package com.qpwflshclub.formal_club.Booking;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/** One server-side interpretation of the SQL policy, shared by reads and writes. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BookingPolicy(
    String zone,
    int slotMinutes,
    int weeklyLimit,
    int dailyLimit,
    List<Integer> bookingDays,
    List<Integer> studentOpenDays,
    LocalTime studentOpen,
    LocalTime studentClose,
    LocalTime teacherDeadline,
    List<Period> periods,
    List<Period> fridayPeriods,
    LocalDate studentForceOpenOn,
    LocalTime studentForceOpen,
    LocalTime studentForceClose,
    int rulesVersion
) {
    public record Period(LocalTime start, LocalTime end) {}

    public BookingPolicy {
        if (
            !"Asia/Shanghai".equals(zone) ||
            slotMinutes < 5 ||
            slotMinutes > 120 ||
            dailyLimit < 1 ||
            weeklyLimit < dailyLimit ||
            weeklyLimit > 50 ||
            bookingDays == null ||
            bookingDays.isEmpty() ||
            bookingDays.stream().anyMatch(d -> d < 1 || d > 7) ||
            studentOpenDays == null ||
            studentOpenDays.isEmpty() ||
            studentOpenDays.stream().anyMatch(d -> d < 1 || d > 7) ||
            studentOpen == null ||
            studentClose == null ||
            !studentOpen.isBefore(studentClose) ||
            teacherDeadline == null ||
            periods == null ||
            periods.isEmpty() ||
            rulesVersion < 1
        ) {
            throw new IllegalArgumentException("Invalid booking policy");
        }
        periods = List.copyOf(validatePeriods(periods, slotMinutes));
        fridayPeriods = List.copyOf(
            validatePeriods(
                fridayPeriods == null || fridayPeriods.isEmpty()
                    ? List.of(new Period(LocalTime.of(11, 30), LocalTime.of(12, 50)))
                    : fridayPeriods,
                slotMinutes
            )
        );
        if (
            studentForceOpenOn != null &&
            (studentForceOpen != null || studentForceClose != null) &&
            (studentForceOpen == null ||
                studentForceClose == null ||
                !studentForceOpen.isBefore(studentForceClose))
        ) {
            throw new IllegalArgumentException("Invalid booking policy");
        }
        bookingDays = List.copyOf(bookingDays);
        studentOpenDays = List.copyOf(studentOpenDays);
    }

    private static List<Period> validatePeriods(List<Period> periods, int slotMinutes) {
        LocalTime previousEnd = LocalTime.MIN;
        for (Period period : periods) {
            if (
                period.start() == null ||
                period.end() == null ||
                !period.start().isBefore(period.end()) ||
                period.start().isBefore(previousEnd) ||
                Duration.between(period.start(), period.end()).toMinutes() % slotMinutes != 0 ||
                period.start().getSecond() != 0 ||
                period.end().getSecond() != 0
            ) {
                throw new IllegalArgumentException("Invalid or overlapping booking periods");
            }
            previousEnd = period.end();
        }
        return periods;
    }

    public ZoneId zoneId() {
        return ZoneId.of(zone);
    }

    public LocalDate nextWeek(Instant now) {
        return now.atZone(zoneId()).toLocalDate().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
    }

    public long weekStart(LocalDate monday) {
        return monday.atStartOfDay(zoneId()).toEpochSecond();
    }

    public long weekEnd(LocalDate monday) {
        return monday.plusWeeks(1).atStartOfDay(zoneId()).toEpochSecond();
    }

    public boolean inTargetWeek(LocalDate date, Instant now) {
        LocalDate monday = nextWeek(now);
        return !date.isBefore(monday) && date.isBefore(monday.plusWeeks(1));
    }

    public boolean studentOpen(Instant now) {
        var local = now.atZone(zoneId());
        if (studentForceOpenOn != null && local.toLocalDate().equals(studentForceOpenOn)) {
            if (studentForceOpen == null || studentForceClose == null) return true;
            return (
                !local.toLocalTime().isBefore(studentForceOpen) &&
                local.toLocalTime().isBefore(studentForceClose)
            );
        }
        return (
            studentOpenDays.contains(local.getDayOfWeek().getValue()) &&
            !local.toLocalTime().isBefore(studentOpen) &&
            local.toLocalTime().isBefore(studentClose)
        );
    }

    public long teacherDeadline(LocalDate date) {
        return date
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            .minusDays(1)
            .atTime(teacherDeadline)
            .atZone(zoneId())
            .toEpochSecond();
    }

    public List<Period> periodsFor(DayOfWeek day) {
        return day == DayOfWeek.FRIDAY ? fridayPeriods : periods;
    }

    public List<LocalTime> slotsFor(DayOfWeek day) {
        return expand(periodsFor(day))
            .stream()
            .filter(
                start ->
                    day != DayOfWeek.THURSDAY ||
                    !start.isBefore(LocalTime.of(13, 0)) ||
                    !start.plusMinutes(slotMinutes).isAfter(LocalTime.of(11, 30))
            )
            .toList();
    }

    public List<LocalTime> slots() {
        LinkedHashSet<LocalTime> times = new LinkedHashSet<>();
        for (int day : bookingDays) times.addAll(slotsFor(DayOfWeek.of(day)));
        return List.copyOf(times);
    }

    private List<LocalTime> expand(List<Period> periods) {
        List<LocalTime> result = new ArrayList<>();
        for (Period period : periods) {
            long duration = Duration.between(period.start(), period.end()).toMinutes();
            for (int offset = 0; offset + slotMinutes <= duration; offset += slotMinutes) {
                result.add(period.start().plusMinutes(offset));
            }
        }
        return result;
    }

    public boolean validSlot(long start, long end) {
        try {
            var local = Instant.ofEpochSecond(start).atZone(zoneId());
            return (
                Math.subtractExact(end, start) == slotMinutes * 60L &&
                local.getSecond() == 0 &&
                bookingDays.contains(local.getDayOfWeek().getValue()) &&
                slotsFor(local.getDayOfWeek()).contains(local.toLocalTime())
            );
        } catch (DateTimeException | ArithmeticException invalidTime) {
            return false;
        }
    }
}
