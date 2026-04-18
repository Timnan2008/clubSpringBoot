package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.ClubPresident;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.service.User.ClubPresidentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/president")
public class ClubPresidentController {

    @Autowired
    ClubPresidentService clubPresidentService;

    /**
     * 修改社长邮箱和密码
     * 权限校验：需要社长身份，通过 usernameEn 验证本人操作
     */
    @PutMapping("/update-info")
    public ResponseMessage<ClubPresident> updateInfo(@RequestParam Long presidentId,
                                                     @RequestParam String usernameEn,
                                                     @RequestParam String newEmail,
                                                     @RequestParam String newPassword) {
        return clubPresidentService.updateEmailAndPassword(presidentId, usernameEn, newEmail, newPassword);
    }

    /**
     * 修改社团信息
     * 权限校验：需要社长身份，且只能修改自己管理的社团
     */
    @PutMapping("/club/{clubId}/update")
    public ResponseMessage<Club> updateClubInfo(@PathVariable Integer clubId,
                                                @RequestParam Long presidentId,
                                                @RequestBody ClubDTO clubDTO) {
        return clubPresidentService.updateClubInfo(presidentId, clubId, clubDTO);
    }

    /**
     * 添加社团成员
     * 权限校验：需要社长身份，且只能操作自己管理的社团
     */
    @PostMapping("/club/{clubId}/add-member")
    public ResponseMessage<User> addMember(@PathVariable Integer clubId,
                                           @RequestParam Long presidentId,
                                           @RequestParam Long userId) {
        return clubPresidentService.addMemberToClub(presidentId, clubId, userId);
    }

    /**
     * 移除社团成员
     * 权限校验：需要社长身份，且只能操作自己管理的社团
     */
    @DeleteMapping("/club/{clubId}/remove-member")
    public ResponseMessage<User> removeMember(@PathVariable Integer clubId,
                                              @RequestParam Long presidentId,
                                              @RequestParam Long userId) {
        return clubPresidentService.removeMemberFromClub(presidentId, clubId, userId);
    }
}