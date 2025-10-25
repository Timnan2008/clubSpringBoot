package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.dto.ClubDTO;
import com.qpwflshclub.formal_club.service.IClubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/club")
public class ClubController {

    @Autowired
    IClubService clubService;


    //增加
    @PostMapping
    public ResponseMessage<Club> add(@Validated @RequestBody ClubDTO clubDTO){
        Club club = clubService.add(clubDTO);
        return ResponseMessage.success(club);
    }

    //修改
    @PutMapping("/{clubId}")
    public ResponseMessage<Club> update(@PathVariable Integer clubId,@Validated @RequestBody ClubDTO clubDTO){
        clubDTO.setClubId(clubId);
        Club club = clubService.update(clubDTO);
        return ResponseMessage.success(club);
    }

    //删除
    @DeleteMapping("/{clubId}")
    public ResponseMessage<Club> delete(@PathVariable Integer clubId){
        clubService.delate(clubId);
        return ResponseMessage.success();
    }

    //查询
    @GetMapping("/id/{clubId}")
    public ResponseMessage<Club> find(@PathVariable Integer clubId){
        Club club = clubService.find(clubId);
        return ResponseMessage.success(club);
    }

    @GetMapping("/name-en/{clubName}")
    public ResponseMessage<Club> findByName(@PathVariable String clubName){
        System.out.println("clubName: " + clubName);
        Club club = clubService.findByName(clubName);
        return ResponseMessage.success(club);
    }

}
