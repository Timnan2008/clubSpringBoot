package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club;
import com.qpwflshclub.formal_club.service.ClubNotFoundException;
import com.qpwflshclub.formal_club.service.IClubService;
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

    @GetMapping("/index")
    public String indexPage(Model model) {
        return "page/index";
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


}
