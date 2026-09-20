package com.qpwflshclub.formal_club.booking;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class BookingPolicyTest {

    BookingPolicy policy(LocalDate forceOpen) {
        return policy(forceOpen, null, null);
    }

    BookingPolicy policy(LocalDate forceOpen, LocalTime forceStart, LocalTime forceEnd) {
        return new BookingPolicy(
            "Asia/Shanghai",
            20,
            3,
            1,
            List.of(1, 2, 3, 4, 5),
            List.of(6, 7),
            LocalTime.of(13, 0),
            LocalTime.of(19, 0),
            LocalTime.of(19, 0),
            List.of(
                new BookingPolicy.Period(LocalTime.of(11, 30), LocalTime.of(12, 50)),
                new BookingPolicy.Period(LocalTime.of(16, 30), LocalTime.of(18, 30))
            ),
            null,
            forceOpen,
            forceStart,
            forceEnd,
            1
        );
    }

    long start(LocalDate date, String time) {
        return date
            .atTime(LocalTime.parse(time))
            .atZone(ZoneId.of("Asia/Shanghai"))
            .toEpochSecond();
    }

    @Test
    void fridayUsesLunchOnlyAndMissingFridayPeriodsDefaultFromLegacyJson() throws Exception {
        var policy = policy(null);
        assertThat(policy.slotsFor(DayOfWeek.FRIDAY)).containsExactly(
            LocalTime.of(11, 30),
            LocalTime.of(11, 50),
            LocalTime.of(12, 10),
            LocalTime.of(12, 30)
        );
        assertThat(policy.slotsFor(DayOfWeek.MONDAY)).hasSize(10);
        long fridayEvening = start(LocalDate.of(2026, 9, 18), "16:30");
        assertThat(policy.validSlot(fridayEvening, fridayEvening + 1200)).isFalse();
        long mondayEvening = start(LocalDate.of(2026, 9, 14), "16:30");
        assertThat(policy.validSlot(mondayEvening, mondayEvening + 1200)).isTrue();
        long fridayLunch = start(LocalDate.of(2026, 9, 18), "11:30");
        assertThat(policy.validSlot(fridayLunch, fridayLunch + 1200)).isTrue();

        var legacy = new ObjectMapper().findAndRegisterModules().readValue(
            """
            {"zone":"Asia/Shanghai","slotMinutes":20,"weeklyLimit":3,"dailyLimit":1,"bookingDays":[1,2,3,4,5],"studentOpenDays":[6,7],"studentOpen":"13:00","studentClose":"19:00","teacherDeadline":"19:00","periods":[{"start":"11:30","end":"12:50"},{"start":"16:30","end":"18:30"}],"rulesVersion":1}
            """,
            BookingPolicy.class
        );
        assertThat(legacy.fridayPeriods()).containsExactly(
            new BookingPolicy.Period(LocalTime.of(11, 30), LocalTime.of(12, 50))
        );
    }

    @Test
    void studentForceOpenUsesOneDayEveningWindowThenFallsBack() {
        assertThat(policy(null).studentOpen(Instant.parse("2026-09-15T10:00:00Z"))).isFalse();
        var forced = policy(
            LocalDate.of(2026, 9, 15),
            LocalTime.of(18, 0),
            LocalTime.of(23, 59, 59)
        );
        assertThat(forced.studentOpen(Instant.parse("2026-09-15T09:59:59Z"))).isFalse();
        assertThat(forced.studentOpen(Instant.parse("2026-09-15T10:00:00Z"))).isTrue();
        assertThat(forced.studentOpen(Instant.parse("2026-09-15T12:00:00Z"))).isTrue();
        assertThat(forced.studentOpen(Instant.parse("2026-09-15T15:59:58Z"))).isTrue();
        assertThat(forced.studentOpen(Instant.parse("2026-09-15T15:59:59Z"))).isFalse();
        assertThat(forced.studentOpen(Instant.parse("2026-09-16T10:00:00Z"))).isFalse();
        assertThat(forced.studentOpen(Instant.parse("2026-09-19T06:00:00Z"))).isTrue();
    }

    @Test
    void productionOneDayWindowJsonOpensTonightThenWeekendOnly() throws Exception {
        var trial = new ObjectMapper().findAndRegisterModules().readValue(
            """
            {"zone":"Asia/Shanghai","slotMinutes":20,"weeklyLimit":3,"dailyLimit":1,"bookingDays":[1,2,3,4,5],"studentOpenDays":[6,7],"studentOpen":"13:00","studentClose":"19:00","teacherDeadline":"19:00","periods":[{"start":"11:30","end":"12:50"},{"start":"16:30","end":"18:30"}],"fridayPeriods":[{"start":"11:30","end":"12:50"}],"studentForceOpenOn":"2026-09-15","studentForceOpen":"18:00","studentForceClose":"23:59:59","rulesVersion":2}
            """,
            BookingPolicy.class
        );
        assertThat(trial.studentOpen(Instant.parse("2026-09-15T02:38:00Z"))).isFalse();
        assertThat(trial.studentOpen(Instant.parse("2026-09-15T10:30:00Z"))).isTrue();
        assertThat(trial.slotsFor(DayOfWeek.FRIDAY)).hasSize(4);
        assertThat(
            trial.validSlot(
                start(LocalDate.of(2026, 9, 18), "16:30"),
                start(LocalDate.of(2026, 9, 18), "16:30") + 1200
            )
        ).isFalse();
    }

    @Test
    void studentOpenWindowIsWeekendAfternoonWhileCourtsStayWeekdays() {
        var policy = policy(null);
        assertThat(policy.bookingDays()).containsExactly(1, 2, 3, 4, 5);
        assertThat(policy.studentOpenDays()).containsExactly(6, 7);
        long mondayLunch = start(LocalDate.of(2026, 9, 14), "11:30");
        long saturdayAfternoon = start(LocalDate.of(2026, 9, 19), "13:00");
        assertThat(policy.validSlot(mondayLunch, mondayLunch + 1200)).isTrue();
        assertThat(policy.validSlot(saturdayAfternoon, saturdayAfternoon + 1200)).isFalse();
        Instant saturdayOpen = Instant.parse("2026-09-12T05:00:00Z");
        Instant fridayAfternoon = Instant.parse("2026-09-18T06:00:00Z");
        assertThat(policy.studentOpen(saturdayOpen)).isTrue();
        assertThat(policy.studentOpen(fridayAfternoon)).isFalse();
        assertThat(policy.inTargetWeek(LocalDate.of(2026, 9, 14), saturdayOpen)).isTrue();
        assertThat(policy.inTargetWeek(LocalDate.of(2026, 9, 19), saturdayOpen)).isTrue();
        assertThat(policy.weekEnd(policy.nextWeek(saturdayOpen))).isEqualTo(
            policy.weekStart(policy.nextWeek(saturdayOpen).plusWeeks(1))
        );
    }
}
