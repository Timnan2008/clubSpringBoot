package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class AdminDTO implements UserBaseDTO{


    @Override
    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public long getId() {
        return id;
    }

    @Override
    public void setId(long id) {
        this.id = id;
    }

    private long id;

    @NotNull(message = "管理员名称不能为空")
    public String adminName;
    @NotNull(message = "管理员英文名称不能为空")
    private String adminNameEn;
    @NotNull(message = "管理员密码不能为空")
    public String adminPassword;
    @NotNull(message = "管理员邮箱不能为空")
    public String adminEmail;
    @NotNull(message = "管理员的社团不能为空")
    public List<Club> clubs;

    @Override
    public String getUsername() {
        return adminName;
    }

    public String getAdminName() {
        return adminName;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }

    public String getAdminNameEn() {
        return adminNameEn;
    }

    public void setAdminNameEn(String adminNameEn) {
        this.adminNameEn = adminNameEn;
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

    @Override
    public void setUsername(String username) {
        this.adminName = username;
    }
    @Override
    public String getUsernameEn() {
        return adminNameEn;
    }
    @Override
    public void setUsernameEn(String usernameEn) {
        this.adminNameEn = usernameEn;
    }
    @Override
    public String getPassword() {
        return adminPassword;
    }
    @Override
    public void setPassword(String password) {
        this.adminPassword = password;
    }
    @Override
    public String getEmail() {
        return adminEmail;
    }
    @Override
    public void setEmail(String email) {
        this.adminEmail = email;
    }
    @Override
    public List<Club> getClubs() {
        return clubs;
    }
    @Override
    public void setClubs(List<Club> clubs) {
        this.clubs = clubs;
    }



}
