package com.qpwflshclub.formal_club.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Login addresses may change; the original database identity stays stable for encrypted messages. */
@Service
public class LoginEmails {

    public static final String EMAIL_REGISTERED =
        "此邮箱已注册，请直接登录 / This email is already registered. Please sign in.";

    private final Path file;
    private final IUserService users;
    private final ObjectMapper json = new ObjectMapper();
    private final Map<String, String> addresses;

    public LoginEmails(
        @Value("${club.login-emails-file:./data/accounts/login-emails.json}") String path,
        IUserService users
    ) throws IOException {
        this.file = Path.of(path);
        this.users = users;
        addresses = Files.exists(file)
            ? json.readValue(Files.readAllBytes(file), new TypeReference<Map<String, String>>() {})
            : new HashMap<>();
    }

    public static String normalize(String email) {
        return email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
    }

    public synchronized String display(String canonical) {
        return addresses.getOrDefault(normalize(canonical), canonical);
    }

    public synchronized String resolve(String login) {
        String value = normalize(login);
        for (var e : addresses.entrySet()) if (e.getValue().equals(value)) return e.getKey();
        return addresses.containsKey(value) ? null : value;
    }

    public synchronized void requireAvailable(String email) {
        String value = normalize(email);
        pruneStale();
        if (
            addresses.containsValue(value) || users.findByEmail(value) != null
        ) throw SchoolAccounts.error(409, EMAIL_REGISTERED);
    }

    /**
     * 清掉「幽灵别名」：原账号已经在数据库里被删除、别名记录却还留着的条目会挡住重新注册。
     */
    private void pruneStale() {
        Map<String, String> next = new HashMap<>(addresses);
        boolean changed = next.entrySet().removeIf(e -> users.findByEmail(e.getKey()) == null);
        if (changed) write(next);
    }

    /** 删号时清掉这个账号的别名记录（旧版删除接口也会调用）。 */
    public synchronized void forget(String email) {
        Map<String, String> next = new HashMap<>(addresses);
        if (next.remove(normalize(email)) != null) write(next);
    }

    /** 把给定的别名表原子写回文件，并同步内存。 */
    private void write(Map<String, String> data) {
        try {
            Files.createDirectories(file.toAbsolutePath().getParent());
            Path tmp = Files.createTempFile(file.toAbsolutePath().getParent(), "login-", ".tmp");
            try {
                Files.write(tmp, json.writeValueAsBytes(data));
                Files.move(
                    tmp,
                    file,
                    StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING
                );
            } finally {
                Files.deleteIfExists(tmp);
            }
            addresses.clear();
            addresses.putAll(data);
        } catch (IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "登录邮箱存储不可用 / Login address storage unavailable"
            );
        }
    }

    public synchronized void change(String canonical, String email) throws IOException {
        requireAvailable(email);
        Map<String, String> next = new HashMap<>(addresses);
        next.put(normalize(canonical), normalize(email));
        Files.createDirectories(file.toAbsolutePath().getParent());
        Path temp = Files.createTempFile(
            file.toAbsolutePath().getParent(),
            "login-emails-",
            ".tmp"
        );
        try {
            com.qpwflshclub.formal_club.Util.SecureFiles.restrict(temp, "rw-------");
            Files.write(temp, json.writeValueAsBytes(next));
            Files.move(
                temp,
                file,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
            addresses.clear();
            addresses.putAll(next);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    public synchronized void removeAccount(String canonical) throws IOException {
        var next = new HashMap<>(addresses);
        next.remove(normalize(canonical));
        Files.createDirectories(file.toAbsolutePath().getParent());
        Path tmp = Files.createTempFile(file.toAbsolutePath().getParent(), "login-", ".tmp");
        try {
            Files.write(tmp, json.writeValueAsBytes(next));
            Files.move(
                tmp,
                file,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
            addresses.clear();
            addresses.putAll(next);
        } finally {
            Files.deleteIfExists(tmp);
        }
    }
}
