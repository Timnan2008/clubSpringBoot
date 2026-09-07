package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ProfileTemplateTest {

    @Test
    void profilePageDoesNotExposeCurrentPasswordInJavascript() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/profile.html"));

        assertThat(template).doesNotContain("USER_PASSWORD");
        assertThat(template).doesNotContain("loginUser.password");
        assertThat(template).contains("password: \"\"");
    }

    @Test
    void clubPresidentUsesBackendUpdatePathName() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/profile.html"));

        assertThat(template).contains("USER_TYPE = 'club-president'");
        assertThat(template).doesNotContain("USER_TYPE = 'clubPresident'");
    }

    @Test
    void deleteAccountCallsExistingDeleteEndpoint() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/profile.html"));

        assertThat(template).contains("fetch(\"/api/user/delete\",");
        assertThat(template).contains("body: JSON.stringify({ usernameEn: USER_NAME_EN })");
        assertThat(template).doesNotContain("/api/user/delete/\" + userId");
    }
}
