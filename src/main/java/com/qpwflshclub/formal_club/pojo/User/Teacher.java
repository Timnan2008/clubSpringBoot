package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "user_teacher")
public class Teacher implements UserBase{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;


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

    @Column(name = "teacher_name")
    private String teacherName;
    @Column(name = "teacher_name_en")
    private String teacherNameEn;
    @Column(name = "teacher_password")
    private String password;
    @Column(name = "teacher_email")
    private String email;

    @ManyToMany
    @JoinTable(
            name = "teacher_club",
            joinColumns = @JoinColumn(name = "teacher_id"),
            inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    private List<Club> clubs;

    @Override
    public String getUsername() {
        return teacherName;
    }

    @Override
    public void setUsername(String username) {
        this.teacherName = username;
    }


    @Override
    public String getUsernameEn() {
        return teacherNameEn;
    }

    @Override
    public void setUsernameEn(String usernameEn) {
        this.teacherNameEn = usernameEn;
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

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public String getTeacherNameEn() {
        return teacherNameEn;
    }

    public void setTeacherNameEn(String teacherNameEn) {
        this.teacherNameEn = teacherNameEn;
    }
}
