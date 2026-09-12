package com.qpwflshclub.formal_club.page;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class ProfileTemplateTest {

    @Test
    void profilePageDoesNotExposeCurrentPasswordInJavascript() throws Exception {
        String template = Files.readString(
            Path.of("src/main/resources/templates/page/profile.html")
        );

        assertThat(template).doesNotContain("USER_PASSWORD");
        assertThat(template).doesNotContain("loginUser.password");
        assertThat(template).contains("/javascript/ui/account.js");
    }

    @Test
    void profileLoadsSharedAccountEditorWithoutEmbeddingAnIdentityOrPassword() throws Exception {
        String template = Files.readString(
            Path.of("src/main/resources/templates/page/profile.html")
        );
        assertThat(template).contains("data-mode=\"profile\"");
        assertThat(template).contains("/javascript/ui/account.js");
        assertThat(template).doesNotContain(
            "USER_TYPE",
            "USER_PASSWORD",
            "USER_NAME_EN",
            "/api/user/delete"
        );
    }
}
