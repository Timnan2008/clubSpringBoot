package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class OpenClawRunHistoryTest {

    @Test
    void staleClientSnapshotCannotReplaceServerOwnedRunsAndStorageIsSealed() throws Exception {
        var json = new ObjectMapper();
        var jdbc = mock(JdbcTemplate.class);
        var history = spy(new OpenClawHistory(jdbc, json));
        ObjectNode run = json
            .createObjectNode()
            .put("id", "11111111-1111-1111-1111-111111111111")
            .put("runId", "22222222-2222-2222-2222-222222222222")
            .put("working", true)
            .put("runVersion", 12);
        doReturn(Map.of("resetAt", 0L, "backgroundRuns", List.of(run)))
            .when(history)
            .read(7L);
        AtomicReference<byte[]> written = new AtomicReference<>();
        when(jdbc.update(anyString(), eq(7L), anyString(), any(byte[].class))).thenAnswer(a -> {
            written.set(a.getArgument(3));
            return 1;
        });
        history.write(
            7L,
            json.readTree(
                "{\"resetAt\":0,\"history\":[],\"backgroundRuns\":[{\"runVersion\":999,\"working\":false}]}"
            )
        );
        byte[] sealed = written.get();
        assertNotNull(sealed);
        assertEquals('O', sealed[0]);
        JsonNode stored = json.readTree(OpenClawHistory.gunzip(OpenClawHistory.open(sealed)));
        assertEquals(run, stored.path("backgroundRuns").get(0));
    }
}
