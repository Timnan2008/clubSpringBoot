package com.qpwflshclub.formal_club.social;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.service.PostPins;
import com.qpwflshclub.formal_club.social.service.SocialStore;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;

class PostPinsTest {

    @TempDir
    Path dir;

    @Test
    void ownershipScopeReplacementPersistenceAndOrdering() throws Exception {
        var json = new ObjectMapper();
        var store = new SocialStore(json, dir.toString());
        var pins = new PostPins(json, dir.toString());
        var old = store.post("a", "old");
        var fresh = store.post("a", "fresh");
        var other = store.post("b", "other");
        var anonymous = store.post("a", "anonymous", "general", true);
        assertEquals(
            403,
            assertThrows(ResponseStatusException.class, () ->
                pins.update(old, "b", false, "profile", true)
            )
                .getStatusCode()
                .value()
        );
        assertThrows(ResponseStatusException.class, () ->
            pins.update(old, "a", false, "wall", true)
        );
        assertThrows(ResponseStatusException.class, () ->
            pins.update(anonymous, "a", false, "profile", true)
        );
        pins.update(old, "a", false, "profile", true);
        assertTrue(pins.profile(old));
        assertFalse(pins.wall(old));
        assertEquals(old.id(), pins.ordered(store.snapshot().posts(), true).getFirst().id());
        pins.update(fresh, "a", false, "profile", true);
        assertFalse(pins.profile(old));
        assertTrue(pins.profile(fresh));
        pins.update(old, "a", false, "profile", false);
        assertTrue(pins.profile(fresh));
        pins.update(other, "admin", true, "wall", true);
        assertTrue(pins.wall(other));
        assertEquals(other.id(), pins.ordered(store.snapshot().posts(), false).getFirst().id());
        var reloaded = new PostPins(json, dir.toString());
        assertTrue(reloaded.profile(fresh));
        assertTrue(reloaded.wall(other));
        reloaded.remove(fresh.id());
        assertFalse(reloaded.profile(fresh));
        assertTrue(reloaded.wall(other));
        reloaded.update(other, "admin", true, "wall", false);
        assertFalse(reloaded.wall(other));
    }

    @Test
    void wallKeepsThreePinsAndMigratesLegacyWithoutReplacingThem() throws Exception {
        var json = new ObjectMapper();
        var store = new SocialStore(json, dir.toString());
        var a = store.post("a", "first");
        var b = store.post("b", "second");
        var c = store.post("c", "third");
        var d = store.post("d", "fourth");
        java.nio.file.Files.writeString(
            dir.resolve("post-pins.json"),
            json.writeValueAsString(java.util.Map.of("wall", a.id()))
        );
        var pins = new PostPins(json, dir.toString());
        pins.update(b, "admin", true, "wall", true);
        pins.update(c, "admin", true, "wall", true);
        pins.update(c, "admin", true, "wall", true);
        assertEquals(
            409,
            assertThrows(ResponseStatusException.class, () ->
                pins.update(d, "admin", true, "wall", true)
            )
                .getStatusCode()
                .value()
        );
        var reloaded = new PostPins(json, dir.toString());
        assertTrue(reloaded.wall(a));
        assertTrue(reloaded.wall(b));
        assertTrue(reloaded.wall(c));
        assertFalse(reloaded.wall(d));
        var ordered = reloaded.ordered(java.util.List.of(d, c, b, a), false);
        assertEquals(java.util.List.of(c, b, a, d), ordered);
        reloaded.update(a, "admin", true, "wall", false);
        reloaded.update(d, "admin", true, "wall", true);
        assertFalse(reloaded.wall(a));
        assertTrue(reloaded.wall(d));
        reloaded.remove(b.id());
        assertFalse(reloaded.wall(b));
        assertTrue(new PostPins(json, dir.toString()).wall(d));
    }

    @Test
    void simultaneousPinsCannotExceedThree() throws Exception {
        var json = new ObjectMapper();
        var store = new SocialStore(json, dir.toString());
        var pins = new PostPins(json, dir.toString());
        var posts = new java.util.ArrayList<SocialStore.Post>();
        for (int i = 0; i < 8; i++) posts.add(store.post("a", "post " + i));
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(8)) {
            var futures = posts
                .stream()
                .map(post ->
                    pool.submit(() -> {
                        start.await();
                        try {
                            pins.update(post, "admin", true, "wall", true);
                            return true;
                        } catch (ResponseStatusException error) {
                            assertEquals(409, error.getStatusCode().value());
                            return false;
                        }
                    })
                )
                .toList();
            start.countDown();
            int successes = 0;
            for (var future : futures) if (future.get()) successes++;
            assertEquals(3, successes);
        }
        assertEquals(3, posts.stream().filter(pins::wall).count());
    }
}
