package com.qpwflshclub.formal_club.service.Club;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;

import java.util.List;

public interface IClubService {


    Club add(ClubDTO clubDTO);

    Club find(Integer id);

    Club update(ClubDTO clubDTO);

    void delate(Integer clubId);

    Club findByName(String clubName);


    List<Club> findAll();

    void updateVideoAll(List<Club> clubs);

    boolean hasLiked(String clubName, String deviceId);

    void addLikeDevice(String clubName, String deviceId);

    void removeLikeDevice(String clubName, String deviceId);
}
