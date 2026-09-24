package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class OpenClawMaterialsTest {

    @Test
    void retrievalPrefersPassagesThatShareTheQuestion() {
        List<OpenClawMaterials.Passage> ranked = OpenClawMaterials.rank(
            "新社员见面会场地",
            List.of(
                new OpenClawMaterials.Passage("历史社 · 社团资料", "历史社研究近代校园史"),
                new OpenClawMaterials.Passage(
                    "历史社 · 活动 新社员见面会",
                    "见面会在图书馆讨论场地和流程"
                )
            )
        );
        assertFalse(ranked.isEmpty());
        assertTrue(ranked.get(0).source().contains("见面会"));
    }

    @Test
    void modelChoiceRejectsAnythingExceptTheSchoolModels() {
        assertEquals("deepseek/deepseek-flash", OpenClawModels.ref("flash"));
        assertEquals("deepseek/deepseek-v4-pro", OpenClawModels.ref("v4"));
        assertEquals("mimo/mimo-v2.6-pro", OpenClawModels.ref("mimo"));
        assertEquals("mimo", OpenClawModels.known("mimo"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
            OpenClawModels.ref("openai/gpt")
        );
    }
}
