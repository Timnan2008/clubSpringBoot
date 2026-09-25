package com.qpwflshclub.formal_club.social.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ChatArchiveSealTest {

    @TempDir
    Path dir;

    @Test
    void roundTripKeepsPlaintextOffTheEnvelope() throws Exception {
        var seal = new ChatArchiveSeal(dir);
        var envelope = seal.wrap("今晚老地方见");
        assertThat(envelope.iv()).hasSize(32);
        assertThat(envelope.body()).isNotBlank().doesNotContain("今晚").doesNotContain("老地方");
        assertThat(seal.unwrap(envelope.iv(), envelope.body())).isEqualTo("今晚老地方见");
        assertThat(Files.size(dir.resolve("recovery").resolve("archive.key"))).isEqualTo(32);
    }

    @Test
    void opensslAes256CbcCanOpenTheEnvelope() throws Exception {
        assumeTrue(opensslAvailable());
        var seal = new ChatArchiveSeal(dir);
        var envelope = seal.wrap("ssh-only");
        byte[] key = Files.readAllBytes(dir.resolve("recovery").resolve("archive.key"));
        var process = new ProcessBuilder(
            "openssl",
            "enc",
            "-d",
            "-aes-256-cbc",
            "-K",
            HexFormat.of().formatHex(key),
            "-iv",
            envelope.iv()
        )
            .redirectErrorStream(true)
            .start();
        process.getOutputStream().write(HexFormat.of().parseHex(envelope.body()));
        process.getOutputStream().close();
        String opened = new String(process.getInputStream().readAllBytes());
        assertThat(process.waitFor(8, TimeUnit.SECONDS)).isTrue();
        assertThat(process.exitValue()).isZero();
        assertThat(opened).isEqualTo("ssh-only");
    }

    private static boolean opensslAvailable() {
        try {
            return new ProcessBuilder("openssl", "version").start().waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }
}
