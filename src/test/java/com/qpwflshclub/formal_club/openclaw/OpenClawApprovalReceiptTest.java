package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class OpenClawApprovalReceiptTest {

    @Test
    void retainsSettledDisplayReceiptsButNeverRestoresLiveApproval() throws Exception {
        var json = new ObjectMapper();
        var history = new OpenClawHistory(null, json);
        var saved = history.sanitize(
            json.readTree(
                """
                {"history":[{"id":"11111111-1111-1111-1111-111111111111","messages":[
                  {"role":"assistant","approvals":[
                    {"id":"yes","name":"add_personal_event","argument":"迎新会","status":"approved","token":"secret"},
                    {"id":"no","name":"publish_post","status":"denied"},
                    {"id":"live","status":"pending"},
                    {"id":"invalid","status":"executed"}]},
                  {"role":"user","approvals":[{"id":"user","status":"approved"}]}]}]}
                """
            )
        );
        var messages = saved.path("history").get(0).path("messages");
        var receipts = messages.get(0).path("approvals");
        assertEquals(2, receipts.size());
        assertEquals("approved", receipts.get(0).path("status").asText());
        assertEquals("迎新会", receipts.get(0).path("argument").asText());
        assertEquals("denied", receipts.get(1).path("status").asText());
        assertFalse(receipts.get(0).has("token"));
        assertFalse(messages.get(1).has("approvals"));
    }
}
