package com.qpwflshclub.formal_club.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cookie")
public class CookieController {
    @GetMapping("/setCookie")
    public String setCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("userType", "president");
        cookie.setPath("/");
        cookie.setMaxAge(3600);
        response.addCookie(cookie);
        return "Cookie set!";
    }

}
