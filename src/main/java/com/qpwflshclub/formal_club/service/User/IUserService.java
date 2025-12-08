package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.dto.User.*;

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

    <T extends UserBase> T findByNameEn(String nameEn);

}
