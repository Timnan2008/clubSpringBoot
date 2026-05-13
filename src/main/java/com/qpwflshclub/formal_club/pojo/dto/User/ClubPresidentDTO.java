package com.qpwflshclub.formal_club.pojo.dto.User;

import com.fasterxml.jackson.annotation.JsonTypeName;
import com.qpwflshclub.formal_club.pojo.User.ClubPresident;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 社长 DTO，用于请求与响应之间的数据传输。
 */
@JsonTypeName("club-president")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "password")
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ClubPresidentDTO implements UserBaseDTO {

    @EqualsAndHashCode.Include
    private Long id;

    @NotBlank(message = "社长名称不能为空")
    private String username;

    @NotBlank(message = "社长英文名称不能为空")
    private String usernameEn;

    @NotBlank(message = "社长密码不能为空")
    private String password;

    @NotBlank(message = "社长邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    private List<Long> clubs;

    private Long mainClubId;

    private boolean vicePresident;

    public static final Integer userRight = 1;

    @Override
    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public long getId() {
        return this.id == null ? 0L : this.id;
    }

    @Override
    public void setId(long id) {
        this.id = id;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public void setUsername(String username) {
        this.username = trimToNull(username);
    }

    @Override
    public String getUsernameEn() {
        return usernameEn;
    }

    @Override
    public void setUsernameEn(String usernameEn) {
        this.usernameEn = trimToNull(usernameEn);
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public void setPassword(String password) {
        this.password = trimToNull(password);
    }

    @Override
    public String getEmail() {
        return email;
    }

    @Override
    public void setEmail(String email) {
        this.email = trimToNull(email);
    }

    @Override
    public List<Long> getClubs() {
        if (clubs == null) {
            clubs = new ArrayList<>();
        }
        return clubs;
    }

    @Override
    public void setClubs(List<Long> clubs) {
        this.clubs = clubs == null ? new ArrayList<>() : clubs;
    }

    public Long getMainClubId() {
        return mainClubId;
    }

    public void setMainClubId(Long mainClubId) {
        this.mainClubId = mainClubId;
    }

    public boolean isVicePresident() {
        return vicePresident;
    }

    public void setVicePresident(boolean vicePresident) {
        this.vicePresident = vicePresident;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static ClubPresidentDTO fromEntity(ClubPresident entity) {
        if (entity == null) {
            return null;
        }
        ClubPresidentDTO dto = new ClubPresidentDTO();
        dto.setId(entity.getId());
        dto.setUsername(entity.getUsername());
        dto.setUsernameEn(entity.getUsernameEn());
        dto.setPassword(entity.getPassword());
        dto.setEmail(entity.getEmail());
        dto.setVicePresident(entity.isVicePresident());
        dto.setMainClubId(entity.getMainClub() != null && entity.getMainClub().getId() != null
                ? entity.getMainClub().getId().longValue()
                : null);
        if (entity.getClubs() != null) {
            dto.setClubs(entity.getClubs().stream()
                    .filter(Objects::nonNull)
                    .map(Club::getId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    public ClubPresident toEntity() {
        return ClubPresident.fromDto(this);
    }
}
