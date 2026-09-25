package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class OpenClawBatchTest {

    @Test
    void executesEveryCallAndKeepsToolsAfterElevenRoundsWhileStreamingReasoning() throws Exception {
        var gateway = mock(OpenClawGateway.class);
        var tools = mock(OpenClawTools.class);
        var materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), isNull(), anyBoolean())).thenReturn("");
        when(tools.call(anyString(), any(), any(), isNull(), anyBoolean())).thenReturn("已读取");
        var hits = new AtomicInteger();
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(invocation -> {
            List<Map<String, Object>> offered = invocation.getArgument(3);
            assertFalse(offered.isEmpty(), "Tools must not silently disappear at round 12");
            int round = hits.incrementAndGet();
            OpenClawGateway.TextSink reasoning = invocation.getArgument(5);
            reasoning.write("Checking documents without a newline ");
            if (round <= 12) return new OpenClawGateway.Round(
                "",
                List.of(
                    new OpenClawGateway.Call(
                        "a-" + round,
                        "list_documents",
                        new StringBuilder("{\"clubId\":1}")
                    ),
                    new OpenClawGateway.Call(
                        "b-" + round,
                        "list_documents",
                        new StringBuilder("{\"clubId\":2}")
                    )
                ),
                null,
                ""
            );
            OpenClawGateway.TextSink text = invocation.getArgument(4);
            text.write("检查完成。");
            return new OpenClawGateway.Round("检查完成。", List.of(), null, "");
        });
        var user = new Teacher();
        user.setId(7);
        var out = new ByteArrayOutputStream();
        new OpenClawAgent(gateway, tools, materials, new ObjectMapper()).reply(
            user,
            "batch",
            "deepseek/test",
            true,
            "哪些社团有计划书",
            null,
            false,
            null,
            out
        );
        assertEquals(13, hits.get());
        verify(tools, times(24)).call(anyString(), any(), eq(user), isNull(), eq(false));
        var events = out.toString(StandardCharsets.UTF_8);
        assertTrue(events.contains("Checking documents"));
        assertTrue(events.contains("\"status\":\"pending\""));
        assertTrue(events.contains("\"status\":\"done\""));
        assertTrue(events.contains("[DONE]"));
    }

    @Test
    void budgetExhaustionIsExplicitAndNeverExecutesTheFinalRequestedCall() throws Exception {
        var gateway = mock(OpenClawGateway.class);
        var tools = mock(OpenClawTools.class);
        var materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), isNull(), anyBoolean())).thenReturn("");
        when(tools.call(anyString(), any(), any(), isNull(), anyBoolean())).thenReturn("已读取");
        var hits = new AtomicInteger();
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(invocation -> {
            int round = hits.incrementAndGet();
            assertFalse(((List<?>) invocation.getArgument(3)).isEmpty());
            if (round == 49) assertTrue(
                invocation.getArgument(2).toString().contains("工具服务并未下线")
            );
            return new OpenClawGateway.Round(
                "",
                List.of(
                    new OpenClawGateway.Call("call-" + round, "list_clubs", new StringBuilder("{}"))
                ),
                null,
                ""
            );
        });
        var user = new Teacher();
        user.setId(7);
        var out = new ByteArrayOutputStream();
        new OpenClawAgent(gateway, tools, materials, new ObjectMapper()).reply(
            user,
            "budget",
            "deepseek/test",
            false,
            "继续查询",
            null,
            false,
            null,
            out
        );
        verify(tools, times(48)).call(anyString(), any(), eq(user), isNull(), eq(false));
        assertTrue(out.toString(StandardCharsets.UTF_8).contains("剩余检查尚未执行"));
    }

    @Test
    void webRetryLoopStopsEvenWhenProviderIgnoresRemovedTools() throws Exception {
        var gateway = mock(OpenClawGateway.class);
        var tools = mock(OpenClawTools.class);
        var materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), isNull(), anyBoolean())).thenReturn("");
        when(tools.call(anyString(), any(), any(), isNull(), anyBoolean())).thenReturn(
            "WEB_FETCH_ERROR: empty"
        );
        var rounds = new AtomicInteger();
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(invocation -> {
            int n = rounds.incrementAndGet();
            if (n == 11) {
                List<Map<String, Object>> schema = invocation.getArgument(3);
                assertTrue(
                    schema
                        .stream()
                        .noneMatch(tool ->
                            "web_fetch".equals(((Map<?, ?>) tool.get("function")).get("name"))
                        )
                );
            }
            return new OpenClawGateway.Round(
                "",
                List.of(
                    new OpenClawGateway.Call(
                        "web-" + n,
                        "web_fetch",
                        new StringBuilder("{\"url\":\"https://example.com/docs\"}")
                    )
                ),
                null,
                ""
            );
        });
        var user = new Teacher();
        user.setId(7);
        var out = new ByteArrayOutputStream();
        new OpenClawAgent(gateway, tools, materials, new ObjectMapper()).reply(
            user,
            "research",
            "deepseek/test",
            false,
            "查找定价",
            null,
            false,
            null,
            out
        );
        assertEquals(11, rounds.get());
        verify(tools, times(1)).call(eq("web_fetch"), any(), eq(user), isNull(), eq(false));
        assertTrue(out.toString(StandardCharsets.UTF_8).contains("[DONE]"));
    }
}
