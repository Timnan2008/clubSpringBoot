package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "user_club_president")
public class ClubPresident implements UserBase{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;



    @Override
    public void setId(long id) {
        this.id = id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public long getId() {
        return this.id;
    }

    @Column(name = "club_president_name")
    private String clubPresidentName;
    @Column(name = "club_president_name_en")
    private String clubPresidentNameEn;
    @Column(name = "club_president_password")
    private String clubPresidentPassword;
    @Column(name = "club_president_email")
    private String clubPresidentEmail;

    @ManyToMany
    @JoinTable(
            name = "president_club",
            joinColumns = @JoinColumn(name = "president_id"),
            inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    private List<Club> clubPresidentClubs;

    @ManyToOne
    @JoinColumn(name = "club_president_main_club")
    private Club clubPresidentMainClub;

    @Column(name = "is_vice_president")
    private boolean isVicePresident;


    public final static Integer userRight = 1;

    public boolean isVicePresident() {
        return isVicePresident;
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

    public void setVicePresident(boolean vicePresident) {
        isVicePresident = vicePresident;
    }

    public Club getClubPresidentMainClub() {
        return clubPresidentMainClub;
    }

    public void setClubPresidentMainClub(Club clubPresidentMainClub) {
        this.clubPresidentMainClub = clubPresidentMainClub;
    }

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
