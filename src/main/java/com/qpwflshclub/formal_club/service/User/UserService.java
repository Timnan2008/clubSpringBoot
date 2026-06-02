package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.dto.User.*;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.repository.User.AdminRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.User.TeacherRepository;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class UserService implements IUserService{

    @Autowired
    TeacherRepository teacherRepository;

    @Autowired
    AdminRepository adminRepository;

    @Autowired
    ClubPresidentRepository clubPresidentRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ClubRepository clubRepository;

    //增
    @Override
    public Teacher addTeacher(TeacherDTO teacherDTO) {
        Teacher teacher = new Teacher();
        BeanUtils.copyProperties(teacherDTO, teacher, "id", "clubs");
        teacher.setClubs(findClubsByIds(teacherDTO.getClubs()));
        return teacherRepository.save(teacher);
    }

    @Override
    public User addUser(UserDTO userDTO) {
        User user = new User();

        BeanUtils.copyProperties(userDTO, user, "id", "clubs");
        List<Club> clubs = findClubsByIds(userDTO.getClubs());
        if (!clubs.isEmpty()) {
            user.setClubs(clubs);
        }

        return userRepository.save(user);
    }

    @Override
    public ClubPresident addClubPresident(ClubPresidentDTO cpDTO) {
        ClubPresident cp = new ClubPresident();
        BeanUtils.copyProperties(cpDTO, cp, "id", "clubs", "mainClub", "mainClubId");
        cp.setClubs(findClubsByIds(cpDTO.getClubs()));
        cp.setMainClub(findClubByLongId(cpDTO.getMainClubId()));
        cp.setVicePresident(cpDTO.isVicePresident());
        return clubPresidentRepository.save(cp);
    }

    @Override
    public Admin addAdmin(AdminDTO adminDTO) {
        Admin admin = new Admin();
        BeanUtils.copyProperties(adminDTO, admin, "id", "clubs");
        admin.setClubs(findClubsByIds(adminDTO.getClubs()));
        return adminRepository.save(admin);
    }


    //改
    @Override
    public Teacher update(TeacherDTO teacherDTO) {
        Teacher existingTeacher = teacherRepository.findById(teacherDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该教师"));

        BeanUtils.copyProperties(teacherDTO, existingTeacher, "id", "clubs");
        if (teacherDTO.getClubs() != null) {
            existingTeacher.setClubs(findClubsByIds(teacherDTO.getClubs()));
        }

        return teacherRepository.save(existingTeacher);

    }

    @Override
    public Admin update(AdminDTO adminDTO) {
        Admin existingAdmin = adminRepository.findById(adminDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该管理员"));

        BeanUtils.copyProperties(adminDTO, existingAdmin, "id", "clubs");
        if (adminDTO.getClubs() != null) {
            existingAdmin.setClubs(findClubsByIds(adminDTO.getClubs()));
        }

        return adminRepository.save(existingAdmin);
    }

    @Override
    public ClubPresident update(ClubPresidentDTO clubPresidentDTO) {
        ClubPresident existingClubPresident = clubPresidentRepository.findById(clubPresidentDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该社长"));

        BeanUtils.copyProperties(clubPresidentDTO, existingClubPresident, "id", "clubs", "mainClub", "mainClubId");
        if (clubPresidentDTO.getClubs() != null) {
            existingClubPresident.setClubs(findClubsByIds(clubPresidentDTO.getClubs()));
        }
        if (clubPresidentDTO.getMainClubId() != null) {
            existingClubPresident.setMainClub(findClubByLongId(clubPresidentDTO.getMainClubId()));
        }

        return clubPresidentRepository.save(existingClubPresident);
    }

    @Override
    public User update(UserDTO userDTO) {
        User existingUser = userRepository.findById(userDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该用户"));

        BeanUtils.copyProperties(userDTO, existingUser, "id", "clubs");
        if (userDTO.getClubs() != null) {
            existingUser.setClubs(findClubsByIds(userDTO.getClubs()));
        }

        return userRepository.save(existingUser);
    }




    //删
    @Override
    public void delete(Long userId, int userRight) {
        if(userRight == 0){
            userRepository.deleteById(userId);
        }else if(userRight == 1){
            clubPresidentRepository.deleteById(userId);
        }else if(userRight == 2){
            teacherRepository.deleteById(userId);
        }else{
            adminRepository.deleteById(userId);
        }

    }

    @Override
    public void delete(String nameEn){
        for(User user : userRepository.findAll()){
            if(user.getUsernameEn().equals(nameEn)){
                userRepository.deleteById(user.getId());
            }
        }
        for(Teacher teacher : teacherRepository.findAll()){
            if(teacher.getUsernameEn().equals(nameEn)){
                teacherRepository.deleteById(teacher.getId());
            }
        }
        for (ClubPresident cp : clubPresidentRepository.findAll()){
            if(cp.getUsernameEn().equals(nameEn)){
                clubPresidentRepository.deleteById(cp.getId());
            }
        }
        for(Admin admin : adminRepository.findAll()){
            if(admin.getUsernameEn().equals(nameEn)){
                adminRepository.deleteById(admin.getId());
            }
        }
    }




    //查
    @Override
    public Teacher findTeacherByID(Long id) {
        return teacherRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("没有找到该教师"));
    }

    @Override
    public Admin findAdminByID(Long id) {
        return adminRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("没有找到该管理员"));
    }

    @Override
    public ClubPresident findClubPresidentByID(Long id) {
        return clubPresidentRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("没有找到该社长"));
    }

    @Override
    public ClubPresident findClubPresidentByUsernameEn(String usernameEn) {
        return clubPresidentRepository.findByUsernameEn(usernameEn)
                .orElseThrow(() -> new IllegalArgumentException("没有找到该社长"));
    }

    @Override
    public User findUserById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("没有找到该用户"));
    }

    @Override
    public boolean hasUser(String nameEn){
        for(User user : userRepository.findAll()){
            if(user.getUsernameEn().equals(nameEn)){
                return true;
            }
        }
        for(Teacher teacher : teacherRepository.findAll()){
            if(teacher.getUsernameEn().equals(nameEn)){
                return true;
            }
        }
        for (ClubPresident cp : clubPresidentRepository.findAll()){
            if(cp.getUsernameEn().equals(nameEn)){
                return true;
            }
        }

        return false;
    }

    @Override
    public <T extends UserBase> T findByNameEn(String nameEn) {
        for(User user : userRepository.findAll()){
            if(user.getUsernameEn().equals(nameEn)){
                return (T) user;
            }
        }
        for(Teacher teacher : teacherRepository.findAll()){
            if(teacher.getUsernameEn().equals(nameEn)){
                return (T) teacher;
            }
        }
        for (ClubPresident cp : clubPresidentRepository.findAll()){
            if(cp.getUsernameEn().equals(nameEn)){
                return (T) cp;
            }
        }
        for (Admin admin : adminRepository.findAll()){
            if(admin.getUsernameEn().equals(nameEn)){
                return (T) admin;
            }
        }
        return null;
    }

    /*
    @Override
    public <T extends UserBase> T findByEmail(String email) {
        for (User user : userRepository.findAll()) {
            if (user.getEmail().equals(email)) {
                return (T) user;
            }
        }
        
        for (Teacher teacher : teacherRepository.findAll()) {
            if (teacher.getEmail().equals(email)) {
                return (T) teacher;
            }
        }
        
        for (ClubPresident cp : clubPresidentRepository.findAll()) {
            if (cp.getEmail().equals(email)) {
                return (T) cp;
            }
        }
        
        for (Admin admin : adminRepository.findAll()) {
            if (admin.getEmail().equals(email)) {
                return (T) admin;
            }
        }
        
        return null;
    }

     */
    @Override
    @SuppressWarnings("unchecked")
    public <T extends UserBase> T findByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }

        // 🌟 1. 优先级最高：先去社长/副社长表里查
        // 如果该邮箱存在于社长表中，直接返回社长对象。
        // 这样就截断了后续对普通用户表的查询，完美规避了 user 表残留数据的干扰！
        ClubPresident president = clubPresidentRepository.findByEmail(email);
        if (president != null) {
            return (T) president;
        }

        // 2. 优先级第二：如果不是社长，再去普通用户（学生）表里查
        User student = userRepository.findByEmail(email);
        if (student != null) {
            return (T) student;
        }

        // 3. 优先级第三：去老师表查
        Teacher teacher = teacherRepository.findByEmail(email);
        if (teacher != null) {
            return (T) teacher;
        }

        // 4. 优先级第四：去管理员表查
        Admin admin = adminRepository.findByAdminEmail(email);
        if (admin != null) {
            return (T) admin;
        }

        return null;
    }

    /* ========================================================================= */
    /* 以下为整合多表关联的社团交互底座核心                    */
    /* ========================================================================= */

    private List<Club> findClubsByIds(List<Long> clubIds) {
        List<Club> clubs = new ArrayList<>();
        if (clubIds == null || clubIds.isEmpty()) {
            return clubs;
        }

        List<Integer> ids = clubIds.stream()
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .collect(Collectors.toList());
        clubRepository.findAllById(ids).forEach(clubs::add);
        return clubs;
    }

    private Club findClubByLongId(Long clubId) {
        if (clubId == null) {
            return null;
        }
        return clubRepository.findById(clubId.intValue()).orElse(null);
    }

    private boolean hasClub(List<Club> clubs, Integer clubId) {
        return clubs != null && clubs.stream().anyMatch(club -> Objects.equals(club.getId(), clubId));
    }

    private boolean matchesStudentKeyword(User user, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return false;
        }

        return containsIgnoreCase(user.getUsername(), keyword)
                || containsIgnoreCase(user.getUsernameEn(), keyword);
    }

    private boolean containsIgnoreCase(String value, String keyword) {
        return value != null && value.toLowerCase().contains(keyword);
    }

    @Override
    public List<Map<String, Object>> getClubMembersWithRoles(Integer clubId) {
        java.util.ArrayList<Map<String, Object>> list = new java.util.ArrayList<>();
        Club club = clubRepository.findById(clubId).orElse(null);
        if (club == null) return list;

        // 1. 扫描所有普通学生
        for (User u : userRepository.findAll()) {
            if (hasClub(u.getClubs(), clubId)) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("userId", u.getId());
                m.put("username", u.getUsername());
                m.put("usernameEn", u.getUsernameEn());
                m.put("roleInClub", "member"); // 普通学生在这个社团是普通社员
                list.add(m);
            }
        }

        // 2. 扫描社长及副社长池
        for (ClubPresident cp : clubPresidentRepository.findAll()) {
            // 判定该人在此社团中是否担任正/副社长
            if (cp.getMainClub() != null && Objects.equals(cp.getMainClub().getId(), clubId)) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("userId", cp.getId());
                m.put("username", cp.getUsername());
                m.put("usernameEn", cp.getUsernameEn());
                m.put("roleInClub", cp.isVicePresident() ? "vice_president" : "president");
                list.add(m);
            }
            // 如果此人在这个社团仅仅挂名作为普通成员
            else if (hasClub(cp.getClubs(), clubId)) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("userId", cp.getId());
                m.put("username", cp.getUsername());
                m.put("usernameEn", cp.getUsernameEn());
                m.put("roleInClub", "member");
                list.add(m);
            }
        }
        return list;
    }

    @Override
    public List<Map<String, Object>> searchStudentsForClub(Integer clubId, String keyword) {
        List<Map<String, Object>> result = new ArrayList<>();
        Club club = clubRepository.findById(clubId).orElse(null);
        if (club == null) return result;

        String text = keyword == null ? "" : keyword.trim().toLowerCase();
        for (User student : userRepository.findAll()) {
            if (!matchesStudentKeyword(student, text)) {
                continue;
            }

            boolean isMember = hasClub(student.getClubs(), club.getId());
            Map<String, Object> item = new HashMap<>();
            item.put("userId", student.getId());
            item.put("username", student.getUsername());
            item.put("usernameEn", student.getUsernameEn());
            item.put("member", isMember);
            item.put("roleInClub", isMember ? "member" : "none");
            result.add(item);
        }
        return result;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void updateClubStaffRole(Integer clubId, Long targetUserId, String newRole) {
        Club club = clubRepository.findById(clubId).orElseThrow(() -> new RuntimeException("社团不存在"));

        // 逻辑：如果要把某个用户设为社长/副社长
        if ("president".equals(newRole) || "vice_president".equals(newRole)) {
            // 先尝试从社长表里找人
            ClubPresident cp = clubPresidentRepository.findById(targetUserId).orElse(null);
            if (cp == null) {
                // 如果在社长表找不到，说明原来只是普通学生，需从 User 转到 ClubPresident（这里根据你的多继承或数据模型而定）
                User user = userRepository.findById(targetUserId).orElseThrow(() -> new RuntimeException("未定位到学生数据"));
                cp = new ClubPresident();
                cp.setUsername(user.getUsername());
                cp.setUsernameEn(user.getUsernameEn());
                cp.setEmail(user.getEmail());
                cp.setPassword(user.getPassword());
                // 不能从普通用户表抹除，升职到社长管理表
                //不能userRepository.delete(user);
            }
            cp.setMainClub(club);
            cp.setVicePresident("vice_president".equals(newRole));
            clubPresidentRepository.save(cp);
        }
        // 降职为普通成员
        else if ("member".equals(newRole)) {
            ClubPresident cp = clubPresidentRepository.findById(targetUserId).orElse(null);
            if (cp != null) {
                /* 如果原来在社长表里，降职后转回普通 User 表维护
                User user = new User();
                user.setUsername(cp.getUsername());
                user.setUsernameEn(cp.getUsernameEn());
                user.setEmail(cp.getEmail());
                user.setPassword(cp.getPassword());
                user.setClubs(new java.util.ArrayList<>());
                user.getClubs().add(club);
                userRepository.save(user);
                */
                clubPresidentRepository.delete(cp);
            }
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void addStudentToClubRelationship(Long userId, Integer clubId) {
        Club club = clubRepository.findById(clubId).orElseThrow(() -> new RuntimeException("社团不存在"));

        // 分别对不同的角色实体进行多对多集合压入
        User u = userRepository.findById(userId).orElse(null);
        if (u != null) {
            if (u.getClubs() == null) u.setClubs(new java.util.ArrayList<>());
            if (!hasClub(u.getClubs(), club.getId())) {
                u.getClubs().add(club);
                userRepository.save(u);
            }
            return;
        }

        ClubPresident cp = clubPresidentRepository.findById(userId).orElse(null);
        if (cp != null) {
            if (cp.getClubs() == null) cp.setClubs(new java.util.ArrayList<>());
            if (!hasClub(cp.getClubs(), club.getId())) {
                cp.getClubs().add(club);
                clubPresidentRepository.save(cp);
            }
            return;
        }
        throw new RuntimeException("未找到学生数据");
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void removeStudentFromClubRelationship(Long userId, Integer clubId) {
        User u = userRepository.findById(userId).orElse(null);
        if (u != null && u.getClubs() != null) {
            u.getClubs().removeIf(c -> Objects.equals(c.getId(), clubId));
            userRepository.save(u);
            return;
        }

        ClubPresident cp = clubPresidentRepository.findById(userId).orElse(null);
        if (cp != null) {
            // 如果他是这个社团的主负责人，退出社团时顺便清除正副社长官职
            if (cp.getMainClub() != null && Objects.equals(cp.getMainClub().getId(), clubId)) {
                cp.setMainClub(null);
            }
            if (cp.getClubs() != null) {
                cp.getClubs().removeIf(c -> Objects.equals(c.getId(), clubId));
            }
            clubPresidentRepository.save(cp);
        }
    }


    @Override
    public Admin transferAdmin(User u){

        Admin admin = new Admin();

        admin.setUsername(u.getUsername());
        admin.setUsernameEn(u.getUsernameEn());
        admin.setEmail(u.getEmail());
        admin.setPassword(u.getPassword());
        admin.setClubs(new java.util.ArrayList<>());
        admin.getClubs().addAll(u.getClubs());

        userRepository.delete(u);

        return adminRepository.save(admin);
    }

    @Override
    public Admin transferAdmin(Teacher u){

        Admin admin = new Admin();

        admin.setUsername(u.getUsername());
        admin.setUsernameEn(u.getUsernameEn());
        admin.setEmail(u.getEmail());
        admin.setPassword(u.getPassword());
        admin.setClubs(new java.util.ArrayList<>());
        admin.getClubs().addAll(u.getClubs());

        teacherRepository.delete(u);

        return adminRepository.save(admin);
    }

    @Override
    public Admin transferAdmin(ClubPresident u){

        Admin admin = new Admin();

        admin.setUsername(u.getUsername());
        admin.setUsernameEn(u.getUsernameEn());
        admin.setEmail(u.getEmail());
        admin.setPassword(u.getPassword());
        admin.setClubs(new java.util.ArrayList<>());
        admin.getClubs().addAll(u.getClubs());

        clubPresidentRepository.delete(u);

        return adminRepository.save(admin);
    }

    @Override
    public List<UserBase> findAllUsers() {
        List<UserBase> allUsers = new java.util.ArrayList<>();

        // 分别读出四张表的所有用户
        allUsers.addAll((Collection<? extends UserBase>) userRepository.findAll());
        allUsers.addAll((Collection<? extends UserBase>) teacherRepository.findAll());
        allUsers.addAll((Collection<? extends UserBase>) clubPresidentRepository.findAll());
        allUsers.addAll((Collection<? extends UserBase>) adminRepository.findAll());

        // 按照数字-字母-汉字排序
        allUsers.sort((u1, u2) -> {
            String name1 = u1.getUsername() != null ? u1.getUsername() : u1.getUsernameEn() != null ? u1.getUsernameEn() : "";
            String name2 = u2.getUsername() != null ? u2.getUsername() : u2.getUsernameEn() != null ? u2.getUsernameEn() : "";
            return compareChineseStrings(name1, name2);
        });

        return allUsers;
    }

    /**
     * 按数字-字母-汉字顺序排序的比较器
     * 数字排在最前，然后是字母，最后是汉字
     */
    private int compareChineseStrings(String s1, String s2) {
        for (int i = 0; i < Math.min(s1.length(), s2.length()); i++) {
            char c1 = s1.charAt(i);
            char c2 = s2.charAt(i);

            // 检查字符类型
            boolean isDigit1 = Character.isDigit(c1);
            boolean isDigit2 = Character.isDigit(c2);
            boolean isLetter1 = Character.isLetter(c1);
            boolean isLetter2 = Character.isLetter(c2);
            boolean isChinese1 = isChinese(c1);
            boolean isChinese2 = isChinese(c2);

            // 数字优先
            if (isDigit1 && !isDigit2) return -1;
            if (!isDigit1 && isDigit2) return 1;

            // 字母次之
            if (isLetter1 && !isLetter2 && !isDigit2) return -1;
            if (!isLetter1 && isLetter2 && !isDigit1) return 1;

            // 汉字最后
            if (isChinese1 && !isChinese2 && !isDigit2 && !isLetter2) return 1;
            if (!isChinese1 && isChinese2 && !isDigit1 && !isLetter1) return -1;

            // 同类型字符，直接比较
            int result = Character.compare(c1, c2);
            if (result != 0) return result;
        }

        // 如果前面都相同，比较长度
        return Integer.compare(s1.length(), s2.length());
    }

    /**
     * 判断字符是否为汉字
     */
    private boolean isChinese(char c) {
        Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
        return block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_B;
    }

    @Override
    @Transactional
    public UserBase changeRole(String usernameEn, int newRole) {
        // 首先找到用户
        UserBase user = findByNameEn(usernameEn);
        if (user == null) {
            throw new IllegalArgumentException("未找到该用户");
        }

        // 如果用户已经是目标角色，直接返回
        if (user.getUserRight() == newRole) {
            return user;
        }

        // 根据目标角色进行转换
        switch (newRole) {
            case 0 -> {
                return convertToUser(user);
            }
            case 2 -> {
                return convertToTeacher(user);
            }
            case 3 -> {
                return convertToAdmin(user);
            }
            default -> throw new IllegalArgumentException("不支持的目标角色: " + newRole);
        }
    }

    /**
     * 将用户转换为普通用户
     */
    private User convertToUser(UserBase user) {
        User newUser = new User();
        newUser.setUsername(user.getUsername());
        newUser.setUsernameEn(user.getUsernameEn());
        newUser.setEmail(user.getEmail());
        newUser.setPassword(user.getPassword());
        newUser.setClubs(new java.util.ArrayList<>());
        if (user.getClubs() != null) {
            newUser.getClubs().addAll(user.getClubs());
        }

        // 删除原用户
        deleteUserByType(user);

        return userRepository.save(newUser);
    }

    /**
     * 将用户转换为老师
     */
    private Teacher convertToTeacher(UserBase user) {
        Teacher newTeacher = new Teacher();
        newTeacher.setUsername(user.getUsername());
        newTeacher.setUsernameEn(user.getUsernameEn());
        newTeacher.setEmail(user.getEmail());
        newTeacher.setPassword(user.getPassword());
        newTeacher.setClubs(new java.util.ArrayList<>());
        if (user.getClubs() != null) {
            newTeacher.getClubs().addAll(user.getClubs());
        }

        // 删除原用户
        deleteUserByType(user);

        return teacherRepository.save(newTeacher);
    }

    /**
     * 将用户转换为管理员
     */
    private Admin convertToAdmin(UserBase user) {
        Admin newAdmin = new Admin();
        newAdmin.setUsername(user.getUsername());
        newAdmin.setUsernameEn(user.getUsernameEn());
        newAdmin.setEmail(user.getEmail());
        newAdmin.setPassword(user.getPassword());
        newAdmin.setClubs(new java.util.ArrayList<>());
        if (user.getClubs() != null) {
            newAdmin.getClubs().addAll(user.getClubs());
        }

        // 删除原用户
        deleteUserByType(user);

        return adminRepository.save(newAdmin);
    }

    /**
     * 根据用户类型删除用户
     */
    private void deleteUserByType(UserBase user) {
        if (user instanceof User) {
            userRepository.delete((User) user);
        } else if (user instanceof Teacher) {
            teacherRepository.delete((Teacher) user);
        } else if (user instanceof ClubPresident) {
            clubPresidentRepository.delete((ClubPresident) user);
        } else if (user instanceof Admin) {
            adminRepository.delete((Admin) user);
        }
    }

    @Override
    @Transactional
    public ClubPresident appointPresident(String targetUsernameEn, Integer clubId, boolean isVicePresident) {
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new IllegalArgumentException("社团不存在"));

        UserBase targetUser = findByNameEn(targetUsernameEn);
        if (targetUser == null) {
            throw new IllegalArgumentException("目标用户不存在");
        }

        ClubPresident newPresident;

        if (targetUser instanceof ClubPresident existingPresident) {
            newPresident = existingPresident;
        } else {
            newPresident = new ClubPresident();
            newPresident.setUsername(targetUser.getUsername());
            newPresident.setUsernameEn(targetUser.getUsernameEn());
            newPresident.setEmail(targetUser.getEmail());
            newPresident.setPassword(targetUser.getPassword());
            newPresident.setClubs(new ArrayList<>());
            if (targetUser.getClubs() != null) {
                newPresident.getClubs().addAll(targetUser.getClubs());
            }
            // 多身份兼容：不删除原管理员/老师记录，保留原身份
            // deleteUserByType(targetUser);
        }

        newPresident.setMainClub(club);
        newPresident.setVicePresident(isVicePresident);

        if (!hasClub(newPresident.getClubs(), clubId)) {
            newPresident.getClubs().add(club);
        }

        return clubPresidentRepository.save(newPresident);
    }

    @Override
    @Transactional
    public void revokePresident(Long presidentId) {
        if (presidentId == null) {
            throw new IllegalArgumentException("社长ID不能为空");
        }

        ClubPresident president = clubPresidentRepository.findById(presidentId)
                .orElseThrow(() -> new IllegalArgumentException("该用户不是社长或副社长"));

        clubPresidentRepository.delete(president);
    }

    @Override
    public List<Club> getAllClubs() {
        return (List<Club>) clubRepository.findAll();
    }

}
