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

    static final String MESSAGE =
        "内容包含不适当用语，请修改后提交。 / Please remove inappropriate language.";

    /** 额外词库路径，可用系统属性/环境变量覆盖。 */
    private static volatile String extraFile = Objects.toString(
        System.getProperty(
            "club.moderation.words-file",
            System.getenv().getOrDefault(
                "CLUB_MODERATION_WORDS_FILE",
                "data/moderation/banned-words.txt"
            )
        ),
        "data/moderation/banned-words.txt"
    );

    /** 词库缓存：5 秒内不重复读盘，够快也不影响热更新。 */
    private static final long CACHE_MILLIS = 5_000;

    /**
     * 一条「编译好的」规则：
     * 英文词用整词正则（避免 school 命中 fool 里的字母组合），中文词用「去掉空格标点后包含」。
     * 编译只在词库变化时做一次，检查时不再重复编译正则 / 重复去标点。
     */
    private record Rule(String word, Pattern latinPattern, String compact) {}

    private static volatile List<Rule> rules = List.of();
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
        List<String> list = new ArrayList<>();
        for (Rule rule : load()) list.add(rule.word());
        return list;
    }

    /** 强制立刻重新读盘（比如管理员改完词库想马上生效）。 */
    public static void reload() {
        refresh(true);
    }

    /**
     * 取当前规则表。
     * 关键优化：5 秒窗口内直接返回，连文件系统都不碰（原来每次检查都要 stat 一两次文件）；
     * 窗口过期后才看一眼文件修改时间，没改就只续期，改了才重新读盘并编译。
     */
    private static List<Rule> load() {
        refresh(false);
        return rules;
    }

    private static synchronized void refresh(boolean force) {
        long now = System.currentTimeMillis();
        if (!force && loadedAt != 0 && now - loadedAt < CACHE_MILLIS) return;
        long stamp = extraFileStamp();
        if (!force && loadedAt != 0 && stamp == extraStamp) {
            loadedAt = now; // 词库文件没动过：只把缓存续期
            return;
        }
        LinkedHashSet<String> all = new LinkedHashSet<>();
        all.addAll(readClasspathWords());
        try (var in = ContentModeration.class.getResourceAsStream("/sensitive-words.txt")) {
            if (in != null) all.addAll(
                parse(new String(in.readAllBytes(), StandardCharsets.UTF_8).split("\\n"))
            );
        } catch (IOException ignored) {}
        all.addAll(readExtraFileWords());
        for (String extra : Objects.toString(System.getenv("CLUB_BLOCKED_WORDS"), "").split(",")) {
            String word = normalize(extra.trim());
            if (!word.isBlank()) all.add(word);
        }
        List<Rule> compiled = new ArrayList<>(all.size());
        for (String word : all) {
            if (word.isBlank()) continue;
            if (word.matches("[a-z]+")) compiled.add(
                new Rule(
                    word,
                    Pattern.compile("(?<![a-z])" + Pattern.quote(word) + "(?![a-z])"),
                    null
                )
            );
            else compiled.add(new Rule(word, null, word.replaceAll("[\\s\\p{P}]+", "")));
        }
        rules = List.copyOf(compiled);
        loadedAt = now;
        extraStamp = stamp;
    }

    private static long extraFileStamp() {
        try {
            Path path = Path.of(extraFile);
            return Files.exists(path) ? Files.getLastModifiedTime(path).toMillis() : -1;
        } catch (RuntimeException | IOException e) {
            return -1;
        }
    }

    /** 默认词库：随 JAR 打包的那份。 */
    private static List<String> readClasspathWords() {
        List<String> list = new ArrayList<>();
        try (
            InputStream in = ContentModeration.class.getResourceAsStream(
                "/moderation/banned-words.txt"
            )
        ) {
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
            Path path = Path.of(extraFile);
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
        if (raw.isBlank() || raw.startsWith("e2ee:v1:")) return null;
        String normalized = normalize(raw);
        // 只有在真的检查到中文词时才做「去空格标点」这一步，避免无谓的字符串生成
        String compact = null;
        for (Rule rule : load()) {
            if (rule.latinPattern() != null) {
                if (rule.latinPattern().matcher(normalized).find()) return rule.word();
            } else {
                if (compact == null) compact = normalized.replaceAll("[\\s\\p{P}]+", "");
                if (
                    !rule.compact().isEmpty() && compact.contains(rule.compact())
                ) return rule.word();
            }
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
    public static void check(String... texts) {
        ContentDiscipline.guard();
        if (texts == null) return;
        if (findAny(texts) != null) ContentDiscipline.violate();
    }

    public static boolean blocked(String text) {
        return find(text) != null;
    }

    public static String mask(String text) {
        if (text == null || text.isBlank() || text.startsWith("e2ee:v1:")) return Objects.toString(
            text,
            ""
        );
        String result = text;
        for (String word : words()) {
            if (word.isBlank()) continue;
            if (word.chars().allMatch(c -> c < 128 && Character.isLetter(c))) {
                result = Pattern.compile("(?i)(?<![A-Za-z])" + Pattern.quote(word) + "(?![A-Za-z])")
                    .matcher(result)
                    .replaceAll("*".repeat(word.length()));
            } else result = result.replace(word, "*".repeat(Math.max(1, word.length())));
        }
        return result;
    }

    // ---------------------------------------------------------------- 管理员后台（第三十四轮）

    /** 一条词条以及它来自哪份词库（后台列表用）/ one word plus where it comes from */
    public record WordInfo(String word, String source) {}

    /** 三份词库合并后的明细：打包 / 本机 / 环境变量。 */
    public static List<WordInfo> wordInfo() {
        List<WordInfo> out = new ArrayList<>();
        for (String word : readClasspathWords()) {
            out.add(new WordInfo(word, "打包"));
        }
        for (String word : extraWords()) {
            out.add(new WordInfo(word, "本机"));
        }
        for (String part : Objects.toString(System.getenv("CLUB_BLOCKED_WORDS"), "").split(",")) {
            String word = normalize(part.trim());
            if (!word.isBlank()) {
                out.add(new WordInfo(word, "环境变量"));
            }
        }
        return out;
    }

    /**
     * 后台加词：写进**本机额外词库**（打包词库保持只读），写完立刻生效。
     * 非法词条（空、带换行）直接拒绝，避免把词库文件写坏。
     */
    public static String addWord(String word) {
        String normalized = normalize(Objects.toString(word, "").trim());
        if (normalized.isBlank() || normalized.contains("\n") || normalized.contains(" ")) {
            throw SchoolAccounts.error(400, "词条无效：不能为空，也不能带空格或换行");
        }
        List<String> words = extraWords();
        if (words.contains(normalized)) {
            throw SchoolAccounts.error(400, "这个词已经在本机词库里了");
        }
        if (readClasspathWords().contains(normalized)) {
            throw SchoolAccounts.error(400, "这个词已经在打包词库里了（打包词库只读）");
        }
        words.add(normalized);
        writeExtra(words);
        refresh(true);
        return normalized;
    }

    /**
     * 后台删词：只能删本机词库里的词（打包词库不动）。
     *
     * @return 删掉了返回 true；打包词库里的词返回 false（调用方据此提示）
     */
    public static boolean removeWord(String word) {
        String normalized = normalize(Objects.toString(word, "").trim());
        List<String> words = extraWords();
        if (!words.remove(normalized)) {
            return false;
        }
        writeExtra(words);
        refresh(true);
        return true;
    }

    /** 本机额外词库里现有的词（已归一化）。 */
    private static List<String> extraWords() {
        List<String> out = new ArrayList<>();
        try {
            Path path = Path.of(extraFile);
            if (!Files.exists(path)) {
                return out;
            }
            for (String line : Files.readString(path, StandardCharsets.UTF_8).split("\n")) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                    out.add(normalize(trimmed));
                }
            }
        } catch (RuntimeException | IOException e) {
            // 读不到就当空的
        }
        return out;
    }

    private static void writeExtra(List<String> words) {
        try {
            Path path = Path.of(extraFile);
            if (path.getParent() != null) {
                Files.createDirectories(path.getParent());
            }
            StringBuilder text = new StringBuilder(
                "# 本机补充词库（管理员后台维护；一行一个词；保存后最多 5 秒生效）\n"
            );
            for (String word : words) {
                text.append(word).append('\n');
            }
            Files.writeString(path, text.toString(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw SchoolAccounts.error(500, "写入词库失败：" + e.getMessage());
        }
    }

    /** 本机词库文件路径（后台展示用）。 */
    public static String extraFile() {
        return extraFile;
    }

    /**
     * 测试钩子：把「本机词库」指到临时文件，测完记得调回来。
     * 让单元测试能真实验证「后台加词 / 删词」这条写盘路径，而不会污染仓库里的词库。
     */
    static void overrideExtraFile(String path) {
        extraFile = path;
    }
}
