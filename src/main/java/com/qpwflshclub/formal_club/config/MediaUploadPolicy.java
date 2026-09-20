package com.qpwflshclub.formal_club.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.web.multipart.MultipartFile;

/** Validate bounded media content, not the browser-controlled MIME type or filename alone. */
public final class MediaUploadPolicy {

    private MediaUploadPolicy() {}

    public static void validate(MultipartFile file, String extension, boolean video)
        throws IOException {
        long limit = (video ? 200L : 10L) * 1024 * 1024;
        if (file.isEmpty() || file.getSize() > limit) throw new IllegalArgumentException(
            video ? "视频不能超过 200 MB" : "图片不能超过 10 MB"
        );
        byte[] bytes;
        try (var input = file.getInputStream()) {
            bytes = input.readNBytes(64);
        }
        boolean valid = switch (extension) {
            case ".png" -> !video &&
                starts(bytes, new byte[] { (byte) 137, 80, 78, 71, 13, 10, 26, 10 });
            case ".jpg", ".jpeg" -> !video &&
                starts(bytes, new byte[] { (byte) 255, (byte) 216, (byte) 255 });
            case ".gif" -> !video && (text(bytes, 0, "GIF87a") || text(bytes, 0, "GIF89a"));
            case ".webp" -> !video &&
                text(bytes, 0, "RIFF") &&
                text(bytes, 8, "WEBP") &&
                (text(bytes, 12, "VP8 ") || text(bytes, 12, "VP8L") || text(bytes, 12, "VP8X"));
            case ".mp4" -> video && text(bytes, 4, "ftyp");
            case ".webm" -> video &&
                starts(bytes, new byte[] { 0x1a, 0x45, (byte) 0xdf, (byte) 0xa3 }) &&
                new String(bytes, StandardCharsets.ISO_8859_1).contains("webm");
            case ".ogg" -> video && text(bytes, 0, "OggS");
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException(
            "文件内容与格式不符 / File content does not match its format"
        );
    }

    private static boolean starts(byte[] b, byte[] signature) {
        return (
            b.length >= signature.length &&
            Arrays.equals(Arrays.copyOf(b, signature.length), signature)
        );
    }

    private static boolean text(byte[] b, int offset, String text) {
        return (
            b.length >= offset + text.length() &&
            new String(b, offset, text.length(), StandardCharsets.US_ASCII).equals(text)
        );
    }
}
