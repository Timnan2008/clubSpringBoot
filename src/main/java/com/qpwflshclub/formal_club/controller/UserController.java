package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.pojo.dto.User.*;
import com.qpwflshclub.formal_club.service.User.IUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheConfig;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    IUserService userService;

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

    @DeleteMapping("/delete/{id}")
    public ResponseMessage<Long> delete(@PathVariable Long id){
        userService.delate(id);
        return new ResponseMessage<>(200, "删除成功", id);
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
}
