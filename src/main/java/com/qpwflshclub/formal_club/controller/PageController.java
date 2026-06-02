package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import com.qpwflshclub.formal_club.service.Club.ClubNotFoundException;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import com.qpwflshclub.formal_club.service.User.IUserService;
import com.qpwflshclub.formal_club.pojo.User.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.hibernate.Internal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Objects;

@Controller
@RequestMapping("/page")
public class PageController {

    @Autowired
    IClubService clubService;
    @Autowired
    IUserService userService;

    @GetMapping("/club-watch/{clubName}")
    public String clubPage(@PathVariable String clubName, Model model) {

        System.out.println("clubName: " + clubName);

        try{
            Club club = clubService.findByName(clubName);
            model.addAttribute("club", clubName);
            return "page/club-template"; // 👈 和上面的路径一致
        }catch (ClubNotFoundException e){
            return "page/fall_to_get_club";
        }

    }

    @GetMapping("/club-watch/En/{clubName}")
    public String clubPageEn(@PathVariable String clubName, Model model) {
        try{
            Club club = clubService.findByName(clubName);
            model.addAttribute("club", clubName);
            return "page/En/club-template-en"; // 👈 和上面的路径一致
        }catch (ClubNotFoundException e){
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/index")
    public String index(HttpServletRequest request, Model model) {
        model.addAttribute("currentUri", request.getRequestURI());
        return "page/index";
    }

    @GetMapping("/index-en")
    public String indexPageEn(Model model) {
        return "page/En/index-en";
    }

    @GetMapping("/club-type/{type}")
    public String clubTypePage(@PathVariable String type, Model model) {
        System.out.println("type: " + type);

        if(type.equals("activity") || type.equals("creativity") || type.equals("study") || type.equals("service")){
            model.addAttribute("type", type);
            return "page/club-type-template";
        }else{
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/club-type/En/{type}")
    public String clubTypePageEn(@PathVariable String type, Model model) {
        System.out.println("type: " + type);

        if(type.equals("activity") || type.equals("creativity") || type.equals("study") || type.equals("service")){
            model.addAttribute("type", type);
            return "page/En/club-type-template-en";
        }else{
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/user/login")
    public String loginPage(Model model) {
        return "page/login";
    }

    @GetMapping("/suggestion")
    public String suggestionPage(Model model) {
        return "page/advice";
    }

    @GetMapping("/suggestion/history")
    public String suggestionHistoryPage(Model model) {
        model.addAttribute("currentUri", "/page/suggestion/history");
        return "page/suggestion-history";
    }
    @GetMapping("/suggestion/manage")
    public String suggestionManagePage() {
        return "page/manager of advice";
    }

    @GetMapping("/search")
    public String searchPage(Model model) {
        return "page/search";
    }

    @GetMapping("/user/profile")
    public String profile(HttpServletRequest request, Model model) {
        // 1. 从刚才 navbar 里面提到的 Cookie 中获取登录用户的 session (这里通常是 email)
        Cookie[] cookies = request.getCookies();
        String email = null;
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("user_session".equals(cookie.getName())) {
                    email = cookie.getValue();
                    break;
                }
            }
        }

        // 2. 如果没登录，重定向到登录页
        if (email == null) {
            return "redirect:/page/user/login";
        }

        // 3. 根据 email 查出完整的用户信息

        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return "redirect:/page/user/login";
        }

        // 4. 【关键】将用户信息存入 model，这样前端的 ${loginUser.username} 等表达式才能拿到值！
        model.addAttribute("loginUser", loginUser);

        // 5. 返回模板路径：对应 templates/page/user/profile.html
        return "page/profile";
    }


    /* ========================================================================= */
    /* 以下为新添加的“我的社团”页面跳转渲染控制器                                  */
    /* ========================================================================= */


    @Autowired
    private com.qpwflshclub.formal_club.repository.Club.ClubRepository clubRepository;

    @GetMapping("/club/manage")
    public String clubManagePage(
            @CookieValue(value = "user_session", required = false) String email,
            Model model) {
        if (email == null || email.isBlank()) {
            return "redirect:/page/user/login";
        }

        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return "redirect:/page/user/login";
        }

        int userRightNum = loginUser.getUserRight();
        if (userRightNum < 1) {
            return "redirect:/page/my-clubs";
        }

        List<Map<String, Object>> managedClubs = buildManageableClubList(loginUser);
        model.addAttribute("loginUser", loginUser);
        model.addAttribute("clubList", managedClubs);
        model.addAttribute("clubCount", managedClubs.size());
        model.addAttribute("userRightValue", userRightNum);
        model.addAttribute("managerRoleText", managerRoleText(loginUser));

        return "page/teacher-club-manage";
    }

    /**
     * 导航进入“我的社团”多权限交互中心页面
     * 对应前端访问路径：GET /page/my-clubs
     */
    @GetMapping("/my-clubs")
    public String myClubsPage(
            @CookieValue(value = "user_session", required = false) String email,
            org.springframework.ui.Model model) {

        // 1. 安全校验：如果用户未登录（Cookie 为空），直接重定向引导至登录页面
        if (email == null || email.isBlank()) {
            return "redirect:/page/user/login";
        }

        // 2. 核心鉴权：根据 Session 里的 Email 查出当前登录的实体
        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return "redirect:/page/user/login";
        }
        if (loginUser.getUserRight() >= 1) {
            return "redirect:/page/club/manage";
        }

        // 🌟 核心改进：直接在后端用 instanceof 判定身份，算好布尔值传给前端
        boolean isTeacher = loginUser instanceof com.qpwflshclub.formal_club.pojo.User.Teacher;
        boolean isAdmin = loginUser instanceof com.qpwflshclub.formal_club.pojo.User.Admin;

        // 判定前端的大类级别（0:学生, 2:老师, 3:管理员）
        int userRightNum = loginUser.getUserRight();

        // 将这些绝对安全的计算结果灌入 Model
        model.addAttribute("loginUser", loginUser);
        model.addAttribute("isTeacherOrAdmin", isTeacher || isAdmin);
        model.addAttribute("isTeacher", isTeacher);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("userRightValue", userRightNum); // 传给前端全局 JS 变量

        // 3. 数据平铺与实时权限交叉计算 (兼容 CrudRepository 的 Iterable 返回)
        Iterable<Club> allClubsIterable = clubRepository.findAll();
        List<Map<String, Object>> clubList = java.util.stream.StreamSupport
                .stream(allClubsIterable.spliterator(), false)
                .map(c -> {
                    Map<String, Object> map = new java.util.HashMap<>();
                    map.put("id", c.getId());
                    map.put("clubName", c.getClubName());
                    map.put("clubNameEn", c.getClubNameEn());
                    map.put("clubItem", c.getClubItem());

                    String role = "none";

                    if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.Admin) {
                        role = "admin";
                    }
                    else if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.Teacher) {
                        com.qpwflshclub.formal_club.pojo.User.Teacher t = (com.qpwflshclub.formal_club.pojo.User.Teacher) loginUser;
                        boolean isManager = t.getClubs() != null && t.getClubs().stream().anyMatch(tc -> Objects.equals(tc.getId(), c.getId()));
                        if (isManager) role = "teacher";
                    }
                    else if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.ClubPresident) {
                        com.qpwflshclub.formal_club.pojo.User.ClubPresident cp = (com.qpwflshclub.formal_club.pojo.User.ClubPresident) loginUser;
                        if (cp.getMainClub() != null && Objects.equals(cp.getMainClub().getId(), c.getId())) {
                            role = cp.isVicePresident() ? "vice_president" : "president";
                        } else {
                            boolean isMember = cp.getClubs() != null && cp.getClubs().stream().anyMatch(cc -> Objects.equals(cc.getId(), c.getId()));
                            if (isMember) role = "member";
                        }
                    }
                    else if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.User) {
                        com.qpwflshclub.formal_club.pojo.User.User u = (com.qpwflshclub.formal_club.pojo.User.User) loginUser;
                        boolean isMember = u.getClubs() != null && u.getClubs().stream().anyMatch(uc -> Objects.equals(uc.getId(), c.getId()));
                        if (isMember) role = "member";
                    }

