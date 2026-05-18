package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.service.User.IUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.ui.Model;

@ControllerAdvice(assignableTypes = PageController.class) // 只针对 PageController 生效
public class GlobalPageControllerAdvice {

    @Autowired
    private IUserService userService;

    // @ModelAttribute 注解的方法会在 PageController 的每个 @GetMapping 方法执行前先执行
    @ModelAttribute
    public void addGlobalAttributes(
            @CookieValue(value = "user_session", required = false) String userSession,
            Model model) {

        if (userSession != null) {
            // 根据 Cookie 里的 email 查询用户
            UserBase currentUser = userService.findByEmail(userSession);
            if (currentUser != null) {
                // 统一往所有页面的 Model 里塞入 loginUser
                model.addAttribute("loginUser", currentUser);
            }
        }
    }
}