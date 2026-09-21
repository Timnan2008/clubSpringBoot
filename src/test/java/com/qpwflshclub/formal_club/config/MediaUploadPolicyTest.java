package com.qpwflshclub.formal_club.config;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;

class MediaUploadPolicyTest {

    @ParameterizedTest
    @ValueSource(strings = { ".png", ".jpg", ".gif", ".webp", ".mp4", ".webm", ".ogg" })
    void htmlDisguisedAsMediaIsRejected(String ext) {
        var file = new MockMultipartFile(
            "file",
            "payload" + ext,
            "image/png",
            "<html><script>alert(1)</script></html>".getBytes()
        );
        assertThatIllegalArgumentException().isThrownBy(() ->
            MediaUploadPolicy.validate(file, ext, ext.matches("\\.(mp4|webm|ogg)"))
        );
    }

    @Test
    void acceptsRealPngRegardlessOfUntrustedMimeClaim() throws Exception {
        var bytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(
            new java.awt.image.BufferedImage(2, 2, java.awt.image.BufferedImage.TYPE_INT_RGB),
            "png",
            bytes
        );
        var file = new MockMultipartFile(
            "file",
            "photo.png",
            "application/octet-stream",
            bytes.toByteArray()
        );
        assertThatCode(() ->
            MediaUploadPolicy.validate(file, ".png", false)
        ).doesNotThrowAnyException();
        assertThatIllegalArgumentException().isThrownBy(() ->
            MediaUploadPolicy.validate(file, ".jpg", false)
        );
    }

    @Test
    void oversizedAndEmptyMediaAreRejectedBeforeReading() {
        var file = new MockMultipartFile("file", "big.png", "image/png", new byte[] { 1 }) {
            @Override
            public long getSize() {
                return 10L * 1024 * 1024 + 1;
            }
        };
        assertThatIllegalArgumentException()
            .isThrownBy(() -> MediaUploadPolicy.validate(file, ".png", false))
            .withMessageContaining("10 MB");
        assertThatIllegalArgumentException().isThrownBy(() ->
            MediaUploadPolicy.validate(new MockMultipartFile("file", new byte[0]), ".png", false)
        );
    }
}
