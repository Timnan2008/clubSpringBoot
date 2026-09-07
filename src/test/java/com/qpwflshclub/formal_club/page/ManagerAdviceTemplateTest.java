package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ManagerAdviceTemplateTest {

    @Test
    void loginLinksUseExistingLoginRoute() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/manager of advice.html"));

        assertThat(template).contains("/page/user/login");
        assertThat(template).doesNotContain("/page/login");
    }
}
