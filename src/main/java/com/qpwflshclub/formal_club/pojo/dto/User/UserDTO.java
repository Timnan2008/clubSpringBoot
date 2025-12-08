package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class UserDTO {

    private Long id;

    @NotNull(message = "用户名不能为空")
    private String username;
    @NotNull(message = "用户名英文不能为空")
    private String usernameEn;
    @NotNull(message = "密码不能为空")
    private String password;
    @NotNull(message = "邮箱不能为空")
    private String email;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUsernameEn() {
        return usernameEn;
    }

    public void setUsernameEn(String usernameEn) {
        this.usernameEn = usernameEn;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public List<Club> getClubs() {
        return clubs;
    }

    public void setClubs(List<Club> clubs) {
        this.clubs = clubs;
    }

    public static final Integer userRight = 0;

    @NotNull(message = "用户社团不能为空")
    private List<Club> clubs;

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }
}
