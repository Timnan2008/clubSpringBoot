package com.qpwflshclub.formal_club.service;


import com.qpwflshclub.formal_club.pojo.Club;
import com.qpwflshclub.formal_club.pojo.dto.ClubDTO;
import com.qpwflshclub.formal_club.repository.ClubRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ClubService implements IClubService {

    @Autowired
    ClubRepository clubRepository;

    @Override
    public Club add(ClubDTO clubDTO) {

        Club club = new Club();
        BeanUtils.copyProperties(clubDTO, club);

        return clubRepository.save(club);
        //调用数据访问类

    }

    @Override
    public Club update(ClubDTO clubDTO) {
        // 先从数据库查找现有的club对象
        Club existingClub = clubRepository.findById(clubDTO.getClubId())
                .orElseThrow(() -> new IllegalArgumentException("没有找到该社团"));

        // 将DTO的属性复制到existingClub对象上
        BeanUtils.copyProperties(clubDTO, existingClub);

        return clubRepository.save(existingClub);
    }

    @Override
    public void delate(Integer clubId) {
        clubRepository.deleteById(clubId);
    }

    @Override
    public Club findByName(String clubName) {
        return clubRepository.findByClubNameEn(clubName).orElseThrow(() -> {
            throw new ClubNotFoundException("没有找到该社团");
        });
    }

    @Override
    public List<Club> findAll() {
        List<Club> clubs = new ArrayList<>();
        clubRepository.findAll().forEach(clubs::add);
        return clubs;
    }


    @Override
    public Club find(Integer id) {
        return clubRepository.findById(id).orElseThrow(() -> {
            throw new ClubNotFoundException("没有找到该社团");
        });
    }





}
