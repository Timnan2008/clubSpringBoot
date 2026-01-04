package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.Club.ClubInfoVO;
import com.qpwflshclub.formal_club.pojo.Club.ClubVO;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.service.Club.ClubLikeService;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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

    @PutMapping("/video-all")
    public ResponseMessage<List<Club>> updateAll(){
        List<Club> clubs = clubService.findAll();

        for(Club club : clubs){
            ClubDTO clubDto = club.toDTO();
            clubDto.setVideo("http://123.57.189.22/media/video/" + club.getClubClass() + "/" + club.getClubNameEn() + ".mp4");
            update(clubDto.getClubId(), clubDto);
        }

        return ResponseMessage.success();
    }

    @Autowired
    private ClubLikeService clubLikeService;


    @PutMapping("/like/{clubName}")
    public ResponseMessage<Club> like(
            @PathVariable String clubName,
            @RequestHeader("Device-Id") String deviceId) {

        System.out.println("clubName: " + clubName);
        System.out.println("deviceId: " + deviceId);
        boolean ok = clubLikeService.like(clubName, deviceId);
        System.out.println("ok: " + ok);
        if (!ok) {
            return ResponseMessage.error("不能刷赞");
        }

        // 返回最新 club 信息
        Club club = clubService.findByName(clubName);
        return ResponseMessage.success(club);
    }


    @PutMapping("/dislike/{clubName}")
    public ResponseMessage<Club> dislike(
            @PathVariable String clubName,
            @RequestHeader("X-Device-Id") String deviceId) {

        boolean ok = clubLikeService.dislike(clubName, deviceId);
        if (!ok) {
            return ResponseMessage.error("不能刷取消");
        }

        Club club = clubService.findByName(clubName);
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
    public <ClubInfoVo> ResponseMessage<ClubInfoVo> findByName(@PathVariable String clubName){
        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = locale.getLanguage().equals("en");
        System.out.println("clubName: " + clubName);
        Club club = clubService.findByName(clubName);
        ClubInfoVO clubInfoVO = new ClubInfoVO();
        clubInfoVO.setClubDescription(isEn? club.getClubDescriptionEn() : club.getClubDescription());
        clubInfoVO.setClubName(isEn? club.getClubNameEn() : club.getClubName());
        clubInfoVO.setClubItem(club.getClubItem());
        clubInfoVO.setVideo(club.getVideo());
        clubInfoVO.setVideoLike(club.getVideoLike());
        clubInfoVO.setPresident(isEn? club.getPresidentEn() : club.getPresident());
        clubInfoVO.setVicePresident(isEn? club.getVicePresidentEn() : club.getVicePresident());
        clubInfoVO.setTeacher(isEn? club.getTeacherEn() : club.getTeacher());

        return (ResponseMessage<ClubInfoVo>) ResponseMessage.success(clubInfoVO);
    }

    @GetMapping("/all")
    public ResponseMessage<List<ClubVO>> findAll(){
        Locale locale = LocaleContextHolder.getLocale();
        boolean isEn = locale.getLanguage().equals("en");
        System.out.println("isEn: " + isEn);

        List<Club> clubs = clubService.findAll();

        List<ClubVO> list = clubs.stream().map(c -> {
            ClubVO vo = new ClubVO();

            vo.setClubName(isEn ? c.getClubNameEn() : c.getClubName());
            vo.setClubItem(c.getClubNameEn());
            vo.setSortDescription(isEn ? c.getSortDescriptionEn() : c.getSortDescription());
            vo.setClubItem(c.getClubItem());
            vo.setGreatClub(c.isGreatClub());
            vo.setClubURL(isEn
                    ? "page/club-watch/" + c.getClubNameEn() + "?lang=en"
                    : "page/club-watch/" + c.getClubNameEn() + "?lang=zh");
            vo.setClubClass(c.getClubClass());

            return vo;
        }).toList();

        System.out.println(list);

        return ResponseMessage.success(list);
    }

}
