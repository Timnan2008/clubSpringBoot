package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class AdminDTO {


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


    private Long id;

    @NotNull(message = "管理员名称不能为空")
    public String adminName;
    @NotNull(message = "管理员英文名称不能为空")
    private String adminNameEn;
    @NotNull(message = "管理员密码不能为空")
    public String adminPassword;
    @NotNull(message = "管理员邮箱不能为空")
    public String adminEmail;

    public final static Integer userRight = 3;

    public String getAdminName() {
        return adminName;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }

    public String getAdminPassword() {
        return adminPassword;
    }

    public void setAdminPassword(String adminPassword) {
        this.adminPassword = adminPassword;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public void setAdminEmail(String adminEmail) {
        this.adminEmail = adminEmail;
    }

    public List<Club> getClubs() {
        return clubs;
    }

    public void setClubs(List<Club> clubs) {
        this.clubs = clubs;
    }

    @NotNull(message = "管理员的社团不能为空")
    public List<Club> clubs;



}
