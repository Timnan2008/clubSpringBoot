package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.User.controller.UserController;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.pojo.dto.LoginDTO;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.service.*;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.*;
import org.springframework.test.util.ReflectionTestUtils;

class MutedAccountAccessTest {

    @TempDir
    Path dir;

    @Test
    void mutedAccountsCanLoginReadAndUseNonSpeechFeatures() throws Exception {
        var penalties = new ModerationPenalty(dir.resolve("penalties.json").toString());
        var user = new User();
        user.setId(12L);
        user.setEmail("muted@example.com");
        user.setUsername("Student");
        user.setPassword("test-password");
        String key = SchoolAccounts.key(user.getEmail());
        for (int i = 0; i < 3; i++) penalties.strike(key, ModerationGate.CHAT, "test");
        var users = mock(IUserService.class);
        when(users.findByEmail(user.getEmail())).thenReturn(user);
        var login = new UserController();
        ReflectionTestUtils.setField(login, "userService", users);
        ReflectionTestUtils.setField(login, "moderationPenalties", penalties);
        var dto = new LoginDTO();
        dto.setEmail(user.getEmail());
        dto.setPassword("test-password");
        var request = new MockHttpServletRequest();
        login.login(dto, new MockHttpServletResponse(), request);
        assertThat(request.getSession().getAttribute("authenticatedEmail")).isEqualTo(
            user.getEmail()
        );
        var accounts = new SchoolAccounts(users, null, null, null, null);
        ReflectionTestUtils.setField(accounts, "moderationPenalties", penalties);
        for (String path : new String[] {
            "/api/campus-social/me",
            "/api/openclaw/bootstrap",
            "/api/campus-social/me/details",
        }) {
            request.setRequestURI(path);
            request.setMethod("PUT");
            assertThat(accounts.current(request)).isSameAs(user);
        }
        var gate = new ModerationGate(penalties);
        for (String where : new String[] {
            ModerationGate.POST,
            ModerationGate.REPLY,
            ModerationGate.CHAT,
            ModerationGate.SUGGESTION,
        })
            assertThatThrownBy(() -> gate.inspect(key, where, "正常内容")).hasMessageContaining(
                "403"
            );
        gate.inspect(key, ModerationGate.PROFILE, "正常资料");
        gate.inspect(key, ModerationGate.CALENDAR, "正常日程");
        assertThatThrownBy(() ->
            gate.inspect(key, ModerationGate.PROFILE, "傻逼")
        ).hasMessageContaining("400");
        penalties.forgive(key);
        gate.inspect(key, ModerationGate.CHAT, "正常消息");
    }
}
