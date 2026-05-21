package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.dto.User.*;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import com.qpwflshclub.formal_club.repository.User.AdminRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.User.TeacherRepository;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
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
        return teacherRepository.save(teacher);
    }

    @Override
    public User addUser(UserDTO userDTO) {
        User user = new User();

        BeanUtils.copyProperties(userDTO, user, "id", "clubs");
        // 用 id 查 Club
        if (userDTO.getClubs() != null && !userDTO.getClubs().isEmpty()) {
            List<Integer> ids = userDTO.getClubs()
                    .stream()
                    .map(Long::intValue)
                    .collect(Collectors.toList());

            List<Club> clubs = (List<Club>) clubRepository.findAllById(ids);

            user.setClubs(clubs);
        }

        return userRepository.save(user);
    }

    @Override
    public ClubPresident addClubPresident(ClubPresidentDTO cpDTO) {
        ClubPresident cp = new ClubPresident();
        BeanUtils.copyProperties(cpDTO, cp, "id");
        return clubPresidentRepository.save(cp);
    }

    @Override
    public Admin addAdmin(AdminDTO adminDTO) {
        Admin admin = new Admin();
        BeanUtils.copyProperties(adminDTO, admin, "id");
        return adminRepository.save(admin);
    }


    //改
    @Override
    public Teacher update(TeacherDTO teacherDTO) {
        Teacher existingTeacher = teacherRepository.findById(teacherDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该教师"));

        BeanUtils.copyProperties(teacherDTO, existingTeacher);

        return teacherRepository.save(existingTeacher);

    }

    @Override
    public Admin update(AdminDTO adminDTO) {
        Admin existingAdmin = adminRepository.findById(adminDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该管理员"));

        BeanUtils.copyProperties(adminDTO, existingAdmin);

        return adminRepository.save(existingAdmin);
    }

    @Override
    public ClubPresident update(ClubPresidentDTO clubPresidentDTO) {
        ClubPresident existingClubPresident = clubPresidentRepository.findById(clubPresidentDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该社长"));

        BeanUtils.copyProperties(clubPresidentDTO, existingClubPresident);

        return clubPresidentRepository.save(existingClubPresident);
    }

    @Override
    public User update(UserDTO userDTO) {
        User existingUser = userRepository.findById(userDTO.getId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该用户"));

        BeanUtils.copyProperties(userDTO, existingUser);

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

    /* ========================================================================= */
    /* 以下为整合多表关联的社团交互底座核心                    */
    /* ========================================================================= */

    @Override
    public List<Map<String, Object>> getClubMembersWithRoles(Integer clubId) {
        java.util.ArrayList<Map<String, Object>> list = new java.util.ArrayList<>();
        Club club = clubRepository.findById(clubId).orElse(null);
        if (club == null) return list;

        // 1. 扫描所有普通学生
        for (User u : userRepository.findAll()) {
            if (u.getClubs() != null && u.getClubs().stream().anyMatch(c -> c.getId() == clubId)) {
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
            if (cp.getMainClub() != null && cp.getMainClub().getId() == clubId) {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("userId", cp.getId());
                m.put("username", cp.getUsername());
                m.put("usernameEn", cp.getUsernameEn());
                m.put("roleInClub", cp.isVicePresident() ? "vice_president" : "president");
                list.add(m);
            }
            // 如果此人在这个社团仅仅挂名作为普通成员
            else if (cp.getClubs() != null && cp.getClubs().stream().anyMatch(c -> c.getId() == clubId)) {
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
            if (!u.getClubs().contains(club)) {
                u.getClubs().add(club);
                userRepository.save(u);
            }
            return;
        }

        ClubPresident cp = clubPresidentRepository.findById(userId).orElse(null);
        if (cp != null) {
            if (cp.getClubs() == null) cp.setClubs(new java.util.ArrayList<>());
            if (!cp.getClubs().contains(club)) {
                cp.getClubs().add(club);
                clubPresidentRepository.save(cp);
            }
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void removeStudentFromClubRelationship(Long userId, Integer clubId) {
        User u = userRepository.findById(userId).orElse(null);
        if (u != null && u.getClubs() != null) {
            u.getClubs().removeIf(c -> c.getId() == clubId);
            userRepository.save(u);
            return;
        }

        ClubPresident cp = clubPresidentRepository.findById(userId).orElse(null);
        if (cp != null) {
            // 如果他是这个社团的主负责人，退出社团时顺便清除正副社长官职
            if (cp.getMainClub() != null && cp.getMainClub().getId() == clubId) {
                cp.setMainClub(null);
            }
            if (cp.getClubs() != null) {
                cp.getClubs().removeIf(c -> c.getId() == clubId);
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

        // 按照中文名 (Username) 进行排序（如果没中文名按英文名排）
        allUsers.sort((u1, u2) -> {
            String name1 = u1.getUsername() != null ? u1.getUsername() : "";
            String name2 = u2.getUsername() != null ? u2.getUsername() : "";
            return name1.compareTo(name2);
        });

        return allUsers;
    }

}
