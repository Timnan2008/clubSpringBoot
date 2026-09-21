package com.qpwflshclub.formal_club.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.qpwflshclub.formal_club.User.service.IUserService;
import java.lang.reflect.Field;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AuthFilterTest {

    @Test
    void highPrivilegeAccountCreationIsNotPublic() throws Exception {
        Field field = AuthFilter.class.getDeclaredField("PUBLIC_POST_PATHS");
        field.setAccessible(true);

        @SuppressWarnings("unchecked")
        Set<String> publicPostPaths = (Set<String>) field.get(null);

        assertThat(publicPostPaths)
            .doesNotContain("/api/user/add/admin")
            .doesNotContain("/api/user/add/club-president");
    }

    @Test
    void anonymousSignupVerificationReachesHandlerButDoesNotOpenOtherAccountEndpoints()
        throws Exception {
        var filter = new AuthFilter();
        var request = new org.springframework.mock.web.MockHttpServletRequest(
            "POST",
            "/api/user/registration-verification"
        );
        var response = new org.springframework.mock.web.MockHttpServletResponse();
        var chain = new org.springframework.mock.web.MockFilterChain();
        filter.doFilter(request, response, chain);
        assertThat(chain.getRequest()).isSameAs(request);
        var protectedRequest = new org.springframework.mock.web.MockHttpServletRequest(
            "POST",
            "/api/user/add/admin"
        );
        var protectedResponse = new org.springframework.mock.web.MockHttpServletResponse();
        var protectedChain = new org.springframework.mock.web.MockFilterChain();
        filter.doFilter(protectedRequest, protectedResponse, protectedChain);
        assertThat(protectedResponse.getStatus()).isEqualTo(401);
        assertThat(protectedChain.getRequest()).isNull();
    }

    @Test
    void emailCookieCannotImpersonateClubManager() throws Exception {
        var filter = new AuthFilter();
        var users = org.mockito.Mockito.mock(IUserService.class);
        org.springframework.test.util.ReflectionTestUtils.setField(filter, "userService", users);
        var request = new org.springframework.mock.web.MockHttpServletRequest(
            "POST",
            "/api/club/member/add"
        );
        request.setCookies(new jakarta.servlet.http.Cookie("user_session", "leader@example.com"));
        var response = new org.springframework.mock.web.MockHttpServletResponse();
        var chain = new org.springframework.mock.web.MockFilterChain();
        filter.doFilter(request, response, chain);
        assertThat(response.getStatus()).isEqualTo(401);
        org.mockito.Mockito.verifyNoInteractions(users);
    }
}
