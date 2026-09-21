package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.Clubs.service.IClubService;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

/**
 * 页面总调度（gyhchang-cell 写的那部分）：把网址对到具体的页面模板。
 *
 * <p>所有地址都以 <code>/page</code> 开头，返回的字符串就是模板文件名，例如
 * <code>return "page/index"</code> → 渲染 <code>templates/page/index.html</code>。
 *
 * <p>本类负责的地址一览：
 * <ul>
 *   <li><code>/page/index</code>、<code>/page/index-en</code>：首页（中/英）</li>
 *   <li><code>/page/club-watch/{社团名}</code>、<code>/page/clubs/{id}</code>：社团详情</li>
 *   <li><code>/page/club-type/{分类}</code>：某一类社团列表</li>
 *   <li><code>/page/search</code>、<code>/page/clubs</code>：搜索 / 社团目录</li>
 *   <li><code>/page/user/login</code>：登录注册页（已登录就直接跳首页）</li>
 *   <li><code>/page/user/profile</code>、<code>/page/user/home</code>：个人资料页</li>
 *   <li><code>/page/my-clubs</code>：我的社团</li>
 *   <li><code>/page/suggestion</code>、<code>/page/suggestion/history</code>：清源建议 / 我的建议历史</li>
 *   <li><code>/page/club/manage</code>、<code>/page/club/add</code>、<code>/page/user-edit</code>：老师/管理员专用页面</li>
 * </ul>
 *
 * <p>权限判断：需要登录的页面先看 session 里的邮箱，没登录就 <code>redirect:</code> 到登录页。
 */
@Controller
@RequestMapping("/page")
public class PageController {

    /** 从会话里取当前登录邮箱；没登录或账号已被删掉就返回 null。 */
    private String sessionEmail(HttpServletRequest request) {
        var session = request.getSession(false);
        return session != null &&
            session.getAttribute("authenticatedEmail") instanceof String email &&
            userService.findByEmail(email) != null
            ? email
            : null;
    }

    @Autowired
    private SchoolAccounts schoolAccounts;

    @Autowired
    IClubService clubService;

    @Autowired
    IUserService userService;

    /** 社团详情页：中英文名都能进；找不到这个社团就给兜底页。 */
    @GetMapping({ "/club-watch/{clubName}", "/club-watch/En/{clubName}" })
    public String clubPage(@PathVariable String clubName, Model model) {
        String decoded = clubName.replace('+', ' ');
        return clubRepository
            .findAll()
            .stream()
            .filter(
                c ->
                    Objects.equals(c.getClubNameEn(), clubName) ||
                    Objects.equals(c.getClubName(), clubName) ||
                    Objects.equals(c.getClubNameEn(), decoded)
            )
            .findFirst()
            .map(c -> "redirect:/page/clubs/" + c.getId())
            .orElse(
                "redirect:/page/search?keyword=" +
                    java.net.URLEncoder.encode(decoded, java.nio.charset.StandardCharsets.UTF_8)
            );
    }

