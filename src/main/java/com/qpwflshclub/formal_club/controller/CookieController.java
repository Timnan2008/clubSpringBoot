package com.qpwflshclub.formal_club.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CookieController {

    @GetMapping("/setCookie")
    public String setCookie(HttpServletResponse response) {
        // 1. 创建 Cookie
        Cookie cookie = new Cookie("username", "timnan"); // key = username, value = timnan

        // 2. 设置属性
        cookie.setMaxAge(24 * 60 * 60); // 存活1天（秒）
        cookie.setPath("/"); // 整个网站都有效
        cookie.setHttpOnly(true); // 浏览器 JS 无法访问，安全
        cookie.setSecure(false); // 如果用 HTTPS，改为 true

        // 3. 添加到响应头
        response.addCookie(cookie);

        return "Cookie 已经设置成功！";
    }
}
