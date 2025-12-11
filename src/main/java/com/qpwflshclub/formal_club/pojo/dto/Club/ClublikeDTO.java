package com.qpwflshclub.formal_club.pojo.dto.Club;

import jakarta.validation.constraints.NotNull;

public class ClublikeDTO {
    private Long id;
    @NotNull
    private String clubNameEn;
    @NotNull
    private String deviceId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getClubNameEn() {
        return clubNameEn;
    }

    public void setClubNameEn(String clubNameEn) {
        this.clubNameEn = clubNameEn;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }
}
