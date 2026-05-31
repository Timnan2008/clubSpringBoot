package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.Club.ClubVO;

import java.util.Collections;
import java.util.List;

public class LoginUserVO {
    private Long id;
    private String username;
    private String usernameEn;
    private String email;
    private String role;
    private List<ClubVO> clubs;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUsernameEn() {
        return usernameEn;
    }

    public void setUsernameEn(String usernameEn) {
        this.usernameEn = usernameEn;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<ClubVO> getClubs() {
        return clubs;
    }

    public void setClubs(List<ClubVO> clubs) {
        this.clubs = clubs;
    }

    public static LoginUserVO fromUser(UserBase user, String role) {
        LoginUserVO vo = new LoginUserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setUsernameEn(user.getUsernameEn());
        vo.setEmail(user.getEmail());
        vo.setRole(role);
        vo.setClubs(toClubVOList(user.getClubs()));
        return vo;
    }

    private static List<ClubVO> toClubVOList(List<Club> clubs) {
        if (clubs == null) {
            return Collections.emptyList();
        }

        return clubs.stream().map(LoginUserVO::toClubVO).toList();
    }

    private static ClubVO toClubVO(Club club) {
        ClubVO vo = new ClubVO();
        vo.setId(club.getId());
        vo.setClubName(club.getClubName());
        vo.setClubNameEn(club.getClubNameEn());
        vo.setClubItem(club.getClubItem());
        vo.setClubClass(club.getClubClass());
        vo.setClubURL(club.getClubURL());
        vo.setSortDescription(club.getSortDescription());
        vo.setGreatClub(club.isGreatClub());
        return vo;
    }
}
