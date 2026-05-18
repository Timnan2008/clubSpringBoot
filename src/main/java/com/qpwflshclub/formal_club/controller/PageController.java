package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.service.Club.ClubNotFoundException;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

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

}