                    map.put("currentUserRole", role);
                    return map;
                }).toList();

        if (isTeacher) {
            clubList = clubList.stream()
                    .filter(club -> !"none".equals(club.get("currentUserRole")))
                    .toList();
        }

        model.addAttribute("clubList", clubList);
        return "page/my-clubs";
    }

    private List<Map<String, Object>> buildManageableClubList(UserBase loginUser) {
        Map<Integer, Club> clubs = new LinkedHashMap<>();

        if (loginUser instanceof Admin || loginUser.getUserRight() >= 3) {
            clubRepository.findAll().forEach(club -> putClub(clubs, club));
        } else if (loginUser instanceof Teacher teacher) {
            putClubs(clubs, teacher.getClubs());
        } else if (loginUser instanceof ClubPresident president) {
            putClub(clubs, president.getMainClub());
        }

        return clubs.values().stream()
                .map(this::toClubManageMap)
                .toList();
    }

    private void putClubs(Map<Integer, Club> target, List<Club> clubs) {
        if (clubs == null) {
            return;
        }
        clubs.forEach(club -> putClub(target, club));
    }

    private void putClub(Map<Integer, Club> target, Club club) {
        if (club != null && club.getId() != null) {
            target.put(club.getId(), club);
        }
    }

    private Map<String, Object> toClubManageMap(Club club) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", club.getId());
        map.put("clubName", club.getClubName());
        map.put("clubNameEn", club.getClubNameEn());
        map.put("clubItem", club.getClubItem());
        return map;
    }

    private String managerRoleText(UserBase loginUser) {
        if (loginUser instanceof Admin || loginUser.getUserRight() >= 3) {
            return "管理员账号";
        }
        if (loginUser instanceof Teacher) {
            return "老师账号";
        }
        if (loginUser instanceof ClubPresident) {
            return "社长账号";
        }
        return "管理账号";
    }


    /**
     * 🌟 新增：社团修改页面的跳转 API
     * 路由：GET /page/club-edit
     * 访问示例：/page/club-edit?clubName=WFL-CS-Club
     */
    @GetMapping("/club-edit")
    public String editClubPage(
            @RequestParam("clubName") String clubName,
            @CookieValue(value = "user_session", required = false) String email,
            Model model) {

        // 1. 如果没有登录，直接重定向到登录页面（或者你系统的首页）
        if (email == null || email.isBlank()) {
            return "redirect:/page/login"; // 请根据你实际登录页路径调整
        }

        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return "redirect:/page/login";
        }

        // 2. 获取当前的社团实体
        Club c;
        try {
            c = clubService.findByName(clubName);
        } catch (ClubNotFoundException e) {
            return "error/404"; // 找不到社团去404页面
        }

        // 3. 🌟 权限核心判定：依据全局 userright 或者是社团内职务
        boolean hasPermission = false;

        // 方案 A：通过实体类型（系统原有设计）与职务比对
        if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.Admin) {
            hasPermission = true; // Admin 直接放行
        }
        else if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.Teacher) {
            com.qpwflshclub.formal_club.pojo.User.Teacher t = (com.qpwflshclub.formal_club.pojo.User.Teacher) loginUser;
            // 指导老师必须负责这个社团
            hasPermission = t.getClubs() != null && t.getClubs().stream().anyMatch(tc -> tc.getId() == c.getId());
        }
        else if (loginUser instanceof com.qpwflshclub.formal_club.pojo.User.ClubPresident) {
            com.qpwflshclub.formal_club.pojo.User.ClubPresident cp = (com.qpwflshclub.formal_club.pojo.User.ClubPresident) loginUser;
            // 必须是该社团绑定的正/副社长
            hasPermission = cp.getMainClub() != null && cp.getMainClub().getId() == c.getId();
        }

        /* // 方案 B：如果系统各 User 里面有统一的 getUserRight() 方法，也可以简化写为：
        if (loginUser.getUserRight() >= 3) { // 假设 3 是 Admin
            hasPermission = true;
        } else if (...) { ... }
        */

        // 4. 如果没权限，无权访问修改页，拦截并重定向回详情页
        if (!hasPermission) {
            return "redirect:/page/club-watch/" + clubName;
        }

        // 5. 校验通过，往前端 Thymeleaf 注入变量
        model.addAttribute("clubName", clubName);

        // 6. 返回模板名称，Thymeleaf 会去找 templates/club-edit.html 页面
        return "page/club-edit";
    }

    @Autowired
    UserRepository userRepository;

    @GetMapping("/user-edit")
    public String managerPage(HttpServletRequest request, Model model) {
        // 1. 从 Cookie 中获取登录用户的 session
        Cookie[] cookies = request.getCookies();
        String email = null;
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("user_session".equals(cookie.getName())) {
                    email = cookie.getValue();
                    break;
                }
            }
        }

        // 2. 如果没登录，重定向到登录页
        if (email == null) {
            return "redirect:/page/user/login";
        }

        // 3. 根据 email 查出完整的用户信息
        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return "redirect:/page/user/login";
        }

        // 4. 权限检查：只有 UserRight >= 2 的用户（老师或管理员）才能访问
        if (loginUser.getUserRight() < 2) {
            return "redirect:/page/index";
        }

        // 5. 将登录用户信息存入 model
        model.addAttribute("loginUser", loginUser);

        // 6. 从 userService 中查出所有用户（包括学生、老师、社长、管理员）
        List<UserBase> userList = userService.findAllUsers();

        // 7. 将用户列表放进 model 里
        model.addAttribute("users", userList);

        return "page/manager of users"; // 返回你的 HTML 模板文件名
    }
}
