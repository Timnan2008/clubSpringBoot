package com.qpwflshclub.formal_club.User.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.User.controller.UserController;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.pojo.dto.AdminDTO;
import com.qpwflshclub.formal_club.User.pojo.dto.UserDTO;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.AccountProfiles;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        controller.turnstile = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.service.Suggestion.TurnstileService.class
        );
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
        verify(userService).delete(2L, 0);
    }

    @Test
    void sameNameCannotDeleteAnotherAccount() {
        User currentUser = user("Shared", "same", 1L);
        UserDTO other = userDTO("Shared", "same", 2L);
        when(request.getAttribute("currentUser")).thenReturn(currentUser);
        assertThat(controller.delete(other, request).getCode()).isEqualTo(400);
        verify(userService, never()).delete(2L, 0);
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
        dto.setEmail(usernameEn.replace(" ", ".") + "@example.com");
        dto.setPassword("StrongTest!Password7");
        return dto;
    }

    private static AdminDTO adminDTO() {
        AdminDTO dto = new AdminDTO();
        dto.setUsername("Admin");
        dto.setUsernameEn("admin");
        dto.setEmail("admin@example.com");
        dto.setPassword("StrongTest!Password7");
        return dto;
    }

    @Test
    void studentProfileCannotInjectMemberships() {
        User u = user("Student", "student", 1L);
        u.setEmail("student@example.com");
        u.setClubs(java.util.List.of());
        UserDTO dto = userDTO("Student", "student", 1L);
        dto.setClubs(java.util.List.of(99L));
        when(request.getAttribute("currentUser")).thenReturn(u);
        controller.update(dto, "user", request);
        assertThat(dto.getClubs()).isEmpty();
        assertThat(dto.getEmail()).isEqualTo(u.getEmail());
    }

    @Test
    void publicRegistrationCannotChooseAClub() {
        UserDTO dto = userDTO("新同学", "Xin Tongxue", 1L);
        dto.setClubs(java.util.List.of(99L));
        var verified = new org.springframework.mock.web.MockHttpServletRequest();
        com.qpwflshclub.formal_club.config.RegistrationProof.verified(verified, dto.getEmail());
        controller.profiles = org.mockito.Mockito.mock(
            AccountProfiles.class
        );
        controller.add(dto, verified);
        assertThat(dto.getClubs()).isEmpty();
    }

    @Test
    void captchaFailurePreventsRegistration() {
        var dto = userDTO("新同学", "Xin Tongxue", 1L);
        dto.setTurnstileToken("expired");
        org.mockito.Mockito.doThrow(
            new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST
            )
        )
            .when(controller.turnstile)
            .verify("expired", "register");
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            controller.add(dto, new org.springframework.mock.web.MockHttpServletRequest())
        ).hasMessageContaining("400");
        verify(userService, never()).addUser(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void signupRetryKeepsVerifiedEmailAfterStorageFailure() {
        var dto = userDTO("新同学", "New Student", 1L);
        dto.setEmail("new@example.com");
        dto.setEmailCode("123456");
        var r = new org.springframework.mock.web.MockHttpServletRequest();
        controller.registrationCodes = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.service.Suggestion.EmailCodeService.class
        );
        controller.profiles = org.mockito.Mockito.mock(
            AccountProfiles.class
        );
        when(controller.registrationCodes.verifyCode(dto.getEmail(), "123456")).thenReturn(true);
        when(
            controller.profiles.register(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.eq(true),
                org.mockito.ArgumentMatchers.any()
            )
        )
            .thenThrow(new IllegalStateException("temporary"))
            .thenReturn(null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            controller.add(dto, r)
        ).hasMessageContaining("temporary");
        assertThat(
            com.qpwflshclub.formal_club.config.RegistrationProof.valid(r, dto.getEmail())
        ).isTrue();
        controller.add(dto, r);
        verify(controller.registrationCodes, org.mockito.Mockito.times(1)).verifyCode(
            dto.getEmail(),
            "123456"
        );
        assertThat(
            com.qpwflshclub.formal_club.config.RegistrationProof.valid(r, dto.getEmail())
        ).isFalse();
    }

    @Test
    void signupVerificationRejectsRegisteredEmailBeforeCaptcha() {
        controller.loginEmails = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.config.LoginEmails.class
        );
        org.mockito.Mockito.doThrow(
            com.qpwflshclub.formal_club.social.service.SchoolAccounts.error(
                409,
                com.qpwflshclub.formal_club.config.LoginEmails.EMAIL_REGISTERED
            )
        )
            .when(controller.loginEmails)
            .requireAvailable("taken@example.com");
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            controller.verifySignup(
                new UserController.SignupVerification("taken@example.com", "user", "fresh"),
                new org.springframework.mock.web.MockHttpServletRequest()
            )
        ).hasMessageContaining("409");
        org.mockito.Mockito.verify(controller.turnstile, never()).verify(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void availabilityRejectsMismatchedStudentName() {
        controller.roster = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.config.StudentRoster.class
        );
        controller.profiles = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.social.service.AccountProfiles.class
        );
        org.mockito.Mockito.doThrow(
            com.qpwflshclub.formal_club.social.service.SchoolAccounts.error(
                400,
                com.qpwflshclub.formal_club.config.StudentRoster.MISMATCH
            )
        )
            .when(controller.roster)
            .requireMatchingStudent("20260001", "测试乙", "Alice");
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            controller.availability(
                new UserController.SignupAvailability(null, "20260001", "user", "测试乙", "Alice")
            )
        ).hasMessageContaining("400");
        org.mockito.Mockito.verify(
            controller.profiles,
            org.mockito.Mockito.never()
        ).requireStudentNumberAvailable(
            org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void availabilityAllowsUnusedStudentNumber() {
        controller.profiles = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.social.service.AccountProfiles.class
        );
        ResponseMessage<?> response = controller.availability(
            new UserController.SignupAvailability(null, "NEW-99", "user", "测试甲", "Alice")
        );
        assertThat(response.getCode()).isEqualTo(200);
        org.mockito.Mockito.verify(controller.profiles).requireStudentNumberAvailable("", "NEW-99");
    }

    @Test
    void availabilityRejectsRegisteredStudentNumber() {
        controller.profiles = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.social.service.AccountProfiles.class
        );
        org.mockito.Mockito.doThrow(
            com.qpwflshclub.formal_club.social.service.SchoolAccounts.error(
                409,
                com.qpwflshclub.formal_club.social.service.AccountProfiles.STUDENT_NUMBER_REGISTERED
            )
        )
            .when(controller.profiles)
            .requireStudentNumberAvailable("", "00123");
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            controller.availability(
                new UserController.SignupAvailability(null, "00123", "user", "测试甲", "Alice")
            )
        ).hasMessageContaining("409");
    }

    @Test
    void invalidEmailCodeCannotCreateAccount() {
        var dto = userDTO("新同学", "New Student", 1L);
        dto.setEmailCode("000000");
        controller.registrationCodes = org.mockito.Mockito.mock(
            com.qpwflshclub.formal_club.service.Suggestion.EmailCodeService.class
        );
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            controller.add(dto, new org.springframework.mock.web.MockHttpServletRequest())
        ).hasMessageContaining("Email code is invalid or expired");
        verify(userService, never()).addUser(org.mockito.ArgumentMatchers.any());
    }
}
