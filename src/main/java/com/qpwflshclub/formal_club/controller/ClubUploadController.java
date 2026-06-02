package com.qpwflshclub.formal_club.controller;


import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.UUID;

@RestController
@RequestMapping("/api/club")
public class ClubUploadController {

    @Autowired
    private IClubService clubService;

    // Linux服务器上的图片保存根目录（可在application.properties里配置）
    private static final String UPLOAD_DIR = "/opt/club-app/media/logo/";

    @PostMapping("/upload/logo/{clubId}")
    public ResponseMessage<String> uploadLogo(
            @PathVariable Integer clubId,
            @RequestParam("file") MultipartFile file){

        if (file.isEmpty()) {
            return ResponseMessage.error("文件为空");
        }

        try {
            // 1. 确保目录存在
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists() && !dir.mkdirs()) {
                return ResponseMessage.error("目录创建失败: " + UPLOAD_DIR);
            }

            // 2. 构建唯一文件名，保留原文件扩展名
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = UUID.randomUUID() + ext;

            // 3. 保存文件到Linux服务器
            File dest = new File(dir, newFilename);
            file.transferTo(dest);

            // 4. 构建前端访问 URL（假设你 nginx 或 Spring Boot 静态映射 /media/**）
            String fileUrl = "/media/logo/" + newFilename;

            // 5. 更新数据库 Club_item 字段（或其他字段存放 logo URL）
            Club club = clubService.find(clubId);
            if (club == null) {
                return ResponseMessage.error("社团不存在");
            }
            club.setClubItem(fileUrl); // 这里更新 logo URL
            clubService.update(club.toDTO());

            return ResponseMessage.success(fileUrl);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseMessage.error("上传失败: " + e.getMessage());
        }
    }
}


