package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.dto.User.*;

import java.util.List;
import java.util.Map;

public interface IUserService {

    Teacher addTeacher(TeacherDTO teacherDTO);
    User addUser(UserDTO userDTO);
    ClubPresident addClubPresident(ClubPresidentDTO cpDTO);
    Admin addAdmin(AdminDTO adminDTO);

    Teacher update(TeacherDTO  teacherDTO);
    Admin update(AdminDTO adminDTO);
    ClubPresident update(ClubPresidentDTO clubPresidentDTO);
    User update(UserDTO userDTO);

    void delete(Long userId, int userRight);
    void delete(String nameEn);

    Teacher findTeacherByID(Long id);
    Admin findAdminByID(Long id);
    ClubPresident findClubPresidentByID(Long id);
    User findUserById(Long id);

    boolean hasUser(String nameEn);

    <T extends UserBase> T findByNameEn(String nameEn);
    <T extends UserBase> T findByEmail(String email);

    List<Map<String, Object>> getClubMembersWithRoles(Integer clubId);
    void updateClubStaffRole(Integer clubId, Long targetUserId, String newRole);
    void addStudentToClubRelationship(Long userId, Integer clubId);
    void removeStudentFromClubRelationship(Long userId, Integer clubId);

    Admin transferAdmin(User u);

}
