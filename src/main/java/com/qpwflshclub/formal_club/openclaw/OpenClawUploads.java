package com.qpwflshclub.formal_club.openclaw;

import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Text the student attaches to one turn. Bodies stay out of the saved transcript. */
final class OpenClawUploads {

    private static final int MAX_TEXT = 20_000;
    private static final int MAX_TOTAL = 40_000;
    private static final int MAX_FILE_BYTES = 12_000_000;

    private OpenClawUploads() {}

    public record Upload(String name, String text, String data) {}

    static String merge(String text, List<Upload> attachments, boolean english) {
        if (attachments == null || attachments.isEmpty()) return text;
        if (attachments.size() > 4) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                english ? "Attach at most 4 files" : "最多附上 4 个文件"
            );
        }
        StringBuilder extra = new StringBuilder();
        int total = 0;
        int bytes = 0;
        for (Upload file : attachments) {
            String name = file == null || file.name() == null ? "" : file.name().strip();
            if (!allowed(name)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    english
                        ? "Only supported text, source, Word, PDF, and PowerPoint files can be attached"
                        : "只能附上受支持的文本、代码、Word、PDF 或 PPT 文件"
                );
            }
            String body = bodyOf(file, name, english);
            if (office(name)) bytes += file.data() == null ? 0 : file.data().length();
            if (bytes > 18_000_000) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    english ? "The attached file is too large" : "附上的文件太大"
                );
            }
            total += body.length();
            if (total > MAX_TOTAL) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    english ? "The attached text is too long" : "附上的文本太长"
                );
            }
            extra
                .append(english ? "\n\nAttached file: " : "\n\n用户附上的文件：")
                .append(name)
                .append('\n')
                .append(body);
        }
        return text + extra;
    }

    private static String bodyOf(Upload file, String name, boolean english) {
        if (office(name)) {
            byte[] raw = decode(file == null ? null : file.data());
            if (raw == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    english ? "The attached file is too large" : "附上的文件太大"
                );
            }
            String extracted = OpenClawOffice.extract(name, raw);
            if (extracted == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    english
                        ? "Save this file as docx or pptx and attach it again"
                        : "请把这份文件另存为 docx 或 pptx 后再附上"
                );
            }
            String body = extracted.strip();
            if (body.isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    english ? "No text could be read from this file" : "这份文件没有读出文字"
                );
            }
            return body.length() > MAX_TEXT ? body.substring(0, MAX_TEXT) : body;
        }
        String body = file == null || file.text() == null ? "" : file.text();
        if (body.isBlank() || body.length() > MAX_TEXT) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                english ? "The text attachment is empty or too long" : "文本附件为空或太长"
            );
        }
        return body;
    }

    private static byte[] decode(String data) {
        if (data == null || data.isBlank()) return null;
        String compact = data.replaceAll("\\s", "");
        if (compact.length() > 18_000_000) return null;
        try {
            byte[] raw = Base64.getDecoder().decode(compact);
            if (raw.length == 0 || raw.length > MAX_FILE_BYTES) return null;
            return raw;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static boolean allowed(String name) {
        return textName(name) || office(name);
    }

    private static boolean office(String name) {
        String lower = stem(name);
        return (
            lower.endsWith(".pdf") ||
            lower.endsWith(".doc") ||
            lower.endsWith(".docx") ||
            lower.endsWith(".ppt") ||
            lower.endsWith(".pptx")
        );
    }

    private static boolean textName(String name) {
        String lower = stem(name);
        return lower.matches(
            ".*\\.(txt|md|markdown|csv|json|js|jsx|ts|tsx|py|java|html|css|sql|xml|yml|yaml)"
        );
    }

    private static String stem(String name) {
        if (name == null || name.isBlank() || name.length() > 80) return "";
        if (name.contains("/") || name.contains("\\") || name.contains("..")) return "";
        return name.toLowerCase(Locale.ROOT);
    }
}
