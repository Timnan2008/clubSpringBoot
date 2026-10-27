package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

class OpenClawRunsTest {

    ObjectMapper json = new ObjectMapper();
    OpenClawAgent agent;
    OpenClawHistory history;
    OpenClawApprovals approvals;
    OpenClawRuns runs;
    Map<Long, Map<String, ObjectNode>> saved = new ConcurrentHashMap<>();
    String conversation = "11111111-1111-1111-1111-111111111111",
        id = "22222222-2222-2222-2222-222222222222";
    Admin user;
    long account;
    MockHttpServletRequest servlet;

    @BeforeEach
    void setup() throws Exception {
        agent = mock(OpenClawAgent.class);
        history = mock(OpenClawHistory.class);
        approvals = new OpenClawApprovals();
        user = new Admin();
        user.setId(7L);
        account = OpenClawIdentity.id(user);
        servlet = new MockHttpServletRequest();
        servlet.getSession().setAttribute("authenticatedEmail", "owner@example.invalid");
        servlet.getSession().setAttribute("workspaceToken", "token");
        servlet.addHeader("X-Workspace-Token", "token");
        var sanitizer = new OpenClawHistory(
            mock(org.springframework.jdbc.core.JdbcTemplate.class),
            json
        );
        when(history.sanitize(any())).thenAnswer(a -> sanitizer.sanitize(a.getArgument(0)));
        when(history.runs(anyLong())).thenAnswer(a ->
            new ArrayList<>(saved.getOrDefault(a.getArgument(0), Map.of()).values())
                .stream()
                .map(ObjectNode::deepCopy)
                .toList()
        );
        when(history.read(anyLong())).thenReturn(Map.of("resetAt", 0L));
        doAnswer(a -> {
            saved
                .computeIfAbsent(a.getArgument(0), k -> new ConcurrentHashMap<>())
                .put(
                    ((ObjectNode) a.getArgument(2)).path("id").asText(),
                    ((ObjectNode) a.getArgument(2)).deepCopy()
                );
            return null;
        })
            .when(history)
            .saveRun(anyLong(), anyLong(), any());
        doAnswer(a -> {
            saved.getOrDefault(a.getArgument(0), new HashMap<>()).remove(a.getArgument(1));
            return null;
        })
            .when(history)
            .deleteRun(anyLong(), anyString());
        runs = new OpenClawRuns(agent, history, approvals, json);
    }

    OpenClawController.ChatRequest request() {
        return new OpenClawController.ChatRequest(
            conversation,
            "test",
            "flash",
            List.of(),
            true,
            "zh",
            List.of(),
            List.of(),
            0L
        );
    }

    ObjectNode start() throws Exception {
        return runs.start(
            user,
            request(),
            json.readTree(
                "[{\"role\":\"user\",\"content\":\"test\"},{\"role\":\"assistant\",\"content\":\"\"}]"
            ),
            id,
            "model",
            "test",
            false,
            servlet
        );
    }

    static void emit(OutputStream out, String data) throws IOException {
        out.write(("data: " + data + "\n\n").getBytes(StandardCharsets.UTF_8));
        out.flush();
    }

