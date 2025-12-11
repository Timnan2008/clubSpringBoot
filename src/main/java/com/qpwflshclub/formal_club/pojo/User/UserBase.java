package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.persistence.*;

import java.util.List;

@Inheritance(strategy = InheritanceType.JOINED)
public interface UserBase {
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
