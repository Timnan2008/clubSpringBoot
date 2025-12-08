package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class TeacherDTO {

    private Long id;

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    @NotNull(message = "教师名称不能为空")
    private String teacherName;

    @NotNull(message = "教师英文名称不能为空")
    private String teacherNameEn;

    public String getTeacherNameEn() {
        return teacherNameEn;
    }

    public void setTeacherNameEn(String teacherNameEn) {
        this.teacherNameEn = teacherNameEn;
    }

    public List<Club> getDirectedClubs() {
        return directedClubs;
    }

    public void setDirectedClubs(List<Club> directedClubs) {
        this.directedClubs = directedClubs;
    }

    @NotNull(message = "教师密码不能为空")
    private String teacherPassword;
    @NotNull(message = "教师邮箱不能为空")
    private String teacherEmail;


    public final static Integer userRight = 2;

    @NotNull(message = "指导的社团不能为空")
    public List<Club> directedClubs;

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
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
}
