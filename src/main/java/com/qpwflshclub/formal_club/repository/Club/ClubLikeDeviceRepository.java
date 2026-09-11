package com.qpwflshclub.formal_club.repository.Club;

import com.qpwflshclub.formal_club.pojo.Club.ClubLikeDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubLikeDeviceRepository extends JpaRepository<ClubLikeDevice, Long> {

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update ClubLikeDevice d set d.clubNameEn = :newName where d.clubNameEn = :oldName")
    void renameClub(@org.springframework.data.repository.query.Param("oldName")String oldName,@org.springframework.data.repository.query.Param("newName")String newName);
    boolean existsByClubNameEnAndDeviceId(String clubNameEn, String deviceId);

    void deleteByClubNameEnAndDeviceId(String clubNameEn, String deviceId);
}

