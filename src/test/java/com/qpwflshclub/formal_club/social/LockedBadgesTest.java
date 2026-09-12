package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.User.User;
import com.qpwflshclub.formal_club.repository.User.*;
import com.qpwflshclub.formal_club.service.User.IUserService;
import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;

class LockedBadgesTest {

    @TempDir
    Path dir;

    @Test
    void badgesAreServerAssignedIndependentOfEditableAppearanceAndSurviveReload() throws Exception {
        var u = new User();
        u.setEmail("badge@example.invalid");
        var id = SchoolAccounts.key(u.getEmail());
        Files.writeString(dir.resolve(id + ".json"), "[\"male-bestie\"]");
        var store = new LockedBadges(new ObjectMapper(), dir.toString());
        var accounts = new SchoolAccounts(
            mock(IUserService.class),
            mock(UserRepository.class),
            mock(ClubPresidentRepository.class),
            mock(TeacherRepository.class),
            mock(AdminRepository.class)
        );
        org.springframework.test.util.ReflectionTestUtils.setField(accounts, "lockedBadges", store);
        assertThat(accounts.view(u).badges()).containsExactly("male-bestie");
        assertThat(
            new LockedBadges(new ObjectMapper(), dir.toString()).forAccount(id)
        ).containsExactly("male-bestie");
        assertThat(store.forAccount(SchoolAccounts.key("other@example.invalid"))).isEmpty();
        store.removeAccount(id);
        assertThat(store.forAccount(id)).isEmpty();
    }
}
