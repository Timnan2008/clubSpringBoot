package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ClubEditTemplateTest {

    @Test
    void editPayloadPreservesGreatClubAndVideoLike() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/club-edit.html"));

        assertThat(template).contains("IS_GREAT = club.greatClub");
        assertThat(template).contains("VIDEO_LIKE = club.videoLike");
        assertThat(template).contains("greatClub: IS_GREAT");
        assertThat(template).contains("videoLike: VIDEO_LIKE");
        assertThat(template).doesNotContain("isGreatClub: IS_GREAT");
    }
}
