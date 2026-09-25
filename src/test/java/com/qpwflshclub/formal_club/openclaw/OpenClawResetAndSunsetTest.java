package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class OpenClawResetAndSunsetTest {

    @Test
    void cutoffIsMondayMidnightShanghaiForEveryone() {
        assertTrue(OpenClawAccess.enabledAt(Instant.parse("2026-09-27T15:59:59Z")));
        assertFalse(OpenClawAccess.enabledAt(Instant.parse("2026-09-27T16:00:00Z")));
        assertFalse(OpenClawAccess.enabledAt(Instant.parse("2026-10-01T00:00:00Z")));
    }

    @Test
    void oldBrowserCannotRestoreClearedHistoryOrSendOldContext() throws Exception {
        var json = new ObjectMapper();
        var jdbc = mock(JdbcTemplate.class);
        var history = spy(new OpenClawHistory(jdbc, json));
        doReturn(Map.of("resetAt", 1234L)).when(history).read(12L);
        assertEquals(
            409,
            assertThrows(ResponseStatusException.class, () ->
                history.write(12L, json.readTree("{\"history\":[]}"))
            )
                .getStatusCode()
                .value()
        );
        assertThrows(ResponseStatusException.class, () -> history.requireCurrentReset(12L, 0));
        history.requireCurrentReset(12L, 1234L);
        assertEquals(
            1234L,
            history.sanitize(json.readTree("{\"resetAt\":1234}")).path("resetAt").asLong()
        );
    }
}
