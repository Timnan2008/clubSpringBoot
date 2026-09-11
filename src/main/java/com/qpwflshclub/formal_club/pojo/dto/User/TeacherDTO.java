package com.qpwflshclub.formal_club.pojo.dto.User;

import com.fasterxml.jackson.annotation.JsonTypeName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@JsonTypeName("Teacher")
public class TeacherDTO implements UserBaseDTO{

    private String studentNumber,nickname;
    public String getStudentNumber(){return studentNumber;} public void setStudentNumber(String value){studentNumber=value;}
    public String getNickname(){return nickname;} public void setNickname(String value){nickname=value;}
    private String emailCode;
    public String getEmailCode(){return emailCode;} public void setEmailCode(String value){emailCode=value;}
    private String turnstileToken;
    public String getTurnstileToken(){return turnstileToken;}
    public void setTurnstileToken(String token){turnstileToken=token;}
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


    @Override
    public void setId(long id) {
        this.id = id;
    }

    private String teacherName = "";

    private String teacherNameEn = "";

    @NotNull(message = "教师密码不能为空")
    private String teacherPassword;
    @NotNull(message = "教师邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String teacherEmail;

    public final static Integer userRight = 2;


    public List<Long> Clubs;

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
        return Clubs;
    }

    @Override
    public void setClubs(List<Long> clubs) {
        this.Clubs = clubs;
    }

}
