package com.qpwflshclub.formal_club.pojo.Club;

import jakarta.persistence.*;

@Entity
@Table(name = "tb_club_like_device",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"club_name_en", "device_id"})
        })
public class ClubLikeDevice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "club_name_en")
    private String clubNameEn;

    @Column(name = "device_id")
    private String deviceId;

    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
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
