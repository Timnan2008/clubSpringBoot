package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ManagerOfUsersTemplateTest {

    @Test
    void presidentCardsRenderManagedClubInformation() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/manager of users.html"));

        assertThat(template).contains("president-club-info");
        assertThat(template).contains("presidentClubInfoHtml");
        assertThat(template).contains("mainClubId");
    }

    @Test
    void usersWithMultipleIdentitiesAreRenderedAsMergedPersonCards() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/manager of users.html"));

        assertThat(template).contains("groupUsersByPerson(users).forEach");
        assertThat(template).contains("person-card merged-person");
        assertThat(template).contains("identity-grid");
        assertThat(template).contains("buildUserCard(user, true)");
    }

    @Test
    void revokePresidentModalIsWiredToBackend() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/manager of users.html"));

        assertThat(template).contains("revoke-president-btn");
        assertThat(template).contains("openRevokeModal(user)");
        assertThat(template).contains("currentUserToRevoke");
        assertThat(template).contains("/api/user/revoke-president");
        assertThat(template).contains("btnDoRevoke");
    }
}
