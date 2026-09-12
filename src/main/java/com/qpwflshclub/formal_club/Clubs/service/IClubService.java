package com.qpwflshclub.formal_club.Clubs.service;

import com.qpwflshclub.formal_club.Clubs.pojo.Club;
import com.qpwflshclub.formal_club.Clubs.pojo.dto.ClubDTO;
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

    List<Club> search(String keyword);
}
