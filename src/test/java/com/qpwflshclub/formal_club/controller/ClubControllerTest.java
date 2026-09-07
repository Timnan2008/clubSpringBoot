package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.Club.ClubVO;
import com.qpwflshclub.formal_club.pojo.Club.SearchResultVO;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.pojo.dto.Club.ClubDTO;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Locale;

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

    @Mock
    IUserService userService;

    ClubController controller;

    @BeforeEach
    void setUp() {
        controller = new ClubController();
        controller.clubService = clubService;
        ReflectionTestUtils.setField(controller, "userService", userService);
        LocaleContextHolder.setLocale(Locale.CHINA);
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
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

    @Test
    void deleteRejectsTeacherBecauseOnlyAdminsCanDeleteClubs() {
        Teacher teacher = new Teacher();

        when(request.getAttribute("currentUser")).thenReturn(teacher);

        ResponseMessage<Club> response = controller.delete(1, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有管理员可以删除社团");
        verify(clubService, never()).delate(1);
    }

    @Test
    void deleteAllowsAdminToDeleteClubs() {
        Admin admin = new Admin();

        when(request.getAttribute("currentUser")).thenReturn(admin);

        ResponseMessage<Club> response = controller.delete(1, request);

        assertThat(response.getCode()).isEqualTo(200);
        verify(clubService).delate(1);
    }

    @Test
    void findAllCarriesEnglishClubNameForFrontendConsumers() {
        Club club = club();

        when(clubService.findAll()).thenReturn(List.of(club));

        ResponseMessage<List<ClubVO>> response = controller.findAll();

        assertThat(response.getData()).hasSize(1);
        assertThat(response.getData().getFirst().getClubName()).isEqualTo("编程社");
        assertThat(response.getData().getFirst().getClubNameEn()).isEqualTo("Codecraft");
        assertThat(response.getData().getFirst().getClubURL()).isEqualTo("page/club-watch/Codecraft?lang=zh");
    }

    @Test
    void searchUsesShortDescriptionAsBriefInChineseLocale() {
        Club club = club();

        when(clubService.search("编程")).thenReturn(List.of(club));

        ResponseMessage<List<SearchResultVO>> response = controller.search("编程");

        assertThat(response.getData()).hasSize(1);
        assertThat(response.getData().getFirst().getBrief()).isEqualTo("用代码连接世界");
    }

    @Test
    void updateNameEnAllowsTeacherWhenManagedClubIdsMatch() {
        Teacher teacher = new Teacher();
        Club managedClub = new Club();
        managedClub.setId(1);
        teacher.setClubs(List.of(managedClub));
        Club currentClub = club();
        ClubDTO dto = clubDTO();
        Club updatedClub = club();

        when(userService.findByEmail("teacher@example.com")).thenReturn(teacher);
        when(clubService.findByName("Codecraft")).thenReturn(currentClub);
        when(clubService.update(dto)).thenReturn(updatedClub);

        ResponseMessage<Club> response = controller.updateNameEn("Codecraft", dto, "teacher@example.com");

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getData()).isSameAs(updatedClub);
        assertThat(dto.getClubId()).isEqualTo(1);
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

    private static Club club() {
        Club club = new Club();
        club.setId(1);
        club.setClubName("编程社");
        club.setClubNameEn("Codecraft");
        club.setClubItem("/logo.png");
        club.setClubClass("study");
        club.setSortDescription("用代码连接世界");
        club.setSortDescriptionEn("Build with code");
        club.setClubDescription("详细介绍");
        club.setClubDescriptionEn("Long description");
        return club;
    }
}
