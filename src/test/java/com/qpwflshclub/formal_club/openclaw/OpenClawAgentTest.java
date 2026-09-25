package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class OpenClawAgentTest {

    @Test
    void privateResearchIsNotRejectedByCampusWallWordList() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            byte[] bytes =
                "data: {\"choices\":[{\"delta\":{\"content\":\"Document 91 is ready for review.\"}}]}\n\ndata: [DONE]\n\n".getBytes(
                    StandardCharsets.UTF_8
                );
            exchange.getResponseHeaders().add("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        try {
            var gateway = new OpenClawGateway(
                new ObjectMapper(),
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "test-token"
            );
            var materials = mock(OpenClawMaterials.class);
            when(
                materials.search(
                    any(),
                    any(),
                    nullable(jakarta.servlet.http.HttpServletRequest.class),
                    anyBoolean()
                )
            ).thenReturn("");
            var agent = new OpenClawAgent(
                gateway,
                mock(OpenClawTools.class),
                materials,
                new ObjectMapper()
            );
            Teacher teacher = new Teacher();
            teacher.setId(7);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            agent.reply(
                teacher,
                "11111111-1111-1111-1111-111111111111",
                OpenClawModels.ref("flash"),
                false,
                "整理这学期的社团材料",
                null,
                false,
                null,
                out
            );
            String sent = out.toString(StandardCharsets.UTF_8);
            assertTrue(sent.contains("Document 91 is ready"));
            assertFalse(sent.contains("辱骂"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void toolCallRunsOnTheSchoolSideThenTheAnswerIsStreamed() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        AtomicReference<String> firstBody = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            String auth = exchange.getRequestHeaders().getFirst("Authorization");
            String model = exchange.getRequestHeaders().getFirst("x-openclaw-model");
            assertEquals("Bearer test-token", auth);
            assertEquals("deepseek/deepseek-flash", model);
            byte[] body = exchange.getRequestBody().readAllBytes();
            String raw = new String(body, StandardCharsets.UTF_8);
            assertFalse(raw.contains("test-token"));
            if (hits.get() == 0) firstBody.set(raw);
            String sse =
                hits.incrementAndGet() == 1
                    ? """
                      data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"write_document","arguments":"{\\"filename\\":\\"通知\\"}"}}]}}]}

                      data: [DONE]

                      """
                    : """
                      data: {"choices":[{"delta":{"content":"通知已保存。"}}]}

                      data: [DONE]

                      """;
            byte[] bytes = sse.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "text/event-stream");
            exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        try {
            OpenClawTools tools = mock(OpenClawTools.class);
            OpenClawMaterials materials = mock(OpenClawMaterials.class);
            when(
                materials.search(
                    any(),
                    any(),
                    nullable(jakarta.servlet.http.HttpServletRequest.class),
                    anyBoolean()
                )
            ).thenReturn("见面会摘录");
            when(tools.call(eq("write_document"), any(), any(), isNull(), anyBoolean())).thenReturn(
                "已保存文档 通知.txt"
            );
            var gateway = new OpenClawGateway(
                new ObjectMapper(),
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "test-token"
            );
            var agent = new OpenClawAgent(gateway, tools, materials, new ObjectMapper());
            Teacher teacher = new Teacher();
            teacher.setId(7);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            agent.reply(
                teacher,
                "11111111-1111-1111-1111-111111111111",
                OpenClawModels.ref("flash"),
                false,
                "写一份通知",
                null,
                false,
                null,
                out
            );
            String sent = out.toString(StandardCharsets.UTF_8);
            assertTrue(firstBody.get().contains("/think:off"));
            assertTrue(firstBody.get().contains("写一份通知"));
            assertTrue(firstBody.get().contains("编程、解题"));
            assertFalse(firstBody.get().contains("范围只包括"));
            assertTrue(firstBody.get().contains("list_join_requests"));
            assertTrue(firstBody.get().contains("remember"));
            assertTrue(firstBody.get().contains("web_search"));
            assertTrue(
                OpenClawCatalog.toolsFor(java.util.List.of("search")).contains("web_search")
            );
            assertTrue(OpenClawCatalog.toolsFor(java.util.List.of("search")).contains("give_file"));
            assertTrue(
                OpenClawCatalog.toolsFor(java.util.List.of("profile")).contains("list_members")
            );
            assertTrue(
                OpenClawCatalog.toolsFor(java.util.List.of("documents")).contains("read_document")
            );
            assertTrue(OpenClawCatalog.toolsFor(java.util.List.of("search")).contains("remember"));
            assertEquals(
                "/page/wall?post=8a465c93-4d37-479f-a32f-f8335ea7d723",
                OpenClawTools.postLink(
                    "查看 /page/wall?post=8a465c93-4d37-479f-a32f-f8335ea7d723。"
                )
            );
            assertFalse(firstBody.get().contains("/think:high"));
            assertTrue(sent.contains("通知已保存"));
            assertTrue(sent.contains("正在执行："));
            assertFalse(sent.contains("test-token"));
            verify(tools).call(eq("write_document"), any(), eq(teacher), isNull(), eq(false));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void networkErrorsNameTheStatusAndJoiningIsRecognized() {
        assertTrue(OpenClawMaterials.aboutJoining("报名方式"));
        assertTrue(OpenClawMaterials.aboutJoining("apply to join"));
        assertFalse(OpenClawMaterials.aboutJoining("天气"));
        assertEquals(
            "404 Network Error",
            OpenClawAgent.unavailable(new java.io.IOException("status 404"), true)
        );
        assertEquals(
            "404 网络错误",
            OpenClawAgent.unavailable(new java.io.IOException("status 404"), false)
        );
        assertEquals(
            "MiMo 暂未开放",
            OpenClawAgent.unavailable(new java.io.IOException("status 402"), false)
        );
        assertEquals(
            "503 Service Unavailable",
            OpenClawAgent.unavailable(new java.io.IOException("status 503"), true)
        );
        assertEquals(
            "网络错误",
            OpenClawAgent.unavailable(new java.io.IOException("upstream"), false)
        );
    }

    @Test
    void personaIsOnlyForLiYirui() {
        Admin li = new Admin();
        li.setUsername("李毅睿");
        li.setUsernameEn("Jason");
        Teacher other = new Teacher();
        other.setUsername("李毅睿");
        other.setUsernameEn("Jason");
        String persona = OpenClawAgent.persona(li);
        assertTrue(persona.contains("不设定年龄"));
        assertTrue(persona.contains("称呼他为主人"));
        assertTrue(persona.contains("创始人"));
        assertEquals("", OpenClawAgent.persona(other));
        li.setUsernameEn("Someone");
        assertEquals("", OpenClawAgent.persona(li));
    }

    @Test
    void claimedNameMustMatchTheSignedInUsername() {
        Teacher xiaoming = new Teacher();
        xiaoming.setUsername("小明");
        xiaoming.setUsernameEn("Xiaoming");
        assertTrue(OpenClawAgent.accountLine(xiaoming, false).contains("小明"));
        assertTrue(OpenClawAgent.conflictsWithAccount("我是小李", xiaoming));
        assertFalse(OpenClawAgent.conflictsWithAccount("我是小明", xiaoming));
        assertFalse(OpenClawAgent.conflictsWithAccount("我是编程社社长", xiaoming));
        assertTrue(OpenClawAgent.identityConflict("我叫小李", xiaoming, false).contains("对不上"));
    }

    @Test
    void thinkingDoesNotRepeatMarkdownDocumentText() {
        String output =
            "文档：计划.md\n说明：\n正文：\n# 学期计划\n本学期在图书馆开会，确认报名名单。";
        String body = OpenClawAgent.documentBody(output);
        String thinking =
            "先看文档。\n# 学期计划\n本学期在图书馆开会，确认报名名单。\n结论是下周一开会。";
        String hidden = OpenClawAgent.hideDocumentEcho(thinking, List.of(body));
        assertFalse(hidden.contains("本学期在图书馆开会"));
        assertTrue(hidden.contains("下周一开会"));
    }

    @Test
    void rawSkillAndAttachmentMarkdownNeverLeavesTheReasoningChannel() throws Exception {
        var gateway = mock(OpenClawGateway.class);
        when(
            gateway.complete(anyString(), anyString(), anyList(), anyList(), any(), any())
        ).thenAnswer(call -> {
            OpenClawGateway.TextSink thought = call.getArgument(5);
            OpenClawGateway.TextSink answer = call.getArgument(4);
            thought.write("# PRIVATE_MD_SENTINEL\n");
            thought.write("document body without markdown formatting\n");
            answer.write("<think>another hidden document fragment</think>正常回答");
            return new OpenClawGateway.Round("正常回答", List.of(), null, "");
        });
        var materials = mock(OpenClawMaterials.class);
        when(materials.search(any(), any(), any(), anyBoolean())).thenReturn("");
        var agent = new OpenClawAgent(
            gateway,
            mock(OpenClawTools.class),
            materials,
            new ObjectMapper()
        );
        var user = new Teacher();
        user.setId(7);
        var out = new ByteArrayOutputStream();
        agent.reply(
            user,
            "11111111-1111-1111-1111-111111111111",
            OpenClawModels.ref("flash"),
            true,
            "总结附件",
            null,
            false,
            null,
            out
        );
        String sent = out.toString(StandardCharsets.UTF_8);
        assertFalse(sent.contains("PRIVATE_MD_SENTINEL"));
        assertFalse(sent.contains("document body"));
        assertFalse(sent.contains("another hidden"));
        assertTrue(sent.contains("正在分析请求"));
        assertTrue(sent.contains("正常回答"));
    }
}
