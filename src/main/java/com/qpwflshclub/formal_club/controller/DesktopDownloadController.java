package com.qpwflshclub.formal_club.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 下载 Windows 桌面客户端安装包。
 *
 * <p>安装包体积较大，不打进 JAR；默认读取项目内的打包产物，部署时可通过
 * {@code CLUB_DESKTOP_INSTALLER} 环境变量指定服务器上的实际路径。
 */
@RestController
public class DesktopDownloadController {

    private final Path installer;

    public DesktopDownloadController(
        @Value(
            "${club.desktop-installer:desktop/release/QingpuWFL-Club-Setup-1.1.5.exe}"
        ) String installer
    ) {
        this.installer = Path.of(installer).toAbsolutePath().normalize();
    }

    @GetMapping("/download/desktop")
    public ResponseEntity<Resource> download() throws IOException {
        if (!Files.isRegularFile(installer)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity
            .ok()
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition
                    .attachment()
                    .filename(installer.getFileName().toString(), StandardCharsets.UTF_8)
                    .build()
                    .toString()
            )
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .contentLength(Files.size(installer))
            .body(new FileSystemResource(installer));
    }
}
