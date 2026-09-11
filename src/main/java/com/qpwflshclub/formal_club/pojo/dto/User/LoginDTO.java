package com.qpwflshclub.formal_club.pojo.dto.User;

public class LoginDTO {
    private boolean rememberMe;
    public boolean isRememberMe(){return rememberMe;}
    public void setRememberMe(boolean value){rememberMe=value;}
    private String email;
    private String password;
    public String getEmail()    { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}