package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.service.Club.ClubNotFoundException;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/page")
public class PageController {

    @Autowired
    IClubService clubService;

    private static final String DEFAULT_LANG = "zh";
    private static final String LANG_SESSION_KEY = "lang";

    private String getCurrentLanguage(HttpServletRequest request) {
        HttpSession session = request.getSession();
        String lang = (String) session.getAttribute(LANG_SESSION_KEY);
        return lang != null ? lang : DEFAULT_LANG;
    }

    private void setCurrentLanguage(HttpServletRequest request, String lang) {
        HttpSession session = request.getSession();
        session.setAttribute(LANG_SESSION_KEY, lang);
    }

    @GetMapping("/switch-lang")
    public String switchLanguage(@RequestParam("lang") String lang, 
                                @RequestParam("redirect") String redirectUrl,
                                HttpServletRequest request) {
        if ("en".equals(lang) || "zh".equals(lang)) {
            setCurrentLanguage(request, lang);
        }
        return "redirect:" + redirectUrl;
    }

    @GetMapping("/club-watch/{clubName}")
    public String clubPage(@PathVariable String clubName, 
                          HttpServletRequest request,
                          Model model) {
        String currentLang = getCurrentLanguage(request);
        System.out.println("clubName: " + clubName + ", lang: " + currentLang);

        try{
            Club club = clubService.findByName(clubName);
            model.addAttribute("club", clubName);
            model.addAttribute("lang", currentLang);
            
            if ("en".equals(currentLang)) {
                return "page/En/club-template-en";
            } else {
                return "page/club-template";
            }
        }catch (ClubNotFoundException e){
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/index")
    public String indexPage(HttpServletRequest request, Model model) {
        String currentLang = getCurrentLanguage(request);
        model.addAttribute("lang", currentLang);
        
        if ("en".equals(currentLang)) {
            return "page/En/index-en";
        } else {
            return "page/index";
        }
    }

    @GetMapping("/club-type/{type}")
    public String clubTypePage(@PathVariable String type, 
                              HttpServletRequest request,
                              Model model) {
        String currentLang = getCurrentLanguage(request);
        System.out.println("type: " + type + ", lang: " + currentLang);

        if(type.equals("activity") || type.equals("creativity") || type.equals("study") || type.equals("service")){
            model.addAttribute("type", type);
            model.addAttribute("lang", currentLang);
            
            if ("en".equals(currentLang)) {
                return "page/En/club-type-template-en";
            } else {
                return "page/club-type-template";
            }
        }else{
            return "page/fall_to_get_club";
        }
    }

    @GetMapping("/user/login")
    public String loginPage(HttpServletRequest request, Model model) {
        String currentLang = getCurrentLanguage(request);
        model.addAttribute("lang", currentLang);
        return "page/login";
    }

    @GetMapping("/suggestion")
    public String suggestionPage(HttpServletRequest request, Model model) {
        String currentLang = getCurrentLanguage(request);
        model.addAttribute("lang", currentLang);
        return "page/advice";
    }
}
