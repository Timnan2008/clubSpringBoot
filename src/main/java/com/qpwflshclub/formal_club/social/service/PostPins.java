package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PostPins {

    private final ObjectMapper json;
    private final Path file;
    private Map<String, String> pins;

    public PostPins(ObjectMapper json, @Value("${club.social-dir:./data/campus-social}") String dir)
        throws IOException {
        this.json = json;
        file = Path.of(dir).resolve("post-pins.json");
        pins = Files.exists(file)
            ? json.readValue(file.toFile(), new TypeReference<LinkedHashMap<String, String>>() {})
            : new LinkedHashMap<>();
    }

    public synchronized boolean profile(SocialStore.Post post) {
        return !post.anonymous() && post.id().equals(pins.get("profile:" + post.author()));
    }

    public synchronized boolean wall(SocialStore.Post post) {
        return wallIds(pins).contains(post.id());
    }

    public synchronized List<SocialStore.Post> ordered(
        List<SocialStore.Post> posts,
        boolean profile
    ) {
        return posts
            .stream()
            .sorted(
                Comparator.comparing((SocialStore.Post p) ->
                    profile ? profile(p) : wall(p)
                ).reversed()
            )
            .toList();
    }

    public synchronized void update(
        SocialStore.Post post,
        String actor,
        boolean admin,
        String scope,
        boolean pinned
    ) throws IOException {
        if (
            !Set.of("profile", "wall").contains(Objects.toString(scope, ""))
        ) throw SchoolAccounts.error(400, "置顶位置无效 / Invalid pin location");
        if (scope.equals("wall") && !admin) throw SchoolAccounts.error(
            403,
            "仅管理员可置顶校园墙帖子 / Only administrators can pin campus wall posts"
        );
        if (
            scope.equals("profile") && (!post.author().equals(actor) || post.anonymous())
        ) throw SchoolAccounts.error(
            403,
            "只能置顶自己非匿名的帖子 / You can only pin your own non-anonymous posts"
        );
        var next = new LinkedHashMap<>(pins);
        if (scope.equals("wall")) {
            var ids = wallIds(next);
            if (pinned && !ids.contains(post.id()) && ids.size() >= 3) {
                throw SchoolAccounts.error(
                    409,
                    "校园墙最多置顶 3 条帖子，请先取消一条置顶 / The campus wall allows up to 3 pinned posts. Unpin one first."
                );
            }
            if (pinned && !ids.contains(post.id())) next.put("wall:" + post.id(), post.id());
            if (!pinned) next.entrySet().removeIf(
                entry -> isWallKey(entry.getKey()) && post.id().equals(entry.getValue())
            );
        } else {
            String key = "profile:" + actor;
            if (pinned) next.put(key, post.id());
            else next.remove(key, post.id());
        }
        save(next);
    }

    public synchronized void remove(String post) throws IOException {
        var next = new LinkedHashMap<>(pins);
        if (next.values().removeIf(post::equals)) save(next);
    }

    private static boolean isWallKey(String key) {
        return key.equals("wall") || key.startsWith("wall:");
    }

    private static Set<String> wallIds(Map<String, String> values) {
        var ids = new LinkedHashSet<String>();
        values.forEach((key, id) -> {
            if (isWallKey(key)) ids.add(id);
        });
        return ids;
    }

    private void save(Map<String, String> next) throws IOException {
        Files.createDirectories(file.getParent());
        Path temp = Files.createTempFile(file.getParent(), "post-pins-", ".json");
        try {
            json.writeValue(temp.toFile(), next);
            Files.move(
                temp,
                file,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
            pins = next;
        } finally {
            Files.deleteIfExists(temp);
        }
    }
}
