package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;

class OpenClawPriceTest {

    @Test
    void weekdayPeakWindowsUseTheHigherRate() {
        assertTrue(OpenClawPrice.peak(utc(2026, 9, 22, 2, 30)));
        assertTrue(OpenClawPrice.peak(utc(2026, 9, 22, 3, 59)));
        assertTrue(OpenClawPrice.peak(utc(2026, 9, 22, 6, 0)));
        assertFalse(OpenClawPrice.peak(utc(2026, 9, 22, 4, 0)));
        assertFalse(OpenClawPrice.peak(utc(2026, 9, 22, 10, 0)));
        assertFalse(OpenClawPrice.peak(utc(2026, 9, 22, 12, 0)));
        assertFalse(OpenClawPrice.peak(utc(2026, 9, 26, 2, 30)));
    }

    @Test
    void flashPeakCacheMissMatchesThePublishedDollarPrice() {
        long cost = OpenClawPrice.microYuan(
            "deepseek/deepseek-flash",
            0,
            1_000_000,
            0,
            utc(2026, 9, 22, 2, 30)
        );
        assertEquals(2_190_000L, cost);
        assertTrue(cost > OpenClawPrice.WEEKLY_LIMIT_MICRO);
    }

    @Test
    void offPeakIsHalfAndProCostsMoreThanFlash() {
        Instant offPeak = utc(2026, 9, 26, 2, 30);
        long flash = OpenClawPrice.microYuan("deepseek/deepseek-flash", 0, 1_000_000, 0, offPeak);
        long pro = OpenClawPrice.microYuan("deepseek/deepseek-v4-pro", 0, 1_000_000, 0, offPeak);
        long mimo = OpenClawPrice.microYuan("mimo/mimo-v2.6-pro", 0, 1_000_000, 0, offPeak);
        assertEquals(1_095_000L, flash);
        assertEquals(pro, mimo);
        assertTrue(pro > flash * 4);
    }

    @Test
    void shanghaiWeekStartsOnMonday() {
        assertEquals(LocalDate.of(2026, 9, 21), OpenClawQuota.weekStart(utc(2026, 9, 22, 16, 0)));
        assertEquals(LocalDate.of(2026, 9, 21), OpenClawQuota.weekStart(utc(2026, 9, 27, 15, 59)));
    }

    @Test
    void historyRoundTripDropsFileBlobsAndUnknownTools() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        var history = new OpenClawHistory(null, mapper);
        var body = history.sanitize(
            mapper.readTree(
                """
                {"activeId":"11111111-1111-1111-1111-111111111111","model":"v4","reasoning":false,
                 "enabled":["documents","sandbox","nope"],
                 "history":[{"id":"11111111-1111-1111-1111-111111111111","title":"通知","draft":"",
                   "messages":[{"role":"user","content":"你好","files":[{"name":"secret.txt"}]}]}]}
                """
            )
        );
        byte[] stored = OpenClawHistory.gzip(body.toString().getBytes(StandardCharsets.UTF_8));
        String restored = new String(OpenClawHistory.gunzip(stored), StandardCharsets.UTF_8);
        assertTrue(restored.contains("你好"));
        assertFalse(restored.contains("secret.txt"));
        assertFalse(restored.contains("sandbox"));
        assertTrue(restored.contains("documents"));
    }

    private static Instant utc(int year, int month, int day, int hour, int minute) {
        return ZonedDateTime.of(year, month, day, hour, minute, 0, 0, ZoneOffset.UTC).toInstant();
    }
}
