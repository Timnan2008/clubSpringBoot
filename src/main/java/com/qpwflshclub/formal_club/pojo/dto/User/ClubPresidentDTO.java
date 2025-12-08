package com.qpwflshclub.formal_club.pojo.dto.User;

import com.qpwflshclub.formal_club.pojo.Club;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public class ClubPresidentDTO implements UserBaseDTO{

    private Long id;


    @Override
    public void setId(Long id) {
        this.id = id;
    }

    public String getClubPresidentName() {
        return clubPresidentName;
    }

    public void setClubPresidentName(String clubPresidentName) {
        this.clubPresidentName = clubPresidentName;
    }

    public String getClubPresidentNameEn() {
        return clubPresidentNameEn;
    }

    public void setClubPresidentNameEn(String clubPresidentNameEn) {
        this.clubPresidentNameEn = clubPresidentNameEn;
    }

    public String getClubPresidentPassword() {
        return clubPresidentPassword;
    }

    public void setClubPresidentPassword(String clubPresidentPassword) {
        this.clubPresidentPassword = clubPresidentPassword;
    }

    public String getClubPresidentEmail() {
        return clubPresidentEmail;
    }

    public void setClubPresidentEmail(String clubPresidentEmail) {
        this.clubPresidentEmail = clubPresidentEmail;
    }

    public List<Club> getClubPresidentClubs() {
        return clubPresidentClubs;
    }

    public void setClubPresidentClubs(List<Club> clubPresidentClubs) {
        this.clubPresidentClubs = clubPresidentClubs;
    }

    public Club getClubPresidentMainClub() {
        return clubPresidentMainClub;
    }

    public void setClubPresidentMainClub(Club clubPresidentMainClub) {
        this.clubPresidentMainClub = clubPresidentMainClub;
    }

    public boolean isVicePresident() {
        return isVicePresident;
    }

    public void setVicePresident(boolean vicePresident) {
        isVicePresident = vicePresident;
    }

    @Override
    public long getId() {
        return this.id;
    }

    @Override
    public void setId(long id) {
        this.id = id;
    }


    @NotNull(message = "社长名称不能为空")
    private String clubPresidentName;
    @NotNull(message = "社长英文名称不能为空")
    private String clubPresidentNameEn;
    @NotNull(message = "社长密码不能为空")
    private String clubPresidentPassword;
    @NotNull(message = "社长邮箱不能为空")
    private String clubPresidentEmail;

    @NotNull(message = "社团不能为空")
    private List<Club> clubPresidentClubs;

    @ManyToOne
    @NotNull(message = "负责社团不能为空")
    private Club clubPresidentMainClub;

    @NotNull(message = "是否为副社长不能为空")
    private boolean isVicePresident;

    public final static Integer userRight = 1;

    @Override
    public String getUsername() {
        return clubPresidentName;
    }
    @Override
    public void setUsername(String username) {
        this.clubPresidentName = username;
    }
    @Override
    public String getUsernameEn() {
        return clubPresidentNameEn;
    }
    @Override
    public void setUsernameEn(String usernameEn) {
        this.clubPresidentNameEn = usernameEn;
    }
    @Override
    public String getPassword() {
        return clubPresidentPassword;
    }
    @Override
    public void setPassword(String password) {
        this.clubPresidentPassword = password;
    }
    @Override
    public String getEmail() {
        return clubPresidentEmail;
    }
    @Override
    public void setEmail(String email) {
        this.clubPresidentEmail = email;
    }
    @Override
    public List<Club> getClubs() {
        return clubPresidentClubs;
    }
    @Override
    public void setClubs(List<Club> clubs) {
        this.clubPresidentClubs = clubs;
    }
}
