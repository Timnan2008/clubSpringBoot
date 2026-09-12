package com.qpwflshclub.formal_club.booking;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/** One server-side interpretation of the SQL policy, shared by reads and writes. */
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
            bookingDays.stream().anyMatch(d -> d < 1 || d > 5) ||
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
        periods = List.copyOf(periods);
        bookingDays = List.copyOf(bookingDays);
        studentOpenDays = List.copyOf(studentOpenDays);
    }

    public ZoneId zoneId() {
        return ZoneId.of(zone);
    }

    public LocalDate nextWeek(Instant now) {
        return now.atZone(zoneId()).toLocalDate().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
    }

    public boolean studentOpen(Instant now) {
        var local = now.atZone(zoneId());
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

    public List<LocalTime> slots() {
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
                slots().contains(local.toLocalTime())
            );
        } catch (DateTimeException | ArithmeticException invalidTime) {
            return false;
        }
    }
}
