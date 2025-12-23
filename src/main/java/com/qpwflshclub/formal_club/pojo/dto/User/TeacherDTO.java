package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class TeacherDTO implements UserBaseDTO{

    private Long id;

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public long getId() {
        return this.id;
    }

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public String getTeacherNameEn() {
        return teacherNameEn;
    }

    public void setTeacherNameEn(String teacherNameEn) {
        this.teacherNameEn = teacherNameEn;
    }

    public String getTeacherPassword() {
        return teacherPassword;
    }

    public void setTeacherPassword(String teacherPassword) {
        this.teacherPassword = teacherPassword;
    }

    public String getTeacherEmail() {
        return teacherEmail;
    }

    public void setTeacherEmail(String teacherEmail) {
        this.teacherEmail = teacherEmail;
    }

    public List<Long> getDirectedClubs() {
        return directedClubs;
    }

    public void setDirectedClubs(List<Long> directedClubs) {
        this.directedClubs = directedClubs;
    }

    @Override
    public void setId(long id) {
        this.id = id;
    }

    @NotNull(message = "教师名称不能为空")
    private String teacherName;

    @NotNull(message = "教师英文名称不能为空")
    private String teacherNameEn;

    @NotNull(message = "教师密码不能为空")
    private String teacherPassword;
    @NotNull(message = "教师邮箱不能为空")
    private String teacherEmail;

    public final static Integer userRight = 2;

    @NotNull(message = "指导的社团不能为空")
    public List<Long> directedClubs;

    @Override
    public String getUsername() {
        return teacherName;
    }

    @Override
    public void setUsername(String username) {
        this.teacherName = username;
    }


    @Override
    public String getUsernameEn() {
        return teacherNameEn;
    }

    @Override
    public void setUsernameEn(String usernameEn) {
        this.teacherNameEn = usernameEn;
    }

    @Override
    public String getPassword() {
        return teacherPassword;
    }

    @Override
    public void setPassword(String password) {
        this.teacherPassword = password;
    }

    @Override
    public String getEmail() {
        return teacherEmail;
    }

    @Override
    public void setEmail(String email) {
        this.teacherEmail = email;
    }

    @Override
    public List<Long> getClubs() {
        return  directedClubs;
    }

    @Override
    public void setClubs(List<Long> clubs) {
        this.directedClubs = clubs;
    }

}
