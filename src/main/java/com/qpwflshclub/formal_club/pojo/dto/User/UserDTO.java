package com.qpwflshclub.formal_club.pojo.dto.User;

import com.fasterxml.jackson.annotation.JsonTypeName;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

import java.util.List;

@JsonTypeName("User")
public class UserDTO implements UserBaseDTO{

    private String studentNumber,nickname;
    public String getStudentNumber(){return studentNumber;} public void setStudentNumber(String value){studentNumber=value;}
    public String getNickname(){return nickname;} public void setNickname(String value){nickname=value;}
    private String emailCode;
    public String getEmailCode(){return emailCode;} public void setEmailCode(String value){emailCode=value;}
    private String turnstileToken;
    public String getTurnstileToken(){return turnstileToken;}
    public void setTurnstileToken(String token){turnstileToken=token;}
    private Long id;

    private String username = "";
    private String usernameEn = "";
    @NotNull(message = "密码不能为空")
    private String password;
    @NotNull(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    public static final Integer userRight = 0;


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
