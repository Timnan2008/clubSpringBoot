package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.dto.User.*;

import java.util.List;

public interface IUserService {

    Teacher addTeacher(TeacherDTO teacherDTO);
    User addUser(UserDTO userDTO);
    ClubPresident addClubPresident(ClubPresidentDTO cpDTO);
    Admin addAdmin(AdminDTO adminDTO);

    Teacher update(TeacherDTO  teacherDTO);
    Admin update(AdminDTO adminDTO);
    ClubPresident update(ClubPresidentDTO clubPresidentDTO);
    User update(UserDTO userDTO);

    void delate(Long userId);

    Teacher findTeacherByID(Long id);
    Admin findAdminByID(Long id);
    ClubPresident findClubPresidentByID(Long id);
    User findUserById(Long id);

    boolean hasUser(String nameEn);

    <T extends UserBase> T findByNameEn(String nameEn);
    <T extends UserBase> T findByEmail(String email);

    List<Club> findManageableClubs(String managerType, Long managerId);
    List<ClubMemberVO> findClubMembers(Integer clubId, String managerType, Long managerId);
    List<ClubMemberVO> searchStudents(Integer clubId, String keyword, String managerType, Long managerId);
    ClubMemberVO addStudentToClub(Integer clubId, Long studentId, String managerType, Long managerId);
    ClubMemberVO removeStudentFromClub(Integer clubId, Long studentId, String managerType, Long managerId);

}
