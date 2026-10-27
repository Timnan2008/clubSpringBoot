package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class OpenClawResetAndSunsetTest {

    @Test
    void reopenedServiceAllowsOnlyAuthenticatedAdministratorTypes() {
        assertDoesNotThrow(() ->
            OpenClawAccess.requireAdministrator(new com.qpwflshclub.formal_club.User.pojo.Admin())
        );
        for (var user : new com.qpwflshclub.formal_club.User.pojo.UserBase[] {
            null,
            new com.qpwflshclub.formal_club.User.pojo.User(),
            new com.qpwflshclub.formal_club.User.pojo.Teacher(),
            new com.qpwflshclub.formal_club.User.pojo.ClubPresident(),
        })
            assertEquals(
                403,
                assertThrows(ResponseStatusException.class, () ->
                    OpenClawAccess.requireAdministrator(user)
                )
                    .getStatusCode()
                    .value()
            );
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
