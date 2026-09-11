package com.qpwflshclub.formal_club.controller;

import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.pojo.dto.User.LoginDTO;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class BookingControllerTest {
    private final IUserService users = mock(IUserService.class);
    private final BookingController booking = new BookingController(users, "http://localhost:8765/");

    @Test
    void visitorAndForgedEmailCannotEnterBooking() {
        var request = new MockHttpServletRequest();
        request.setCookies(new Cookie("user_session", "student@example.com"));
        assertThat(booking.booking(request)).isEqualTo("redirect:/page/user/login?next=%2Fpage%2Fbooking");
        assertThat(booking.currentAccount(request).getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(users);
    }

    @Test
    void loginGrantsBookingAndLogoutRevokesIt() {
        var user = new User();
        user.setUsername("Test student");
        user.setEmail("student@example.com");
        user.setPassword("test-only-password");
        when(users.findByEmail(user.getEmail())).thenReturn(user);
        var controller = new UserController();
        controller.userService = users;
        var dto = new LoginDTO();
        dto.setEmail(user.getEmail());
        dto.setPassword(user.getPassword());
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        var oldSession = request.getSession();
        assertThat(controller.login(dto, response, request).getCode()).isEqualTo(200);
        assertThat(request.getSession()).isNotSameAs(oldSession);
        assertThat(booking.booking(request)).isEqualTo("redirect:http://localhost:8765/");
        var account = booking.currentAccount(request);
        assertThat(account.getStatusCode().value()).isEqualTo(200);
        assertThat(account.getBody().toString()).contains(user.getEmail()).doesNotContain(user.getPassword());
        controller.logout(request, response);
        assertThat(booking.currentAccount(request).getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void wrongPasswordDoesNotCreateBookingSession() {
        var user = new User();
        user.setEmail("student@example.com");
        user.setPassword("correct");
        when(users.findByEmail(user.getEmail())).thenReturn(user);
        var controller = new UserController();
        controller.userService = users;
        var dto = new LoginDTO();
        dto.setEmail(user.getEmail());
        dto.setPassword("wrong");
        var request = new MockHttpServletRequest();
        assertThat(controller.login(dto, new MockHttpServletResponse(), request).getCode()).isNotEqualTo(200);
        assertThat(request.getSession(false)).isNull();
        assertThat(booking.currentAccount(request).getStatusCode().value()).isEqualTo(401);
    }

    @Test
    void deletedAccountCannotUseOldSession() {
        var request = new MockHttpServletRequest();
        request.getSession().setAttribute("authenticatedEmail", "deleted@example.com");
        assertThat(booking.currentAccount(request).getStatusCode().value()).isEqualTo(401);
    }
}
