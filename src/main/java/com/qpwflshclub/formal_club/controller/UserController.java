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
import java.util.Map;
import java.util.Objects;
import com.qpwflshclub.formal_club.pojo.Club.Club;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    IUserService userService;
    @Autowired com.qpwflshclub.formal_club.social.AccountProfiles profiles;
    @Autowired com.qpwflshclub.formal_club.social.MessageKeyVault keyVault;
    @Autowired com.qpwflshclub.formal_club.service.Suggestion.TurnstileService turnstile;
    @Autowired com.qpwflshclub.formal_club.service.Suggestion.EmailCodeService registrationCodes;
    private void verifyRegistrationEmail(HttpServletRequest request,String email,String code){
        if(com.qpwflshclub.formal_club.config.RegistrationProof.valid(request,email))return;
        if(code==null||!registrationCodes.verifyCode(email,code.strip()))throw com.qpwflshclub.formal_club.social.SchoolAccounts.error(400,"验证码错误或已过期，请重新获取 / Email code is invalid or expired; request a new code");
        com.qpwflshclub.formal_club.config.RegistrationProof.verified(request,email);
    }
    @Autowired
    com.qpwflshclub.formal_club.repository.User.UserRepository userRepository;

    @Autowired
    com.qpwflshclub.formal_club.config.RememberMeService rememberMe;

    @Autowired
    com.qpwflshclub.formal_club.config.LoginEmails loginEmails;

    //添加用户

    @PostMapping("/add/admin")
    @ResponseBody
    public ResponseMessage<Admin> add(@Validated @RequestBody AdminDTO adminDTO, HttpServletRequest request) {
        UserBase currentUser = currentUserFromRequest(request);
        if (!isAdmin(currentUser)) {
            return ResponseMessage.error("无权限：只有管理员可以创建管理员账号");
        }
        com.qpwflshclub.formal_club.config.PasswordPolicy.require(adminDTO.getPassword());
        if (loginEmails != null) loginEmails.requireAvailable(adminDTO.getEmail());
        Admin admin = userService.addAdmin(adminDTO);
        return ResponseMessage.success(admin);
    }

    @PostMapping("/add/teacher")
    @ResponseBody
    public ResponseMessage<Teacher> add(@Validated @RequestBody TeacherDTO teacherDTO, HttpServletRequest request) {
        com.qpwflshclub.formal_club.config.RegistrationNames.validate(teacherDTO.getUsername(),teacherDTO.getUsernameEn());
        turnstile.verify(teacherDTO.getTurnstileToken(),"register");
        com.qpwflshclub.formal_club.config.PasswordPolicy.require(teacherDTO.getPassword());
        if(!com.qpwflshclub.formal_club.config.LoginEmails.normalize(teacherDTO.getEmail()).endsWith("@shwfl.edu.cn"))throw com.qpwflshclub.formal_club.social.SchoolAccounts.error(400,"教师请使用 @shwfl.edu.cn 邮箱 / Teachers must use @shwfl.edu.cn");
        verifyRegistrationEmail(request,teacherDTO.getEmail(),teacherDTO.getEmailCode());
        teacherDTO.setClubs(List.of());
        if (loginEmails != null) loginEmails.requireAvailable(teacherDTO.getEmail());
        Teacher teacher = profiles.register(teacherDTO.getEmail(),"",teacherDTO.getNickname(),false,()->userService.addTeacher(teacherDTO));
        com.qpwflshclub.formal_club.config.RegistrationProof.consume(request);
        return ResponseMessage.success(teacher);
    }

    @PostMapping("/add/club-president")
    @ResponseBody
    public ResponseMessage<ClubPresident> add(@Validated @RequestBody ClubPresidentDTO clubPresidentDTO, HttpServletRequest request) {
        UserBase currentUser = currentUserFromRequest(request);
        if (!isAdmin(currentUser)) {
            return ResponseMessage.error("无权限：只有管理员可以创建社长账号");
        }
        com.qpwflshclub.formal_club.config.PasswordPolicy.require(clubPresidentDTO.getPassword());
        if (loginEmails != null) loginEmails.requireAvailable(clubPresidentDTO.getEmail());
        ClubPresident clubPresident = userService.addClubPresident(clubPresidentDTO);
        return ResponseMessage.success(clubPresident);
    }

    @PostMapping("/add/user")
    @ResponseBody
    public ResponseMessage<User> add(@Validated @RequestBody UserDTO userDTO, HttpServletRequest request) {

        com.qpwflshclub.formal_club.config.RegistrationNames.validate(userDTO.getUsername(),userDTO.getUsernameEn());
        turnstile.verify(userDTO.getTurnstileToken(),"register");
        com.qpwflshclub.formal_club.config.PasswordPolicy.require(userDTO.getPassword());
        verifyRegistrationEmail(request,userDTO.getEmail(),userDTO.getEmailCode());
        userDTO.setClubs(List.of());
        if (loginEmails != null) loginEmails.requireAvailable(userDTO.getEmail());
        User user = profiles.register(userDTO.getEmail(),userDTO.getStudentNumber(),userDTO.getNickname(),true,()->userService.addUser(userDTO));
        com.qpwflshclub.formal_club.config.RegistrationProof.consume(request);
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
    public ResponseMessage<Object> update(@Validated @RequestBody UserBaseDTO userDTO, @PathVariable String userType, HttpServletRequest request) {
        UserBase currentUser = currentUserFromRequest(request);
        if (!canModifyUser(currentUser, userDTO, userType)) {
            return ResponseMessage.error("无权限：只能修改自己的账号");
        }
        com.qpwflshclub.formal_club.config.RegistrationNames.validate(userDTO.getUsername(), userDTO.getUsernameEn());
        if (!isAdmin(currentUser)) {
            var memberships=currentUser.getClubs();
            userDTO.setClubs(memberships==null?List.of():memberships.stream().map(c->c.getId().longValue()).toList());
            userDTO.setEmail(currentUser.getEmail());
            if(currentUser instanceof ClubPresident cp && userDTO instanceof ClubPresidentDTO dto){dto.setMainClubId(cp.getMainClub()==null?null:cp.getMainClub().getId().longValue());dto.setVicePresident(cp.isVicePresident());}
        }
        if(userDTO.getPassword()!=null&&!userDTO.getPassword().isBlank()&&!Objects.equals(userDTO.getPassword(),currentUser.getPassword())){if(keyVault!=null&&!keyVault.get(com.qpwflshclub.formal_club.social.SchoolAccounts.key(currentUser.getEmail())).isBlank())throw com.qpwflshclub.formal_club.social.SchoolAccounts.error(400,"请在个人资料页面更新密码 / Change your password in Profile");com.qpwflshclub.formal_club.config.PasswordPolicy.require(userDTO.getPassword());userDTO.setPassword(com.qpwflshclub.formal_club.config.PasswordCodec.encode(userDTO.getPassword()));}
        preserveCurrentPasswordIfProfileLeftBlank(currentUser, userDTO, userType);
        Object result = switch (userType) {
            case "teacher" -> userService.update((TeacherDTO) userDTO);
            case "user" -> userService.update((UserDTO) userDTO);
            case "club-president" -> userService.update((ClubPresidentDTO) userDTO);
            case "admin" -> userService.update((AdminDTO) userDTO);
            default -> throw new IllegalArgumentException("不支持的用户类型");
        };
        return new ResponseMessage<>(200, "更新成功", result);
    }



    /*
    @PutMapping("/update/user")
    public ResponseMessage<User> update(@Validated @RequestBody UserDTO userDTO){
        User user = userService.update(userDTO);
        return ResponseMessage.success(user);
    }

    @PutMapping("/update/club-president")
    public ResponseMessage<ClubPresident> update(@Validated @RequestBody ClubPresidentDTO clubPresidentDTO){
        ClubPresident clubPresident = userService.update(clubPresidentDTO);
        return ResponseMessage.success(clubPresident);
    }

    @PutMapping("/update/teacher")
    public ResponseMessage<Teacher> update(@Validated @RequestBody TeacherDTO teacherDTO){
        Teacher teacher = userService.update(teacherDTO);
        return ResponseMessage.success(teacher);
    }

    @PutMapping("/update/admin")
    public ResponseMessage<Admin> update(@Validated @RequestBody AdminDTO adminDTO){
        Admin admin = userService.update(adminDTO);
        return ResponseMessage.success(admin);
    }

     */

    @DeleteMapping("/delete")
    public ResponseMessage<String> delete(@RequestBody UserBaseDTO userDTO, HttpServletRequest request) {
        UserBase currentUser = currentUserFromRequest(request);
        String type = userDTO instanceof TeacherDTO ? "teacher" : userDTO instanceof ClubPresidentDTO ? "club-president" : userDTO instanceof AdminDTO ? "admin" : "user";
        if (userDTO.getId() <= 0 || !canModifyUser(currentUser, userDTO, type)) {
            return ResponseMessage.error("无权限：只能删除自己的账号");
        }
        int role = switch (type) { case "teacher" -> 2; case "club-president" -> 1; case "admin" -> 3; default -> 0; };
        // Names are not unique identifiers. Delete only the selected typed account.
        userService.delete(userDTO.getId(), role);
        return new ResponseMessage<>(200, "删除成功", Long.toString(userDTO.getId()));
    }

    private UserBase currentUserFromRequest(HttpServletRequest request) {
        return (UserBase) request.getAttribute("currentUser");
    }

    private boolean isAdmin(UserBase user) {
        return user instanceof Admin || (user != null && user.getUserRight() >= 3);
    }

    private boolean canModifyUser(UserBase currentUser, UserBaseDTO targetUser, String targetType) {
        if (currentUser == null || targetUser == null) {
            return false;
        }
        return isAdmin(currentUser) || isSameTypedUser(currentUser, targetUser, targetType);
    }

    private boolean isSameTypedUser(UserBase currentUser, UserBaseDTO targetUser, String targetType) {
        return currentUser != null
                && targetUser != null
                && currentUser.getId() == targetUser.getId()
                && Objects.equals(userTypeOf(currentUser), targetType);
    }

    private void preserveCurrentPasswordIfProfileLeftBlank(UserBase currentUser, UserBaseDTO targetUser, String targetType) {
        if (isSameTypedUser(currentUser, targetUser, targetType)
                && (targetUser.getPassword() == null || targetUser.getPassword().isBlank())) {
            targetUser.setPassword(currentUser.getPassword());
        }
    }

    private boolean canDeleteUser(UserBase currentUser, String targetUsernameEn) {
        if (currentUser == null || targetUsernameEn == null || targetUsernameEn.isBlank()) {
            return false;
        }
        return isAdmin(currentUser) || Objects.equals(currentUser.getUsernameEn(), targetUsernameEn);
    }

    private String userTypeOf(UserBase user) {
        if (user instanceof Teacher) return "teacher";
        if (user instanceof ClubPresident) return "club-president";
        if (user instanceof Admin) return "admin";
        return "user";
    }

    @GetMapping("/find/{type}/{id}")
    public ResponseMessage<UserBase> find(@PathVariable String type, @PathVariable Long id) {
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
    public ResponseMessage<UserBase> find(@PathVariable String type, @PathVariable String nameEn) {
        if (type.equals("user")) {
            return new ResponseMessage<>(200, "查询成功", userService.findUserById(Long.parseLong(nameEn)));
        }
        if (type.equals("admin")) {
            return new ResponseMessage<>(200, "查询成功", userService.findAdminByID(Long.parseLong(nameEn)));
        }
        if (type.equals("teacher")) {
            return new ResponseMessage<>(200, "查询成功", userService.findTeacherByID(Long.parseLong(nameEn)));

        }
        if (type.equals("club-president")) {
            return new ResponseMessage<>(200, "查询成功", userService.findClubPresidentByID(Long.parseLong(nameEn)));
        }
        return ResponseMessage.error("查不到");
    }

    @GetMapping("/find-name-directly/{nameEn}")
    public ResponseMessage<?> findNameDirectly(@PathVariable String nameEn) {
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

    @Autowired private com.qpwflshclub.formal_club.config.LoginProtection loginProtection;
    @PostMapping("/login")
    @ResponseBody
    public ResponseMessage<UserBase> login(@RequestBody LoginDTO loginDTO, HttpServletResponse response, HttpServletRequest request) {
        // 按 email 在 user / teacher 表查找（可按需扩展）
        String email = loginDTO.getEmail();
        String canonical = loginEmails == null ? email : loginEmails.resolve(email);
        String throttleEmail=canonical==null?email:canonical;
        if(loginProtection!=null)loginProtection.check(throttleEmail,request.getRemoteAddr());
        UserBase user = canonical == null ? null : userService.findByEmail(canonical);

        if (user == null) {
            if(loginProtection!=null)loginProtection.failed(throttleEmail,request.getRemoteAddr());
            return ResponseMessage.error("用户名或密码错误 / Incorrect email or password");
        }

        String inputPassword = loginDTO.getPassword();
        boolean isPasswordCorrect = false;

        isPasswordCorrect = com.qpwflshclub.formal_club.config.PasswordCodec.matches(user.getPassword(), inputPassword);

        // 校验密码结果
        if (!isPasswordCorrect) {
            if(loginProtection!=null)loginProtection.failed(throttleEmail,request.getRemoteAddr());
            return ResponseMessage.error("用户名或密码错误 / Incorrect email or password");
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
        } else if (user instanceof ClubPresident) {// 获取当前用户身份并控制“优秀社团”按钮的显隐
    fetch('/api/user/current')
        .then(res => res.json())
        .then(result => {
            if (result.code === 200 && result.data) {
                const userRight = result.data.userRight;
                // userRight: 2-老师, 3-管理员
                if (userRight === 2 || userRight === 3) {
                    document.getElementById('great-club-row').style.display = 'flex';

                    // 初始化优秀社团开关状态（确保在权限校验通过后才绑定和初始化）
                    const greatClubSwitch = document.getElementById('greatClubSwitch');
                    const greatClubText = document.getElementById('greatClubText');
                    greatClubSwitch.checked = IS_GREAT;
                    greatClubText.textContent = IS_GREAT ? '是' : '否';

                    greatClubSwitch.addEventListener('change', function() {
                        IS_GREAT = this.checked;
                        greatClubText.textContent = this.checked ? '是' : '否';
                    });
                }
            } else if (result.code === 401) {
                openNotice26(false, { title: "权限校验失败", msg: "未登录或登录已失效", subMsg: "请重新登录后再试。" });
            } else {
                openNotice26(false, { title: "权限校验失败", msg: result.message || "无法获取用户身份", subMsg: "请刷新页面重试。" });
            }
        })
        .catch(() => {
            openNotice26(false, { title: "网络错误", msg: "获取用户身份失败", subMsg: "请检查网络连接或尝试关闭VPN。" });
        });
// 获取当前用户身份并控制“优秀社团”按钮的显隐
    fetch('/api/user/current')
        .then(res => res.json())
        .then(result => {
            if (result.code === 200 && result.data) {
                const userRight = result.data.userRight;
                // userRight: 2-老师, 3-管理员
                if (userRight === 2 || userRight === 3) {
                    document.getElementById('great-club-row').style.display = 'flex';

                    // 初始化优秀社团开关状态（确保在权限校验通过后才绑定和初始化）
                    const greatClubSwitch = document.getElementById('greatClubSwitch');
                    const greatClubText = document.getElementById('greatClubText');
                    greatClubSwitch.checked = IS_GREAT;
                    greatClubText.textContent = IS_GREAT ? '是' : '否';

                    greatClubSwitch.addEventListener('change', function() {
                        IS_GREAT = this.checked;
                        greatClubText.textContent = this.checked ? '是' : '否';
                    });
                }
            } else if (result.code === 401) {
                openNotice26(false, { title: "权限校验失败", msg: "未登录或登录已失效", subMsg: "请重新登录后再试。" });
            } else {
                openNotice26(false, { title: "权限校验失败", msg: result.message || "无法获取用户身份", subMsg: "请刷新页面重试。" });
            }
        })
        .catch(() => {
            openNotice26(false, { title: "网络错误", msg: "获取用户身份失败", subMsg: "请检查网络连接或尝试关闭VPN。" });
        });
// 获取当前用户身份并控制“优秀社团”按钮的显隐
    fetch('/api/user/current')
        .then(res => res.json())
        .then(result => {
            if (result.code === 200 && result.data) {
                const userRight = result.data.userRight;
                // userRight: 2-老师, 3-管理员
                if (userRight === 2 || userRight === 3) {
                    document.getElementById('great-club-row').style.display = 'flex';

                    // 初始化优秀社团开关状态（确保在权限校验通过后才绑定和初始化）
                    const greatClubSwitch = document.getElementById('greatClubSwitch');
                    const greatClubText = document.getElementById('greatClubText');
                    greatClubSwitch.checked = IS_GREAT;
                    greatClubText.textContent = IS_GREAT ? '是' : '否';

                    greatClubSwitch.addEventListener('change', function() {
                        IS_GREAT = this.checked;
                        greatClubText.textContent = this.checked ? '是' : '否';
                    });
                }
            } else if (result.code === 401) {
                openNotice26(false, { title: "权限校验失败", msg: "未登录或登录已失效", subMsg: "请重新登录后再试。" });
            } else {
                openNotice26(false, { title: "权限校验失败", msg: result.message || "无法获取用户身份", subMsg: "请刷新页面重试。" });
            }
        })
        .catch(() => {
            openNotice26(false, { title: "网络错误", msg: "获取用户身份失败", subMsg: "请检查网络连接或尝试关闭VPN。" });
        });

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
        // Booking identity is based on a server-side session established only after password verification.
        HttpSession oldSession = request.getSession(false);
        if (oldSession != null) oldSession.invalidate();
        HttpSession authenticatedSession = request.getSession(true);
        authenticatedSession.setAttribute("authenticatedEmail", user.getEmail());
        if(loginProtection!=null)loginProtection.success(throttleEmail);
        authenticatedSession.setMaxInactiveInterval(7 * 24 * 60 * 60);

        if (rememberMe != null) {
            if (loginDTO.isRememberMe()) rememberMe.issue(user, request, response);
            else rememberMe.revoke(request, response);
        }
        // --- 密码正确，写入 Cookie ---
        Cookie userCookie = new Cookie("user_session", email); // 直接用前端传来的 email 即可
        userCookie.setMaxAge(-1);
        userCookie.setPath("/");
        userCookie.setHttpOnly(true);
        response.addCookie(userCookie);

        return ResponseMessage.success(user);
    }

    @GetMapping("/logout")
    public ResponseMessage<String> logout(HttpServletRequest request, HttpServletResponse response) {
        if (rememberMe != null) rememberMe.revoke(request, response);
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
     * 撤销社长/副社长
     * POST /api/user/revoke-president
     * 请求体：{ "userId": 1 }
     * 权限：老师可以撤销自己指导社团的社长，管理员可以撤销任何社长
     */
    @PostMapping("/revoke-president")
    public ResponseMessage<String> revokePresident(
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {

        UserBase currentUser = (UserBase) request.getAttribute("currentUser");
        if (currentUser == null || currentUser.getUserRight() < 2) {
            return ResponseMessage.error("无权限：只有老师和管理员可以撤销社长");
        }

        Object userIdValue = requestBody.get("userId");
        if (userIdValue == null) {
            return ResponseMessage.error("社长ID不能为空");
        }

        try {
            Long presidentId = Long.valueOf(userIdValue.toString());
            ClubPresident targetPresident = userService.findClubPresidentByID(presidentId);

            if (currentUser.getUserRight() == 2 && currentUser instanceof Teacher teacher) {
                Club targetClub = targetPresident.getMainClub();
                boolean hasPermission = targetClub != null
                        && teacher.getClubs() != null
                        && teacher.getClubs().stream()
                        .anyMatch(club -> Objects.equals(club.getId(), targetClub.getId()));

                if (!hasPermission) {
                    return ResponseMessage.error("无权限：您只能撤销自己指导社团的社长");
                }
            }

            userService.revokePresident(presidentId);
            return ResponseMessage.success("社长身份已撤销");
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
     * 获取当前登录用户的信息
     * GET /api/user/current
     * 作用：供前端 navbar.html 动态校验用户的登录状态，控制“登录/注册”按钮与头像的显隐
     */
    @GetMapping("/current")
    public ResponseMessage<UserBase> getCurrentUser(HttpServletRequest request) {
        // 1. 从刚才恢复的 AuthFilter 注入的 request 属性中获取当前登录用户
        UserBase currentUser = (UserBase) request.getAttribute("currentUser");

        // 2. 如果 Filter 没有找到有效 Session/Cookie（用户未登录），返回 401 状态码或错误提示
        if (currentUser == null) {
            return new ResponseMessage<>(401, "用户未登录", null);
        }

        // 3. 用户已登录，将查出的高优先级实体类对象（如已完美兼容多身份的 ClubPresident）返回给前端
        return ResponseMessage.success(currentUser);
    }
}
