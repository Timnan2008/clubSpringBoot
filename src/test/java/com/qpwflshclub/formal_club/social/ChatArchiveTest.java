package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.service.ChatArchive;
import com.qpwflshclub.formal_club.social.service.ChatPlaintext;
import com.qpwflshclub.formal_club.social.service.SocialStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ChatArchiveTest {

    @TempDir
    Path dir;

    SocialStore store;
    ChatPlaintext plaintext;
    ChatArchive archive;

    @BeforeEach
    void setup() throws Exception {
        store = new SocialStore(new ObjectMapper(), dir.toString());
        plaintext = mock(ChatPlaintext.class);
        archive = new ChatArchive(store, plaintext, dir.toString());
    }

    @Test
    void ciphertextIsKeptAfterRecallAndNeverWrittenAsJson() throws Exception {
        var message = new SocialStore.Message(
            "m1",
            "a".repeat(64),
            "b".repeat(64),
            "今晚老地方见",
            Instant.now().toString(),
            false
        );
        archive.capture(message, "今晚老地方见");
        archive.markRecalled("m1");
        var stored = archive.all().getFirst();
        assertThat(stored.text()).isEqualTo("今晚老地方见");
        assertThat(stored.recalled()).isTrue();
        assertThat(stored.readable()).isTrue();
        assertThat(archive.ciphertext("m1")).matches("[0-9a-f]+").doesNotContain("今晚老地方见");
        assertThat(Files.exists(archive.legacyFile())).isFalse();
        assertThat(Files.exists(archive.keyFile())).isTrue();
    }

    @Test
    void encryptedPayloadsAreDecryptedThenSealed() throws Exception {
        when(plaintext.decrypt(any(), any(), eq("e2ee:v1:opaque"))).thenReturn("解密后的正文");
        var message = new SocialStore.Message(
            "m2",
            "a".repeat(64),
            "b".repeat(64),
            "e2ee:v1:opaque",
            Instant.now().toString(),
            false
        );
        archive.capture(message, "e2ee:v1:opaque");
        assertThat(archive.all().getFirst().text()).isEqualTo("解密后的正文");
        assertThat(archive.all().getFirst().readable()).isTrue();
        assertThat(archive.ciphertext("m2"))
            .doesNotContain("e2ee:v1:opaque")
            .doesNotContain("解密后的正文");
    }

    @Test
    void catchUpReadsExistingSocialMessages() throws Exception {
        store.message("a".repeat(64), "b".repeat(64), "历史明文");
        assertThat(archive.catchUp()).isEqualTo(1);
        assertThat(archive.catchUp()).isEqualTo(0);
        assertThat(archive.all().getFirst().text()).isEqualTo("历史明文");
        assertThat(archive.ciphertext(archive.all().getFirst().id())).doesNotContain("历史明文");
    }

    @Test
    void legacyPlaintextFileIsSealedAndDeleted() throws Exception {
        Files.writeString(
            archive.legacyFile(),
            """
            [{"id":"old1","sender":"%s","recipient":"%s","createdAt":"2026-09-20T12:00:00Z","text":"旧明文备份","readable":true,"recalled":false,"archivedAt":"2026-09-21T00:00:00Z"}]
            """.formatted("a".repeat(64), "b".repeat(64))
        );
        assertThat(archive.migrateLegacyFile()).isEqualTo(1);
        assertThat(Files.exists(archive.legacyFile())).isFalse();
        assertThat(archive.all().getFirst().text()).isEqualTo("旧明文备份");
        assertThat(archive.ciphertext("old1")).doesNotContain("旧明文备份");
    }
}
