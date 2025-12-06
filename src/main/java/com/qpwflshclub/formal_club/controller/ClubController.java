package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.dto.ClubDTO;
import com.qpwflshclub.formal_club.service.IClubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @PutMapping("/name-en/{clubName}")
    public ResponseMessage<Club> updateNameEn(@PathVariable String clubName,@Validated @RequestBody ClubDTO clubDTO){
        ClubDTO clubDTONameEn = clubService.findByName(clubName).toDTO();
        Club club = clubService.update(clubDTO);
        return ResponseMessage.success(club);
    }

    @PutMapping("/initialize-url/{clubName}")
    public ResponseMessage<Club> initializeUrl(@PathVariable String clubName){
        Club club = clubService.findByName(clubName);
        club.setClubURL("page/club-watch/" + clubName);
        clubService.update(club.toDTO());
        return ResponseMessage.success(club);
    }



    @PutMapping("/like/{clubName}")
    public ResponseMessage<Club> like(@PathVariable String clubName){
        Club club = clubService.findByName(clubName);
        if(club.isEmpty()){
            return ResponseMessage.error(club);
        }
        club.setVideoLike(club.getVideoLike() + 1);
        System.out.println("点赞数：" + club.getVideoLike());

        clubService.update(club.toDTO());
        return ResponseMessage.success(club);
    }

    @PutMapping("/dislike/{clubName}")
    public ResponseMessage<Club> dislike(@PathVariable String clubName){
        Club club = clubService.findByName(clubName);
        if(club.isEmpty()){
            return ResponseMessage.error(club);
        }
        club.setVideoLike(club.getVideoLike() - 1);
        System.out.println("点赞数：" + club.getVideoLike());

        clubService.update(club.toDTO());
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

    @GetMapping("/all")
    public ResponseMessage<List<Club>> findAll(){
        List<Club> clubs = clubService.findAll();
        System.out.println("clubs: " + clubs);
        return ResponseMessage.success(clubs);
    }

}
