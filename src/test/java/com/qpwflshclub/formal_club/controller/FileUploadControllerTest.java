package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.service.User.IUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FileUploadControllerTest {

    @Mock
    IUserService userService;

    @TempDir
    Path uploadDir;

    FileUploadController controller;

    @BeforeEach
    void setUp() {
        controller = new FileUploadController();
        ReflectionTestUtils.setField(controller, "userService", userService);
        ReflectionTestUtils.setField(controller, "configuredUploadDir", uploadDir.toString());
    }

    @Test
    void uploadClubLogoRejectsFilenameWithoutExtension() {
        Admin admin = new Admin();
        when(userService.findByEmail("admin@example.com")).thenReturn(admin);
        MockMultipartFile file = new MockMultipartFile("file", "logo", "image/png", "fake".getBytes());

        ResponseMessage<String> response = controller.uploadClubLogo(file, "admin@example.com");

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("文件名格式不正确");
    }
}
