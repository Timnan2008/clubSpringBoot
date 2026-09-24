package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Facts one account asked the assistant to keep. They are not shared with anyone else. */
@Component
public class OpenClawMemory implements ApplicationRunner {

    static final int MAX_ITEMS = 40;
    static final int MAX_TEXT = 400;
    private static final String DDL = """
    CREATE TABLE IF NOT EXISTS openclaw_memory (
      account_id BIGINT NOT NULL PRIMARY KEY,
      body MEDIUMBLOB NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public OpenClawMemory(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute(DDL);
        } catch (RuntimeException e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "OpenClaw memory table missing: {}",
                e.toString()
            );
        }
    }

    public synchronized String prompt(long accountId, boolean english) {
        List<Item> items = read(accountId);
        if (items.isEmpty()) {
            return english
                ? "\nNothing is remembered yet. Remember only when the person explicitly asks.\n"
                : "\n还没有记住的事实。仅在用户明确要求时调用 remember。\n";
        }
        StringBuilder out = new StringBuilder(
            english ? "\nFacts remembered for this account:\n" : "\n这个账号已经记住的事实：\n"
        );
        for (Item item : items)
            out.append("- ").append(item.id).append(' ').append(item.text).append('\n');
        return out.toString();
    }

    public synchronized String remember(long accountId, String text, boolean english) {
        String fact = clean(text);
        if (fact.isBlank()) return english ? "Say what to remember." : "请说明要记住的内容。";
        List<Item> items = read(accountId);
        for (Item item : items) {
            if (item.text.equals(fact)) return (
                (english ? "Already remembered: " : "已经记住：") + fact
            );
        }
        items.add(new Item(UUID.randomUUID().toString().substring(0, 8), fact));
        while (items.size() > MAX_ITEMS) items.remove(0);
        write(accountId, items);
        return (english ? "Remembered: " : "已记住：") + fact;
    }

    public synchronized String forget(long accountId, String text, boolean english) {
        String query = clean(text);
        if (query.isBlank()) return english ? "Say what to forget." : "请说明要忘掉的内容。";
        List<Item> items = read(accountId);
        List<Item> kept = new ArrayList<>();
        List<String> removed = new ArrayList<>();
        for (Item item : items) {
            if (
                item.id.equalsIgnoreCase(query) ||
                item.text.toLowerCase().contains(query.toLowerCase())
            ) {
                removed.add(item.text);
            } else kept.add(item);
        }
        if (removed.isEmpty()) return english
            ? "Nothing matched that memory."
            : "没有找到要忘掉的内容。";
        write(accountId, kept);
        return (english ? "Forgot: " : "已忘掉：") + String.join(english ? "; " : "；", removed);
    }

    private List<Item> read(long accountId) {
        try {
            byte[] body = jdbc.query(
                "SELECT body FROM openclaw_memory WHERE account_id = ?",
                rs -> rs.next() ? rs.getBytes(1) : null,
                accountId
            );
            if (body == null || body.length == 0) return new ArrayList<>();
            JsonNode stored = json.readTree(body);
            List<Item> items = new ArrayList<>();
            for (JsonNode node : stored.path("items")) {
                String fact = clean(node.path("text").asText(""));
                String id = node.path("id").asText("");
                if (fact.isBlank() || !id.matches("[0-9a-fA-F]{8}")) continue;
                items.add(new Item(id, fact));
                if (items.size() >= MAX_ITEMS) break;
            }
            return items;
        } catch (RuntimeException | IOException e) {
            return new ArrayList<>();
        }
    }

    private void write(long accountId, List<Item> items) {
        ObjectNode body = json.createObjectNode();
        ArrayNode list = body.putArray("items");
        for (Item item : items) {
            ObjectNode row = list.addObject();
            row.put("id", item.id);
            row.put("text", item.text);
        }
        try {
            jdbc.update(
                """
                INSERT INTO openclaw_memory (account_id, body)
                VALUES (?, ?) AS incoming
                ON DUPLICATE KEY UPDATE body = incoming.body
                """,
                accountId,
                json.writeValueAsBytes(body)
            );
        } catch (RuntimeException | IOException e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "OpenClaw memory was not saved: {}",
                e.toString()
            );
        }
    }

    static String clean(String text) {
        String fact = text == null ? "" : text.replaceAll("\\s+", " ").strip();
        return fact.length() > MAX_TEXT ? fact.substring(0, MAX_TEXT) : fact;
    }

    private record Item(String id, String text) {}
}
