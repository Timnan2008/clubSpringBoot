package com.qpwflshclub.formal_club.social;

import com.qpwflshclub.formal_club.social.service.SchoolAccounts;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/**
 * 违禁词过滤引擎（全站唯一入口）。
 *
 * <p>词库来源（三份叠加，改完不用重启，最多 5 秒自动生效）：
 * <ol>
 *   <li>打包装进 JAR 的 <code>src/main/resources/moderation/banned-words.txt</code>（默认词库）</li>
 *   <li>服务器/本机额外词库 <code>data/moderation/banned-words.txt</code>（存在才读，适合线上临时加词）</li>
 *   <li>环境变量 <code>CLUB_BLOCKED_WORDS</code>（英文逗号分隔，临时追加）</li>
 * </ol>
 *
 * <p>匹配规则：英文按「整词」匹配（避免 school 命中 fool 里的字母组合），中文/符号忽略空格和标点后按包含匹配。
 * 命中后由 {@link com.qpwflshclub.formal_club.social.service.ModerationGate} 决定怎么罚。
 */
public final class ContentModeration {

    /** 额外词库路径，可用系统属性/环境变量覆盖。 */
    private static final String EXTRA_FILE = Objects.toString(
        System.getProperty("club.moderation.words-file",
            System.getenv().getOrDefault("CLUB_MODERATION_WORDS_FILE", "data/moderation/banned-words.txt")),
        "data/moderation/banned-words.txt"
    );

    /** 词库缓存：5 秒内不重复读盘，够快也不影响热更新。 */
    private static final long CACHE_MILLIS = 5_000;

    private static volatile List<String> words = List.of();
    private static volatile long loadedAt = 0;
    private static volatile long extraStamp = -1;

    private ContentModeration() {}

    /** 大小写、全角半角、变体字符统一化后再比较。 */
    public static String normalize(String text) {
        return Normalizer.normalize(Objects.toString(text, ""), Normalizer.Form.NFKC)
            .replaceAll("[\\p{Cf}\\p{M}]", "")
            .toLowerCase(Locale.ROOT);
    }

    /** 当前生效的词库（只读快照）。 */
    public static List<String> words() {
        refresh(false);
        return words;
    }

    /** 强制立刻重新读盘（比如管理员改完词库想马上生效）。 */
    public static void reload() {
        refresh(true);
    }

    private static synchronized void refresh(boolean force) {
        long now = System.currentTimeMillis();
        long stamp = extraFileStamp();
        if (!force && now - loadedAt < CACHE_MILLIS && stamp == extraStamp) return;
        LinkedHashSet<String> all = new LinkedHashSet<>();
        all.addAll(readClasspathWords());
        all.addAll(readExtraFileWords());
        for (String extra : Objects.toString(System.getenv("CLUB_BLOCKED_WORDS"), "").split(",")) {
            String word = normalize(extra.trim());
            if (!word.isBlank()) all.add(word);
        }
        words = List.copyOf(all);
        loadedAt = now;
        extraStamp = stamp;
    }

    private static long extraFileStamp() {
        try {
            Path path = Path.of(EXTRA_FILE);
            return Files.exists(path) ? Files.getLastModifiedTime(path).toMillis() : -1;
        } catch (RuntimeException | IOException e) {
            return -1;
        }
    }

    /** 默认词库：随 JAR 打包的那份。 */
    private static List<String> readClasspathWords() {
        List<String> list = new ArrayList<>();
        try (InputStream in = ContentModeration.class.getResourceAsStream("/moderation/banned-words.txt")) {
            if (in == null) return list;
            list.addAll(parse(new String(in.readAllBytes(), StandardCharsets.UTF_8).split("\n")));
        } catch (IOException ignored) {
            // 读不到默认词库不影响其它检查
        }
        return list;
    }

    /** 额外词库：服务器上那份（改完 5 秒内自动生效）。 */
    private static List<String> readExtraFileWords() {
        try {
            Path path = Path.of(EXTRA_FILE);
            if (!Files.exists(path)) return List.of();
            return parse(Files.readString(path, StandardCharsets.UTF_8).split("\n"));
        } catch (RuntimeException | IOException e) {
            return List.of();
        }
    }

    private static List<String> parse(String[] lines) {
        List<String> list = new ArrayList<>();
        for (String line : lines) {
            String word = normalize(line.replace("#", "").trim());
            if (word.isBlank() || line.trim().startsWith("#")) continue;
            list.add(word);
        }
        return list;
    }

    /**
     * 找出文本里命中的第一个违禁词。
     *
     * @return 命中的词；没命中返回 null
     */
    public static String find(String text) {
        String raw = Objects.toString(text, "");
        if (raw.isBlank()) return null;
        String normalized = normalize(raw);
        String compact = normalized.replaceAll("[\\s\\p{P}]+", "");
        for (String word : words()) {
            if (word.isBlank()) continue;
            boolean matched = word.matches("[a-z]+")
                ? Pattern.compile("(?<![a-z])" + Pattern.quote(word) + "(?![a-z])")
                      .matcher(normalized)
                      .find()
                : compact.contains(word.replaceAll("[\\s\\p{P}]+", ""));
            if (matched) return word;
        }
        return null;
    }

    /** 多个字段一起查（昵称、正文、备注……），任一命中即算。 */
    public static String findAny(String... texts) {
        for (String text : texts) {
            String hit = find(text);
            if (hit != null) return hit;
        }
        return null;
    }

    /** 只要一句话的检查：命中就直接拒绝提交（旧行为，保留给不需要记过的场景）。 */
    public static void check(String text) {
        String hit = find(text);
        if (hit != null) throw SchoolAccounts.error(
            400,
            "内容包含不适当用语，请修改后提交。 / Please remove inappropriate language."
        );
    }
}
