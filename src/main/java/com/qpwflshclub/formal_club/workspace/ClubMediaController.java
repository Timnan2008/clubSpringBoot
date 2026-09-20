package com.qpwflshclub.formal_club.workspace;

import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.social.*;
import jakarta.servlet.http.HttpServletRequest;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class ClubMediaController {

    private final WorkspaceAccess access;
    private final ClubRepository clubs;
    private final WallFiles images;
    private final Path root;

    public ClubMediaController(
        WorkspaceAccess a,
        ClubRepository c,
        WallFiles images,
        @Value("${club.media-dir:./data/club-media}") String root
    ) {
        access = a;
        clubs = c;
        this.images = images;
        this.root = Path.of(root);
    }

    @PostMapping("/api/club-workspace/{club}/media/{kind}")
    public Object upload(
        @PathVariable int club,
        @PathVariable String kind,
        @RequestParam MultipartFile file,
        HttpServletRequest request
    ) throws IOException {
        var c = access.require(access.current(request), club);
        access.mutation(request);
        long limit = kind.equals("logo") ? 10L * 1024 * 1024 : 200L * 1024 * 1024;
        if (file.isEmpty() || file.getSize() > limit) throw SchoolAccounts.error(
            400,
            kind.equals("logo")
                ? "Logo 不能超过 10 MB / Logo must be under 10 MB"
                : "视频不能超过 200 MB / Video must be under 200 MB"
        );
        Files.createDirectories(root);
        String name = UUID.randomUUID() + (kind.equals("logo") ? ".jpg" : ".mp4");
        Path target = root.resolve(name);
        if (kind.equals("logo")) {
            var saved = images.save(file, false);
            try {
                if (!saved.type().startsWith("image/")) throw SchoolAccounts.error(
                    400,
                    "Logo 请使用 JPG 或 PNG / Use JPG or PNG"
                );
                Files.write(target, images.read(saved.id()));
            } finally {
                images.remove(saved.id());
            }
        } else if (kind.equals("video")) {
            Path input = Files.createTempFile("club-video-", ".mp4");
            try {
                try (var stream = file.getInputStream()) {
                    Files.copy(stream, input, StandardCopyOption.REPLACE_EXISTING);
                }
                byte[] header;
                try (var stream = Files.newInputStream(input)) {
                    header = stream.readNBytes(12);
                }
                if (
                    header.length < 12 ||
                    !new String(header, 4, 4, java.nio.charset.StandardCharsets.US_ASCII).equals(
                        "ftyp"
                    )
                ) throw SchoolAccounts.error(
                    400,
                    "请选择 MP4 或 MOV 视频 / Select an MP4 or MOV video"
                );
                MediaCompression.video(input, target);
            } finally {
                Files.deleteIfExists(input);
            }
        } else throw SchoolAccounts.error(400, "Unsupported media");
        String url = "/club-media/" + name;
        try {
            if (kind.equals("logo")) c.setClubItem(url);
            else c.setVideo(url);
            clubs.save(c);
        } catch (RuntimeException e) {
            Files.deleteIfExists(target);
            throw e;
        }
        return Map.of("url", url);
    }

    @GetMapping("/club-media/{name}")
    public ResponseEntity<Resource> read(@PathVariable String name) {
        if (!name.matches("[a-f0-9-]{36}\\.(png|jpg|mp4)")) throw SchoolAccounts.error(
            404,
            "Not found"
        );
        Path p = root.resolve(name);
        if (!Files.isRegularFile(p)) throw SchoolAccounts.error(404, "Not found");
        return ResponseEntity.ok()
            .contentType(
                MediaType.parseMediaType(
                    name.endsWith(".png")
                        ? "image/png"
                        : name.endsWith(".jpg")
                          ? "image/jpeg"
                          : "video/mp4"
                )
            )
            .cacheControl(CacheControl.maxAge(30, java.util.concurrent.TimeUnit.DAYS).cachePublic())
            .header("X-Content-Type-Options", "nosniff")
            .body(new FileSystemResource(p));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<?> error(org.springframework.web.server.ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(
            Map.of("message", Objects.toString(e.getReason(), "请求未成功"))
        );
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<?> io(IOException e) {
        return ResponseEntity.internalServerError().body(
            Map.of(
                "message",
                "视频暂时无法保存，请稍后重试 / Unable to save the video, try again shortly"
            )
        );
    }
}
