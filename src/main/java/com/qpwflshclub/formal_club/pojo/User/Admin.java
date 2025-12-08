package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "user_admin")
public class Admin implements UserBase{


    public long getId() {
        return id;
    }

    @Override
    public void setId(long id) {
        this.id = id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_name")
    public String adminName;
    @Column(name = "admin_name_en")
    private String adminNameEn;
    @Column(name = "admin_password")
    public String adminPassword;
    @Column(name = "admin_email")
    public String adminEmail;

    @Column(name = "user_right")
    public final static Integer userRight = 3;

    @ManyToMany
    @JoinTable(
            name = "admin_club",
            joinColumns = @JoinColumn(name = "admin_id"),
            inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    public List<Club> clubs;

    @Override
    public String getUsername() {
        return adminName;
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
