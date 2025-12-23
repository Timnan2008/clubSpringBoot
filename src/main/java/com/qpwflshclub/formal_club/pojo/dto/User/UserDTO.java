package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class UserDTO implements UserBaseDTO{

    private Long id;

    @NotNull(message = "用户名不能为空")
    private String username;
    @NotNull(message = "用户名英文不能为空")
    private String usernameEn;
    @NotNull(message = "密码不能为空")
    private String password;
    @NotNull(message = "邮箱不能为空")
    private String email;

    public static final Integer userRight = 0;

    @NotNull(message = "用户社团不能为空")
    private List<Long> clubs;

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
    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public void setUsername(String username) {
        this.username = username;
    }
    @Override
    public String getUsernameEn() {
        return usernameEn;
    }
    @Override
    public void setUsernameEn(String usernameEn) {
        this.usernameEn = usernameEn;
    }
    @Override
    public String getPassword() {
        return password;
    }
    @Override
    public void setPassword(String password) {
        this.password = password;
    }
    @Override
    public String getEmail() {
        return email;
    }
    @Override
    public void setEmail(String email) {
        this.email = email;
    }
    @Override
    public List<Long> getClubs() {
        return clubs;
    }
    @Override
    public void setClubs(List<Long> clubs) {
        this.clubs = clubs;
    }


}
