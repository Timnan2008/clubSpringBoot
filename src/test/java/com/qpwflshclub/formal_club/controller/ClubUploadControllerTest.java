package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.Teacher;
import com.qpwflshclub.formal_club.service.Club.IClubService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClubUploadControllerTest {

    @Mock
    IClubService clubService;

    @Mock
    HttpServletRequest request;

    ClubUploadController controller;

    @BeforeEach
    void setUp() {
        controller = new ClubUploadController();
        ReflectionTestUtils.setField(controller, "clubService", clubService);
    }

    @Test
    void uploadLogoRejectsTeacherWithoutClubPermission() {
        Club club = new Club();
        club.setId(1);
        Teacher teacher = new Teacher();
        MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", "fake".getBytes());
        when(clubService.find(1)).thenReturn(club);
        when(request.getAttribute("currentUser")).thenReturn(teacher);

        ResponseMessage<String> response = controller.uploadLogo(1, file, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：不能修改该社团");
        verify(clubService, never()).update(any());
    }

    @Test
    void uploadLogoRejectsNonImageExtension() {
        Club club = new Club();
        club.setId(1);
        Admin admin = new Admin();
        MockMultipartFile file = new MockMultipartFile("file", "logo.txt", "text/plain", "fake".getBytes());
        when(clubService.find(1)).thenReturn(club);
        when(request.getAttribute("currentUser")).thenReturn(admin);

        ResponseMessage<String> response = controller.uploadLogo(1, file, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("只支持 jpg, jpeg, png, gif, webp 格式的图片");
        verify(clubService, never()).update(any());
    }
}
