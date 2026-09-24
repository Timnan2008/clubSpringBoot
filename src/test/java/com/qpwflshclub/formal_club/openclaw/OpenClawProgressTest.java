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
