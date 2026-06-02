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

import java.util.List;
import java.util.Objects;
import com.qpwflshclub.formal_club.pojo.Club.Club;

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
    public ResponseMessage<Admin> ternAdmin(@RequestBody UserBaseDTO userbase, HttpServletRequest request) {
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (currentUser == null || !(currentUser instanceof Admin) && currentUser.getUserRight() < 3) {
            return ResponseMessage.error("无权限：只有管理员可以将用户提升为管理员");
        }
        
        String userNameEn = userbase.getUsernameEn();

        UserBase u = userService.findByNameEn(userNameEn);
        if (u == null) {
            return ResponseMessage.error("不存在");
        }

        Admin admin;
        if (u instanceof Teacher t) {
            admin = userService.transferAdmin(t);
        } else if (u instanceof ClubPresident cp) {
            admin = userService.transferAdmin(cp);
        } else if (u instanceof User us) {
            admin = userService.transferAdmin(us);
        } else {
            return ResponseMessage.error("该用户已经是管理员");
        }

        return ResponseMessage.success(admin);
    }

    @GetMapping("/all")
    public ResponseMessage<List<UserBase>> getAllUsers(HttpServletRequest request) {
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (currentUser == null || currentUser.getUserRight() < 2) {
            return ResponseMessage.error("无权限：只有老师和管理员可以查看所有用户");
        }
        List<UserBase> list = userService.findAllUsers();
        return new ResponseMessage<>(200, "查询成功", list);
    }

    /**
     * 改变用户职位（只有管理员可以操作）
     * POST /api/user/change-role
     * 请求体：{ "usernameEn": "xxx", "newRole": 0|2|3 }
     * newRole: 0-普通用户, 2-老师, 3-管理员
     */
    @PostMapping("/change-role")
    public ResponseMessage<UserBase> changeRole(@RequestBody java.util.Map<String, Object> requestBody, HttpServletRequest request) {
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        // 只有管理员（UserRight == 3）可以改变用户职位
        if (currentUser == null || currentUser.getUserRight() != 3) {
            return ResponseMessage.error("无权限：只有管理员可以改变用户职位");
        }

        String usernameEn = (String) requestBody.get("usernameEn");
        Integer newRole = (Integer) requestBody.get("newRole");

        if (usernameEn == null || usernameEn.isBlank()) {
            return ResponseMessage.error("用户名不能为空");
        }
        if (newRole == null || (newRole != 0 && newRole != 2 && newRole != 3)) {
            return ResponseMessage.error("无效的目标职位：只能转换为普通用户(0)、老师(2)或管理员(3)");
        }

        try {
            UserBase updatedUser = userService.changeRole(usernameEn, newRole);
            return ResponseMessage.success(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseMessage.error(e.getMessage());
        }
    }

    /**
     * 任命社长
     * POST /api/user/appoint-president
     * 请求体：{ "usernameEn": "xxx", "clubId": 1, "isVicePresident": false }
     * 权限：老师可以任命自己指导的社团的社长，管理员可以任命任何社团的社长
     */
    @PostMapping("/appoint-president")
    public ResponseMessage<ClubPresident> appointPresident(
            @RequestBody java.util.Map<String, Object> requestBody,
            HttpServletRequest request) {
        
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (currentUser == null || currentUser.getUserRight() < 2) {
            return ResponseMessage.error("无权限：只有老师和管理员可以任命社长");
        }

        String targetUsernameEn = (String) requestBody.get("usernameEn");
        Integer clubId = (Integer) requestBody.get("clubId");
        Boolean isVicePresident = (Boolean) requestBody.get("isVicePresident");

        if (targetUsernameEn == null || targetUsernameEn.isBlank()) {
            return ResponseMessage.error("目标用户名不能为空");
        }
        if (clubId == null) {
            return ResponseMessage.error("社团ID不能为空");
        }
        if (isVicePresident == null) {
            isVicePresident = false;
        }

        // 如果是老师（不是管理员），检查是否有权限管理该社团
        if (currentUser.getUserRight() == 2 && currentUser instanceof Teacher teacher) {
            boolean hasPermission = false;
            if (teacher.getClubs() != null) {
                hasPermission = teacher.getClubs().stream()
                        .anyMatch(club -> Objects.equals(club.getId(), clubId));
            }
            if (!hasPermission) {
                return ResponseMessage.error("无权限：您只能任命自己指导的社团的社长");
            }
        }

        try {
            ClubPresident newPresident = userService.appointPresident(targetUsernameEn, clubId, isVicePresident);
            return ResponseMessage.success(newPresident);
        } catch (IllegalArgumentException e) {
            return ResponseMessage.error(e.getMessage());
        }
    }

    /**
     * 获取当前用户管理的社团列表（用于老师任命社长时选择社团）
     * GET /api/user/my-clubs
     * 权限：老师和管理员可以访问
     */
    @GetMapping("/my-clubs")
    public ResponseMessage<List<Club>> getMyManagedClubs(HttpServletRequest request) {
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (currentUser == null || currentUser.getUserRight() < 2) {
            return ResponseMessage.error("无权限：只有老师和管理员可以访问");
        }

        List<Club> clubs = null;
        
        // 如果是管理员，返回所有社团
        if (currentUser.getUserRight() == 3 || currentUser instanceof Admin) {
            clubs = userService.getAllClubs();
        }
        // 如果是老师，返回自己指导的社团
        else if (currentUser instanceof Teacher teacher) {
            clubs = teacher.getClubs();
        }

        if (clubs == null) {
            clubs = List.of();
        }
        
        return ResponseMessage.success(clubs);
    }

    /**
     * 撤销社长
     * POST /api/user/revoke-president
     * 请求体：{ "usernameEn": "xxx", "clubId": 1 }
     * 权限：老师可以撤销自己指导的社团的社长，管理员可以撤销任何社团的社长
     */
    @PostMapping("/revoke-president")
    public ResponseMessage<String> revokePresident(
            @RequestBody java.util.Map<String, Object> requestBody,
            HttpServletRequest request) {
        
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (currentUser == null || currentUser.getUserRight() < 2) {
            return ResponseMessage.error("无权限：只有老师和管理员可以撤销社长");
        }

        String targetUsernameEn = (String) requestBody.get("usernameEn");
        Integer clubId = (Integer) requestBody.get("clubId");

        if (targetUsernameEn == null || targetUsernameEn.isBlank()) {
            return ResponseMessage.error("目标用户名不能为空");
        }
        if (clubId == null) {
            return ResponseMessage.error("社团ID不能为空");
        }

        // 如果是老师（不是管理员），检查是否有权限管理该社团
        if (currentUser.getUserRight() == 2 && currentUser instanceof Teacher teacher) {
            boolean hasPermission = false;
            if (teacher.getClubs() != null) {
                hasPermission = teacher.getClubs().stream()
                        .anyMatch(club -> Objects.equals(club.getId(), clubId));
            }
            if (!hasPermission) {
                return ResponseMessage.error("无权限：您只能撤销自己指导的社团的社长");
            }
        }

        try {
            userService.revokePresident(targetUsernameEn, clubId);
            return ResponseMessage.success("撤销社长成功");
        } catch (IllegalArgumentException e) {
            return ResponseMessage.error(e.getMessage());
        }
    }
}
