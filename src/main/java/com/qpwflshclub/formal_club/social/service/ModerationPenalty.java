package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 违规记过与阶梯封禁（「网管」角度的处罚台）。
 *
 * <p>规则：同一账号累计命中违禁词
 * <ul>
 *   <li>第 1、2 次 → 只用「网管」身份提醒一次，不封号</li>
 *   <li>第 3 次起 → 封禁 2^(次数-3) 天：第 3 次 1 天、第 4 次 2 天、第 5 次 4 天、第 6 次 8 天……</li>
 *   <li>再次违规时取「原有封禁结束时间」和「新封禁」里更晚的那个，不会越罚越轻</li>
 * </ul>
 *
 * <p>数据落在私有文件里（默认 <code>data/moderation/penalties.json</code>），不入库、不进 Git。
 */
@Service
public class ModerationPenalty {

    /** 提醒/封禁通知的署名。 */
    public static final String WARDEN_NAME = "网管";
    public static final String WARDEN_NAME_EN = "Network Admin";

    /** 网管身份用的虚拟邮箱（只用来生成一个稳定的账号 id，不会在数据库里建号）。 */
    private static final String WARDEN_EMAIL = "warden@accounts.qpwflhs.invalid";

    /** 封禁天数上限，防止刷到天文数字。 */
    private static final long MAX_BAN_DAYS = 365;

    private static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    /** 一次违规的原始记录。 */
    public record Strike(String at, String where, String word) {}

    /** 某个账号的累计状态。 */
    public record State(int strikes, long banUntil, List<Strike> history) {
        public State {
            history = history == null ? List.of() : List.copyOf(history);
        }

        public static State empty() {
            return new State(0, 0, List.of());
        }
    }

    private final Path file;
    private final ObjectMapper json = new ObjectMapper();
    private final Map<String, State> states;

    public ModerationPenalty(
        @Value("${club.moderation-file:./data/moderation/penalties.json}") String path
    ) throws IOException {
        file = Path.of(path);
        states = Files.exists(file)
            ? json.readValue(
                  Files.readAllBytes(file),
                  new TypeReference<LinkedHashMap<String, State>>() {}
              )
            : new LinkedHashMap<>();
    }

    /** 网管的账号 id（通知/聊天里显示成「网管」）。 */
    public static String wardenId() {
        return SchoolAccounts.key(WARDEN_EMAIL);
    }

    /** 第 N 次违规封多少天：第 3 次 1 天，之后每次翻倍。 */
    public static long banDaysFor(int count) {
        if (count < 3) return 0;
        return Math.min(MAX_BAN_DAYS, 1L << Math.min(count - 3, 20));
    }

    /** 给用户看的解封时间。 */
    public static String untilText(long banUntil) {
        return STAMP.format(Instant.ofEpochMilli(banUntil).atZone(ZONE));
    }

    /** 这次违规的处置结果（WARN = 只提醒；BAN = 封禁 N 天）。 */
    public record Outcome(int count, String word, String where, long banUntil, long banDays) {
        public boolean banned() {
            return banUntil > System.currentTimeMillis();
        }

        public String message() {
            if (!banned()) return String.format(
                "内容里出现了违禁词「%s」，已被拦截。这是第 %d 次提醒（前 2 次只提醒，第 3 次起会封禁账号）。" +
                    " / Word \"%s\" blocked. Warning %d of 2.",
                word,
                count,
                word,
                count
            );
            return String.format(
                "内容里出现了违禁词「%s」，已被拦截。你的账号已被「%s」封禁 %d 天，解封时间：%s。" +
                    " / Blocked. Suspended for %d day(s) until %s.",
                word,
                WARDEN_NAME,
                banDays,
                untilText(banUntil),
                banDays,
                untilText(banUntil)
            );
        }
    }

    /** 记一次违规并算出处置结果。 */
    public synchronized Outcome strike(String account, String where, String word) {
        long now = System.currentTimeMillis();
        State old = states.getOrDefault(account, State.empty());
        int count = old.strikes() + 1;
        long days = banDaysFor(count);
        long banUntil =
            days > 0 ? Math.max(old.banUntil(), now + days * 86_400_000L) : old.banUntil();
        List<Strike> history = new ArrayList<>(old.history());
        history.add(new Strike(Instant.ofEpochMilli(now).atZone(ZONE).toString(), where, word));
        if (history.size() > 50) {
            history = new ArrayList<>(history.subList(history.size() - 50, history.size()));
        }
        states.put(account, new State(count, banUntil, history));
        persist();
        return new Outcome(count, word, where, banUntil, days);
    }

    public synchronized State state(String account) {
        return states.getOrDefault(account, State.empty());
    }

    /** 全部有记录的账号（后台列表用；返回副本，外面改不动）。 */
    public synchronized Map<String, State> all() {
        return new LinkedHashMap<>(states);
    }

    /** 当前是否处于封禁中。 */
    public synchronized boolean banned(String account) {
        return account != null && state(account).banUntil() > System.currentTimeMillis();
    }

    /** 剩余封禁毫秒数（没封就返回 0）。 */
    public synchronized long remainingMillis(String account) {
        return account == null
            ? 0
            : Math.max(0, state(account).banUntil() - System.currentTimeMillis());
    }

    /** 管理员解封：清掉累计次数和封禁时间。 */
    public synchronized boolean forgive(String account) {
        if (account == null || states.remove(account) == null) return false;
        persist();
        return true;
    }

    /** 账号注销时清掉违规记录。 */
    public synchronized void removeAccount(String account) {
        if (account != null && states.remove(account) != null) persist();
    }

    private void persist() {
        try {
            Files.createDirectories(file.toAbsolutePath().getParent());
            Path tmp = Files.createTempFile(
                file.toAbsolutePath().getParent(),
                "penalties-",
                ".tmp"
            );
            try {
                Files.write(tmp, json.writeValueAsBytes(states));
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
            throw new IllegalStateException("Moderation storage unavailable", e);
        }
    }
}
