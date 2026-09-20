package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.Clubs.repository.ClubRepository;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.repository.AdminRepository;
import com.qpwflshclub.formal_club.User.repository.ClubPresidentRepository;
import com.qpwflshclub.formal_club.User.repository.TeacherRepository;
import com.qpwflshclub.formal_club.User.repository.UserRepository;
import com.qpwflshclub.formal_club.User.service.IUserService;
import com.qpwflshclub.formal_club.social.controller.PersonalWelcomeController;
import com.qpwflshclub.formal_club.social.service.PersonalWelcomeStore;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import java.nio.file.*;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockHttpServletRequest;

class PersonalWelcomeTest {

    @TempDir
    Path dir;

    PersonalWelcomeStore store;
    PersonalWelcomeController controller;
    WorkspaceAccess access;
    String key;

    @BeforeEach
    void setup() throws Exception {
        var user = new User();
        user.setEmail("welcome@example.invalid");
        var other = new User();
        other.setEmail("other@example.invalid");
        var users = mock(IUserService.class);
        when(users.findByEmail(user.getEmail())).thenReturn(user);
        when(users.findByEmail(other.getEmail())).thenReturn(other);
        var accounts = new SchoolAccounts(
            users,
            mock(UserRepository.class),
            mock(ClubPresidentRepository.class),
            mock(TeacherRepository.class),
            mock(AdminRepository.class)
        );
        access = new WorkspaceAccess(users, mock(ClubRepository.class));
        store = new PersonalWelcomeStore(new ObjectMapper(), dir.toString());
        controller = new PersonalWelcomeController(accounts, access, store);
        key = SchoolAccounts.key(user.getEmail());
        Files.createDirectories(dir.resolve(key));
        Files.writeString(
            dir.resolve(key).resolve("welcome.json"),
            "{\"id\":\"welcome-v1\",\"title\":\"Welcome\",\"message\":\"A personal greeting\",\"imageAlt\":\"Gift\"}"
        );
        Files.write(dir.resolve(key).resolve("image.jpg"), new byte[] { 1, 2, 3 });
    }

    MockHttpServletRequest session(String email) {
        var r = new MockHttpServletRequest();
        r.getSession().setAttribute("authenticatedEmail", email);
        return r;
    }

    @Test
    void welcomeAndPhotoAreRestrictedToTheirOwner() throws Exception {
        var owner = session("welcome@example.invalid");
        var other = session("other@example.invalid");
        assertThat(((Map<?, ?>) controller.get(owner).getBody()).containsKey("welcome")).isTrue();
        assertThat(controller.get(other).getBody()).isEqualTo(Map.of("show", false));
        assertThat(controller.image(owner).getBody()).containsExactly((byte) 1, (byte) 2, (byte) 3);
        assertThat(controller.image(owner).getHeaders().getFirst("Cache-Control")).contains(
            "no-store"
        );
        assertThatThrownBy(() -> controller.image(other)).hasMessageContaining("404");
        assertThatThrownBy(() -> controller.get(new MockHttpServletRequest())).hasMessageContaining(
            "401"
        );
        assertThatThrownBy(() ->
            controller.image(new MockHttpServletRequest())
        ).hasMessageContaining("401");
    }

    @Test
    void openingNeedsTokenAndIsRememberedAcrossSessions() throws Exception {
        var owner = session("welcome@example.invalid");
        controller.get(owner);
        assertThatThrownBy(() -> controller.open(owner)).hasMessageContaining("403");
        owner.addHeader("X-Workspace-Token", access.token(owner));
        controller.open(owner);
        assertThat(controller.get(owner).getBody()).isEqualTo(Map.of("show", false));
        assertThat(controller.get(session("welcome@example.invalid")).getBody()).isEqualTo(
            Map.of("show", false)
        );
        assertThat(controller.open(owner).getBody()).isEqualTo(Map.of("show", false));
        assertThat(
            new PersonalWelcomeStore(new ObjectMapper(), dir.toString()).seen(key, "welcome-v1")
        ).isTrue();
    }

    @Test
    void deletingAnAccountRemovesItsPrivateWelcomeAndPhoto() throws Exception {
        assertThatThrownBy(() -> store.image("../secret")).hasMessageContaining("404");
        store.claim(key, store.find(key));
        store.removeAccount(key);
        assertThat(store.find(key)).isNull();
        assertThat(dir.resolve(key)).doesNotExist();
    }
}
