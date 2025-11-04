package com.qpwflshclub.formal_club.service;

import com.qpwflshclub.formal_club.pojo.Club;
import com.qpwflshclub.formal_club.pojo.dto.ClubDTO;

public interface IClubService {


    Club add(ClubDTO clubDTO);

    Club find(Integer id);

    Club update(ClubDTO clubDTO);

    void delate(Integer clubId);

    Club findByName(String clubName);


}
