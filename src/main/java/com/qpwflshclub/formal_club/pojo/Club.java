package com.qpwflshclub.formal_club.pojo;



import com.qpwflshclub.formal_club.pojo.dto.ClubDTO;
import jakarta.persistence.*;
import jakarta.validation.constraints.Size;

import java.util.List;

@Entity
@Table(name = "tb_user")
public class Club {
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "club_name")
    private String clubName;

    @Column(name = "club_item")
    private String clubItem;

    @Column(name = "president")
    private String president;

    @Column(name = "president_en")
    private String presidentEn;

    @Column(name = "vice_president")
    private String vicePresident;

    @Column(name = "vice_president_en")
    private String vicePresidentEn;

    @Column(name = "teacher")
    private String teacher;

    @Column(name = "teacher_en")
    private String teacherEn;

    @Column(name = "club_description")
    @Size(max = 1000)
    private String clubDescription;

    @Column(name = "club_description_en")
    @Size(max = 1000)
    private String clubDescriptionEn;

    @Column(name = "video_like")
    private Integer videoLike;

    @Column(name = "video")
    private String video;

    @Column(name = "club_name_en")
    private String clubNameEn;

    @Column(name = "club_class")
    private String clubClass;

    @Column(name = "is_great_club")
    private boolean isGreatClub;



    public String getPresidentEn() {
        return presidentEn;
    }

    public void setPresidentEn(String presidentEn) {
        this.presidentEn = presidentEn;
    }

    public String getVicePresidentEn() {
        return vicePresidentEn;
    }

    public void setVicePresidentEn(String vicePresidentEn) {
        this.vicePresidentEn = vicePresidentEn;
    }

    public String getTeacherEn() {
        return teacherEn;
    }

    public void setTeacherEn(String teacherEn) {
        this.teacherEn = teacherEn;
    }

    public String getClubDescriptionEn() {
        return clubDescriptionEn;
    }

    public void setClubDescriptionEn(String clubDescriptionEn) {
        this.clubDescriptionEn = clubDescriptionEn;
    }

    public String getSortDescriptionEn() {
        return sortDescriptionEn;
    }

    public void setSortDescriptionEn(String sortDescriptionEn) {
        this.sortDescriptionEn = sortDescriptionEn;
    }

    @Column(name = "club_URL")
    private String clubURL; //DTO无需体现因为系统会自动生成

    @Column(name = "sort_description")
    private String sortDescription;

    @Column(name = "sort_description_en")
    private String sortDescriptionEn;

    public String getSortDescription() {
        return sortDescription;
    }

    public void setSortDescription(String sortDescription) {
        this.sortDescription = sortDescription;
    }

    public String getClubURL(){
        return clubURL;
    }

    public void setClubURL(String clubURL){
        this.clubURL = clubURL;
    }


    public String getClubClass() {
        return clubClass;
    }

    public void setClubClass(String clubClass) {
        this.clubClass = clubClass;
    }

    public boolean isGreatClub() {
        return isGreatClub;
    }

    public void setGreatClub(boolean greatClub) {
        isGreatClub = greatClub;
    }

    public String getClubNameEn() {
        return clubNameEn;
    }

    public boolean isEmpty() {
        return clubName == null || clubName.isEmpty();
    }

    public void setClubNameEn(String clubNameEn) {
        this.clubNameEn = clubNameEn;
    }

    public String getVideo() {
        return video;
    }

    public void setVideo(String video) {
        this.video = video;
    }

    public Integer getVideoLike() {
        return videoLike;
    }

    public void setVideoLike(Integer videoLike) {
        this.videoLike = videoLike;
    }

    public String getClubName() {
        return clubName;
    }

    public void setClubName(String clubName) {
        this.clubName = clubName;
    }

    public String getClubItem() {
        return clubItem;
    }

    public void setClubItem(String clubItem) {
        this.clubItem = clubItem;
    }

    public String getVicePresident() {
        return vicePresident;
    }

    public void setVicePresident(String vicePresident) {
        this.vicePresident = vicePresident;
    }

    public String getPresident() {
        return president;
    }

    public void setPresident(String president) {
        this.president = president;
    }

    public String getTeacher() {
        return teacher;
    }

    public void setTeacher(String teacher) {
        this.teacher = teacher;
    }

    public String getClubDescription() {
        return clubDescription;
    }

    public void setClubDescription(String clubDescription) {
        this.clubDescription = clubDescription;
    }

    public ClubDTO toDTO() {
        ClubDTO dto = new ClubDTO();
        dto.setClubName(this.clubName);
        dto.setClubItem(this.clubItem);
        dto.setPresident(this.president);
        dto.setVicePresident(this.vicePresident);
        dto.setTeacher(this.teacher);
        dto.setClubDescription(this.clubDescription);
        dto.setClubNameEn(this.clubNameEn);
        dto.setVideo(this.video);
        dto.setVideoLike(this.videoLike);
        dto.setClubId(this.id);
        dto.setClubClass(this.clubClass);
        dto.setGreatClub(this.isGreatClub);
        dto.setClubURL(this.clubURL);
        dto.setSortDescription(this.sortDescription);
        dto.setSortDescriptionEn(this.sortDescriptionEn);
        dto.setClubDescriptionEn(this.clubDescriptionEn);
        dto.setPresidentEn(this.presidentEn);
        dto.setVicePresidentEn(this.vicePresidentEn);
        dto.setTeacherEn(this.teacherEn);
        return dto;
    }

    @Override
    public String toString() {
        return "Club{" +
                "id=" + id +
                ", clubName='" + clubName + '\'' +
                ", clubItem='" + clubItem + '\'' +
                ", president='" + president + '\'' +
                ", vicePresident='" + vicePresident + '\'' +
                ", teacher='" + teacher + '\'' +
                ", clubDescription='" + clubDescription + '\'' +
                '}';
    }

}
