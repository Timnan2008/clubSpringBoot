package com.qpwflshclub.formal_club.service.User;

import com.qpwflshclub.formal_club.pojo.User.*;
import com.qpwflshclub.formal_club.pojo.dto.User.*;
import com.qpwflshclub.formal_club.repository.User.AdminRepository;
import com.qpwflshclub.formal_club.repository.User.ClubPresidentRepository;
import com.qpwflshclub.formal_club.repository.User.TeacherRepository;
import com.qpwflshclub.formal_club.repository.User.UserRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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



    //增
    @Override
    public Teacher addTeacher(TeacherDTO teacherDTO) {
        Teacher teacher = new Teacher();
        BeanUtils.copyProperties(teacherDTO, teacher, "id");
        return teacherRepository.save(teacher);
    }

    @Override
    public User addUser(UserDTO userDTO) {
        User user = new User();
        BeanUtils.copyProperties(userDTO, user, "id");
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
        throw new IllegalArgumentException("没有找到该用户");
    }


}
