package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ClubAddRouteTest {

    @Test
    void createClubPageRouteIsAdminOnly() throws Exception {
        String controller = Files.readString(Path.of("src/main/java/com/qpwflshclub/formal_club/controller/PageController.java"));

        assertThat(controller).contains("@GetMapping(\"/club/add\")");
        assertThat(controller).contains("loginUser.getUserRight() < 3");
        assertThat(controller).contains("return \"page/club-add\"");
    }
}
