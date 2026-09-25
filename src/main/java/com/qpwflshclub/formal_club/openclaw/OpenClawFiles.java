package com.qpwflshclub.formal_club.openclaw;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Text files the assistant prepares for the signed-in account. */
@Component
public class OpenClawFiles {

    private static final int MAX_CHARS = 80_000;

    private final Path root;

    public OpenClawFiles(@Value("${club.openclaw.file-dir:data/openclaw-files}") String dir) {
        this.root = Path.of(dir == null || dir.isBlank() ? "data/openclaw-files" : dir)
            .toAbsolutePath()
            .normalize();
    }

    public String give(long accountId, String name, String content, boolean english) {
        String safe = safeName(name);
        String body = content == null ? "" : content;
        if (safe == null) {
            return english
                ? "Only supported text, source, or docx files can be prepared. This action did not finish."
                : "只能准备受支持的文本、源代码或 docx 文件，这次没有完成。";
        }
        if (body.isBlank() || body.length() > MAX_CHARS) {
            return english
                ? "The file is empty or too long. This action did not finish."
                : "文件是空的或太长，这次没有完成。";
        }
        String id = UUID.randomUUID().toString();
        try {
            Path dir = accountDir(accountId);
            Files.createDirectories(dir);
            Path file = dir.resolve(id + ".txt").normalize();
            Path meta = dir.resolve(id + ".name").normalize();
            if (!file.startsWith(root) || !meta.startsWith(root)) {
                return english
                    ? "The file could not be prepared. This action did not finish."
                    : "文件没有准备好，这次没有完成。";
            }
            if (safe.toLowerCase(Locale.ROOT).endsWith(".docx")) Files.write(
                file,
                OpenClawOffice.word(body)
            );
            else Files.writeString(file, body);
            Files.writeString(meta, safe);
        } catch (IOException e) {
            return english
                ? "The file could not be prepared. This action did not finish."
                : "文件没有准备好，这次没有完成。";
        }
        return (
            "FILE\t" +
            safe +
            "\t/api/openclaw/files/" +
            id +
            "\n" +
            (english ? "File ready: " : "文件已准备：") +
            safe
        );
    }

    public void remove(long accountId, String id) throws IOException {
        if (id == null || !id.matches("[0-9a-fA-F-]{36}")) return;
        Path dir = accountDir(accountId);
        Path file = dir.resolve(id + ".txt").normalize();
        Path meta = dir.resolve(id + ".name").normalize();
        if (!file.startsWith(root) || !meta.startsWith(root)) return;
        Files.deleteIfExists(file);
        Files.deleteIfExists(meta);
    }

    public Download load(long accountId, String id) {
        if (id == null || !id.matches("[0-9a-fA-F-]{36}")) return null;
        try {
            Path dir = accountDir(accountId);
            Path file = dir.resolve(id + ".txt").normalize();
            Path meta = dir.resolve(id + ".name").normalize();
            if (!file.startsWith(root) || !Files.isRegularFile(file)) return null;
            String name = Files.isRegularFile(meta) ? Files.readString(meta).strip() : "file.txt";
            String safe = safeName(name);
            return new Download(safe == null ? "file.txt" : safe, file);
        } catch (IOException e) {
            return null;
        }
    }

    static Map<String, String> cited(String output) {
        if (output == null) return Map.of();
        for (String line : output.split("\n")) {
            if (!line.startsWith("FILE\t")) continue;
            String[] parts = line.split("\t", 3);
            if (parts.length < 3) continue;
            if (!parts[2].matches("/api/openclaw/files/[0-9a-fA-F-]{36}")) continue;
            String name = safeName(parts[1]);
            if (name == null) continue;
            return Map.of("name", name, "href", parts[2]);
        }
        return Map.of();
    }

    static String safeName(String raw) {
        if (raw == null) return null;
        String name = raw.strip().replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) name = name.substring(slash + 1);
        name = name.replaceAll("[\\p{Cntrl}]", "");
        if (name.isBlank() || name.length() > 80 || name.contains("..")) return null;
        String lower = name.toLowerCase(Locale.ROOT);
        if (
            lower.matches(
                ".*\\.(txt|md|markdown|csv|json|js|jsx|ts|tsx|py|java|html|css|sql|xml|yml|yaml|docx)"
            )
        ) {
            return name;
        }
        if (name.indexOf('.') >= 0) return null;
        return name + ".txt";
    }

    private Path accountDir(long accountId) {
        if (accountId <= 0) throw new IllegalArgumentException("account");
        return root.resolve(Long.toString(accountId)).normalize();
    }

    public record Download(String name, Path path) {}
}
