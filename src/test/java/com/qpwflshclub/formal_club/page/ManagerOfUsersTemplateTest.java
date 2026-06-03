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
}
