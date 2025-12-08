package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "user")
public class User implements UserBase{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "username")
    private String username;
    @Column(name = "username_en")
    private String usernameEn;
    @Column(name = "password")
    private String password;
    @Column(name = "email")
    private String email;

    @ManyToMany
    @JoinTable(
            name = "user_club",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    private List<Club> clubs;

    public static Integer userRight = 0;

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
    public List<Club> getClubs() {
        return clubs;
    }
    @Override
    public void setClubs(List<Club> clubs) {
        this.clubs = clubs;
    }

    public static Integer getUserRight() {
        return userRight;
    }

    public static void setUserRight(Integer userRight) {
        User.userRight = userRight;
    }
}
