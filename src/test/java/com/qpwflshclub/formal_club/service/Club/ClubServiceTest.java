package com.qpwflshclub.formal_club.service.Club;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.repository.Club.ClubRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClubServiceTest {

    @Mock
    ClubRepository clubRepository;

    ClubService clubService;

    @BeforeEach
    void setUp() {
        clubService = new ClubService();
        clubService.clubRepository = clubRepository;
    }

    @Test
    void updateKeepsGeneratedFieldsWhenDtoDoesNotCarryThem() {
        Club existingClub = new Club();
        existingClub.setId(1);
        existingClub.setClubName("旧社团");
        existingClub.setVideoLike(12);
        existingClub.setClubURL("page/club-watch/OldClub");

        ClubDTO dto = completeClubDTO();
        dto.setClubId(1);
        dto.setVideoLike(null);
        dto.setClubURL(null);

        when(clubRepository.findById(1)).thenReturn(Optional.of(existingClub));
        when(clubRepository.save(existingClub)).thenReturn(existingClub);

        Club updated = clubService.update(dto);

        assertThat(updated.getVideoLike()).isEqualTo(12);
        assertThat(updated.getClubURL()).isEqualTo("page/club-watch/OldClub");
    }

    private static ClubDTO completeClubDTO() {
        ClubDTO dto = new ClubDTO();
        dto.setClubName("新社团");
        dto.setClubNameEn("NewClub");
        dto.setClubItem("/logo.png");
        dto.setClubClass("study");
        dto.setPresident("社长");
        dto.setPresidentEn("President");
        dto.setVicePresident("副社长");
        dto.setVicePresidentEn("Vice");
        dto.setTeacher("老师");
        dto.setTeacherEn("Teacher");
        dto.setSortDescription("简介");
        dto.setSortDescriptionEn("Summary");
        dto.setClubDescription("描述");
        dto.setClubDescriptionEn("Description");
        return dto;
    }
}
