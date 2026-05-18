package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.Club.ClubInfoVO;
import com.qpwflshclub.formal_club.pojo.Club.ClubVO;
import com.qpwflshclub.formal_club.pojo.Club.SearchResultVO;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.service.Club.ClubLikeService;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import com.qpwflshclub.formal_club.pojo.User.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/club")
public class ClubController {



    @Autowired
    IClubService clubService;

    //增加
    @PostMapping
    public ResponseMessage<Club> add(@Validated @RequestBody ClubDTO clubDTO){
        Club club = clubService.add(clubDTO);
        return ResponseMessage.success(club);
    }

    //修改
    @PutMapping("/{clubId}")
    public ResponseMessage<Club> update(@PathVariable Integer clubId,@Validated @RequestBody ClubDTO clubDTO){
        clubDTO.setClubId(clubId);
        Club club = clubService.update(clubDTO);
        return ResponseMessage.success(club);
    }

    @PutMapping("/name-en/{clubName}")
    public ResponseMessage<Club> updateNameEn(@PathVariable String clubName,@Validated @RequestBody ClubDTO clubDTO){
        ClubDTO clubDTONameEn = clubService.findByName(clubName).toDTO();
        Club club = clubService.update(clubDTO);
        return ResponseMessage.success(club);
    }

    @PutMapping("/initialize-url/{clubName}")
    public ResponseMessage<Club> initializeUrl(@PathVariable String clubName){
        Club club = clubService.findByName(clubName);
        club.setClubURL("page/club-watch/" + clubName);
        clubService.update(club.toDTO());
        return ResponseMessage.success(club);
    }

    @PutMapping("/video-all")
    public ResponseMessage<List<Club>> updateAll(){
        List<Club> clubs = clubService.findAll();

        for(Club club : clubs){
            ClubDTO clubDto = club.toDTO();
            clubDto.setVideo("http://123.57.189.22/media/video/" + club.getClubClass() + "/" + club.getClubNameEn() + ".mp4");
            update(clubDto.getClubId(), clubDto);
        }

        return ResponseMessage.success();
    }

    @Autowired
    private ClubLikeService clubLikeService;

    @PutMapping("/reverse")
    public ResponseMessage<List<Club>> reverse(){
        List<Club> clubs = clubService.findAll();
        clubs.forEach(n -> {
            String ClubPresident = n.getVicePresident();
            String ClubPresidentEn = n.getVicePresidentEn();
            String ClubVicePresident = n.getPresident();
            String ClubVicePresidentEn = n.getPresidentEn();
            n.setPresident(ClubPresident);
            n.setPresidentEn(ClubPresidentEn);
            n.setVicePresident(ClubVicePresident);
            n.setVicePresidentEn(ClubVicePresidentEn);
        });
        return ResponseMessage.success(clubs);
    }


    @PutMapping("/like/{clubName}")
    public ResponseMessage<Club> like(
            @PathVariable String clubName,
            @RequestHeader("Device-Id") String deviceId) {

        System.out.println("clubName: " + clubName);
        System.out.println("deviceId: " + deviceId);
        boolean ok = clubLikeService.like(clubName, deviceId);
        System.out.println("ok: " + ok);
        if (!ok) {
            return ResponseMessage.error("不能刷赞");
        }

        // 返回最新 club 信息
        Club club = clubService.findByName(clubName);
        return ResponseMessage.success(club);
    }


    @PutMapping("/dislike/{clubName}")
    public ResponseMessage<Club> dislike(
            @PathVariable String clubName,
            @RequestHeader("X-Device-Id") String deviceId) {

        boolean ok = clubLikeService.dislike(clubName, deviceId);
        if (!ok) {
            return ResponseMessage.error("不能刷取消");
        }

        Club club = clubService.findByName(clubName);
        return ResponseMessage.success(club);
    }



    //删除
    @DeleteMapping("/{clubId}")
    public ResponseMessage<Club> delete(@PathVariable Integer clubId){
        clubService.delate(clubId);
        return ResponseMessage.success();
    }

    //查询
    @GetMapping("/id/{clubId}")
    public ResponseMessage<Club> find(@PathVariable Integer clubId){
        Club club = clubService.find(clubId);
        return ResponseMessage.success(club);
    }

