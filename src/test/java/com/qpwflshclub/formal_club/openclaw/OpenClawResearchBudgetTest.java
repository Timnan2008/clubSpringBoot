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
        for (int i = 0; i < 10; i++) budget.nextRound();
        assertTrue(budget.exhausted());
    }

    @Test
    void allowsTwentyFourUniqueRequestsButNeverExecutesTheTwentyFifth() throws Exception {
        var budget = new OpenClawResearchBudget();
        var count = new AtomicInteger();
        for (int i = 0; i < 25; i++) {
            String result = budget.read(
                "web_search",
                json.readTree("{\"query\":\"topic " + i + "\"}"),
                false,
                () -> "body " + count.incrementAndGet()
            );
            if (i == 24) assertTrue(result.startsWith("WEB_RESEARCH_LIMIT:"));
        }
        assertEquals(24, count.get());
    }
}
