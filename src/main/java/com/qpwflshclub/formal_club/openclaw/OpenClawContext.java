package com.qpwflshclub.formal_club.openclaw;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** The visible conversation branch supplied for this turn, never gateway session history. */
final class OpenClawContext {

    private OpenClawContext() {}

    public record Message(String role, String content) {}

    static List<Map<String, Object>> messages(List<Message> history) {
        if (history == null) return List.of();
        if (history.size() > 40) throw invalid();
        List<Map<String, Object>> result = new ArrayList<>();
        int total = 0;
        for (Message message : history) {
            if (
                message == null ||
                !("user".equals(message.role()) || "assistant".equals(message.role()))
            ) {
                throw invalid();
            }
            String content = message.content() == null ? "" : message.content().strip();
            total += content.length();
            if (content.length() > 16000 || total > 60000) throw invalid();
            if (!content.isEmpty()) result.add(Map.of("role", message.role(), "content", content));
        }
        return result;
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "对话上下文无效或过长 / Invalid or oversized conversation context"
        );
    }
}
