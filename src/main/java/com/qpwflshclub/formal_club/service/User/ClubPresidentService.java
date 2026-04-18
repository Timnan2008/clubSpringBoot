package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.ClubPresident;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

/**
 * 社长服务类，处理社长相关的业务逻辑。
 */
@Service
@RequiredArgsConstructor
public class ClubPresidentService {

    private final ClubPresidentRepository clubPresidentRepository;
    private final ClubRepository clubRepository;
    private final UserRepository userRepository;

    /**
     * 修改社长自己的邮箱和密码，需要校验用户身份。
     *
     * @param presidentId 社长ID
     * @param usernameEn  英文用户名
     * @param newEmail    新邮箱
     * @param newPassword 新密码
     * @return 操作结果
     */
    public ResponseMessage<ClubPresident> updateEmailAndPassword(Long presidentId, String usernameEn, String newEmail, String newPassword) {
        ClubPresident cp = clubPresidentRepository.findById(presidentId).orElse(null);
        if (cp == null || !cp.getUsernameEn().equals(usernameEn)) {
            return ResponseMessage.error("身份校验失败");
        }
        cp.setEmail(newEmail);
        cp.setPassword(newPassword);
        clubPresidentRepository.save(cp);
        return ResponseMessage.success(cp);
    }

    /**
     * 修改自己管理的社团的基础信息（只能修改自己关联的社团）。
     *
     * @param presidentId 社长ID
     * @param clubId      社团ID
     * @param clubDTO     社团DTO
     * @return 操作结果
     */
    public ResponseMessage<Club> updateClubInfo(Long presidentId, Integer clubId, ClubDTO clubDTO) {
        ClubPresident cp = clubPresidentRepository.findById(presidentId).orElse(null);
        if (cp == null) {
            return ResponseMessage.error("社长不存在");
        }
        boolean manages = cp.getClubs().stream().anyMatch(c -> c.getId().equals(clubId));
        if (!manages) {
            return ResponseMessage.error("无权限修改该社团");
        }
        Club club = clubRepository.findById(clubId).orElse(null);
        if (club == null) {
            return ResponseMessage.error("社团不存在");
        }
        // 更新字段，排除 id
        BeanUtils.copyProperties(clubDTO, club, "clubId");
        clubRepository.save(club);
        return ResponseMessage.success(club);
    }

    /**
     * 添加成员到社团（只能操作自己管理的社团）。
     *
     * @param presidentId 社长ID
     * @param clubId      社团ID
     * @param userId      用户ID
     * @return 操作结果
     */
    public ResponseMessage<User> addMemberToClub(Long presidentId, Integer clubId, Long userId) {
        ClubPresident cp = clubPresidentRepository.findById(presidentId).orElse(null);
        if (cp == null) {
            return ResponseMessage.error("社长不存在");
        }
        boolean manages = cp.getClubs().stream().anyMatch(c -> c.getId().equals(clubId));
        if (!manages) {
            return ResponseMessage.error("无权限操作该社团");
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseMessage.error("用户不存在");
        }
        Club club = clubRepository.findById(clubId).orElse(null);
        if (club == null) {
            return ResponseMessage.error("社团不存在");
        }
        if (!user.getClubs().contains(club)) {
            user.getClubs().add(club);
            userRepository.save(user);
        }
        return ResponseMessage.success(user);
    }

    /**
     * 移除成员从社团（只能操作自己管理的社团）。
     *
     * @param presidentId 社长ID
     * @param clubId      社团ID
     * @param userId      用户ID
     * @return 操作结果
     */
    public ResponseMessage<User> removeMemberFromClub(Long presidentId, Integer clubId, Long userId) {
        ClubPresident cp = clubPresidentRepository.findById(presidentId).orElse(null);
        if (cp == null) {
            return ResponseMessage.error("社长不存在");
        }
        boolean manages = cp.getClubs().stream().anyMatch(c -> c.getId().equals(clubId));
        if (!manages) {
            return ResponseMessage.error("无权限操作该社团");
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseMessage.error("用户不存在");
        }
        Club club = clubRepository.findById(clubId).orElse(null);
        if (club == null) {
            return ResponseMessage.error("社团不存在");
        }
        user.getClubs().removeIf(c -> c.getId().equals(clubId));
        userRepository.save(user);
        return ResponseMessage.success(user);
    }
}