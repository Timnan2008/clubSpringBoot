package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.Admin;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.pojo.dto.User.AdminDTO;
import com.qpwflshclub.formal_club.pojo.dto.User.UserDTO;
import com.qpwflshclub.formal_club.service.User.IUserService;
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
class UserControllerTest {

    @Mock
    IUserService userService;

    @Mock
    HttpServletRequest request;

    UserController controller;

    @BeforeEach
    void setUp() {
        controller = new UserController();
        controller.userService = userService;
    }

    @Test
    void addAdminRejectsNonAdmin() {
        User currentUser = user("Student", "student", 1L);
        AdminDTO dto = adminDTO();

        when(request.getAttribute("currentUser")).thenReturn(currentUser);

        ResponseMessage<Admin> response = controller.add(dto, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只有管理员可以创建管理员账号");
        verify(userService, never()).addAdmin(dto);
    }

    @Test
    void updateRejectsNonAdminUpdatingAnotherUser() {
        User currentUser = user("Student", "student", 1L);
        UserDTO dto = userDTO("Other", "other", 2L);

        when(request.getAttribute("currentUser")).thenReturn(currentUser);

        ResponseMessage<Object> response = controller.update(dto, "user", request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只能修改自己的账号");
        verify(userService, never()).update(dto);
    }

    @Test
    void updateAllowsSelfChangingEnglishName() {
        User currentUser = user("Student", "student", 1L);
        UserDTO dto = userDTO("Student", "student-new", 1L);
        User updatedUser = user("Student", "student-new", 1L);

        when(request.getAttribute("currentUser")).thenReturn(currentUser);
        when(userService.update(dto)).thenReturn(updatedUser);

        ResponseMessage<Object> response = controller.update(dto, "user", request);

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(response.getData()).isSameAs(updatedUser);
        verify(userService).update(dto);
    }

    @Test
    void updatePreservesCurrentPasswordWhenProfileSendsBlankPassword() {
        User currentUser = user("Student", "student", 1L);
        currentUser.setPassword("old-password");
        UserDTO dto = userDTO("Student", "student", 1L);
        dto.setPassword("");
        User updatedUser = user("Student", "student", 1L);

        when(request.getAttribute("currentUser")).thenReturn(currentUser);
        when(userService.update(dto)).thenReturn(updatedUser);

        ResponseMessage<Object> response = controller.update(dto, "user", request);

        assertThat(response.getCode()).isEqualTo(200);
        assertThat(dto.getPassword()).isEqualTo("old-password");
        verify(userService).update(dto);
    }

    @Test
    void deleteRejectsNonAdminDeletingAnotherUser() {
        User currentUser = user("Student", "student", 1L);
        UserDTO dto = userDTO("Other", "other", 2L);

        when(request.getAttribute("currentUser")).thenReturn(currentUser);

        ResponseMessage<String> response = controller.delete(dto, request);

        assertThat(response.getCode()).isEqualTo(400);
        assertThat(response.getMessage()).isEqualTo("无权限：只能删除自己的账号");
        verify(userService, never()).delete("other");
    }

    @Test
    void deleteAllowsAdminDeletingAnotherUser() {
        Admin currentUser = new Admin();
        currentUser.setId(99L);
        UserDTO dto = userDTO("Other", "other", 2L);

        when(request.getAttribute("currentUser")).thenReturn(currentUser);

        ResponseMessage<String> response = controller.delete(dto, request);

        assertThat(response.getCode()).isEqualTo(200);
        verify(userService).delete("other");
    }

    private static User user(String username, String usernameEn, long id) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setUsernameEn(usernameEn);
        user.setEmail(usernameEn + "@example.com");
        user.setPassword("password");
        return user;
    }

    private static UserDTO userDTO(String username, String usernameEn, long id) {
        UserDTO dto = new UserDTO();
        dto.setId(id);
        dto.setUsername(username);
        dto.setUsernameEn(usernameEn);
        dto.setEmail(usernameEn + "@example.com");
        dto.setPassword("password");
        return dto;
    }

    private static AdminDTO adminDTO() {
        AdminDTO dto = new AdminDTO();
        dto.setUsername("Admin");
        dto.setUsernameEn("admin");
        dto.setEmail("admin@example.com");
        dto.setPassword("password");
        return dto;
    }
}
