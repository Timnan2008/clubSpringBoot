package com.qpwflshclub.formal_club.social.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * 私信归档正文加密。算法是 AES-256-CBC + PKCS5，方便在服务器上用 openssl / MySQL
 * {@code AES_DECRYPT} 解开；密钥只放本机 {@code recovery/archive.key}，不进网页。
 */
final class ChatArchiveSeal {

    record Envelope(String iv, String body) {}

    private static final HexFormat HEX = HexFormat.of();
    private final Path file;
    private final SecureRandom random = new SecureRandom();

    ChatArchiveSeal(Path socialDir) {
        file = socialDir.resolve("recovery").resolve("archive.key");
    }

    Path file() {
        return file;
    }

    Envelope wrap(String plaintext) throws IOException {
        byte[] iv = new byte[16];
        random.nextBytes(iv);
        byte[] packed = crypt(Cipher.ENCRYPT_MODE, iv, plaintext.getBytes(StandardCharsets.UTF_8));
        return new Envelope(HEX.formatHex(iv), HEX.formatHex(packed));
    }

    String unwrap(String ivHex, String bodyHex) throws IOException {
        if (ivHex == null || bodyHex == null || ivHex.isBlank() || bodyHex.isBlank()) return "";
        byte[] iv = HEX.parseHex(ivHex.strip());
        byte[] packed = HEX.parseHex(bodyHex.strip());
        return new String(crypt(Cipher.DECRYPT_MODE, iv, packed), StandardCharsets.UTF_8);
    }

    private byte[] crypt(int mode, byte[] iv, byte[] bytes) throws IOException {
        if (iv.length != 16) throw new IOException("Invalid archive IV");
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(mode, new SecretKeySpec(key(), "AES"), new IvParameterSpec(iv));
            return cipher.doFinal(bytes);
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("Chat archive cipher failed", e);
        }
    }

    private byte[] key() throws IOException {
        Files.createDirectories(file.getParent());
        try {
            Files.setPosixFilePermissions(
                file.getParent(),
                java.nio.file.attribute.PosixFilePermissions.fromString("rwx------")
            );
        } catch (UnsupportedOperationException ignored) {}
        if (!Files.exists(file)) {
            byte[] secret = new byte[32];
            random.nextBytes(secret);
            try {
                Files.write(file, secret, StandardOpenOption.CREATE_NEW);
                try {
                    Files.setPosixFilePermissions(
                        file,
                        java.nio.file.attribute.PosixFilePermissions.fromString("rw-------")
                    );
                } catch (UnsupportedOperationException ignored) {}
            } catch (FileAlreadyExistsException ignored) {}
        }
        byte[] value = Files.readAllBytes(file);
        if (value.length != 32) throw new IOException("Invalid chat archive key");
        return value;
    }
}