    ObjectNode awaitDone() throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
        while (System.nanoTime() < deadline) {
            var list = runs.list(account);
            if (
                !list.isEmpty() && !list.getFirst().path("working").asBoolean()
            ) return list.getFirst();
            Thread.sleep(10);
        }
        fail("job did not finish");
        return null;
    }

    @Test
    void runsWithoutObserverAndReloadsCompletedResultWithoutDuplicateExecution() throws Exception {
        var release = new CountDownLatch(1);
        var started = new CountDownLatch(1);
        var calls = new AtomicInteger();
        doAnswer(a -> {
            calls.incrementAndGet();
            started.countDown();
            release.await();
            var request = (jakarta.servlet.http.HttpServletRequest) a.getArgument(8);
            assertEquals(
                "owner@example.invalid",
                request.getSession().getAttribute("authenticatedEmail")
            );
            emit(a.getArgument(9), "{\"delta\":\"finished in background\"}");
            return null;
        })
            .when(agent)
            .reply(
                any(),
                anyString(),
                anyString(),
                anyBoolean(),
                anyString(),
                anyList(),
                anyBoolean(),
                anyList(),
                any(),
                any()
            );
        try {
            assertTimeout(java.time.Duration.ofSeconds(1), () ->
                assertTrue(start().path("working").asBoolean())
            );
            assertTrue(started.await(1, TimeUnit.SECONDS));
            assertEquals(id, start().path("runId").asText());
            assertEquals(1, calls.get());
            var observe = runs.observe(account);
            assertEquals(1, observe.get().size());
            assertTrue(observe.get().isEmpty());
            assertTrue(runs.observe(account + 1).get().isEmpty());
            servlet.getSession().invalidate(); // The HTTP session/request may disappear after navigation.
            release.countDown();
            var done = awaitDone();
            assertEquals(
                "finished in background",
                done.path("messages").get(1).path("content").asText()
            );
            var finalUpdates = observe.get();
            assertEquals(1, finalUpdates.size());
            assertFalse(finalUpdates.getFirst().path("working").asBoolean());
            // A view attaching after a very short run still receives its terminal snapshot.
            assertFalse(runs.observe(account).get().getFirst().path("working").asBoolean());
            var reloaded = new OpenClawRuns(agent, history, approvals, json);
            assertFalse(reloaded.list(account).getFirst().path("working").asBoolean());
            assertTrue(reloaded.list(account + 1).isEmpty());
        } finally {
            release.countDown();
        }
    }

    @Test
    void onlyOwnerCanStopAndStopDoesNotProceedToNextAction() throws Exception {
        var entered = new CountDownLatch(1);
        var sideEffects = new AtomicInteger();
        doAnswer(a -> {
            entered.countDown();
            Thread.sleep(30000);
            sideEffects.incrementAndGet();
            return null;
        })
            .when(agent)
            .reply(
                any(),
                anyString(),
                anyString(),
                anyBoolean(),
                anyString(),
                anyList(),
                anyBoolean(),
                anyList(),
                any(),
                any()
            );
        start();
        assertTrue(entered.await(1, TimeUnit.SECONDS));
        assertThrows(ResponseStatusException.class, () -> runs.stop(account + 1, conversation, id));
        assertFalse(runs.stop(account, conversation, id).path("working").asBoolean());
        awaitDone();
        assertEquals(0, sideEffects.get());
    }

    @Test
    void pendingApprovalSurvivesObserverAbsenceAndRequiresOwnerDecision() throws Exception {
        String approvalId = UUID.randomUUID().toString();
        var waiting = new CountDownLatch(1);
        var writes = new AtomicInteger();
        doAnswer(a -> {
            approvals.open(account, approvalId, "write_document");
            emit(
                a.getArgument(9),
                "{\"approval\":{\"id\":\"" + approvalId + "\",\"name\":\"write_document\"}}"
            );
            waiting.countDown();
            if (approvals.await(approvalId, java.time.Duration.ofSeconds(4))) {
                writes.incrementAndGet();
                emit(a.getArgument(9), "{\"delta\":\"saved\"}");
            }
            return null;
        })
            .when(agent)
            .reply(
                any(),
                anyString(),
                anyString(),
                anyBoolean(),
                anyString(),
                anyList(),
                anyBoolean(),
                anyList(),
                any(),
                any()
            );
        start();
        assertTrue(waiting.await(1, TimeUnit.SECONDS));
        Thread.sleep(50);
        assertTrue(runs.list(account).getFirst().path("awaiting").asBoolean());
        assertEquals(0, writes.get());
        assertFalse(runs.decide(account + 1, approvalId, true));
        assertTrue(runs.decide(account, approvalId, true));
        var done = awaitDone();
        assertEquals(1, writes.get());
        assertEquals(
            "approved",
            done.path("messages").get(1).path("approvals").get(0).path("status").asText()
        );
    }

    @Test
    void deletingAJobCannotBeUndoneByLateWorkerCompletion() throws Exception {
        var entered = new CountDownLatch(1);
        doAnswer(a -> {
            entered.countDown();
            Thread.sleep(30000);
            return null;
        })
            .when(agent)
            .reply(
                any(),
                anyString(),
                anyString(),
                anyBoolean(),
                anyString(),
                anyList(),
                anyBoolean(),
                anyList(),
                any(),
                any()
            );
        start();
        assertTrue(entered.await(1, TimeUnit.SECONDS));
        runs.delete(account, conversation);
        Thread.sleep(100);
        assertTrue(runs.list(account).isEmpty());
    }

    @Test
    void partialPlanUpdatesPreserveCompletedItemsWhenAnotherItemStops() throws Exception {
        doAnswer(a -> {
            emit(
                a.getArgument(9),
                "{\"tasks\":[{\"id\":\"a\",\"label\":\"Read\",\"status\":\"done\"}]}"
            );
            emit(
                a.getArgument(9),
                "{\"tasks\":[{\"id\":\"b\",\"label\":\"Write\",\"status\":\"running\"}]}"
            );
            return null;
        })
            .when(agent)
            .reply(
                any(),
                anyString(),
                anyString(),
                anyBoolean(),
                anyString(),
                anyList(),
                anyBoolean(),
                anyList(),
                any(),
                any()
            );
        start();
        JsonNode tasks = awaitDone().path("messages").get(1).path("tasks");
        assertEquals(2, tasks.size());
        assertEquals("done", tasks.get(0).path("status").asText());
        assertEquals("cancelled", tasks.get(1).path("status").asText());
    }
}
