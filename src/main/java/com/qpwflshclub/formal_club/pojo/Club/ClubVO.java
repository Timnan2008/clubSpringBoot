package com.qpwflshclub.formal_club.pojo.Club;

public class ClubVO {
    private Integer id;
    private String clubName;
    private String clubNameEn;
    private String sortDescription;
    private String clubURL;
    private String clubItem;
    private String clubClass;
    private Boolean greatClub;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getClubName() {
        return clubName;
    }

    public void setClubName(String clubName) {
        this.clubName = clubName;
    }

    public String getClubNameEn() {
        return clubNameEn;
    }

    public void setClubNameEn(String clubNameEn) {
        this.clubNameEn = clubNameEn;
    }

    public String getSortDescription() {
        return sortDescription;
    }

    public void setSortDescription(String sortDescription) {
        this.sortDescription = sortDescription;
    }

    public String getClubURL() {
        return clubURL;
    }

    public void setClubURL(String clubURL) {
        this.clubURL = clubURL;
    }

    public String getClubItem() {
        return clubItem;
    }

    public void setClubItem(String clubItem) {
        this.clubItem = clubItem;
    }

    public String getClubClass() {
        return clubClass;
    }

    public void setClubClass(String clubClass) {
        this.clubClass = clubClass;
    }

    public Boolean getGreatClub() {
        return greatClub;
    }

    public void setGreatClub(Boolean greatClub) {
        this.greatClub = greatClub;
    }
}
