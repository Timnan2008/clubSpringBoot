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
    private String sessionEmail(HttpServletRequest request) {
        var session=request.getSession(false);
        return session!=null && session.getAttribute("authenticatedEmail") instanceof String email && userService.findByEmail(email)!=null ? email : null;
    }
    @Autowired private com.qpwflshclub.formal_club.social.SchoolAccounts schoolAccounts;

    @Autowired
    IClubService clubService;
    @Autowired
    IUserService userService;

    @GetMapping({"/club-watch/{clubName}", "/club-watch/En/{clubName}"})
    public String clubPage(@PathVariable String clubName, Model model) {
        String decoded=clubName.replace('+',' ');
        return clubRepository.findAll().stream()
            .filter(c -> Objects.equals(c.getClubNameEn(),clubName) || Objects.equals(c.getClubName(),clubName) || Objects.equals(c.getClubNameEn(),decoded))
            .findFirst().map(c -> "redirect:/page/clubs/"+c.getId())
            .orElse("redirect:/page/search?keyword="+java.net.URLEncoder.encode(decoded,java.nio.charset.StandardCharsets.UTF_8));
    }
    @GetMapping("/clubs/{id}")
    public String clubDetail(@PathVariable int id, Model model) {
        if(!clubRepository.existsById(id)) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"社团不存在");
        model.addAttribute("clubId",id); model.addAttribute("catalogMode","detail");
        return "page/club-catalog";
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

        if(type.equals("activity") || type.equals("creativity") || type.equals("study") || type.equals("service")){
            model.addAttribute("type", type);
            model.addAttribute("catalogMode","category"); return "page/club-catalog";
        }else{
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/club-type/En/{type}")
    public String clubTypePageEn(@PathVariable String type, Model model) {

        if(type.equals("activity") || type.equals("creativity") || type.equals("study") || type.equals("service")){
            model.addAttribute("type", type);
            model.addAttribute("catalogMode","category"); return "page/club-catalog";
        }else{
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/user/login")
    public String loginPage(Model model, HttpServletRequest request) {
        if (sessionEmail(request) != null) return "redirect:/";
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

    @GetMapping({"/search","/clubs"})
    public String searchPage(Model model) {
        model.addAttribute("catalogMode","search"); return "page/club-catalog";
    }

    @GetMapping({"/user/profile","/user/home"})
    public String profile(HttpServletRequest request, Model model) {
        try { model.addAttribute("loginUser",schoolAccounts.current(request)); } catch (org.springframework.web.server.ResponseStatusException e) { return "redirect:/page/user/login?next="+java.net.URLEncoder.encode(request.getRequestURI()+(request.getQueryString()==null?"":"?"+request.getQueryString()),java.nio.charset.StandardCharsets.UTF_8); }
        return "page/profile";
    }


    /* ========================================================================= */
    /* 以下为新添加的“我的社团”页面跳转渲染控制器                                  */
    /* ========================================================================= */


    @Autowired
    private com.qpwflshclub.formal_club.repository.Club.ClubRepository clubRepository;

    @GetMapping("/club/manage")
    public String teacherClubManagePage(@RequestAttribute(value="verifiedEmail",required=false) String email, Model model) {
        return "redirect:/page/club/workspace";
    }
    @GetMapping("/club/add")
    public String clubAddPage(
            @RequestAttribute(value = "verifiedEmail", required = false) String email,
            Model model) {
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
    @GetMapping("/my-clubs")
    public String myClubsPage(HttpServletRequest request, Model model) {
        try { model.addAttribute("loginUser",schoolAccounts.current(request)); } catch (org.springframework.web.server.ResponseStatusException e) { return "redirect:/page/user/login?next=/page/my-clubs"; }
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
    public String editClubPage(@RequestParam String clubName, @RequestAttribute(value="verifiedEmail",required=false) String email, Model model) {
        return "redirect:/page/club/workspace";
    }
    @Autowired
    UserRepository userRepository;

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
