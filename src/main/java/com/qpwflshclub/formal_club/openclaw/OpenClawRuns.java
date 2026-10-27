package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import jakarta.servlet.http.HttpServletRequest;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Server-owned jobs: browsers observe snapshots; disconnecting never cancels execution. */
@Component
public class OpenClawRuns {

    private final OpenClawAgent agent;
    private final OpenClawHistory history;
    private final OpenClawApprovals approvals;
    private final ObjectMapper json;
    private final Map<String, Run> active = new ConcurrentHashMap<>();
    private final Map<String, Run> recent = new ConcurrentHashMap<>();

    public OpenClawRuns(
        OpenClawAgent agent,
        OpenClawHistory history,
        OpenClawApprovals approvals,
        ObjectMapper json
    ) {
        this.agent = agent;
        this.history = history;
        this.approvals = approvals;
        this.json = json;
    }

    private String key(long account, String conversation) {
        return account + ":" + conversation;
    }

    /** Passive observer: keeps a reference long enough to deliver the final state after removal. */
    java.util.function.Supplier<List<ObjectNode>> observe(long account) {
        Map<String, Run> watched = new HashMap<>();
        Map<String, String> versions = new HashMap<>();
        return () -> {
            recent
                .entrySet()
                .removeIf(item -> item.getValue().finishedAt < System.currentTimeMillis() - 60_000);
            recent.forEach((key, run) -> {
                if (run.account == account) watched.put(key, run);
            });
            active.forEach((key, run) -> {
                if (run.account == account) watched.put(key, run);
            });
            List<ObjectNode> changed = new ArrayList<>();
            watched.entrySet().removeIf(item -> {
                Run run = item.getValue();
                synchronized (run) {
                    if (run.deleted) return true;
                    String version =
                        run.entry.path("runId").asText() +
                        ":" +
                        run.entry.path("runVersion").asLong();
                    if (!version.equals(versions.get(item.getKey()))) {
                        changed.add(run.entry.deepCopy());
                        versions.put(item.getKey(), version);
                    }
                    return !run.entry.path("working").asBoolean();
                }
            });
            return changed;
        };
    }