    @GetMapping("/name-en/{clubName}")
    public ResponseMessage<ClubInfoVO> findByName(@PathVariable String clubName){
        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = locale.getLanguage().equals("en");
        System.out.println("clubName: " + clubName);
        Club club = clubService.findByName(clubName);
        ClubInfoVO clubInfoVO = new ClubInfoVO();
        clubInfoVO.setClubDescription(isEn? club.getClubDescriptionEn() : club.getClubDescription());
        clubInfoVO.setClubName(isEn? club.getClubNameEn() : club.getClubName());
        clubInfoVO.setClubItem(club.getClubItem());
        clubInfoVO.setVideo(club.getVideo());
        clubInfoVO.setVideoLike(club.getVideoLike());
        clubInfoVO.setPresident(isEn? club.getPresidentEn() : club.getPresident());
        clubInfoVO.setVicePresident(isEn? club.getVicePresidentEn() : club.getVicePresident());
        clubInfoVO.setTeacher(isEn? club.getTeacherEn() : club.getTeacher());

        return ResponseMessage.success(clubInfoVO);
    }

    @GetMapping("/all")
    public ResponseMessage<List<ClubVO>> findAll(){
        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = locale.getLanguage().equals("en");
        System.out.println("isEn: " + isEn);

        List<Club> clubs = clubService.findAll();

        List<ClubVO> list = clubs.stream().map(c -> {
            ClubVO vo = new ClubVO();

            vo.setClubName(isEn ? c.getClubNameEn() : c.getClubName());
            vo.setClubItem(c.getClubNameEn());
            vo.setSortDescription(isEn ? c.getSortDescriptionEn() : c.getSortDescription());
            vo.setClubItem(c.getClubItem());
            vo.setGreatClub(c.isGreatClub());
            vo.setClubURL(isEn
                    ? "page/club-watch/" + c.getClubNameEn() + "?lang=en"
                    : "page/club-watch/" + c.getClubNameEn() + "?lang=zh");
            vo.setClubClass(c.getClubClass());

            return vo;
        }).toList();

        System.out.println(list);

        return ResponseMessage.success(list);
    }

    @GetMapping("/search")
    public ResponseMessage<List<SearchResultVO>> search(@RequestParam String keyword) {
        List<Club> clubs = clubService.search(keyword);
        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = locale.getLanguage().equals("en");
        List<SearchResultVO> results = clubs.stream().map(c -> {
            SearchResultVO vo = new SearchResultVO();
            vo.setId(c.getId());
            vo.setName(isEn? c.getClubNameEn() : c.getClubName());
            vo.setDescription(isEn ? c.getClubDescriptionEn() : c.getClubDescription());
            vo.setBrief(isEn ? c.getSortDescriptionEn() : c.getClubDescription());
            vo.setLogo(c.getClubItem());
            vo.setClubURL(c.getClubURL());
            String slug = c.getClubNameEn() != null && !c.getClubNameEn().isBlank() ? c.getClubNameEn() : c.getClubName();
            slug = URLEncoder.encode(slug, StandardCharsets.UTF_8);
            vo.setDetailPath("page/club-watch/" + slug);
            return vo;
        }).toList();
        return ResponseMessage.success(results);
    }


    /* ========================================================================= */
    /* 以下为新添加的“我的社团”全交互 API                    */
    /* ========================================================================= */

    @Autowired
    private com.qpwflshclub.formal_club.service.User.IUserService userService;

    /**
     * 1. 获取当前用户的所有社团列表及对应在各个社团的实时身份
     * 对应前端请求: GET /api/club/my-list
     */
    @GetMapping("/my-list")
    public ResponseMessage<List<Map<String, Object>>> getMyClubs(
            @CookieValue(value = "user_session", required = false) String email) {
        if (email == null || email.isBlank()) {
            return ResponseMessage.error("未登录或会话已过期");
        }
        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return ResponseMessage.error("当前登录用户不存在");
        }

        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = "en".equals(locale.getLanguage());

        // 查出系统里所有的社团
        List<Club> allClubs = clubService.findAll(); // 确保你的 clubService 实现了基本查询全量的方法

        List<Map<String, Object>> resultList = allClubs.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("clubName", c.getClubName());
            map.put("clubNameEn", c.getClubNameEn());
            map.put("clubItem", c.getClubItem());

            // 🌟 权限交叉核心计算
            String role = "none"; // 默认为未加入

