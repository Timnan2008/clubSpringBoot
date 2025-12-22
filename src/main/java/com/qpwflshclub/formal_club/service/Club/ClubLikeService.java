package com.qpwflshclub.formal_club.service.Club;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.Club.ClubLikeDevice;
import com.qpwflshclub.formal_club.repository.Club.ClubLikeDeviceRepository;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
@Transactional
public class ClubLikeService{

    @Autowired
    private ClubLikeDeviceRepository deviceRepo;

    @Autowired
    private ClubRepository clubRepo;

    public boolean like(String clubName, String deviceId) {

        System.out.println(deviceRepo.existsByClubNameEnAndDeviceId(clubName, deviceId));

        // 1. 检查是否点赞过
        if (deviceRepo.existsByClubNameEnAndDeviceId(clubName, deviceId)) {
            return false; // 已点赞
        }

        // 2. 点赞数 +1
        Club club = clubRepo.findByClubNameEn(clubName).get();
        club.setVideoLike(club.getVideoLike() + 1);
        clubRepo.save(club);

        // 3. 写入设备记录
        ClubLikeDevice record = new ClubLikeDevice();
        record.setClubNameEn(clubName);
        record.setDeviceId(deviceId);
        deviceRepo.save(record);

        return true;
    }

    public boolean dislike(String clubNameEn, String deviceId) {

        System.out.println(deviceRepo.existsByClubNameEnAndDeviceId(clubNameEn, deviceId));

        // 1. 检查设备是否点过赞
        if (!deviceRepo.existsByClubNameEnAndDeviceId(clubNameEn, deviceId)) {
            return false;
        }

        // 2. 点赞数 -1
        Club club = clubRepo.findByClubNameEn(clubNameEn).get();
        club.setVideoLike(club.getVideoLike() - 1);
        clubRepo.save(club);

        // 3. 删除点赞记录
        deviceRepo.deleteByClubNameEnAndDeviceId(clubNameEn, deviceId);

        return true;
    }
}

