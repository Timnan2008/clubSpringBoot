package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class OpenClawEffectTest {

    @Test
    void writesNeedApprovalAndSearchesDoNot() {
        assertTrue(OpenClawTools.needsApproval("publish_post"));
        assertTrue(OpenClawTools.needsApproval("forget"));
        assertFalse(OpenClawTools.needsApproval("give_file"));
        assertTrue(OpenClawTools.needsApproval("write_document"));
        assertFalse(OpenClawTools.needsApproval("web_search"));
        assertFalse(OpenClawTools.needsApproval("list_members"));
    }

    @Test
    void effectLineRoundTripsAndStaysOutOfTheModelText() {
        String output =
            "已发布\n" +
            OpenClawTools.effectLine(
                "post",
                "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "",
                "一行\n两行"
            ).trim();
        var effect = OpenClawTools.effectOf(output);
        assertEquals("post", effect.get("kind"));
        assertEquals("一行\n两行", effect.get("text"));
        assertFalse(OpenClawTools.visible(output).contains("EFFECT"));
        assertTrue(OpenClawTools.visible(output).contains("已发布"));
    }
}
