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
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
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
        user.setClubs(findClubsByIds(userDTO.getClubs()));

        return userRepository.save(user);
    }

    @Override
    public ClubPresident addClubPresident(ClubPresidentDTO cpDTO) {
        ClubPresident cp = new ClubPresident();
        BeanUtils.copyProperties(cpDTO, cp, "id", "clubs", "clubPresidentClubs", "clubPresidentMainClub");
        cp.setClubPresidentClubs(findClubsByIds(cpDTO.getClubs()));
        cp.setClubPresidentMainClub(findClubByLongId(cpDTO.getClubPresidentMainClub()));
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

        BeanUtils.copyProperties(clubPresidentDTO, existingClubPresident, "id", "clubs", "clubPresidentClubs", "clubPresidentMainClub");
        if (clubPresidentDTO.getClubs() != null) {
            existingClubPresident.setClubPresidentClubs(findClubsByIds(clubPresidentDTO.getClubs()));
        }
        if (clubPresidentDTO.getClubPresidentMainClub() != null) {
            existingClubPresident.setClubPresidentMainClub(findClubByLongId(clubPresidentDTO.getClubPresidentMainClub()));
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
    public void delate(Long userId) {
        userRepository.deleteById(userId);
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

    @Override
    public List<Club> findManageableClubs(String managerType, Long managerId) {
        return switch (managerType) {
            case "admin" -> allClubs();
            case "teacher" -> clubsOrEmpty(findTeacherByID(managerId).getClubs());
            case "club-president" -> findPresidentManageableClubs(findClubPresidentByID(managerId));
            default -> throw new IllegalArgumentException("当前身份不能管理社团");
        };
    }

    @Override
    public List<ClubMemberVO> findClubMembers(Integer clubId, String managerType, Long managerId) {
        Club club = findClubById(clubId);
        requireManagePermission(clubId, managerType, managerId);

        return allUsers().stream()
                .filter(user -> isMemberOfClub(user, club.getId()))
                .map(user -> ClubMemberVO.fromUser(user, true))
                .toList();
    }

    @Override
    public List<ClubMemberVO> searchStudents(Integer clubId, String keyword, String managerType, Long managerId) {
        Club club = findClubById(clubId);
        requireManagePermission(club.getId(), managerType, managerId);

        String text = keyword == null ? "" : keyword.trim().toLowerCase();

        return allUsers().stream()
                .filter(user -> matchesStudentKeyword(user, text))
                .map(user -> ClubMemberVO.fromUser(user, isMemberOfClub(user, club.getId())))
                .toList();
    }

    @Override
    @Transactional
    public ClubMemberVO addStudentToClub(Integer clubId, Long studentId, String managerType, Long managerId) {
        Club club = findClubById(clubId);
        requireManagePermission(club.getId(), managerType, managerId);

        User student = findUserById(studentId);
        List<Club> clubs = new ArrayList<>(clubsOrEmpty(student.getClubs()));

        if (!hasClub(clubs, club.getId())) {
            clubs.add(club);
            student.setClubs(clubs);
            userRepository.save(student);
        }

        return ClubMemberVO.fromUser(student, true);
    }

    @Override
    @Transactional
    public ClubMemberVO removeStudentFromClub(Integer clubId, Long studentId, String managerType, Long managerId) {
        Club club = findClubById(clubId);
        requireManagePermission(club.getId(), managerType, managerId);

        User student = findUserById(studentId);
        List<Club> clubs = new ArrayList<>(clubsOrEmpty(student.getClubs()));
        clubs.removeIf(item -> Objects.equals(item.getId(), club.getId()));
        student.setClubs(clubs);
        userRepository.save(student);

        return ClubMemberVO.fromUser(student, false);
    }

    private List<Club> findClubsByIds(List<Long> clubIds) {
        if (clubIds == null || clubIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<Integer> ids = clubIds.stream()
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .collect(Collectors.toList());

        List<Club> clubs = new ArrayList<>();
        clubRepository.findAllById(ids).forEach(clubs::add);
        return clubs;
    }

    private Club findClubByLongId(Long clubId) {
        if (clubId == null) {
            return null;
        }
        return findClubById(clubId.intValue());
    }

    private Club findClubById(Integer clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new IllegalArgumentException("没有找到该社团"));
    }

    private List<Club> allClubs() {
        List<Club> clubs = new ArrayList<>();
        clubRepository.findAll().forEach(clubs::add);
        return clubs;
    }

    private List<User> allUsers() {
        List<User> users = new ArrayList<>();
        userRepository.findAll().forEach(users::add);
        return users;
    }

    private List<Club> clubsOrEmpty(List<Club> clubs) {
        if (clubs == null) {
            return Collections.emptyList();
        }
        return clubs;
    }

    private List<Club> findPresidentManageableClubs(ClubPresident clubPresident) {
        Map<Integer, Club> clubs = new LinkedHashMap<>();

        Club mainClub = clubPresident.getClubPresidentMainClub();
        if (mainClub != null) {
            clubs.put(mainClub.getId(), mainClub);
        }

        clubsOrEmpty(clubPresident.getClubs()).forEach(club -> clubs.put(club.getId(), club));

        return new ArrayList<>(clubs.values());
    }

    private void requireManagePermission(Integer clubId, String managerType, Long managerId) {
        if (!canManageClub(clubId, managerType, managerId)) {
            throw new IllegalArgumentException("没有权限管理该社团");
        }
    }

    private boolean canManageClub(Integer clubId, String managerType, Long managerId) {
        if (managerType == null || managerId == null) {
            return false;
        }

        if ("admin".equals(managerType)) {
            findAdminByID(managerId);
            return true;
        }

        if ("teacher".equals(managerType)) {
            Teacher teacher = findTeacherByID(managerId);
            return hasClub(teacher.getClubs(), clubId);
        }

        if ("club-president".equals(managerType)) {
            ClubPresident clubPresident = findClubPresidentByID(managerId);
            Club mainClub = clubPresident.getClubPresidentMainClub();
            return (mainClub != null && Objects.equals(mainClub.getId(), clubId))
                    || hasClub(clubPresident.getClubs(), clubId);
        }

        return false;
    }

    private boolean hasClub(List<Club> clubs, Integer clubId) {
        return clubs != null && clubs.stream().anyMatch(club -> Objects.equals(club.getId(), clubId));
    }

    private boolean isMemberOfClub(User user, Integer clubId) {
        return hasClub(user.getClubs(), clubId);
    }

    private boolean matchesStudentKeyword(User user, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }

        return containsIgnoreCase(user.getUsername(), keyword)
                || containsIgnoreCase(user.getUsernameEn(), keyword);
    }

    private boolean containsIgnoreCase(String value, String keyword) {
        return value != null && value.toLowerCase().contains(keyword);
    }

}
