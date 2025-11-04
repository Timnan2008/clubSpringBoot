package com.qpwflshclub.formal_club.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/page")
public class PageController {

    @GetMapping("/club-watch/{clubName}")
    public String clubPage(@PathVariable String clubName, Model model) {
        System.out.println("clubName: " + clubName);
        model.addAttribute("club", clubName);
        return "page/club-template"; // 👈 和上面的路径一致
    }


}
