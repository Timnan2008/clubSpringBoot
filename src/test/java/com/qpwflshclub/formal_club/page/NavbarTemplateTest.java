package com.qpwflshclub.formal_club.page;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class NavbarTemplateTest {

    @Test
    void clubMenuShowsOnlyOneClubEntryForEachPermissionLevel() throws Exception {
        String template = Files.readString(
            Path.of("src/main/resources/templates/fragments/navbar.html")
        );

        // HTML 排版空白不属于导航权限行为。
        assertThat(template).containsIgnoringWhitespaces(
            "<a th:if=\"${loginUser != null && loginUser.getUserRight() < 1}\" th:href=\"@{/page/my-clubs}\">My Clubs</a>"
        );
        assertThat(template).containsIgnoringWhitespaces(
            "<a th:if=\"${loginUser != null && loginUser.getUserRight() < 1}\" th:href=\"@{/page/my-clubs}\">我的社团</a>"
        );
        assertThat(template).containsIgnoringWhitespaces(
            "<a th:if=\"${loginUser != null && (loginUser.getUserRight() == 1 || loginUser.getUserRight() == 2)}\" th:href=\"@{/page/club/workspace}\">Club Management</a>"
        );
        assertThat(template).containsIgnoringWhitespaces(
            "<a th:if=\"${loginUser != null && (loginUser.getUserRight() == 1 || loginUser.getUserRight() == 2)}\" th:href=\"@{/page/club/workspace}\">社团管理</a>"
        );
    }
}
