package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ClubAddTemplateTest {

    @Test
    void createClubPagePostsCompleteClubDtoToAdminOnlyEndpoint() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/club-add.html"));

        assertThat(template).contains("fetch(\"/api/club\"");
        assertThat(template).contains("method: \"POST\"");
        assertThat(template).contains("clubName:");
        assertThat(template).contains("clubNameEn:");
        assertThat(template).contains("clubItem:");
        assertThat(template).contains("clubClass:");
        assertThat(template).contains("president:");
        assertThat(template).contains("presidentEn:");
        assertThat(template).contains("vicePresident:");
        assertThat(template).contains("vicePresidentEn:");
        assertThat(template).contains("teacher:");
        assertThat(template).contains("teacherEn:");
        assertThat(template).contains("sortDescription:");
        assertThat(template).contains("sortDescriptionEn:");
        assertThat(template).contains("clubDescription:");
        assertThat(template).contains("clubDescriptionEn:");
        assertThat(template).contains("video:");
        assertThat(template).contains("videoLike: 0");
        assertThat(template).contains("greatClub:");
    }
}
