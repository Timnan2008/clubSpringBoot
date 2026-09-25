package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;

import com.qpwflshclub.formal_club.social.service.AvatarStore;
import com.qpwflshclub.formal_club.social.service.WallFiles;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class MediaCompressionTest {

    @TempDir
    Path dir;

    /** 本机有没有可用的 ffmpeg（视频压缩测试依赖它）。 */
    private static boolean ffmpegAvailable() {
        try {
            var process = new ProcessBuilder("ffmpeg", "-version")
                .redirectError(ProcessBuilder.Redirect.DISCARD)
                .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                .start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    void largePhotosAndLegacyAvatarsBecomeSmallerAndAnonymousFilesStayGeneric() throws Exception {
        var image = new BufferedImage(2400, 1600, BufferedImage.TYPE_INT_RGB);
        var random = new java.util.Random(42);
        for (int y = 0; y < 1600; y++) for (int x = 0; x < 2400; x++) image.setRGB(
            x,
            y,
            random.nextInt()
        );
        var out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        byte[] source = out.toByteArray();
        var files = new WallFiles(dir.toString());
        var saved = files.save(
            new MockMultipartFile("file", "photo.png", "image/png", source),
            true
        );
        assertThat(saved.type()).isEqualTo("image/jpeg");
        assertThat(saved.name()).isEqualTo("attachment.jpg");
        assertThat(saved.size()).isLessThan(source.length / 4);
        assertThat(
            ImageIO.read(new ByteArrayInputStream(files.read(saved.id()))).getWidth()
        ).isEqualTo(1600);
        var avatars = new AvatarStore(dir.toString());
        String id = "a".repeat(64);
        Files.write(dir.resolve(id + ".png"), source);
        byte[] thumb = avatars.read(id);
        var decoded = ImageIO.read(new ByteArrayInputStream(thumb));
        assertThat(decoded.getWidth()).isEqualTo(256);
        assertThat(decoded.getHeight()).isEqualTo(256);
        assertThat(thumb.length).isLessThan(50000);
        assertThat(Files.exists(dir.resolve(id + ".jpg"))).isTrue();
    }

    @Test
    void videoIsEncodedAsPlayableFastStartMp4AndBadInputIsRejected() throws Exception {
        // 视频压缩要靠本机的 ffmpeg：没装就跳过，而不是把整个测试套件弄红
        //（这个测试以前就是因为「本机没 ffmpeg」直接报 IOException）
        Assumptions.assumeTrue(
            ffmpegAvailable(),
            "本机没有 ffmpeg，跳过视频压缩测试（装上 ffmpeg 后会自动跑）"
        );
        Path input = dir.resolve("input.mp4"),
            output = dir.resolve("output.mp4");
        var proc = new ProcessBuilder(
            "ffmpeg",
            "-nostdin",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=1920x1080:rate=24",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-crf",
            "10",
            "-threads",
            "2",
            input.toString()
        )
            .redirectError(ProcessBuilder.Redirect.DISCARD)
            .start();
        assertThat(proc.waitFor()).isZero();
        MediaCompression.video(input, output);
        assertThat(Files.size(output)).isLessThan(Files.size(input));
        byte[] data = Files.readAllBytes(output);
        String raw = new String(data, java.nio.charset.StandardCharsets.ISO_8859_1);
        assertThat(raw.indexOf("moov")).isLessThan(raw.indexOf("mdat"));
        Path bad = dir.resolve("bad.mp4");
        Files.writeString(bad, "not a video");
        assertThatThrownBy(() ->
            MediaCompression.video(bad, dir.resolve("bad-out.mp4"))
        ).hasMessageContaining("400");
    }

    @Test
    void alreadyWebReadyVideoIsRemuxedInsteadOfReencoded() throws Exception {
        Assumptions.assumeTrue(ffmpegAvailable(), "本机没有 ffmpeg，跳过视频转封装测试");
        Path input = dir.resolve("ready.mp4"),
            output = dir.resolve("ready-out.mp4");
        var proc = new ProcessBuilder(
            "ffmpeg",
            "-nostdin",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=1280x720:rate=24",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:sample_rate=44100",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-shortest",
            "-movflags",
            "+faststart",
            input.toString()
        )
            .redirectError(ProcessBuilder.Redirect.DISCARD)
            .start();
        assertThat(proc.waitFor()).isZero();
        long started = System.nanoTime();
        MediaCompression.video(input, output);
        assertThat(System.nanoTime() - started).isLessThan(TimeUnit.SECONDS.toNanos(12));
        assertThat(Files.size(output)).isGreaterThan(0);
        String raw = new String(
            Files.readAllBytes(output),
            java.nio.charset.StandardCharsets.ISO_8859_1
        );
        assertThat(raw.indexOf("moov")).isLessThan(raw.indexOf("mdat"));
    }
}
