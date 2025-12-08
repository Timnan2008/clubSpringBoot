package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club;

import java.util.List;


public interface UserBaseDTO {
    void setId(Long id);

    long getId();
    void setId(long id);
    String getUsername();
    void setUsername(String username);
    String getUsernameEn();
    void setUsernameEn(String usernameEn);
    String getPassword();
    void setPassword(String password);
    String getEmail();
    void setEmail(String email);
    List<Club> getClubs();
    void setClubs(List<Club> clubs);
}
