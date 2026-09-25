package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class OpenClawProgressTest {

    @Test
    void stoppedPlanSurvivesHistorySanitization() throws Exception {
        var json = new ObjectMapper();
        var history = new OpenClawHistory(
            mock(org.springframework.jdbc.core.JdbcTemplate.class),
            json
        );
        var saved = history.sanitize(
            json.readTree(
                """
                {"history":[{"id":"11111111-1111-1111-1111-111111111111","stopped":true,
                  "messages":[{"role":"assistant","outcome":"stopped","tasks":[
                    {"id":"one","label":"Search","status":"done"},
                    {"id":"two","label":"Read","status":"cancelled"}]}]}]}
                """
            )
        );
        var message = saved.path("history").get(0).path("messages").get(0);
        assertEquals("stopped", message.path("outcome").asText());
        assertEquals("done", message.path("tasks").get(0).path("status").asText());
        assertEquals("cancelled", message.path("tasks").get(1).path("status").asText());
    }

    @Test
    void streamsUsefulReasoningButFiltersChunkedDocumentEchoAndMarkdownBlocks() throws Exception {
        var out = new ByteArrayOutputStream();
        var agent = new OpenClawAgent(
            mock(OpenClawGateway.class),
            mock(OpenClawTools.class),
            mock(OpenClawMaterials.class),
            new ObjectMapper()
        );
        var thought = agent.new ThinkSplitter(false, List.of("这是附件中需要保密的完整原文内容。"));
        thought.push("先核对公开资料。", out, true);
        assertTrue(
            out.toString(java.nio.charset.StandardCharsets.UTF_8).contains("先核对公开资料")
        );
        thought.push("这是附件中需要", out, true);
        thought.push(
            "保密的完整原文内容。\n```md\n# 内部 Markdown\nprivate body\n```\n",
            out,
            true
        );
        thought.push("<think>接着比较不同来源。</think>已核实。", out, false);
        thought.finish(out);
        String events = out.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(events.contains("接着比较不同来源"));
        assertTrue(events.contains("已核实"));
        assertFalse(events.contains("保密"));
        assertFalse(events.contains("private body"));
        assertFalse(events.contains("内部 Markdown"));
    }

    @Test
    void emitsStructuredPlanAndReadsBodyWithoutTreatingItsWordsAsErrors() throws Exception {
        var gateway = mock(OpenClawGateway.class);
        var tools = mock(OpenClawTools.class);
        var materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), isNull(), anyBoolean())).thenReturn("");
        when(tools.call(eq("web_fetch"), any(), any(), isNull(), anyBoolean())).thenReturn(
            "SOURCE\tExample\thttps://example.com\nCannot is a word in this successfully read article. 不能也是正文内容。"
        );
        var round = new AtomicInteger();
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(invocation -> {
            if (round.getAndIncrement() == 0) return new OpenClawGateway.Round(
                "",
                List.of(
                    new OpenClawGateway.Call(
                        "plan",
                        "update_plan",
                        new StringBuilder(
                            "{\"tasks\":[{\"id\":\"read\",\"label\":\"读正文\",\"status\":\"running\"},{\"id\":\"write\",\"label\":\"写总结\",\"status\":\"pending\"}]}"
                        )
                    ),
                    new OpenClawGateway.Call(
                        "page",
                        "web_fetch",
                        new StringBuilder("{\"url\":\"https://example.com\"}")
                    )
                ),
                null,
                ""
            );
            return new OpenClawGateway.Round("已核实", List.of(), null, "");
        });
        var user = new Teacher();
        user.setId(7);
        var out = new ByteArrayOutputStream();
        new OpenClawAgent(gateway, tools, materials, new ObjectMapper()).reply(
            user,
            "test",
            "deepseek/test",
            true,
            "读正文",
            null,
            false,
            null,
            out
        );
        String events = out.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(events.contains("\"tasks\":["));
        assertTrue(events.contains("读正文"));
        assertTrue(events.contains("\"sources\":["));
        assertFalse(events.contains("\"status\":\"error\""));
        verify(tools, never()).call(eq("update_plan"), any(), any(), any(), anyBoolean());
    }
}
