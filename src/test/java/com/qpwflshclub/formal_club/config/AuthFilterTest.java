package com.qpwflshclub.formal_club.config;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

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
 @Test void emailCookieCannotImpersonateClubManager()throws Exception{var filter=new AuthFilter();var users=org.mockito.Mockito.mock(com.qpwflshclub.formal_club.service.User.IUserService.class);org.springframework.test.util.ReflectionTestUtils.setField(filter,"userService",users);var request=new org.springframework.mock.web.MockHttpServletRequest("POST","/api/club/member/add");request.setCookies(new jakarta.servlet.http.Cookie("user_session","leader@example.com"));var response=new org.springframework.mock.web.MockHttpServletResponse();var chain=new org.springframework.mock.web.MockFilterChain();filter.doFilter(request,response,chain);assertThat(response.getStatus()).isEqualTo(401);org.mockito.Mockito.verifyNoInteractions(users);}
}
