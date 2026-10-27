package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Live delivery is independent of the worker. Closing the view only closes this observer. */
final class OpenClawRunStream {
    static SseEmitter open(OpenClawRuns runs, long account) {
        SseEmitter emitter = new SseEmitter(65_000L);
        AtomicBoolean closed = new AtomicBoolean();
        emitter.onCompletion(() -> closed.set(true));
        emitter.onTimeout(() -> closed.set(true));
        emitter.onError(error -> closed.set(true));
        var observe = runs.observe(account);
        Thread.ofVirtual().start(() -> {
            Map<String, ObjectNode> previous = new HashMap<>();
            long started = System.nanoTime(), heartbeat = started;
            try {
                emitter.send(SseEmitter.event().comment("connected").reconnectTime(1000));
                while (!closed.get() && System.nanoTime() - started < 60_000_000_000L) {
                    for (ObjectNode entry : observe.get()) {
                        String id = entry.path("id").asText();
                        ObjectNode patch = textDelta(previous.get(id), entry);
                        emitter.send(SseEmitter.event().name(patch == null ? "snapshot" : "text").data(patch == null ? entry : patch));
                        previous.put(id, entry);
                    }
                    if (System.nanoTime() - heartbeat >= 10_000_000_000L) {
                        emitter.send(SseEmitter.event().comment("keepalive"));
                        heartbeat = System.nanoTime();
                    }
                    Thread.sleep(50);
                }
                emitter.complete();
            } catch (Exception disconnected) {
                // Never interrupt the run when a browser leaves or its connection breaks.
                emitter.complete();
            }
        });
        return emitter;
    }

    static ObjectNode textDelta(ObjectNode before, ObjectNode after) {
        if (before == null || !before.path("runId").equals(after.path("runId"))) return null;
        var oldMessages = before.path("messages");
        var newMessages = after.path("messages");
        int index = newMessages.size() - 1;
        if (index < 0 || oldMessages.size() != newMessages.size()) return null;
        ObjectNode left = before.deepCopy(), right = after.deepCopy();
        for (ObjectNode copy : new ObjectNode[] { left, right }) {
            copy.remove(java.util.List.of("runVersion", "updatedAt"));
            ((ObjectNode) copy.path("messages").get(index)).remove(java.util.List.of("content", "thinking"));
        }
        if (!left.equals(right)) return null;
        ObjectNode patch = after.objectNode();
        for (String field : java.util.List.of("id", "runId", "runVersion", "updatedAt")) patch.set(field, after.path(field));
        patch.put("fromVersion", before.path("runVersion").asLong());
        for (String field : java.util.List.of("content", "thinking")) {
            String oldText = oldMessages.get(index).path(field).asText();
            String newText = newMessages.get(index).path(field).asText();
            if (!newText.startsWith(oldText)) return null;
            patch.put(field, newText.substring(oldText.length()));
        }
        return patch;
    }
}
