package com.qpwflshclub.formal_club.controller;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model;
@ControllerAdvice(assignableTypes = {PageController.class, HomeController.class})
public class GlobalPageControllerAdvice {
 @Autowired private IUserService userService;
 @ModelAttribute public void addGlobalAttributes(HttpServletRequest request, Model model) {
  var session=request.getSession(false);
  if(session!=null && session.getAttribute("authenticatedEmail") instanceof String email)
   model.addAttribute("loginUser",userService.findByEmail(email));
 }
}