    public synchronized ObjectNode start(
        UserBase user,
        OpenClawController.ChatRequest request,
        JsonNode messages,
        String runId,
        String modelRef,
        String combined,
        boolean english,
        HttpServletRequest servlet
    ) throws IOException {
        OpenClawAccess.requireAdministrator(user);
        if (runId == null || !runId.matches("[0-9a-fA-F-]{36}")) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Invalid run id"
        );
        long account = OpenClawIdentity.id(user),
            reset = request.resetAt() == null ? 0 : request.resetAt();
        String key = key(account, request.conversationId());
        Run previous = active.get(key);
        if (previous != null) {
            if (runId.equals(previous.entry.path("runId").asText())) return previous.snapshot();
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "这条对话的任务仍在后台运行，请先停止 / This conversation is still running"
            );
        }
        for (ObjectNode saved : history.runs(account))
            if (runId.equals(saved.path("runId").asText())) return saved;
        if (
            active.size() >= 24 ||
            active
                .values()
                .stream()
                .filter(r -> r.account == account)
                .count() >= 3
        ) throw new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS,
            "后台任务已达上限，请等待当前任务完成 / Too many background tasks"
        );
        ObjectNode raw = json.createObjectNode();
        raw.put("id", request.conversationId());
        if (
            messages == null || !messages.isArray() || messages.size() > 40
        ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid messages");
        raw.set("messages", messages);
        raw.put("title", request.text().substring(0, Math.min(36, request.text().length())));
        ObjectNode wrapped = json.createObjectNode();
        wrapped.putArray("history").add(raw);
        ObjectNode entry = (ObjectNode) history.sanitize(wrapped).path("history").get(0);
        // UI snapshots are untrusted. The model context is validated independently by the controller.
        ArrayNode list = (ArrayNode) entry.path("messages");
        if (
            list.size() < 2 ||
            !"assistant".equals(
                list
                    .get(list.size() - 1)
                    .path("role")
                    .asText()
            ) ||
            !"user".equals(
                list
                    .get(list.size() - 2)
                    .path("role")
                    .asText()
            )
        ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid message branch");
        list.set(
            list.size() - 1,
            json.createObjectNode().put("role", "assistant").put("content", "").put("thinking", "")
        );
        entry.put("runId", runId);
        entry.put("runVersion", 1);
        entry.put("startedAt", System.currentTimeMillis());
        entry.put("working", true);
        entry.put("stopped", false);
        entry.put("failed", false);
        entry.put("awaiting", false);
        entry.putArray("calls");
        Run run = new Run(account, reset, entry, english);
        HttpServletRequest detached = OpenClawRunRequest.capture(servlet);
        history.saveRun(account, reset, entry); // Must be durable before acknowledging start.
        active.put(key, run);
        run.worker = Thread.ofVirtual().unstarted(() -> {
            org.springframework.context.i18n.LocaleContextHolder.setLocale(
                english ? Locale.ENGLISH : Locale.SIMPLIFIED_CHINESE
            );
            try {
                agent.reply(
                    user,
                    request.conversationId(),
                    modelRef,
                    request.reasoning() == null || request.reasoning(),
                    combined,
                    OpenClawCatalog.ids(),
                    english,
                    request.history(),
                    detached,
                    run.output()
                );
                run.finish(run.cancelled ? "stopped" : run.failed ? "failed" : "completed");
            } catch (Exception failure) {
                run.finish(run.cancelled ? "stopped" : "failed");
            } finally {
                org.springframework.context.i18n.LocaleContextHolder.resetLocaleContext();
                run.finishedAt = System.currentTimeMillis();
                recent.put(key, run);
                if (recent.size() > 128) recent
                    .entrySet()
                    .stream()
                    .min(java.util.Comparator.comparingLong(item -> item.getValue().finishedAt))
                    .ifPresent(item -> recent.remove(item.getKey(), item.getValue()));
                active.remove(key, run);
            }
        });
        run.worker.start();
        return run.snapshot();
    }

    public synchronized List<ObjectNode> list(long account) throws IOException {
        List<ObjectNode> result = new ArrayList<>();
        for (ObjectNode saved : history.runs(account)) {
            Run run = active.get(key(account, saved.path("id").asText()));
            if (run != null) result.add(run.snapshot());
            else {
                // Restart is explicit, never replay a potentially completed write.
                if (saved.path("working").asBoolean()) {
                    saved.put("working", false);
                    saved.put("awaiting", false);
                    saved.remove("approval");
                    saved.put("stopped", true);
                    saved.put(
                        "error",
                        "服务已重启，任务已中断，请核对已有结果 / Service restarted; check existing results before retrying"
                    );
                    saved.put("runVersion", saved.path("runVersion").asLong() + 1);
                    stopTasks(saved.path("calls"));
                    for (JsonNode message : saved.path("messages"))
                        stopTasks(message.path("tasks"));
                    long reset = (
                        (Number) history.read(account).getOrDefault("resetAt", 0L)
                    ).longValue();
                    history.saveRun(account, reset, saved);
                }
                result.add(saved);
            }
        }
        return result;
    }

    public synchronized ObjectNode stop(long account, String id, String runId) {
        Run run = active.get(key(account, id));
        if (run == null) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "任务已结束 / Run ended"
        );
        if (!runId.equals(run.entry.path("runId").asText())) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Run changed"
        );
        run.cancelled = true;
        synchronized (run) {
            String approval = run.entry.path("approval").path("id").asText();
            if (!approval.isEmpty()) approvals.decide(account, approval, false);
        }
        run.worker.interrupt();
        run.finish("stopped");
        return run.snapshot();
    }

    public synchronized void delete(long account, String id) throws IOException {
        Run run = active.get(key(account, id));
        if (run != null) {
            stop(account, id, run.entry.path("runId").asText());
            synchronized (run) {
                run.deleted = true;
            }
        }
        Run finished = recent.remove(key(account, id));
        if (finished != null) finished.deleted = true;
        history.deleteRun(account, id);
    }

    public boolean decide(long account, String approvalId, boolean approved) throws IOException {
        for (Run run : active.values())
            if (run.account == account) synchronized (run) {
                if (!approvalId.equals(run.entry.path("approval").path("id").asText())) continue;
                if (run.cancelled || !approvals.decide(account, approvalId, approved)) return false;
                ObjectNode receipt = ((ObjectNode) run.entry.get("approval")).deepCopy();
                receipt.put("status", approved ? "approved" : "denied");
                run.answer().withArray("approvals").add(receipt);
                run.entry.remove("approval");
                run.entry.put("awaiting", false);
                run.bump();
                run.persist(true);
                return true;
            }
        return false;
    }

    static void stopTasks(JsonNode tasks) {
        for (JsonNode task : tasks)
            if (
                task.isObject() &&
                List.of("pending", "running").contains(task.path("status").asText())
            ) ((ObjectNode) task).put("status", "cancelled");
    }

    private final class Run {

        final long account, reset;
        final ObjectNode entry;
        final boolean english;
        volatile boolean cancelled, deleted;
        boolean failed;
        Thread worker;
        long persistedAt;
        volatile long finishedAt;

        Run(long account, long reset, ObjectNode entry, boolean english) {
            this.account = account;
            this.reset = reset;
            this.entry = entry;
            this.english = english;
        }

        ObjectNode answer() {
            ArrayNode messages = (ArrayNode) entry.get("messages");
            return (ObjectNode) messages.get(messages.size() - 1);
        }

        synchronized ObjectNode snapshot() {
            return entry.deepCopy();
        }

        void bump() {
            entry.put("runVersion", entry.path("runVersion").asLong() + 1);
            entry.put("updatedAt", System.currentTimeMillis());
        }

        void persist(boolean force) throws IOException {
            if (deleted) return;
            if (force || System.currentTimeMillis() - persistedAt >= 1500) {
                history.saveRun(account, reset, entry);
                persistedAt = System.currentTimeMillis();
            }
        }

        synchronized void finish(String state) {
            if (deleted) return;
            entry.put("endedAt", System.currentTimeMillis());
            entry.put("working", false);
            entry.put("awaiting", false);
            entry.remove("approval");
            entry.put("stopped", !state.equals("completed"));
            entry.put("failed", state.equals("failed"));
            entry.put("unread", true);
            entry.put("status", "");
            answer().put("outcome", state);
            if (state.equals("failed") && !entry.hasNonNull("error")) entry.put(
                "error",
                english
                    ? "This task did not complete. Check existing results before retrying."
                    : "本次任务未完成，请先核对已有结果再重试。"
            );
            stopTasks(entry.path("calls"));
            stopTasks(answer().path("tasks"));
            bump();
            try {
                persist(true);
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(OpenClawRuns.class).error(
                    "Could not persist Agent task state",
                    e
                );
            }
        }

        synchronized void accept(JsonNode event) throws IOException {
            if (cancelled || Thread.currentThread().isInterrupted()) throw new IOException(
                "stopped"
            );
            ObjectNode message = answer();
            if (event.has("replace")) {
                message.put("content", event.path("content").asText());
                if (event.has("thinking")) message.put("thinking", event.path("thinking").asText());
            }
            for (String field : List.of("delta", "reasoning"))
                if (event.has(field)) {
                    String target = field.equals("delta") ? "content" : "thinking";
                    String value = message.path(target).asText() + event.path(field).asText();
                    if (value.length() > 100000) throw new IOException("Response too large");
                    message.put(target, value);
                }
            if (event.has("error")) {
                failed = true;
                entry.put("error", event.path("error").asText());
            }
            if (event.has("quota")) entry.set("quota", event.get("quota"));
            if (event.has("approval")) {
                entry.set("approval", event.get("approval"));
                entry.put("awaiting", true);
            }
            if (event.has("tasks")) {
                LinkedHashMap<String, JsonNode> tasks = new LinkedHashMap<>();
                for (JsonNode task : message.path("tasks"))
                    tasks.put(task.path("id").asText(), task);
                JsonNode incoming = json.valueToTree(
                    OpenClawAgent.validatedTasks(event.get("tasks"))
                );
                for (JsonNode task : incoming) {
                    String id = task.path("id").asText();
                    JsonNode previous = tasks.get(id);
                    if (
                        previous == null ||
                        !previous.path("status").asText().equals("done") ||
                        task.path("status").asText().equals("done")
                    ) tasks.put(id, task);
                }
                ArrayNode merged = message.putArray("tasks");
                tasks.values().stream().limit(20).forEach(merged::add);
            }
            if (event.has("sources")) for (JsonNode source : event.path("sources"))
                message.withArray("sources").add(source);
            if (event.has("file")) message.withArray("files").add(event.get("file"));
            if (event.has("name")) {
                ArrayNode calls = entry.withArray("calls");
                ObjectNode chip = null;
                for (JsonNode item : calls)
                    if (item.path("id").asText().equals(event.path("id").asText())) chip =
                        (ObjectNode) item;
                if (chip == null) {
                    chip = json.createObjectNode();
                    calls.add(chip);
                    chip.put("startedAt", System.currentTimeMillis());
                }
                chip.setAll((ObjectNode) event);
                if (event.has("effectKind")) {
                    ObjectNode effect = json.createObjectNode();
                    effect.put("kind", event.path("effectKind").asText());
                    effect.put("id", event.path("effectId").asText());
                    effect.put("club", event.path("effectClub").asText());
                    effect.put("text", event.path("effectText").asText());
                    message.withArray("effects").add(effect);
                }
                if (
                    entry.path("awaiting").asBoolean() &&
                    !event.path("status").asText().equals("running")
                ) {
                    entry.put("awaiting", false);
                    entry.remove("approval");
                }
            } else if (event.has("status")) entry.set("status", event.get("status"));
            bump();
            persist(event.has("approval") || event.has("file") || event.has("tasks"));
        }

        OutputStream output() {
            return new OutputStream() {
                final ByteArrayOutputStream buffer = new ByteArrayOutputStream();

                public void write(int b) throws IOException {
                    buffer.write(b);
                    if (buffer.size() > 600000) throw new IOException("Event too large");
                }

                public void write(byte[] b, int off, int len) throws IOException {
                    if (cancelled) throw new IOException("stopped");
                    buffer.write(b, off, len);
                    if (buffer.size() > 600000) throw new IOException("Event too large");
                }

                public void flush() throws IOException {
                    if (cancelled) throw new IOException("stopped");
                    String raw = buffer.toString(StandardCharsets.UTF_8);
                    buffer.reset();
                    for (String line : raw.split("\\n"))
                        if (line.startsWith("data:")) {
                            String data = line.substring(5).trim();
                            if (!data.isEmpty() && !data.equals("[DONE]")) accept(
                                json.readTree(data)
                            );
                        }
                }
            };
        }
    }
}
