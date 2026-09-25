package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.config.LoginEmails;
import com.qpwflshclub.formal_club.social.ContentModeration;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Single-instance private profile registry. Student numbers are unique and immutable. */
@Service
public class AccountProfiles {

    public static final String EMAIL_REGISTERED = LoginEmails.EMAIL_REGISTERED;
    public static final String STUDENT_NUMBER_REGISTERED =
        "这个学生号已绑定账户，请直接登录 / This student number is already registered. Please sign in.";

    public record Profile(
        String studentNumber,
        String nickname,
        String grade,
        String classroom,
        List<String> tags,
        String bio
    ) {
        public Profile {
            tags = tags == null ? List.of() : List.copyOf(tags);
        }
    }

    private final Path file;
    private final ObjectMapper json = new ObjectMapper();
    private final Map<String, Profile> profiles;

    public AccountProfiles(
        @Value("${club.profiles-file:./data/accounts/profiles.json}") String path
    ) throws IOException {
        file = Path.of(path);
        profiles = Files.exists(file)
            ? json.readValue(
                  Files.readAllBytes(file),
                  new TypeReference<LinkedHashMap<String, Profile>>() {}
              )
            : new LinkedHashMap<>();
    }

    public synchronized Profile get(String email) {
        return profiles.getOrDefault(
            SchoolAccounts.key(email),
            new Profile("", "", "", "", List.of(), "")
        );
    }

    private String clean(String value, int limit) {
        value = Objects.toString(value, "").strip();
        if (
            value.length() > limit ||
            value.codePoints().anyMatch(c -> Character.isISOControl(c) && c != '\n')
        ) throw SchoolAccounts.error(400, "资料超出长度限制 / Profile text is too long");
        ContentModeration.check(value);
        return value;
    }

    private String number(String email, String input) {
        String n = java.text.Normalizer.normalize(
            clean(input, 32),
            java.text.Normalizer.Form.NFKC
        ).toUpperCase(Locale.ROOT);
        String current = get(email).studentNumber();
        if (!current.isEmpty() && !current.equals(n)) throw SchoolAccounts.error(
            409,
            "学生号绑定后不能修改 / Student number cannot be changed"
        );
        if (!n.isEmpty() && !n.matches("[A-Z0-9-]{1,32}")) throw SchoolAccounts.error(
            400,
            "请填写有效学生号 / Enter a valid student number"
        );
        String me = SchoolAccounts.key(email);
        if (
            !n.isEmpty() &&
            profiles
                .entrySet()
                .stream()
                .anyMatch(e -> !e.getKey().equals(me) && n.equals(e.getValue().studentNumber()))
        ) throw SchoolAccounts.error(409, STUDENT_NUMBER_REGISTERED);
        return n;
    }

    public synchronized void requireEmailAvailable(String email) {
        if (profiles.containsKey(SchoolAccounts.key(email))) throw SchoolAccounts.error(
            409,
            EMAIL_REGISTERED
        );
    }

    public synchronized void requireStudentNumberAvailable(String email, String studentNumber) {
        number(email == null ? "" : email, studentNumber);
    }

    private void persist() {
        try {
            Files.createDirectories(file.toAbsolutePath().getParent());
            Path tmp = Files.createTempFile(file.toAbsolutePath().getParent(), "profiles-", ".tmp");
            try {
                com.qpwflshclub.formal_club.Util.SecureFiles.restrict(tmp, "rw-------");
                Files.write(tmp, json.writeValueAsBytes(profiles));
                Files.move(
                    tmp,
                    file.toAbsolutePath(),
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING
                );
            } finally {
                Files.deleteIfExists(tmp);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Profile storage unavailable", e);
        }
    }

    public synchronized <T> T register(
        String email,
        String studentNumber,
        String nickname,
        boolean student,
        Supplier<T> create
    ) {
        String key = SchoolAccounts.key(email);
        requireEmailAvailable(email);
        String n = number(email, studentNumber);
        if (student && n.isEmpty()) throw SchoolAccounts.error(
            400,
            "请填写学生号 / Student number is required"
        );
        profiles.put(key, new Profile(n, clean(nickname, 60), "", "", List.of(), ""));
        try {
            persist();
            return create.get();
        } catch (RuntimeException e) {
            profiles.remove(key);
            persist();
            throw e;
        }
    }

    public synchronized Profile update(String email, Profile input, boolean student) {
        var old = get(email);
        String n = student
            ? number(
                  email,
                  input.studentNumber() == null ? old.studentNumber() : input.studentNumber()
              )
            : old.studentNumber();
        var tags = input
            .tags()
            .stream()
            .map(v -> clean(v, 24))
            .filter(v -> !v.isBlank())
            .distinct()
            .toList();
        if (tags.size() > 8) throw SchoolAccounts.error(400, "最多 8 个标签 / Up to 8 tags");
        var p = new Profile(
            n,
            clean(input.nickname(), 60),
            student ? clean(input.grade(), 30) : "",
            student ? clean(input.classroom(), 30) : "",
            tags,
            clean(input.bio(), 600)
        );
        String key = SchoolAccounts.key(email);
        Profile previous = profiles.put(key, p);
        try {
            persist();
        } catch (RuntimeException e) {
            if (previous == null) profiles.remove(key);
            else profiles.put(key, previous);
            throw e;
        }
        return p;
    }

    public synchronized void removeAccount(String id) {
        profiles.remove(id);
        persist();
    }

    public synchronized int retain(Set<String> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        int before = profiles.size();
        profiles.keySet().retainAll(ids);
        int removed = before - profiles.size();
        if (removed > 0) persist();
        return removed;
    }

    /**
     * 清掉「幽灵登记」：删号时如果只删了数据库那一行，这里还留着邮箱和学生号，
     * 于是重新注册会被「此邮箱已注册 / 这个学生号已绑定账户」挡住。
     * 传入服务器上真实存在的账号 key（SHA-256(邮箱)），把对不上的登记删掉。
     *
     * @return 清掉的条数
     */
    public synchronized int pruneStale(Set<String> liveAccountKeys) {
        List<String> ghosts = new ArrayList<>();
        for (String key : profiles.keySet()) {
            if (!liveAccountKeys.contains(key)) ghosts.add(key);
        }
        if (ghosts.isEmpty()) return 0;
        for (String key : ghosts) profiles.remove(key);
        persist();
        return ghosts.size();
    }

    /** 按邮箱清掉一条登记（旧版删除接口删号后调用）。 */
    public synchronized boolean forget(String email) {
        boolean removed = profiles.remove(SchoolAccounts.key(email)) != null;
        if (removed) persist();
        return removed;
    }
}
