package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Gzipped conversation snapshot for one account. File blobs are not stored. */
@Component
public class OpenClawHistory implements ApplicationRunner {

    static final int MAX_JSON_BYTES = 1_500_000;
    private static final String DDL = """
    CREATE TABLE IF NOT EXISTS openclaw_history (
      account_id BIGINT NOT NULL PRIMARY KEY,
      updated_at VARCHAR(40) NOT NULL,
      body MEDIUMBLOB NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public OpenClawHistory(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute(DDL);
            sealExisting();
        } catch (RuntimeException e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "OpenClaw history table missing: {}",
                e.toString()
            );
        }
    }

    public Map<String, Object> read(long accountId) {
        byte[] body = jdbc.query(
            "SELECT body FROM openclaw_history WHERE account_id = ?",
            rs -> rs.next() ? rs.getBytes(1) : null,
            accountId
        );
        if (body == null || body.length == 0) return Map.of("saved", false);
        try {
            JsonNode stored = json.readTree(gunzip(open(body)));
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("saved", true);
            payload.put("resetAt", stored.path("resetAt").asLong(0));
            payload.put("updatedAt", stored.path("updatedAt").asLong(0));
            payload.put("activeId", stored.path("activeId").asText(""));
            payload.put("model", stored.path("model").asText(OpenClawModels.FLASH));
            payload.put("reasoning", stored.path("reasoning").asBoolean(true));
            payload.put(
                "enabled",
                stored.path("enabled").isArray()
                    ? json.convertValue(
                          stored.path("enabled"),
                          new TypeReference<List<String>>() {}
                      )
                    : List.of()
            );
            payload.put(
                "history",
                stored.path("history").isArray()
                    ? json.convertValue(
                          stored.path("history"),
                          new TypeReference<List<Map<String, Object>>>() {}
                      )
                    : List.of()
            );
            return payload;
        } catch (RuntimeException | IOException e) {
            return Map.of("saved", false);
        }
    }

    public void requireCurrentReset(long accountId, long resetAt) {
        long current = ((Number) read(accountId).getOrDefault("resetAt", 0L)).longValue();
        if (current != resetAt) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "聊天历史已清空，请刷新页面 / History was cleared. Reload this page."
        );
    }

    public synchronized void write(long accountId, JsonNode body) throws IOException {
        requireCurrentReset(accountId, body == null ? 0L : body.path("resetAt").asLong(0L));
        byte[] raw = json.writeValueAsBytes(sanitize(body));
        if (raw.length > MAX_JSON_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "对话记录太大");
        }
        jdbc.update(
            """
            INSERT INTO openclaw_history (account_id, updated_at, body)
            VALUES (?, ?, ?) AS incoming
            ON DUPLICATE KEY UPDATE updated_at = incoming.updated_at, body = incoming.body
            """,
            accountId,
            Instant.now().toString(),
            seal(gzip(raw))
        );
    }

    private void sealExisting() {
        jdbc.query("SELECT account_id, body FROM openclaw_history", rs -> {
            byte[] body = rs.getBytes(2);
            if (
                body == null ||
                body.length < 2 ||
                (body[0] & 0xff) != 0x1f ||
                (body[1] & 0xff) != 0x8b
            ) return;
            try {
                jdbc.update(
                    "UPDATE openclaw_history SET body = ? WHERE account_id = ?",
                    seal(body),
                    rs.getLong(1)
                );
            } catch (IOException e) {
                org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                    "OpenClaw history was not sealed"
                );
            }
        });
    }

    ObjectNode sanitize(JsonNode body) {
        ObjectNode out = json.createObjectNode();
        out.put("resetAt", body == null ? 0L : body.path("resetAt").asLong(0L));
        long updatedAt = body == null ? 0L : body.path("updatedAt").asLong(0L);
        if (updatedAt > 0) out.put("updatedAt", updatedAt);
        String model = body == null ? "" : body.path("model").asText("");
        out.put("model", OpenClawModels.known(model));
        out.put("reasoning", body == null || body.path("reasoning").asBoolean(true));
        ArrayNode enabled = out.putArray("enabled");
        JsonNode requested = body == null ? null : body.path("enabled");
        if (requested != null && requested.isArray()) {
            for (JsonNode id : requested) {
                if (enabled.size() >= 12) break;
                String value = id.asText("");
                if ("sandbox".equals(value)) continue;
                if (
                    OpenClawCatalog.choices()
                        .stream()
                        .anyMatch(item -> item.get("id").equals(value))
                ) {
                    enabled.add(value);
                }
            }
        }
        ArrayNode history = out.putArray("history");
        JsonNode conversations = body == null ? null : body.path("history");
        if (conversations != null && conversations.isArray()) {
            for (JsonNode entry : conversations) {
                if (history.size() >= 30) break;
                String id = entry.path("id").asText("");
                if (!id.matches("[0-9a-fA-F-]{36}")) continue;
                ObjectNode saved = history.addObject();
                saved.put("id", id);
                saved.put("title", clip(entry.path("title").asText(""), 80));
                saved.put("draft", clip(entry.path("draft").asText(""), 4000));
                saved.put("stopped", entry.path("stopped").asBoolean(false));
                saved.put("pinned", entry.path("pinned").asBoolean(false));
                saved.put("archived", entry.path("archived").asBoolean(false));
                saved.put("unread", entry.path("unread").asBoolean(false));
                saved.put("failed", entry.path("failed").asBoolean(false));
                ArrayNode calls = saved.putArray("calls");
                if (entry.path("calls").isArray()) {
                    for (JsonNode call : entry.path("calls")) {
                        if (calls.size() >= 64) break;
                        ObjectNode chip = calls.addObject();
                        chip.put("id", clip(call.path("id").asText(""), 80));
                        chip.put("name", clip(call.path("name").asText(""), 80));
                        chip.put("argument", clip(call.path("argument").asText(""), 80));
                        chip.put("status", clip(call.path("status").asText(""), 20));
                        chip.put("icon", clip(call.path("icon").asText(""), 20));
                        long elapsed = call.path("elapsedMs").asLong(0);
                        if (elapsed > 0 && elapsed < 3_600_000) chip.put("elapsedMs", elapsed);
                        long startedAt = call.path("startedAt").asLong(0);
                        if (startedAt > 0) chip.put("startedAt", startedAt);
                        String link = call.path("link").asText("");
                        if (link.matches("/page/wall\\?post=[0-9a-fA-F-]{36}")) {
                            chip.put("link", link);
                            String label = clip(call.path("linkLabel").asText(""), 40);
                            if (!label.isBlank()) chip.put("linkLabel", label);
                        }
                        copyEffect(call, chip);
                    }
                }
                ArrayNode messages = saved.putArray("messages");
                if (entry.path("messages").isArray()) {
                    int start = Math.max(0, entry.path("messages").size() - 40);
                    for (int i = start; i < entry.path("messages").size(); i++) {
                        JsonNode message = entry.path("messages").get(i);
                        String role = message.path("role").asText("");
                        if (!"user".equals(role) && !"assistant".equals(role)) continue;
                        ObjectNode row = messages.addObject();
                        row.put("role", role);
                        row.put("content", clip(message.path("content").asText(""), 8000));
                        row.put("thinking", clip(message.path("thinking").asText(""), 8000));
                        String outcome = message.path("outcome").asText("");
                        if (List.of("completed", "failed").contains(outcome)) row.put(
                            "outcome",
                            outcome
                        );
                        if (message.path("tasks").isArray()) {
                            try {
                                row.set(
                                    "tasks",
                                    json.valueToTree(
                                        OpenClawAgent.validatedTasks(message.path("tasks"))
                                    )
                                );
                            } catch (IllegalArgumentException ignored) {
                                /* Ignore invalid client plan data. */
                            }
                        }
                        copyPlans(message, row);
                        copySources(message, row);
                        copyFiles(message, row);
                        copyNames(message, row);
                        copyEffects(message, row);
                    }
                }
            }
        }
        String activeId = body == null ? "" : body.path("activeId").asText("");
        boolean known = false;
        for (JsonNode entry : history) {
            if (entry.path("id").asText("").equals(activeId)) known = true;
        }
        out.put("activeId", known ? activeId : "");
        return out;
    }

    private void copySources(JsonNode message, ObjectNode row) {
        if (!message.path("sources").isArray()) return;
        ArrayNode sources = row.putArray("sources");
        for (JsonNode source : message.path("sources")) {
            if (sources.size() >= 5) break;
            String url = source.path("url").asText("");
            String title = clip(source.path("title").asText(""), 120);
            if (title.isBlank() || !OpenClawWebSearch.publicHttp(url)) continue;
            ObjectNode item = sources.addObject();
            item.put("title", title);
            item.put("url", url);
        }
        if (sources.isEmpty()) row.remove("sources");
    }

    private void copyPlans(JsonNode message, ObjectNode row) {
        if (!message.path("plans").isArray()) return;
        ArrayNode plans = row.putArray("plans");
        for (JsonNode plan : message.path("plans")) {
            if (plans.size() >= 8) break;
            String text = clip(plan.asText(""), 200);
            if (!text.isBlank()) plans.add(text);
        }
        if (plans.isEmpty()) row.remove("plans");
    }

    private void copyFiles(JsonNode message, ObjectNode row) {
        if (!message.path("files").isArray()) return;
        ArrayNode files = row.putArray("files");
        for (JsonNode file : message.path("files")) {
            if (files.size() >= 4) break;
            String href = file.path("href").asText("");
            String name = OpenClawFiles.safeName(file.path("name").asText(""));
            if (name == null || !href.matches("/api/openclaw/files/[0-9a-fA-F-]{36}")) continue;
            ObjectNode item = files.addObject();
            item.put("name", name);
            item.put("href", href);
        }
        if (files.isEmpty()) row.remove("files");
    }

    private void copyEffect(JsonNode source, ObjectNode chip) {
        String kind = source.path("effectKind").asText("");
        if (!knownEffect(kind)) return;
        chip.put("effectKind", kind);
        chip.put("effectId", clip(source.path("effectId").asText(""), 80));
        chip.put("effectClub", clip(source.path("effectClub").asText(""), 12));
        chip.put("effectText", clip(source.path("effectText").asText(""), 8000));
    }

    private void copyEffects(JsonNode message, ObjectNode row) {
        if (!message.path("effects").isArray()) return;
        ArrayNode effects = row.putArray("effects");
        for (JsonNode effect : message.path("effects")) {
            if (effects.size() >= 8) break;
            String kind = effect.path("kind").asText("");
            if (!knownEffect(kind)) continue;
            ObjectNode item = effects.addObject();
            item.put("kind", kind);
            item.put("id", clip(effect.path("id").asText(""), 80));
            item.put("club", clip(effect.path("club").asText(""), 12));
            item.put("text", clip(effect.path("text").asText(""), 8000));
        }
        if (effects.isEmpty()) row.remove("effects");
    }

    private static boolean knownEffect(String kind) {
        return switch (kind) {
            case
                "post",
                "file",
                "memory",
                "memory-restore",
                "document",
                "event",
                "club-event",
                "profile",
                "join" -> true;
            default -> false;
        };
    }

    private void copyNames(JsonNode message, ObjectNode row) {
        if (!message.path("attachments").isArray()) return;
        ArrayNode names = row.putArray("attachments");
        for (JsonNode name : message.path("attachments")) {
            if (names.size() >= 4) break;
            String value = clip(name.asText(""), 80).replace("/", "").replace("\\", "");
            if (!value.isBlank()) names.add(value);
        }
        if (names.isEmpty()) row.remove("attachments");
    }

    private static String clip(String value, int max) {
        if (value == null || value.length() <= max) return value == null ? "" : value;
        return value.substring(0, max);
    }

    static byte[] seal(byte[] gzipped) throws IOException {
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                Cipher.ENCRYPT_MODE,
                new SecretKeySpec(historyKey(), "AES"),
                new GCMParameterSpec(128, iv)
            );
            byte[] packed = cipher.doFinal(gzipped);
            byte[] out = new byte[4 + iv.length + packed.length];
            out[0] = 'O';
            out[1] = 'C';
            out[2] = 'H';
            out[3] = 1;
            System.arraycopy(iv, 0, out, 4, iv.length);
            System.arraycopy(packed, 0, out, 16, packed.length);
            return out;
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("OpenClaw history seal failed", e);
        }
    }

    static byte[] open(byte[] stored) throws IOException {
        if (
            stored.length >= 2 && (stored[0] & 0xff) == 0x1f && (stored[1] & 0xff) == 0x8b
        ) return stored;
        if (
            stored.length < 16 ||
            stored[0] != 'O' ||
            stored[1] != 'C' ||
            stored[2] != 'H' ||
            stored[3] != 1
        ) {
            throw new IOException("OpenClaw history envelope");
        }
        byte[] iv = java.util.Arrays.copyOfRange(stored, 4, 16);
        byte[] packed = java.util.Arrays.copyOfRange(stored, 16, stored.length);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(
                Cipher.DECRYPT_MODE,
                new SecretKeySpec(historyKey(), "AES"),
                new GCMParameterSpec(128, iv)
            );
            return cipher.doFinal(packed);
        } catch (Exception e) {
            throw new IOException("OpenClaw history open failed", e);
        }
    }

    private static byte[] historyKey() throws IOException {
        String configured = System.getenv("CLUB_OPENCLAW_HISTORY_KEY_FILE");
        Path file = Path.of(
            configured == null || configured.isBlank() ? "data/openclaw-history.key" : configured
        );
        if (file.getParent() != null) Files.createDirectories(file.getParent());
        if (!Files.exists(file)) {
            byte[] secret = new byte[32];
            new SecureRandom().nextBytes(secret);
            Files.write(file, secret, StandardOpenOption.CREATE_NEW);
            try {
                Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
            } catch (UnsupportedOperationException ignored) {}
        }
        byte[] value = Files.readAllBytes(file);
        if (value.length != 32) throw new IOException("OpenClaw history key");
        return value;
    }

    static byte[] gzip(byte[] raw) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (GZIPOutputStream gzip = new GZIPOutputStream(buffer)) {
            gzip.write(raw);
        }
        return buffer.toByteArray();
    }

    static byte[] gunzip(byte[] body) throws IOException {
        try (GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(body))) {
            return gzip.readAllBytes();
        }
    }
}
