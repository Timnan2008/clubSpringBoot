package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.function.Supplier;

/** Per-answer web budget. Failed origins and identical reads never cause retry loops. */
final class OpenClawResearchBudget {

    private static final int MAX_CALLS = 10;
    private static final int MAX_ROUNDS = 4;
    private final Map<String, String> cache = new HashMap<>();
    private final Map<String, Integer> failures = new HashMap<>();
    private final long started = System.nanoTime();
    private int calls;
    private int rounds;

    static boolean isWeb(String name) {
        return "web_search".equals(name) || "web_fetch".equals(name);
    }

    void nextRound() {
        rounds++;
    }

    boolean exhausted() {
        return (
            calls >= MAX_CALLS ||
            rounds >= MAX_ROUNDS ||
            (calls > 0 && System.nanoTime() - started >= Duration.ofSeconds(120).toNanos())
        );
    }

    String read(String name, JsonNode args, boolean english, Supplier<String> fetch) {
        String target = "web_fetch".equals(name)
            ? normalized(args.path("url").asText())
            : args.path("query").asText().strip().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        String key = name + ":" + target + ":" + args.path("offset").asInt(0);
        if (cache.containsKey(key)) return cache.get(key);
        String host = host(target);
        if (exhausted() || ("web_fetch".equals(name) && failures.getOrDefault(host, 0) >= 2)) {
            return (
                "WEB_RESEARCH_LIMIT: " +
                (english
                    ? "Do not retry this source or guess URL variants. Use already verified bodies or report the evidence gap. This action did not finish."
                    : "停止重复尝试此来源或猜测网址变体。请使用已核实正文，或明确说明证据缺口。这次没有完成。")
            );
        }
        calls++;
        String result = fetch.get();
        cache.put(key, result);
        if ("web_fetch".equals(name) && result.startsWith("WEB_FETCH_ERROR:")) failures.merge(
            host,
            1,
            Integer::sum
        );
        return result;
    }

    private static String normalized(String value) {
        try {
            URI uri = URI.create(value.strip()).normalize();
            return new URI(
                uri.getScheme(),
                uri.getAuthority(),
                uri.getPath(),
                uri.getQuery(),
                null
            ).toString();
        } catch (Exception ignored) {
            return value.strip();
        }
    }

    private static String host(String value) {
        try {
            return URI.create(value).getHost().toLowerCase(Locale.ROOT);
        } catch (Exception ignored) {
            return value;
        }
    }
}
