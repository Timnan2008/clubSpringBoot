package com.qpwflshclub.formal_club.pojo.dto;

import jakarta.validation.constraints.NotNull;

public class ClubDTO {

    private Integer clubId;

    @NotNull(message = "名称不能为空")
    private String clubName;

    @NotNull(message = "类别不能为空")
    private String clubItem;

    @NotNull(message = "社长不能为空")
    private String president;

    @NotNull(message = "副社长不能为空")
    private String vicePresident;

    @NotNull(message = "指导老师不能为空")
    private String teacher;

    @NotNull(message = "社团英文名称不能为空")
    private String clubNameEn;


    public String getClubNameEn() {
        return clubNameEn;
    }

    public String video;

    public Integer getVideoLike() {
        return videoLike;
    }

    public void setVideoLike(Integer videoLike) {
        this.videoLike = videoLike;
    }

    public String getVideo() {
        return video;
    }

    public void setVideo(String video) {
        this.video = video;
    }

    public Integer videoLike;

    public void setClubNameEn(String clubNameEn) {
        this.clubNameEn = clubNameEn;
    }

    public Integer getClubId() {
        return clubId;
    }

    public void setClubId(Integer clubId) {
        this.clubId = clubId;
    }

    public String getClubDescription() {
        return clubDescription;
    }

    public void setClubDescription(String clubDescription) {
        this.clubDescription = clubDescription;
    }

    public String getTeacher() {
        return teacher;
    }

    public void setTeacher(String teacher) {
        this.teacher = teacher;
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

    public String getClubItem() {
        return clubItem;
    }

    public void setClubItem(String clubItem) {
        this.clubItem = clubItem;
    }

    public String getClubName() {
        return clubName;
    }

    public void setClubName(String clubName) {
        this.clubName = clubName;
    }

    @NotNull(message = "社团描述不能为空")
    private String clubDescription;
}