            if (loginUser instanceof Teacher) {
                // 老师账号：检查该社团是不是属于该老师的 clubs 列表
                Teacher t = (Teacher) loginUser;
                boolean isManager = t.getClubs() != null && t.getClubs().stream().anyMatch(tc -> tc.getId() == c.getId());
                if (isManager) {
                    role = "teacher";
                }
            } else if (loginUser instanceof ClubPresident) {
                ClubPresident cp = (ClubPresident) loginUser;
                // 社长团账号：可能是正社长或副社长
                if (cp.getMainClub() != null && cp.getMainClub().getId() == c.getId()) {
                    role = cp.isVicePresident() ? "vice_president" : "president";
                } else {
                    // 如果在此社团不是正副社长，检查他是否通过普通 M2M 关系加入了这个社团
                    boolean isMember = cp.getClubs() != null && cp.getClubs().stream().anyMatch(cc -> cc.getId() == c.getId());
                    if (isMember) {
                        role = "member";
                    }
                }
            } else if (loginUser instanceof User) {
                // 普通学生账号：检查是否在 clubs 列表中
                User u = (User) loginUser;
                boolean isMember = u.getClubs() != null && u.getClubs().stream().anyMatch(uc -> uc.getId() == c.getId());
                if (isMember) {
                    role = "member";
                }
            }
            map.put("currentUserRole", role);
            return map;
        }).toList();

        return ResponseMessage.success(resultList);
    }

    /**
     * 2. 【老师/社长管理面板】获取当前社团的所有成员（包含身份标签）
     * 对应前端请求: GET /api/club/{clubId}/members
     */
    @GetMapping("/{clubId}/members")
    public ResponseMessage<List<Map<String, Object>>> getClubMembers(@PathVariable Integer clubId) {
        // 利用下面我们在 UserService 中新扩展的业务能力，抓取该社团混合池中的所有人
        List<Map<String, Object>> members = userService.getClubMembersWithRoles(clubId);
        return ResponseMessage.success(members);
    }

    /**
     * 3. 【交互修改】更改社团内人员的职位 (老师对社长、副社长任免)
     * 对应前端请求: PUT /api/club/member/update
     */
    @PutMapping("/member/update")
    public ResponseMessage<String> updateMemberRole(@RequestBody Map<String, Object> payload) {
        try {
            Integer clubId = (Integer) payload.get("clubId");
            Long targetUserId = Long.valueOf(payload.get("userId").toString());
            String newRole = (String) payload.get("roleInClub"); // 'president', 'vice_president', 'member'

            userService.updateClubStaffRole(clubId, targetUserId, newRole);
            return ResponseMessage.success("职位更新成功");
        } catch (Exception e) {
            return ResponseMessage.error("更新失败: " + e.getMessage());
        }
    }

    /**
     * 4. 【交互修改】老师或社长将某位普通社员踢出社团
     * 对应前端请求: DELETE /api/club/member/kick
     */
    @DeleteMapping("/member/kick")
    public ResponseMessage<String> kickMember(@RequestBody Map<String, Object> payload) {
        try {
            Integer clubId = (Integer) payload.get("clubId");
            Long targetUserId = Long.valueOf(payload.get("userId").toString());

            userService.removeStudentFromClubRelationship(targetUserId, clubId);
            return ResponseMessage.success("成功移出该社员");
        } catch (Exception e) {
            return ResponseMessage.error("移出失败: " + e.getMessage());
        }
    }

    /**
     * 5. 【学生交互】自助退出已加入社团，或申请加入未加入社团
     * 对应前端请求: POST /api/club/{clubId}/action?type=join|leave
     */
    @PostMapping("/{clubId}/action")
    public ResponseMessage<String> handleClubAction(
            @PathVariable Integer clubId,
            @RequestParam("type") String actionType,
            @CookieValue(value = "user_session", required = false) String email) {
        if (email == null) return ResponseMessage.error("未登录或登录失效");
        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) return ResponseMessage.error("未找到当前账号信息");

        try {
            if ("join".equals(actionType)) {
                userService.addStudentToClubRelationship(loginUser.getId(), clubId);
                return ResponseMessage.success("成功加入社团");
            } else if ("leave".equals(actionType)) {
                userService.removeStudentFromClubRelationship(loginUser.getId(), clubId);
                return ResponseMessage.success("已成功退出该社团");
            }
            return ResponseMessage.error("未知的操作类型");
        } catch (Exception e) {
            return ResponseMessage.error("交互失败: " + e.getMessage());
        }
    }

}
