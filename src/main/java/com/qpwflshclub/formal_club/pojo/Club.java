package com.qpwflshclub.formal_club.pojo;


import com.qpwflshclub.formal_club.pojo.dto.ClubDTO;
import jakarta.persistence.*;

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

    @Column(name = "vice_president")
    private String vicePresident;

    @Column(name = "teacher")
    private String teacher;

    @Column(name = "club_description")
    private String clubDescription;

    @Column(name = "video_like")
    private Integer videoLike;

    @Column(name = "video")
    private String video;

    @Column(name = "club_name_en")
    private String clubNameEn;


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
