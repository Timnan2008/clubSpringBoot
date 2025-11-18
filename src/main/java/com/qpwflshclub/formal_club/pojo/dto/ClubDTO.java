package com.qpwflshclub.formal_club.pojo.dto;

import jakarta.persistence.Column;
import jakarta.validation.constraints.NotNull;

public class ClubDTO {

    //id不可以出现在前端中
    private Integer clubId;

    @NotNull(message = "名称不能为空")
    private String clubName;

    @NotNull(message = "类别不能为空")
    private String clubItem;

    @NotNull(message = "社长不能为空")
    private String president;

    @NotNull(message = "社长英文不能为空")
    private String presidentEn;

    @NotNull(message = "副社长英文不能为空")
    private String vicePresidentEn;

    @NotNull(message = "副社长不能为空")
    private String vicePresident;

    @NotNull(message = "指导老师不能为空")
    private String teacher;

    @NotNull(message = "指导老师英文不能为空")
    private String teacherEn;

    @NotNull(message = "社团英文名称不能为空")
    private String clubNameEn;

    @NotNull(message = "社团类别不能为空")
    private String clubClass;

    @NotNull(message = "简短简介不能为空")
    private String sortDescription;

    @NotNull(message = "社团描述不能为空")
    private String clubDescription;

    @NotNull(message = "社团英文描述不能为空")
    private String clubDescriptionEn;

    @NotNull(message = "简介英文不能为空")
    private String sortDescriptionEn;

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

    //是否为优秀社团可以为空(普通社长创建社团页面不能出现，教师和指导老师还有管理员进行管理的页面可以出现）
    private boolean isGreatClub;

    public String getSortDescription() {
        return sortDescription;
    }

    public void setSortDescription(String sortDescription) {
        this.sortDescription = sortDescription;
    }

    //不能出现在前端中
    private String clubURL;

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

    public void setClubURL(String clubURL) {
        this.clubURL = clubURL;
    }

    public String getClubNameEn() {
        return clubNameEn;
    }

    //可以出现在前端中，但是不强求
    public String video;

    public Integer getVideoLike() {
        return videoLike;
    }

    public void setVideoLike(Integer videoLike) {
        this.videoLike = videoLike;
    }

    //不可以出现在任何用户注册时的页面
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



    public String getClubURL() {
        return clubURL;
    }
}
