package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/upload")
public class FileUploadController {

    private static final Logger logger = LoggerFactory.getLogger(FileUploadController.class);

    @Autowired
    private IUserService userService;

    @Value("${file.upload-dir:}")
    private String configuredUploadDir;

    private String getUploadDir() {
        if (configuredUploadDir != null && !configuredUploadDir.isEmpty()) {
            return configuredUploadDir;
        }
        // 服务器配置路径
        return "/opt/club-app/media";
    }

    private String getAccessPathPrefix() {
        // 对应Nginx配置的URL路径
        return "/media";
    }

    /**
     * 上传社团图标（图片）
     */
    @PostMapping("/club-logo")
    public ResponseMessage<String> uploadClubLogo(
            @RequestParam("file") MultipartFile file,
            @CookieValue(value = "user_session", required = false) String email) {

        if (email == null || email.isBlank()) {
            return ResponseMessage.error("未登录，无权上传");
        }

        UserBase user = userService.findByEmail(email);
        if (user == null || user.getUserRight() < 1) {
            return ResponseMessage.error("无权限：只有社长、老师或管理员可以上传");
        }

        return uploadFile(file, "logo");
    }

    /**
     * 上传社团宣传视频
     */
    @PostMapping("/club-video")
    public ResponseMessage<String> uploadClubVideo(
            @RequestParam("file") MultipartFile file,
            @CookieValue(value = "user_session", required = false) String email) {

        if (email == null || email.isBlank()) {
            return ResponseMessage.error("未登录，无权上传");
        }

        UserBase user = userService.findByEmail(email);
        if (user == null || user.getUserRight() < 1) {
            return ResponseMessage.error("无权限：只有社长、老师或管理员可以上传");
        }

        return uploadFile(file, "video");
    }

    private ResponseMessage<String> uploadFile(MultipartFile file, String type) {
        logger.info("开始上传文件，类型：{}，原始文件名：{}，大小：{} bytes", 
                   type, file.getOriginalFilename(), file.getSize());
        
        if (file.isEmpty()) {
            logger.warn("上传失败：文件为空");
            return ResponseMessage.error("请选择要上传的文件");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            logger.warn("上传失败：文件名为空");
            return ResponseMessage.error("文件名不能为空");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        logger.info("文件扩展名：{}", extension);

        if ("logo".equals(type)) {
            if (!extension.matches("\\.(jpg|jpeg|png|gif|webp)")) {
                logger.warn("上传失败：不支持的图片格式 {}", extension);
                return ResponseMessage.error("只支持 jpg, jpeg, png, gif, webp 格式的图片");
            }
        } else if ("video".equals(type)) {
            if (!extension.matches("\\.(mp4|webm|ogg)")) {
                logger.warn("上传失败：不支持的视频格式 {}", extension);
                return ResponseMessage.error("只支持 mp4, webm, ogg 格式的视频");
            }
        }

        try {
            String uploadDir = getUploadDir();
            String accessPathPrefix = getAccessPathPrefix();
            logger.info("上传目录：{}，访问路径前缀：{}", uploadDir, accessPathPrefix);

            Path targetDir = Paths.get(uploadDir, type).toAbsolutePath().normalize();
            logger.info("目标目录：{}", targetDir);
            
            if (!Files.exists(targetDir)) {
                logger.info("目标目录不存在，创建目录：{}", targetDir);
                Files.createDirectories(targetDir);
            }

            String newFilename = UUID.randomUUID().toString() + extension;
            Path filePath = targetDir.resolve(newFilename);
            logger.info("目标文件路径：{}", filePath);

            try (InputStream inputStream = file.getInputStream()) {
                logger.info("开始复制文件...");
                Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
            }
            
            if (Files.exists(filePath)) {
                logger.info("文件上传成功！文件大小：{} bytes", Files.size(filePath));
            } else {
                logger.error("文件上传失败：文件不存在于目标路径");
                return ResponseMessage.error("文件上传失败：文件未保存");
            }

            String accessPath = accessPathPrefix + "/" + type + "/" + newFilename;
            logger.info("返回访问路径：{}", accessPath);
            return ResponseMessage.success(accessPath);

        } catch (IOException e) {
            logger.error("文件上传失败：{}", e.getMessage(), e);
            return ResponseMessage.error("文件上传失败：" + e.getMessage());
        }
    }
}