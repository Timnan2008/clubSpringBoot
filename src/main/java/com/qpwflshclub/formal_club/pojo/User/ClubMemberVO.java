package com.qpwflshclub.formal_club.pojo.User;

public class ClubMemberVO {
    private Long id;
    private String username;
    private String usernameEn;
    private String email;
    private String role;
    private boolean member;

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

    public boolean isMember() {
        return member;
    }

    public void setMember(boolean member) {
        this.member = member;
    }

    public static ClubMemberVO fromUser(User user, boolean member) {
        ClubMemberVO vo = new ClubMemberVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setUsernameEn(user.getUsernameEn());
        vo.setEmail(user.getEmail());
        vo.setRole("user");
        vo.setMember(member);
        return vo;
    }
}
