package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.dto.User.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.ClubPresident;
import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.service.User.IUserService;

import java.util.Objects;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    IUserService userService;
    @Autowired
    com.qpwflshclub.formal_club.repository.User.UserRepository userRepository;

    //添加用户

    @PostMapping("/add/admin")
    @ResponseBody
    public ResponseMessage<Admin> add(@Validated @RequestBody AdminDTO adminDTO){
        Admin admin = userService.addAdmin(adminDTO);
        return ResponseMessage.success(admin);
    }

    @PostMapping("/add/teacher")
    @ResponseBody
    public ResponseMessage<Teacher> add(@Validated @RequestBody TeacherDTO teacherDTO){
        Teacher teacher = userService.addTeacher(teacherDTO);
        return ResponseMessage.success(teacher);
    }

    @PostMapping("/add/club-president")
    @ResponseBody
    public ResponseMessage<ClubPresident> add(@Validated @RequestBody ClubPresidentDTO clubPresidentDTO){
        ClubPresident clubPresident = userService.addClubPresident(clubPresidentDTO);
        return ResponseMessage.success(clubPresident);
    }

    @PostMapping("/add/user")
    @ResponseBody
    public ResponseMessage<User> add(@Validated @RequestBody UserDTO userDTO){

        String nameEn = userDTO.getUsernameEn();

        if(userService.hasUser(nameEn)){
            return ResponseMessage.occupied(userDTO.getUsername(), null);
        }

        User user = userService.addUser(userDTO);
        return ResponseMessage.success(user);
    }

