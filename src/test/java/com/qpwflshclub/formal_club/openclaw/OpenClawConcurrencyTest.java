package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class OpenClawConcurrencyTest {

    @Test
    void tenPeopleShareTheAgentWithoutCallingARealApi() throws Exception {
        OpenClawGateway gateway = mock(OpenClawGateway.class);
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(invocation -> {
            OpenClawGateway.TextSink onText = invocation.getArgument(4);
            onText.write("材料已整理。");
            return new OpenClawGateway.Round(
                "材料已整理。",
                List.of(),
                OpenClawGateway.Usage.UNKNOWN,
                ""
            );
        });
        OpenClawTools tools = mock(OpenClawTools.class);
        OpenClawMaterials materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), isNull(), anyBoolean())).thenReturn("");
        var agent = new OpenClawAgent(gateway, tools, materials, new ObjectMapper());
        ExecutorService pool = Executors.newFixedThreadPool(10);
        try {
            List<Future<String>> replies = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                int id = i + 1;
                replies.add(
                    pool.submit(() -> {
                        Teacher person = new Teacher();
                        person.setId(id);
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        agent.reply(
                            person,
                            "22222222-2222-2222-2222-22222222222" + id,
                            OpenClawModels.ref("flash"),
                            false,
                            "整理社团材料",
                            null,
                            false,
                            null,
                            out
                        );
                        return out.toString(StandardCharsets.UTF_8);
                    })
                );
            }
            for (Future<String> reply : replies) {
                String sent = reply.get(10, TimeUnit.SECONDS);
                assertTrue(sent.contains("材料已整理"));
                assertFalse(sent.contains("api.deepseek.com"));
                assertFalse(sent.contains("xiaomimimo"));
            }
            verify(gateway, times(10)).complete(
                anyString(),
                anyString(),
                anyList(),
                anyList(),
                any(),
                any()
            );
            verifyNoInteractions(tools);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void dangerousCommandsAreStoppedBeforeTheToolRuns() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        OpenClawGateway gateway = mock(OpenClawGateway.class);
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(invocation -> {
            if (hits.incrementAndGet() == 1) {
                return new OpenClawGateway.Round(
                    "",
                    List.of(
                        new OpenClawGateway.Call(
                            "call-danger",
                            "shell",
                            new StringBuilder("{\"command\":\"rm -rf /\"}")
                        )
                    ),
                    OpenClawGateway.Usage.UNKNOWN,
                    ""
                );
            }
            OpenClawGateway.TextSink onText = invocation.getArgument(4);
            onText.write("已停下。");
            return new OpenClawGateway.Round(
                "已停下。",
                List.of(),
                OpenClawGateway.Usage.UNKNOWN,
                ""
            );
        });
        OpenClawTools tools = mock(OpenClawTools.class);
        OpenClawMaterials materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), isNull(), anyBoolean())).thenReturn("");
        var agent = new OpenClawAgent(gateway, tools, materials, new ObjectMapper());
        Teacher person = new Teacher();
        person.setId(3);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        agent.reply(
            person,
            "33333333-3333-3333-3333-333333333333",
            OpenClawModels.ref("flash"),
            false,
            "整理材料",
            null,
            false,
            null,
            out
        );
        String sent = out.toString(StandardCharsets.UTF_8);
        assertTrue(sent.contains("已经拦截"));
        assertTrue(sent.contains("已停下"));
        verify(tools, never()).call(any(), any(), any(), any(), anyBoolean());
        assertTrue(OpenClawGuard.unsafe("shell", "{\"command\":\"sudo systemctl stop club-app\"}"));
        assertFalse(
            OpenClawGuard.unsafe("write_document", "{\"content\":\"sudo systemctl stop club-app\"}")
        );
        assertFalse(OpenClawGuard.unsafe("list_documents", "{\"clubId\":28}"));
    }
}
