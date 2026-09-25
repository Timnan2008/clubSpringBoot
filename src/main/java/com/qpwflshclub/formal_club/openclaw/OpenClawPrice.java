package com.qpwflshclub.formal_club.openclaw;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

/**
 * DeepSeek list prices in USD per million tokens, converted at 7.30 so the
 * recorded amount stays above the real charge. Weekday UTC 01:00–04:00 and
 * 06:00–10:00 use the peak rate. Other hours, including weekends, use half price.
 */
final class OpenClawPrice {

    static final long WEEKLY_LIMIT_MICRO = 2L * 1_000_000L;
    private static final long FX_NUMERATOR = 73L;
    private static final long FX_DIVISOR = 10_000_000L;

    private OpenClawPrice() {}

    static boolean peak(Instant when) {
        ZonedDateTime utc = when.atZone(ZoneOffset.UTC);
        DayOfWeek day = utc.getDayOfWeek();
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) return false;
        int minute = utc.getHour() * 60 + utc.getMinute();
        return (minute >= 60 && minute < 4 * 60) || (minute >= 6 * 60 && minute < 10 * 60);
    }

    static long microYuan(
        String modelRef,
        long cacheHit,
        long cacheMiss,
        long output,
        Instant when
    ) {
        boolean pro =
            modelRef != null && (modelRef.contains("v4-pro") || modelRef.startsWith("mimo/"));
        boolean peak = peak(when);
        long hit = pro ? (peak ? 44_000L : 22_000L) : peak ? 6_000L : 3_000L;
        long miss = pro ? (peak ? 1_320_000L : 660_000L) : peak ? 300_000L : 150_000L;
        long out = pro ? (peak ? 3_960_000L : 1_980_000L) : peak ? 1_200_000L : 600_000L;
        return tokens(cacheHit, hit) + tokens(cacheMiss, miss) + tokens(output, out);
    }

    private static long tokens(long count, long microDollarsPerMillion) {
        if (count <= 0 || microDollarsPerMillion <= 0) return 0L;
        long numerator = count * microDollarsPerMillion * FX_NUMERATOR;
        return (numerator + FX_DIVISOR - 1) / FX_DIVISOR;
    }
}
