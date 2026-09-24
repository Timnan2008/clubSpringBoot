package com.qpwflshclub.formal_club.openclaw;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Server-side client for the OpenClaw chat endpoint. The bearer token stays here. */
@Component
public class OpenClawGateway {

    private final ObjectMapper json;
    private final HttpClient http;
    private final URI endpoint;
    private final String token;
    private final URI mimoEndpoint;
    private final String mimoKey;

    public OpenClawGateway(ObjectMapper json, String url, String token) {
        this(json, url, token, "", "");
    }

    @Autowired
    public OpenClawGateway(
        ObjectMapper json,
        @Value("${club.openclaw.url:}") String url,
        @Value("${club.openclaw.token:}") String token,
        @Value(
            "${club.openclaw.mimo-url:https://api.xiaomimimo.com/v1/chat/completions}"
        ) String mimoUrl,
        @Value("${club.openclaw.mimo-key:}") String mimoKey
    ) {
        this(
            json,
            // The gateway rejects HTTP/2 with 405 Invalid HTTP method.
            HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(8))
                .build(),
            url,
            token,
            mimoUrl,
            mimoKey
        );
    }

    OpenClawGateway(
        ObjectMapper json,
        HttpClient http,
        String url,
        String token,
        String mimoUrl,
        String mimoKey
    ) {
        this.json = json;
        this.http = http;
        this.token = token == null ? "" : token.trim();
        this.mimoKey = mimoKey == null ? "" : mimoKey.trim();
        URI parsed = null;
        if (url != null && !url.isBlank() && !this.token.isBlank()) {
            try {
                URI uri = URI.create(url.trim());
                if (
                    uri.getUserInfo() == null &&
                    uri.getHost() != null &&
                    ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                ) parsed = URI.create(
                    uri.toString().replaceAll("/+$", "") + "/v1/chat/completions"
                );
            } catch (IllegalArgumentException ignored) {
                parsed = null;
            }
        }
        this.endpoint = parsed;
        URI mimo = null;
        if (mimoUrl != null && !mimoUrl.isBlank() && !this.mimoKey.isBlank()) {
            try {
                URI uri = URI.create(mimoUrl.trim());
                if (
                    uri.getUserInfo() == null &&
                    "https".equals(uri.getScheme()) &&
                    "api.xiaomimimo.com".equalsIgnoreCase(uri.getHost())
                ) mimo = uri;
            } catch (IllegalArgumentException ignored) {
                mimo = null;
            }
        }
        this.mimoEndpoint = mimo;
    }

    public boolean configured() {
        return endpoint != null;
    }

    public boolean mimoConfigured() {
        return mimoEndpoint != null;
    }

    @FunctionalInterface
    public interface TextSink {
        void write(String text) throws IOException;
    }

    public Round complete(
        String sessionUser,
        String modelRef,
        List<Map<String, Object>> messages,
        List<Map<String, Object>> tools,
        TextSink onText,
        TextSink onReasoning
    ) throws IOException {
        boolean mimo = modelRef != null && modelRef.startsWith("mimo/");
        if (mimo) {
            if (mimoEndpoint == null) throw new IOException("status 503");
        } else if (!configured()) throw new IOException("unconfigured");
        ObjectNode body = json.createObjectNode();
        body.put("stream", true);
        body.set("messages", json.valueToTree(messages));
        if (tools != null && !tools.isEmpty()) {
            body.set("tools", json.valueToTree(tools));
            body.put("tool_choice", "auto");
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder(mimo ? mimoEndpoint : endpoint)
            .timeout(Duration.ofSeconds(90))
            .header("Content-Type", "application/json");
        if (mimo) {
            body.put("model", modelRef.substring("mimo/".length()));
            body.put("temperature", 1.0);
            body.put("top_p", 0.95);
            body.put("max_completion_tokens", 4096);
            builder.header("api-key", mimoKey);
        } else {
            body.put("model", "openclaw/default");
            body.putObject("stream_options").put("include_usage", true);
            body.put("user", sessionUser);
            builder.header("Authorization", "Bearer " + token);
            builder.header("x-openclaw-model", modelRef);
        }
        HttpRequest request = builder
            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
            .build();
        HttpResponse<java.io.InputStream> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("interrupted");
        }
        if (response.statusCode() != 200) {
            response.body().close();
            throw new IOException("status " + response.statusCode());
        }
        StringBuilder content = new StringBuilder();
        StringBuilder reasoning = new StringBuilder();
        List<Call> calls = new ArrayList<>();
        JsonNode reportedUsage = null;
        try (
            BufferedReader lines = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8)
            )
        ) {
            String line;
            while ((line = lines.readLine()) != null) {
                if (!line.startsWith("data:")) continue;
                String data = line.substring(5).trim();
                if (data.isEmpty() || "[DONE]".equals(data)) continue;
                JsonNode event = json.readTree(data);
                if (event.has("error")) throw new IOException("upstream");
                JsonNode delta = event.path("choices").path(0).path("delta");
                if (delta.path("content").isTextual()) {
                    String piece = delta.path("content").asText();
                    content.append(piece);
                    if (onText != null && !piece.isEmpty()) onText.write(piece);
                }
                String thought = firstText(delta, "reasoning_content", "reasoning", "thinking");
                if (!thought.isEmpty()) {
                    reasoning.append(thought);
                    if (onReasoning != null) onReasoning.write(thought);
                }
                if (delta.path("tool_calls").isArray()) merge(calls, delta.path("tool_calls"));
                JsonNode reported = event.path("usage");
                if (
                    reported.isObject() &&
                    reported.path("prompt_tokens").asLong(0) +
                        reported.path("completion_tokens").asLong(0) >
                        0
                ) {
                    reportedUsage = reported;
                }
            }
        }
        return new Round(
            content.toString(),
            calls
                .stream()
                .filter(call -> !call.name.isBlank())
                .toList(),
            usage(reportedUsage),
            reasoning.toString()
        );
    }

    private static Usage usage(JsonNode usage) {
        if (usage == null || !usage.isObject()) return Usage.UNKNOWN;
        long prompt = usage.path("prompt_tokens").asLong(0);
        long completion = usage.path("completion_tokens").asLong(0);
        long reasoning = usage.path("completion_tokens_details").path("reasoning_tokens").asLong(0);
        long hit = usage.path("prompt_cache_hit_tokens").asLong(-1);
        long miss = usage.path("prompt_cache_miss_tokens").asLong(-1);
        if (hit < 0 && miss < 0) {
            long cached = usage.path("prompt_tokens_details").path("cached_tokens").asLong(-1);
            if (cached >= 0) {
                hit = cached;
                miss = Math.max(0, prompt - cached);
            } else {
                hit = 0;
                miss = prompt;
            }
        } else {
            if (hit < 0) hit = 0;
            if (miss < 0) miss = Math.max(0, prompt - hit);
        }
        long output = completion > 0 ? completion : reasoning;
        return new Usage(hit, miss, output, true);
    }

    private static String firstText(JsonNode node, String... names) {
        for (String name : names) {
            JsonNode value = node.path(name);
            if (value.isTextual() && !value.asText().isEmpty()) return value.asText();
        }
        return "";
    }

    private void merge(List<Call> calls, JsonNode fragments) {
        for (JsonNode fragment : fragments) {
            int index = fragment.path("index").asInt(calls.size());
            while (calls.size() <= index) calls.add(new Call("", "", new StringBuilder()));
            Call call = calls.get(index);
            if (fragment.path("id").isTextual()) call.id = fragment.path("id").asText();
            JsonNode function = fragment.path("function");
            if (function.path("name").isTextual()) call.name = function.path("name").asText();
            if (function.path("arguments").isTextual()) call.arguments.append(
                function.path("arguments").asText()
            );
        }
    }

    public static final class Usage {

        static final Usage UNKNOWN = new Usage(0, 0, 0, false);
        public final long cacheHit;
        public final long cacheMiss;
        public final long output;
        public final boolean known;

        Usage(long cacheHit, long cacheMiss, long output, boolean known) {
            this.cacheHit = cacheHit;
            this.cacheMiss = cacheMiss;
            this.output = output;
            this.known = known;
        }
    }

    public static final class Round {

        public final String content;
        public final List<Call> calls;
        public final Usage usage;
        public final String reasoning;

        Round(String content, List<Call> calls, Usage usage, String reasoning) {
            this.content = content;
            this.calls = calls;
            this.usage = usage == null ? Usage.UNKNOWN : usage;
            this.reasoning = reasoning == null ? "" : reasoning;
        }
    }

    public static final class Call {

        public String id;
        public String name;
        public final StringBuilder arguments;

        Call(String id, String name, StringBuilder arguments) {
            this.id = id;
            this.name = name;
            this.arguments = arguments;
        }

        ObjectNode message(ObjectMapper json) {
            ObjectNode call = json.createObjectNode();
            call.put("id", id);
            call.put("type", "function");
            ObjectNode function = call.putObject("function");
            function.put("name", name);
            function.put("arguments", arguments.toString());
            return call;
        }
    }
}
