package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.nio.file.Path;
import java.time.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ContentDisciplineTest {

    @TempDir
    Path dir;

    @AfterEach
    void clear() {
        ContentDiscipline.unbind();
        if (active() != null) active().stop();
    }

    @Test
    void fiveBlockedAttemptsMuteTheAccountForAWeek() throws Exception {
        var clock = Clock.fixed(Instant.parse("2026-09-17T09:00:00Z"), ZoneOffset.UTC);
        var discipline = new ContentDiscipline(new ObjectMapper(), dir.toString()).withClock(clock);
        discipline.start();
        ContentDiscipline.bind("student@example.invalid");
        for (int i = 1; i <= 4; i++) {
            int strike = i;
            assertThatThrownBy(() -> ContentModeration.check("nmsl")).hasMessageContaining(
                strike + "/5"
            );
        }
        assertThatThrownBy(() -> ContentModeration.check("nmsl")).hasMessageContaining("禁言至");
        assertThat(discipline.until(SchoolAccounts.key("student@example.invalid"))).isEqualTo(
            "2026-09-24 17:00"
        );
        assertThatThrownBy(() ->
            discipline.requireOpen(SchoolAccounts.key("student@example.invalid"))
        ).hasMessageContaining("禁言至");
    }

    @Test
    void muteExpiresAndStrikesReset() throws Exception {
        var start = Clock.fixed(Instant.parse("2026-09-17T09:00:00Z"), ZoneOffset.UTC);
        var first = new ContentDiscipline(new ObjectMapper(), dir.toString()).withClock(start);
        first.start();
        ContentDiscipline.bind("student@example.invalid");
        for (int i = 0; i < 5; i++) assertThatThrownBy(() -> ContentModeration.check("傻逼"));
        first.stop();
        ContentDiscipline.unbind();
        var later = new ContentDiscipline(new ObjectMapper(), dir.toString()).withClock(
            Clock.fixed(Instant.parse("2026-09-24T09:00:01Z"), ZoneOffset.UTC)
        );
        later.start();
        ContentDiscipline.bind("student@example.invalid");
        assertThat(later.until(SchoolAccounts.key("student@example.invalid"))).isEmpty();
        assertThatThrownBy(() -> ContentModeration.check("傻逼")).hasMessageContaining("1/5");
        later.stop();
    }

    private ContentDiscipline active() {
        try {
            var field = ContentDiscipline.class.getDeclaredField("active");
            field.setAccessible(true);
            return (ContentDiscipline) field.get(null);
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }
}
