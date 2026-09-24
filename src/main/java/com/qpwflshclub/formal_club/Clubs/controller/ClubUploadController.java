package com.qpwflshclub.formal_club.Clubs.controller;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.service.IClubService;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/club")
public class ClubUploadController {

    @Autowired
    private IClubService clubService;

    private static final Logger logger = LoggerFactory.getLogger(ClubUploadController.class);

    /** 未配置 club.media-directory 时的默认目录，与 WebConfig 的 /media/** 静态映射保持一致。 */
    private static final String DEFAULT_UPLOAD_DIR = "/opt/club-app/media/logo/";

    @Value("${club.media-directory:}")
    private String mediaDirectory;

    /** 图片保存目录跟随 club.media-directory，保证写盘路径和 /media/** 读取路径一致。 */
    private String uploadDir() {
        return mediaDirectory == null || mediaDirectory.isBlank()
            ? DEFAULT_UPLOAD_DIR
            : mediaDirectory + "/logo/";
    }

    @PostMapping("/upload/logo/{clubId}")
    public ResponseMessage<String> uploadLogo(
        @PathVariable Integer clubId,
        @RequestParam("file") MultipartFile file,
        HttpServletRequest request
    ) {
        if (file.isEmpty()) {
            return ResponseMessage.error("文件为空");
        }

        Club club = clubService.find(clubId);
        if (club == null) {
            return ResponseMessage.error("社团不存在");
        }
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (!canManageClub(currentUser, club)) {
            return ResponseMessage.error("无权限：不能修改该社团");
        }

        String ext = fileExtension(file.getOriginalFilename());
        if (ext == null) {
            return ResponseMessage.error("文件名格式不正确");
        }
        if (!ext.matches("\\.(jpg|jpeg|png|gif|webp)")) {
            return ResponseMessage.error("只支持 jpg, jpeg, png, gif, webp 格式的图片");
        }

        try {
            com.qpwflshclub.formal_club.config.MediaUploadPolicy.validate(file, ext, false);
            // 1. 确保目录存在
            String uploadDir = uploadDir();
            File dir = new File(uploadDir);
            if (!dir.exists() && !dir.mkdirs()) {
                return ResponseMessage.error("上传暂时不可用，请稍后重试");
            }

            // 2. 构建唯一文件名，保留原文件扩展名
            String newFilename = UUID.randomUUID() + ext;

            // 3. 保存文件到Linux服务器
            File dest = new File(dir, newFilename);
            file.transferTo(dest);

            // 4. 构建前端访问 URL（假设你 nginx 或 Spring Boot 静态映射 /media/**）
            String fileUrl = "/media/logo/" + newFilename;

            // 5. 更新数据库 Club_item 字段（或其他字段存放 logo URL）
            club.setClubItem(fileUrl); // 这里更新 logo URL
            clubService.update(club.toDTO());

            return ResponseMessage.success(fileUrl);
        } catch (IllegalArgumentException e) {
            return ResponseMessage.error(e.getMessage());
        } catch (Exception e) {
            logger.error("社团图标上传失败：{}", file.getOriginalFilename(), e);
            return ResponseMessage.error("上传失败，请稍后重试");
        }
    }

    private boolean canManageClub(UserBase user, Club club) {
        if (user == null || club == null) {
            return false;
        }
        if (user instanceof Admin || user.getUserRight() >= 3) {
            return true;
        }
        if (user instanceof Teacher teacher) {
            List<Club> clubs = teacher.getClubs();
            if (clubs != null) {
                for (Club c : clubs) {
                    if (sameClub(c, club)) {
                        return true;
                    }
                }
            }
        }
        if (user instanceof ClubPresident president) {
            return sameClub(president.getMainClub(), club);
        }
        return false;
    }

    private boolean sameClub(Club a, Club b) {
        return a != null && b != null && a.getId() != null && a.getId().equals(b.getId());
    }

    private String fileExtension(String originalFilename) {
        if (originalFilename == null) {
            return null;
        }
        int extensionStart = originalFilename.lastIndexOf(".");
        if (extensionStart <= 0 || extensionStart == originalFilename.length() - 1) {
            return null;
        }
        return originalFilename.substring(extensionStart).toLowerCase();
    }
}
