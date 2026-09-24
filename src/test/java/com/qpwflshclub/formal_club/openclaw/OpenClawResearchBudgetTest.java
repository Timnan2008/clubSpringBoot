package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class OpenClawResearchBudgetTest {

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void stopsGuessingPathsAfterTwoOriginFailures() throws Exception {
        var budget = new OpenClawResearchBudget();
        var calls = new AtomicInteger();
        for (String path : new String[] { "/docs", "/price", "/pricing" }) {
            String output = budget.read(
                "web_fetch",
                json.readTree("{\"url\":\"https://example.com" + path + "\"}"),
                false,
                () -> {
                    calls.incrementAndGet();
                    return "WEB_FETCH_ERROR: empty";
                }
            );
            if (path.equals("/pricing")) assertTrue(output.startsWith("WEB_RESEARCH_LIMIT:"));
        }
        assertEquals(2, calls.get());
        assertEquals(
            "SOURCE verified",
            budget.read(
                "web_fetch",
                json.readTree("{\"url\":\"https://other.example/docs\"}"),
                false,
                () -> "SOURCE verified"
            )
        );
    }

    @Test
    void repeatedReadsReuseResultsButPaginationRemainsAvailable() throws Exception {
        var budget = new OpenClawResearchBudget();
        var count = new AtomicInteger();
        for (String suffix : new String[] { "#one", "#two", "" })
            budget.read(
                "web_fetch",
                json.readTree("{\"url\":\"https://example.com/docs" + suffix + "\"}"),
                false,
                () -> "body " + count.incrementAndGet()
            );
        budget.read(
            "web_fetch",
            json.readTree("{\"url\":\"https://example.com/docs\",\"offset\":12000}"),
            false,
            () -> "body " + count.incrementAndGet()
        );
        assertEquals(2, count.get());
        for (int i = 0; i < 4; i++) budget.nextRound();
        assertTrue(budget.exhausted());
    }
}
