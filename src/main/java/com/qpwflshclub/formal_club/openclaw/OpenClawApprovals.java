package com.qpwflshclub.formal_club.openclaw;

import com.qpwflshclub.formal_club.User.pojo.UserBase;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/** Pauses a write tool until the signed-in user approves it on the same account. */
@Component
public class OpenClawApprovals {

    public record Pending(String id, String tool, String createdAt) {}

    private record Wait(
        long userId,
        String tool,
        String createdAt,
        CompletableFuture<Boolean> future
    ) {}

    private final ConcurrentHashMap<String, Wait> pending = new ConcurrentHashMap<>();

    public void open(long userId, String id, String tool) {
        pending.put(
            id,
            new Wait(
                userId,
                tool == null ? "" : tool,
                Instant.now().toString(),
                new CompletableFuture<>()
            )
        );
    }

    public List<Pending> pendingFor(long userId) {
        return pending
            .entrySet()
            .stream()
            .filter(entry -> entry.getValue().userId == userId)
            .map(entry ->
                new Pending(entry.getKey(), entry.getValue().tool, entry.getValue().createdAt)
            )
            .toList();
    }

    public List<Pending> pendingFor(UserBase user) {
        return pendingFor(OpenClawIdentity.id(user));
    }

    public boolean await(String id, Duration timeout) {
        Wait wait = pending.get(id);
        if (wait == null) return false;
        try {
            return Boolean.TRUE.equals(wait.future.get(timeout.toMillis(), TimeUnit.MILLISECONDS));
        } catch (Exception e) {
            return false;
        } finally {
            pending.remove(id, wait);
        }
    }

    public boolean decide(long userId, String id, boolean approved) {
        Wait wait = pending.get(id);
        if (wait == null || wait.userId != userId) return false;
        pending.remove(id, wait);
        wait.future.complete(approved);
        return true;
    }
}
