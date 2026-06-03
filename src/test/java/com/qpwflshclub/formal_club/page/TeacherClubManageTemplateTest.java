package com.qpwflshclub.formal_club.page;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class TeacherClubManageTemplateTest {

    @Test
    void memberRowsExposePresidentAppointmentActions() throws Exception {
        String template = Files.readString(Path.of("src/main/resources/templates/page/teacher-club-manage.html"));

        assertThat(template).contains("data-action=\"appoint-president\"");
        assertThat(template).contains("data-action=\"appoint-vice-president\"");
        assertThat(template).contains("data-action=\"revoke-staff-role\"");
        assertThat(template).contains("appointStaffRole(clubId, studentId, \"member\")");
        assertThat(template).contains("撤销社长");
        assertThat(template).contains("撤销副社长");
        assertThat(template).contains("/api/club/member/update");
    }
}
