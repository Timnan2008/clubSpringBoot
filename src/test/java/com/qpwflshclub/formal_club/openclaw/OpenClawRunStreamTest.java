package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class OpenClawRunStreamTest {
    @Test
    void sendsOnlyNewTextButUsesSnapshotForReplacementAndFinalState() throws Exception {
        ObjectNode first = (ObjectNode) new ObjectMapper().readTree("""
            {"id":"chat","runId":"run","runVersion":1,"working":true,
             "messages":[{"role":"assistant","content":"","thinking":"核对"}]}
            """);
        ObjectNode next = first.deepCopy();
        next.put("runVersion", 2);
        ((ObjectNode) next.path("messages").get(0)).put("thinking", "核对社团资料");
        var delta = OpenClawRunStream.textDelta(first, next);
        assertEquals("社团资料", delta.path("thinking").asText());
        assertEquals(1, delta.path("fromVersion").asInt());
        assertFalse(delta.has("messages"));
        next.put("working", false);
        assertNull(OpenClawRunStream.textDelta(first, next));
        next.put("working", true);
        ((ObjectNode) next.path("messages").get(0)).put("thinking", "重新查找");
        assertNull(OpenClawRunStream.textDelta(first, next));
        next.put("runId", "another");
        assertNull(OpenClawRunStream.textDelta(first, next));
    }
}
