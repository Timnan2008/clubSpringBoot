package com.qpwflshclub.formal_club.pojo.dto.User;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.qpwflshclub.formal_club.pojo.Club.Club;

import java.util.List;

@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.PROPERTY,
        property = "userType"
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = TeacherDTO.class, name = "teacher"),
        @JsonSubTypes.Type(value = UserDTO.class, name = "user"),
        @JsonSubTypes.Type(value = ClubPresidentDTO.class, name = "club-president"),
        @JsonSubTypes.Type(value = AdminDTO.class, name = "admin")
})

public interface UserBaseDTO {



    void setId(Long id);

    long getId();
    void setId(long id);
    String getUsername();
    void setUsername(String username);
    String getUsernameEn();
    void setUsernameEn(String usernameEn);
    String getPassword();
    void setPassword(String password);
    String getEmail();
    void setEmail(String email);
    List<Long> getClubs();
    void setClubs(List<Long> clubs);
}
