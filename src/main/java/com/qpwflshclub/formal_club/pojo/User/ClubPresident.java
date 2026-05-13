package com.qpwflshclub.formal_club.pojo.User;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.dto.User.ClubPresidentDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * 社长实体类，用于持久化社长信息。
 */
@Entity
@Table(name = "user_club_president")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"password", "clubs", "mainClub"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ClubPresident implements UserBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(name = "club_president_name", nullable = false)
    private String username;

    @Column(name = "club_president_name_en", nullable = false)
    private String usernameEn;

    @Column(name = "club_president_password", nullable = false)
    private String password;

    @Column(name = "club_president_email", nullable = false)
    private String email;

    @ManyToMany
    @JoinTable(
            name = "president_club",
            joinColumns = @JoinColumn(name = "president_id"),
            inverseJoinColumns = @JoinColumn(name = "club_id")
    )
    private List<Club> clubs;

    @ManyToOne
    @JoinColumn(name = "club_president_main_club")
    private Club mainClub;

    @Column(name = "is_vice_president", nullable = false)
    private boolean vicePresident;

    public static final Integer userRight = 1;

    @Override
    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public void setId(long id) {
        this.id = id;
    }

    @Override
    public long getId() {
        return this.id == null ? 0L : this.id;
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
    public List<Club> getClubs() {
        if (clubs == null) {
            clubs = new ArrayList<>();
        }
        return clubs;
    }

    @Override
    public void setClubs(List<Club> clubs) {
        this.clubs = clubs == null ? new ArrayList<>() : clubs;
    }

    public Club getMainClub() {
        return mainClub;
    }

    public void setMainClub(Club mainClub) {
        this.mainClub = mainClub;
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

    /**
     * 将 DTO 转换为实体对象，关系字段需在服务层补全。
     */
    public static ClubPresident fromDto(ClubPresidentDTO dto) {
        if (dto == null) {
            return null;
        }
        ClubPresident president = new ClubPresident();
        if (dto.getId() > 0L) {
            president.setId(dto.getId());
        }
        president.setUsername(dto.getUsername());
        president.setUsernameEn(dto.getUsernameEn());
        president.setPassword(dto.getPassword());
        president.setEmail(dto.getEmail());
        president.setVicePresident(dto.isVicePresident());
        return president;
    }

    public static ClubPresident fromDto(ClubPresidentDTO dto, List<Club> clubs, Club mainClub) {
        ClubPresident president = fromDto(dto);
        president.setClubs(clubs);
        president.setMainClub(mainClub);
        return president;
    }

    public ClubPresidentDTO toDto() {
        return ClubPresidentDTO.fromEntity(this);
    }
}
