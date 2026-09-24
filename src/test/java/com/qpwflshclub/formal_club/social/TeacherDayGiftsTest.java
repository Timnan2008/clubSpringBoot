package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.User;
import com.qpwflshclub.formal_club.User.repository.TeacherRepository;
import com.qpwflshclub.formal_club.social.service.TeacherDayGifts;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class TeacherDayGiftsTest {

    @TempDir
    Path dir;

    @Test
    void giftsAreTeacherOnlyPersistAndRemainAfterTheAwardYear() throws Exception {
        var repo = mock(TeacherRepository.class);
        var teacher = new Teacher();
        teacher.setEmail("teacher@example.com");
        var student = new User();
        student.setEmail("student@example.com");
        var path = dir.resolve("gifts.json");
        var gifts = spy(new TeacherDayGifts(path.toString(), repo));
        doReturn(true).when(gifts).thisYear();
        assertThat(gifts.awarded(student)).isFalse();
        assertThat(gifts.awarded(teacher)).isTrue();
        assertThat(gifts.awarded(teacher)).isTrue();
        var later = spy(new TeacherDayGifts(path.toString(), repo));
        doReturn(false).when(later).thisYear();
        assertThat(later.awarded(teacher)).isTrue();
        var another = new Teacher();
        another.setEmail("new@example.com");
        assertThat(later.awarded(another)).isFalse();
        assertThat(Files.readString(path)).doesNotContain("teacher@example.com");
    }

    @Test
    void existingTeachersReceiveGiftWithoutLoggingIn() throws Exception {
        var repo = mock(TeacherRepository.class);
        var teacher = new Teacher();
        teacher.setEmail("one@example.com");
        when(repo.findAll()).thenReturn(List.of(teacher));
        var gifts = spy(new TeacherDayGifts(dir.resolve("all.json").toString(), repo));
        doReturn(true).when(gifts).thisYear();
        gifts.distribute();
        doReturn(false).when(gifts).thisYear();
        assertThat(gifts.awarded(teacher)).isTrue();
    }

    @Test
    void newTeachersReceiveThisYearsGiftAfterTheHoliday() throws Exception {
        var repo = mock(TeacherRepository.class);
        var teacher = new Teacher();
        teacher.setEmail("later@example.com");
        var gifts = spy(new TeacherDayGifts(dir.resolve("later.json").toString(), repo));
        doReturn(false).when(gifts).today();
        doReturn(true).when(gifts).thisYear();
        assertThat(gifts.awarded(teacher)).isTrue();
    }

    @Test
    void greetingUsesOnlyTheSpecifiedHolidayAndAwardYearIs2026() {
        assertThat(TeacherDayGifts.celebration(LocalDate.of(2026, 9, 10))).isTrue();
        assertThat(TeacherDayGifts.celebration(LocalDate.of(2026, 9, 11))).isFalse();
        assertThat(TeacherDayGifts.celebration(LocalDate.of(2027, 9, 10))).isFalse();
        assertThat(TeacherDayGifts.awardYear(LocalDate.of(2026, 1, 1))).isTrue();
        assertThat(TeacherDayGifts.awardYear(LocalDate.of(2026, 12, 31))).isTrue();
        assertThat(TeacherDayGifts.awardYear(LocalDate.of(2025, 12, 31))).isFalse();
        assertThat(TeacherDayGifts.awardYear(LocalDate.of(2027, 9, 10))).isFalse();
    }
}
