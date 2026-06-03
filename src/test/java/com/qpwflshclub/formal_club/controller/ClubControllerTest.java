package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClubControllerTest {

    @Mock
    IClubService clubService;

    @Mock
    HttpServletRequest request;

    ClubController controller;

    @BeforeEach
    void setUp() {
        controller = new ClubController();
        controller.clubService = clubService;
    }

    @Test
    void addRejectsTeacherBecauseOnlyAdminsCanCreateClubs() {
        Teacher teacher = new Teacher();
        ClubDTO dto = clubDTO();

        when(request.getAttribute("currentUser")).thenReturn(teacher);

        ResponseMessage<Club> response = controller.add(dto, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有管理员可以创建社团");
        verify(clubService, never()).add(dto);
    }

    @Test
    void addAllowsAdminToCreateClubs() {
        Admin admin = new Admin();
        ClubDTO dto = clubDTO();
        Club savedClub = new Club();

        when(request.getAttribute("currentUser")).thenReturn(admin);
        when(clubService.add(dto)).thenReturn(savedClub);

        ResponseMessage<Club> response = controller.add(dto, request);

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getData()).isSameAs(savedClub);
        verify(clubService).add(dto);
    }

    private static ClubDTO clubDTO() {
        ClubDTO dto = new ClubDTO();
        dto.setClubName("测试社团");
        dto.setClubNameEn("Test Club");
        dto.setClubItem("测试");
        dto.setClubClass("study");
        dto.setPresident("测试社长");
        dto.setPresidentEn("President");
        dto.setVicePresident("测试副社长");
        dto.setVicePresidentEn("Vice President");
        dto.setTeacher("测试老师");
        dto.setTeacherEn("Teacher");
        dto.setSortDescription("测试简介");
        dto.setSortDescriptionEn("Test summary");
        dto.setClubDescription("测试社团描述");
        dto.setClubDescriptionEn("Test club description");
        return dto;
    }
}
