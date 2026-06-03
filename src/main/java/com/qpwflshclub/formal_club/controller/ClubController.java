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
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
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

    private UserBase getCurrentUser(HttpServletRequest request) {
        return (UserBase) request.getAttribute("currentUser");
    }

    private UserBase getManagedCurrentUser(HttpServletRequest request) {
        UserBase user = getCurrentUser(request);
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return user;
        }
        UserBase managedUser = userService.findByEmail(user.getEmail());
        return managedUser != null ? managedUser : user;
    }

    private boolean isAdmin(UserBase user) {
        return user instanceof Admin || (user != null && user.getUserRight() >= 3);
    }

    private boolean canManageClub(UserBase user, Club club) {
        if (user instanceof Admin || user.getUserRight() >= 3) {
            return true;
        }
        if (user instanceof Teacher teacher) {
            List<Club> clubs = teacher.getClubs();
            if (clubs != null) {
                for (Club c : clubs) {
                    if (c.getId().equals(club.getId())) return true;
                }
            }
        }
        if (user instanceof ClubPresident president) {
            Club mainClub = president.getMainClub();
            if (mainClub != null && mainClub.getId().equals(club.getId())) {
                return true;
            }
        }
        return false;
    }

    @PostMapping
    public ResponseMessage<Club> add(@Validated @RequestBody ClubDTO clubDTO, HttpServletRequest request){
        UserBase user = getCurrentUser(request);
        if (!isAdmin(user)) {
            return ResponseMessage.error("无权限：只有管理员可以创建社团");
        }
        Club club = clubService.add(clubDTO);
        return ResponseMessage.success(club);
    }

    @PutMapping("/{clubId}")
    public ResponseMessage<Club> update(@PathVariable Integer clubId, @Validated @RequestBody ClubDTO clubDTO, HttpServletRequest request){
        UserBase user = getCurrentUser(request);
        Club club = clubService.find(clubId);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权修改该社团");
        }
        clubDTO.setClubId(clubId);
        Club updated = clubService.update(clubDTO);
        return ResponseMessage.success(updated);
    }

    //严格修改
    @PutMapping("/name-en/{clubName}")
    public ResponseMessage<Club> updateNameEn(
            @PathVariable String clubName,
            @Validated @RequestBody ClubDTO clubDTO,
            @CookieValue(value = "user_session", required = false) String email) {

        // 1. 验证登录状态
        if (email == null || email.isBlank()) {
            return ResponseMessage.error("未登录，无权修改");
        }
        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return ResponseMessage.error("用户不存在");
        }

        // 2. 获取要修改的社团实体
        Club currentClub = clubService.findByName(clubName);
        if (currentClub == null) {
            return ResponseMessage.error("目标社团不存在");
        }

        // 3. 核心鉴权：验证该用户是否为该社团的负责人
        boolean hasPermission = isHasPermission(loginUser, currentClub);

        if (!hasPermission) {
            return ResponseMessage.error("越权操作！您不是该社团的负责人，无法修改。");
        }

        // 4. 鉴权通过，执行修改逻辑
        // (注意：你原有的业务代码里把 findByName 赋给了 clubDTONameEn 但没使用，请确保使用 clubService.update 更新正确的对象)
        clubDTO.setClubId(currentClub.getId()); // 确保 ID 对应
        Club updatedClub = clubService.update(clubDTO);
        return ResponseMessage.success(updatedClub);
    }

    private static boolean isHasPermission(UserBase loginUser, Club currentClub) {
        boolean hasPermission = false;

        if(loginUser instanceof ClubPresident president){
            Club club = president.getMainClub();
            if(club.equals(currentClub)){
                hasPermission = true;
            }
        }

        if(loginUser instanceof Teacher teacher){
            List<Club> list = teacher.getClubs();
            for (Club club : list) {
                if (club.equals(currentClub)) {
                    hasPermission = true;
                    break;
                }
            }
        }

        // 在 @PutMapping("/name-en/{clubName}") 接口内部校验时：
        if (loginUser.getUserRight() >= 3) {
            // 如果是 admin 或 userright >= 3，直接判定有权修改，跳过社长交叉比对
            hasPermission = true;
        }
        return hasPermission;
    }

    @PutMapping("/initialize-url/{clubName}")
    public ResponseMessage<Club> initializeUrl(@PathVariable String clubName, HttpServletRequest request){
        UserBase user = getCurrentUser(request);
        Club club = clubService.findByName(clubName);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权修改该社团");
        }
        club.setClubURL("page/club-watch/" + clubName);
        clubService.update(club.toDTO());
        return ResponseMessage.success(club);
    }

    @PutMapping("/video-all")
    public ResponseMessage<List<Club>> updateAll(HttpServletRequest request){
        UserBase user = getCurrentUser(request);
        if (!(user instanceof Admin) && user.getUserRight() < 3) {
            return ResponseMessage.error("无权限：只有管理员可以批量更新视频");
        }
        List<Club> clubs = clubService.findAll();

        for(Club club : clubs){
            ClubDTO clubDto = club.toDTO();
            clubDto.setVideo("http://123.57.189.22/media/video/" + club.getClubClass() + "/" + club.getClubNameEn() + ".mp4");
            clubService.update(clubDto);
        }

        return ResponseMessage.success();
    }

    @Autowired
    private ClubLikeService clubLikeService;

    @PutMapping("/reverse")
    public ResponseMessage<List<Club>> reverse(HttpServletRequest request){
        UserBase user = getCurrentUser(request);
        if (!(user instanceof Admin) && user.getUserRight() < 3) {
            return ResponseMessage.error("无权限：只有管理员可以交换社长/副社长");
        }
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
            clubService.update(n.toDTO());
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

    @GetMapping("/name-en/all-info/{clubNameEn}")
    public ResponseMessage<Club>findByname(@PathVariable String clubNameEn){
        Club club = clubService.findByName(clubNameEn);
        return ResponseMessage.success(club);
    }

    @GetMapping("/all")
    public ResponseMessage<List<ClubVO>> findAll(){
        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = locale.getLanguage().equals("en");
        System.out.println("isEn: " + isEn);

        List<Club> clubs = clubService.findAll();

        List<ClubVO> list = clubs.stream().map(c -> {
            ClubVO vo = new ClubVO();

            vo.setId(c.getId());
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

        // ClubController.java 里的 getMyClubs 方法内
        List<Map<String, Object>> resultList = allClubs.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("clubName", c.getClubName());
            map.put("clubNameEn", c.getClubNameEn());
            map.put("clubItem", c.getClubItem());

            // 1. 获取原有的社团内特定身份
            String roleStr = "none";
            if (loginUser instanceof Teacher) { /* ...原逻辑... */ roleStr = "teacher"; }
            else if (loginUser instanceof ClubPresident) { /* ...原逻辑... */ roleStr = "president"; }
            // ...保持你原有的交叉计算逻辑...
            map.put("currentUserRole", roleStr);

            // 2. 🌟 新增：直接把当前用户的全局 userright 等级塞进返回结果中
            // 假设你的 UserBase 实体类中有 getUserright() 方法，如果没有，请替换为你系统中实际的获取权限字段
            map.put("userright", loginUser.getUserRight());

            return map;
        }).toList();
        return ResponseMessage.success(resultList);
    }

    /**
     * 2. 【老师/社长管理面板】获取当前社团的所有成员（包含身份标签）
     * 对应前端请求: GET /api/club/{clubId}/members
     */
    @Transactional(readOnly = true)
    @GetMapping("/{clubId}/members")
    public ResponseMessage<List<Map<String, Object>>> getClubMembers(@PathVariable Integer clubId, HttpServletRequest request) {
        UserBase user = getManagedCurrentUser(request);
        Club club = clubService.find(clubId);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权查看该社团成员");
        }
        List<Map<String, Object>> members = userService.getClubMembersWithRoles(clubId);
        return ResponseMessage.success(members);
    }

    @Transactional(readOnly = true)
    @GetMapping("/{clubId}/students/search")
    public ResponseMessage<List<Map<String, Object>>> searchStudentsForClub(
            @PathVariable Integer clubId,
            @RequestParam(value = "keyword", required = false) String keyword,
            HttpServletRequest request) {
        UserBase user = getManagedCurrentUser(request);
        Club club = clubService.find(clubId);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权搜索该社团可添加学生");
        }
        return ResponseMessage.success(userService.searchStudentsForClub(clubId, keyword));
    }

    @Transactional
    @PostMapping("/member/add")
    public ResponseMessage<String> addMember(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        UserBase user = getManagedCurrentUser(request);
        Integer clubId = Integer.valueOf(payload.get("clubId").toString());
        Club club = clubService.find(clubId);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权添加该社团成员");
        }
        try {
            Long targetUserId = Long.valueOf(payload.get("userId").toString());
            userService.addStudentToClubRelationship(targetUserId, clubId);
            return ResponseMessage.success("已成功添加学生");
        } catch (Exception e) {
            return ResponseMessage.error("添加失败: " + e.getMessage());
        }
    }

    @Transactional
    @PutMapping("/member/update")
    public ResponseMessage<String> updateMemberRole(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        UserBase user = getManagedCurrentUser(request);
        Integer clubId = Integer.valueOf(payload.get("clubId").toString());
        Club club = clubService.find(clubId);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权修改该社团成员职位");
        }
        try {
            Long targetUserId = Long.valueOf(payload.get("userId").toString());
            String newRole = (String) payload.get("roleInClub");

            userService.updateClubStaffRole(clubId, targetUserId, newRole);
            return ResponseMessage.success("职位更新成功");
        } catch (Exception e) {
            return ResponseMessage.error("更新失败: " + e.getMessage());
        }
    }

    @Transactional
    @DeleteMapping("/member/kick")
    public ResponseMessage<String> kickMember(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        UserBase user = getManagedCurrentUser(request);
        Integer clubId = Integer.valueOf(payload.get("clubId").toString());
        Club club = clubService.find(clubId);
        if (!canManageClub(user, club)) {
            return ResponseMessage.error("无权限：您无权移出该社团成员");
        }
        try {
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

    /* =========================
   文件上传 API（新增）


    private static final String LOGO_DIR = "/opt/club-app/media/logo/";
    private static final String VIDEO_DIR = "/opt/club-app/media/video/";

    @PostMapping("/upload/logo")
    public ResponseMessage<String> uploadLogo(@RequestParam("file") MultipartFile file) {
        return saveFile(file, LOGO_DIR, "/media/logo/");
    }

    @PostMapping("/upload/video")
    public ResponseMessage<String> uploadVideo(@RequestParam("file") MultipartFile file) {
        return saveFile(file, VIDEO_DIR, "/media/video/");
    }

    private ResponseMessage<String> saveFile(MultipartFile file, String dir, String urlPrefix) {
        try {
            if (file.isEmpty()) {
                return ResponseMessage.error("文件不能为空");
            }

            File folder = new File(dir);
            if (!folder.exists()) {
                folder.mkdirs();
            }

            String original = file.getOriginalFilename();
            String suffix = original.substring(original.lastIndexOf("."));

            String fileName = java.util.UUID.randomUUID() + suffix;

            File target = new File(dir + fileName);
            file.transferTo(target);

            // 返回给前端的 URL（Nginx 暴露路径）
            String url = urlPrefix + fileName;

            return ResponseMessage.success(url);

        } catch (Exception e) {
            return ResponseMessage.error("上传失败: " + e.getMessage());
        }
    }
    ========================= */

}
