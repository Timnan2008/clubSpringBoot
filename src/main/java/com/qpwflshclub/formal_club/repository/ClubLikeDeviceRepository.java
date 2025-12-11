package com.qpwflshclub.formal_club.repository;

import com.qpwflshclub.formal_club.pojo.Club.ClubLikeDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubLikeDeviceRepository extends JpaRepository<ClubLikeDevice, Long> {

    boolean existsByClubNameEnAndDeviceId(String clubNameEn, String deviceId);

    void deleteByClubNameEnAndDeviceId(String clubNameEn, String deviceId);
}