//    @PostMapping("/add/{userType}")
//    public ResponseMessage<Object> add(@Validated @RequestBody UserBaseDTO userDTO, @PathVariable String userType){
//        Object result = switch (userType) {
//            case "teacher" -> userService.addTeacher((TeacherDTO) userDTO);
//            case "user" -> userService.addUser((UserDTO) userDTO);
//            case "club-president" -> userService.addClubPresident((ClubPresidentDTO) userDTO);
//            case "admin" -> userService.addAdmin((AdminDTO) userDTO);
//            default -> throw new IllegalArgumentException("不支持的用户类型");
//        };
//
//        return new ResponseMessage<>(200, "添加成功", result);
//    }

    //更新用户
    @PutMapping("/update/{userType}")
    public ResponseMessage<Object> update(@Validated @RequestBody UserBaseDTO userDTO, @PathVariable String userType){
        Object result = switch (userType) {
            case "teacher" -> userService.update((TeacherDTO) userDTO);
            case "user" -> userService.update((UserDTO) userDTO);
            case "club-president" -> userService.update((ClubPresidentDTO) userDTO);
            case "admin" -> userService.update((AdminDTO) userDTO);
            default -> throw new IllegalArgumentException("不支持的用户类型");
        };
        return new ResponseMessage<>(200, "更新成功", result);
    }

    @DeleteMapping("/delete")
    public ResponseMessage<String> delete(@RequestBody UserBaseDTO userDTO){
        String nameEn = userDTO.getUsernameEn();
        userService.delete(nameEn);
        return new ResponseMessage<>(200, "删除成功", nameEn);
    }

    @GetMapping("/find/{type}/{id}")
    public ResponseMessage<UserBase> find(@PathVariable String type, @PathVariable Long id){
        UserBase user = switch (type) {
            case "teacher" -> userService.findTeacherByID(id);
            case "user" -> userService.findUserById(id);
            case "club-president" -> userService.findClubPresidentByID(id);
            case "admin" -> userService.findAdminByID(id);
            default -> null;
        };
        return new ResponseMessage<>(200, "查询成功", user);
    }

    @GetMapping("/find-name/{type}/{name-en}")
    public ResponseMessage<UserBase> find(@PathVariable String type, @PathVariable String nameEn){
        if(type.equals("user")){
            return new ResponseMessage<>(200, "查询成功", userService.findUserById(Long.parseLong(nameEn)));
        }
        if(type.equals("admin")){
            return new ResponseMessage<>(200, "查询成功", userService.findAdminByID(Long.parseLong(nameEn)));
        }
        if(type.equals("teacher")){
            return new ResponseMessage<>(200, "查询成功", userService.findTeacherByID(Long.parseLong(nameEn)));

        }
        if(type.equals("club-president")){
            return new ResponseMessage<>(200, "查询成功", userService.findClubPresidentByID(Long.parseLong(nameEn)));
        }
        return ResponseMessage.error("查不到");
    }
    @GetMapping("/find-name-directly/{nameEn}")
    public ResponseMessage<?> findNameDirectly(@PathVariable String nameEn){
        // 假设返回类型为 UserBase
        UserBase user = userService.findByNameEn(nameEn);

        // 判断实际的类型并进行相应的处理
        if (user instanceof User) {
            // 处理 User 类型
            return ResponseMessage.success((User) user); // 或者返回相关的 DTO
        } else if (user instanceof Teacher) {
            // 处理 Teacher 类型
            return ResponseMessage.success((Teacher) user);
        } else if (user instanceof ClubPresident) {
            // 处理 ClubPresident 类型
            return ResponseMessage.success((ClubPresident) user);
        } else if (user instanceof Admin) {
            // 处理 Admin 类型
            return ResponseMessage.success((Admin) user);
        } else {
            return ResponseMessage.error("未找到该用户");
        }
    }

    @PostMapping("/login")
    @ResponseBody
    public ResponseMessage<UserBase> login(@RequestBody LoginDTO loginDTO, HttpServletResponse response) {
    // 按 email 在 user / teacher 表查找（可按需扩展）
        String email = loginDTO.getEmail();
        UserBase user = userService.findByEmail(email);

        if (user == null) {
            return ResponseMessage.error("未找到该用户");
        }

        String inputPassword = loginDTO.getPassword();
        boolean isPasswordCorrect = false;

        // 使用 Java 14+ 的模式匹配（Pattern Matching for instanceof）来简化强转
        if (user instanceof User u) {
            isPasswordCorrect = Objects.equals(u.getPassword(), inputPassword);
        } else if (user instanceof Teacher t) {
            isPasswordCorrect = Objects.equals(t.getPassword(), inputPassword);
        } else if (user instanceof ClubPresident cp) {
            isPasswordCorrect = Objects.equals(cp.getPassword(), inputPassword);
        } else if (user instanceof Admin a) {
            isPasswordCorrect = Objects.equals(a.getPassword(), inputPassword);
        }

        // 校验密码结果
        if (!isPasswordCorrect) {
            return ResponseMessage.error("用户名或密码错误");
        }

        /*
        if (user instanceof User) {
            if(Objects.equals(user.getPassword(), loginDTO.getPassword()))
            // 处理 User 类型
            return ResponseMessage.success((User) user); // 或者返回相关的 DTO
            else return ResponseMessage.error("用户名或密码错误");
        } else if (user instanceof Teacher) {
            if(Objects.equals(user.getPassword(), loginDTO.getPassword()))
            // 处理 Teacher 类型
            return ResponseMessage.success((Teacher) user);
            else return ResponseMessage.error("用户名或密码错误");
        } else if (user instanceof ClubPresident) {
            if(Objects.equals(user.getPassword(), loginDTO.getPassword()))
            // 处理 ClubPresident 类型
            return ResponseMessage.success((ClubPresident) user);
            else return ResponseMessage.error("用户名或密码错误");
        } else if (user instanceof Admin) {
            if(Objects.equals(user.getPassword(), loginDTO.getPassword()))
            // 处理 Admin 类型
            return ResponseMessage.success((Admin) user);
            else return ResponseMessage.error("用户名或密码错误");
        } else {
            return ResponseMessage.error("未找到该用户");
        }

         */
        // --- 密码正确，写入 Cookie ---
        Cookie userCookie = new Cookie("user_session", email); // 直接用前端传来的 email 即可
        userCookie.setMaxAge(7 * 24 * 60 * 60);
        userCookie.setPath("/");
        userCookie.setHttpOnly(true);
        response.addCookie(userCookie);

        return ResponseMessage.success(user);
    }

    @GetMapping("/logout")
    public ResponseMessage<String> logout(HttpServletRequest request, HttpServletResponse response) {
        // 1. 让 session 失效
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        // 2. 后端顺便也删一下 Cookie（双重保险）
        Cookie cookie = new Cookie("user_session", null);
        cookie.setMaxAge(0);
        cookie.setPath("/");
        response.addCookie(cookie);

        return ResponseMessage.success("注销成功");
    }

    @PostMapping("/tern-admin")
    public ResponseMessage<Admin> ternAdmin(@RequestBody UserDTO user) {
        String userNameEn = user.getUsernameEn();
        User u = userService.findByNameEn(userNameEn);
        if (u == null) {
            return ResponseMessage.error("不存在");
        }

        Admin admin = userService.transferAdmin(u);
        return ResponseMessage.success(admin);
    }
}
