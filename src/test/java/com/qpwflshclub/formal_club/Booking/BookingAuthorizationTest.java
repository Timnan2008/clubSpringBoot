package com.qpwflshclub.formal_club.Booking;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.Booking.controller.BookingApiController;
import com.qpwflshclub.formal_club.Booking.service.BookingService;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.repository.AdminRepository;
import com.qpwflshclub.formal_club.User.repository.ClubPresidentRepository;
import com.qpwflshclub.formal_club.User.repository.TeacherRepository;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;

class BookingAuthorizationTest {

    @Test
    void forgedIdentityAndMissingTokenNeverReachTheReservationService() {
        var users = mock(IUserService.class);
        var accounts = new SchoolAccounts(
            users,
            mock(UserRepository.class),
            mock(ClubPresidentRepository.class),
            mock(TeacherRepository.class),
            mock(AdminRepository.class)
        );
        var access = new WorkspaceAccess(users, mock(ClubRepository.class));
        var service = mock(BookingService.class);
        var controller = new BookingApiController(
            accounts,
            access,
            service,
            new BookingOverseers("")
        );
        var request = new MockHttpServletRequest();
        request.setCookies(
            new jakarta.servlet.http.Cookie("user_session", "forged@example.invalid")
        );
        assertThatThrownBy(() ->
            controller.mine(request, new MockHttpServletResponse())
        ).hasMessageContaining("401");
        var user = new User();
        user.setEmail("owner@example.invalid");
        user.setUsername("Owner");
        when(users.findByEmail(user.getEmail())).thenReturn(user);
        request.getSession().setAttribute("authenticatedEmail", user.getEmail());
        var input = new BookingService.Submit(1, 1, 1201, "", 1, "request-key-for-test");
        assertThatThrownBy(() ->
            controller.submit(input, request, new MockHttpServletResponse())
        ).hasMessageContaining("403");
        assertThatThrownBy(() ->
            controller.cancel(1L, request, new MockHttpServletResponse())
        ).hasMessageContaining("403");
        verifyNoInteractions(service);
        request.addHeader("X-Workspace-Token", access.token(request));
        controller.submit(input, request, new MockHttpServletResponse());
        verify(service).submit(new BookingService.Actor(user.getEmail(), "Owner", false), input);
        controller.cancel(1L, request, new MockHttpServletResponse());
        verify(service).cancel(new BookingService.Actor(user.getEmail(), "Owner", false), 1L);
    }
}
