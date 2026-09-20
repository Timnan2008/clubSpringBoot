package com.qpwflshclub.formal_club.social;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Shared server-side filter. Extra terms: CLUB_BLOCKED_WORDS (comma separated). */
public final class ContentModeration {

    static final String MESSAGE = "内容包含不适当用语，请修改后提交。 / Please remove inappropriate language.";

    private static final List<String> WORDS = load();

    private ContentModeration() {}

    public static String normalize(String text) {
        return Normalizer.normalize(Objects.toString(text, ""), Normalizer.Form.NFKC)
            .replaceAll("[\\p{Cf}\\p{M}]", "")
            .toLowerCase(Locale.ROOT);
    }

    public static void check(String... texts) {
        ContentDiscipline.guard();
        if (texts == null) return;
        for (String text : texts) {
            if (blocked(text)) ContentDiscipline.violate();
        }
    }

    public static String mask(String text) {
        if (text == null || text.isBlank() || ciphertext(text)) return Objects.toString(text, "");
        String result = text;
        for (String word : WORDS) {
            if (word.isBlank()) continue;
            if (word.chars().allMatch(c -> c < 128 && Character.isLetter(c))) {
                result = Pattern.compile("(?i)(?<![A-Za-z])" + Pattern.quote(word) + "(?![A-Za-z])")
                    .matcher(result)
                    .replaceAll("*".repeat(word.length()));
            } else {
                result = result.replace(word, "*".repeat(Math.max(1, word.length())));
            }
        }
        return result;
    }

    public static boolean blocked(String text) {
        if (text == null || text.isBlank() || ciphertext(text)) return false;
        String normalized = normalize(text);
        String compact = normalized.replaceAll("[\\s\\p{P}\\p{S}]+", "");
        for (String word : WORDS) {
            if (word.isBlank()) continue;
            boolean english = word.chars().allMatch(c -> c < 128 && Character.isLetterOrDigit(c));
            boolean match = english
                ? Pattern.compile("(?<![a-z0-9])" + Pattern.quote(word) + "(?![a-z0-9])")
                      .matcher(normalized)
                      .find()
                : compact.contains(word);
            if (match) return true;
        }
        return false;
    }

    private static boolean ciphertext(String text) {
        return text.startsWith("e2ee:v1:");
    }

    private static List<String> load() {
        LinkedHashSet<String> words = new LinkedHashSet<>();
        try (var in = ContentModeration.class.getResourceAsStream("/sensitive-words.txt")) {
            if (in != null) {
                new String(in.readAllBytes(), StandardCharsets.UTF_8)
                    .lines()
                    .map(String::trim)
                    .filter(line -> !line.isBlank() && !line.startsWith("#"))
                    .map(ContentModeration::normalize)
                    .filter(word -> !word.isBlank())
                    .forEach(words::add);
            }
        } catch (Exception ignored) {}
        if (words.isEmpty()) {
            words.addAll(
                List.of("傻逼", "操你妈", "草你妈", "去死", "杀你全家", "fuck", "shit", "bitch")
            );
        }
        for (String extra : Objects.toString(System.getenv("CLUB_BLOCKED_WORDS"), "").split(",")) {
            extra = normalize(extra.trim());
            if (!extra.isBlank()) words.add(extra);
        }
        return List.copyOf(words);
    }
}