    /** 按数据库 id 打开社团详情页。 */
    @GetMapping("/clubs/{id}")
    public String clubDetail(@PathVariable int id, Model model) {
        if (
            !clubRepository.existsById(id)
        ) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND,
            "社团不存在"
        );
        model.addAttribute("clubId", id);
        model.addAttribute("catalogMode", "detail");
        return "page/club-catalog";
    }

    /** 首页（中文）。 */
    @GetMapping("/index")
    public String index(HttpServletRequest request, Model model) {
        model.addAttribute("currentUri", request.getRequestURI());
        return "page/index";
    }

    /** 首页（英文版）。 */
    @GetMapping("/index-en")
    public String indexPageEn(Model model) {
        return "page/En/index-en";
    }

    /** 分类页（中文）：/page/club-type/creativity 这类地址，看某一类社团。 */
    @GetMapping("/club-type/{type}")
    public String clubTypePage(@PathVariable String type, Model model) {
        if (
            type.equals("activity") ||
            type.equals("creativity") ||
            type.equals("study") ||
            type.equals("service")
        ) {
            model.addAttribute("type", type);
            model.addAttribute("catalogMode", "category");
            return "page/club-catalog";
        } else {
            return "page/fall_to_get_club";
        }
    }

    /** 分类页（英文版）。 */
    @GetMapping("/club-type/En/{type}")
    public String clubTypePageEn(@PathVariable String type, Model model) {
        if (
            type.equals("activity") ||
            type.equals("creativity") ||
            type.equals("study") ||
            type.equals("service")
        ) {
            model.addAttribute("type", type);
            model.addAttribute("catalogMode", "category");
            return "page/club-catalog";
        } else {
            return "page/fall_to_get_club";
        }
    }

    /** 登录注册页：已经登录过就直接送回首页，避免重复登录。 */
    @GetMapping("/user/login")
    public String loginPage(Model model, HttpServletRequest request) {
        if (sessionEmail(request) != null) return "redirect:/";
        return "page/login";
    }

    /** 清源建议（创意箱）：提交建议的页面。 */
    @GetMapping("/suggestion")
    public String suggestionPage(Model model) {
        return "page/advice";
    }

    /** 我的建议历史：看自己提交过的建议和审核结果（之前出过 500 的那个页面）。 */
    @GetMapping("/suggestion/history")
    public String suggestionHistoryPage(Model model) {
        model.addAttribute("currentUri", "/page/suggestion/history");
        return "page/suggestion-history";
    }

    /** 建议管理页：老师/管理员审核建议（进页面后再由页面里的脚本校验身份）。 */
    @GetMapping("/suggestion/manage")
    public String suggestionManagePage() {
        return "page/manager of advice";
    }

    /** 搜索页 / 社团目录页：同一个模板，用 catalogMode 区分展示方式。 */
    @GetMapping({ "/search", "/clubs" })
    public String searchPage(Model model) {
        model.addAttribute("catalogMode", "search");
        return "page/club-catalog";
    }

    /** 个人资料页：未登录会自动跳到登录页，并记住「登录后回到这里」。 */
    @GetMapping({ "/user/profile", "/user/home" })
    public String profile(HttpServletRequest request, Model model) {
        try {
            model.addAttribute("loginUser", schoolAccounts.current(request));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return (
                "redirect:/page/user/login?next=" +
                java.net.URLEncoder.encode(
                    request.getRequestURI() +
                        (request.getQueryString() == null ? "" : "?" + request.getQueryString()),
                    java.nio.charset.StandardCharsets.UTF_8
                )
            );
        }
        return "page/profile";
    }

    /* ========================================================================= */
    /* 以下为新添加的“我的社团”页面跳转渲染控制器                                  */
    /* ========================================================================= */

    @Autowired
    private ClubRepository clubRepository;

    /** 老师管理自己社团的页面（先算出「我能管哪些社团」再交给模板）。 */
    @GetMapping("/club/manage")
    public String teacherClubManagePage(
        @RequestAttribute(value = "verifiedEmail", required = false) String email,
        Model model
    ) {
        return "redirect:/page/club/workspace";
    }

    /** 新增社团页面（只有老师/管理员能进，普通学生会跳到首页）。 */
    @GetMapping("/club/add")
    public String clubAddPage(
        @RequestAttribute(value = "verifiedEmail", required = false) String email,
        Model model
    ) {
        if (email == null || email.isBlank()) {
            return "redirect:/page/user/login";
        }

        UserBase loginUser = userService.findByEmail(email);
        if (loginUser == null) {
            return "redirect:/page/user/login";
        }

        if (loginUser.getUserRight() < 3) {
            return "redirect:/page/club/manage";
        }

        model.addAttribute("loginUser", loginUser);
        return "page/club-add";
    }

    /**
     * 导航进入“我的社团”多权限交互中心页面
     * 对应前端访问路径：GET /page/my-clubs
     */
    /** 我的社团：列出自己加入/负责的社团。 */
    @GetMapping("/my-clubs")
    public String myClubsPage(HttpServletRequest request, Model model) {
        try {
            model.addAttribute("loginUser", schoolAccounts.current(request));
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return "redirect:/page/user/login?next=/page/my-clubs";
        }
        return "page/my-clubs";
    }

    /** 算出这个登录用户「能管理哪些社团」：老师=指导的社团，管理员=全部，社长=自己那个。 */
    private List<Map<String, Object>> buildManageableClubList(UserBase loginUser) {
        Map<Integer, Club> clubs = new LinkedHashMap<>();

        if (loginUser instanceof Admin || loginUser.getUserRight() >= 3) {
            clubRepository.findAll().forEach(club -> putClub(clubs, club));
        } else if (loginUser instanceof Teacher teacher) {
            putClubs(clubs, teacher.getClubs());
        } else if (loginUser instanceof ClubPresident president) {
            putClub(clubs, president.getMainClub());
        }

        return clubs.values().stream().map(this::toClubManageMap).toList();
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

    /** 页面上显示的「你的身份」文字（管理员账号 / 老师账号 / 社长账号）。 */
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
        @RequestParam String clubName,
        @RequestAttribute(value = "verifiedEmail", required = false) String email,
        Model model
    ) {
        return "redirect:/page/club/workspace";
    }

    @Autowired
    UserRepository userRepository;

    /** 用户管理页：只有 UserRight >= 2（老师 / 管理员）能进，其他人跳首页。 */
    @GetMapping("/user-edit")
    public String managerPage(HttpServletRequest request, Model model) {
        // 1. 从 Cookie 中获取登录用户的 session
        Cookie[] cookies = request.getCookies();
        String email = sessionEmail(request);
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
