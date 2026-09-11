package com.qpwflshclub.formal_club.social;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;
@Controller public class SocialPageController {
 private final SchoolAccounts accounts;public SocialPageController(SchoolAccounts accounts){this.accounts=accounts;}
 @GetMapping({"/page/wall","/page/messages"}) public String page(HttpServletRequest request,Model model){try{model.addAttribute("loginUser",accounts.current(request));model.addAttribute("socialMode",request.getRequestURI().endsWith("messages")?"messages":"wall");return "page/campus-social";}catch(ResponseStatusException e){return "redirect:/page/user/login?next="+request.getRequestURI();}}
 @GetMapping("/page/calendar") public String calendar(HttpServletRequest request,Model model){try{model.addAttribute("loginUser",accounts.current(request));return "page/personal-calendar";}catch(ResponseStatusException e){return "redirect:/page/user/login?next=/page/calendar";}}
}
