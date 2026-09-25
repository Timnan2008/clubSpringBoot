package com.qpwflshclub.formal_club.social;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Counts blocked-word attempts and mutes an account for 7 days after 5 strikes. */
@Service
public class ContentDiscipline {

    public static final int LIMIT = 5;
    public static final Duration MUTE = Duration.ofDays(7);
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern(
        "yyyy-MM-dd HH:mm"
    ).withZone(ZoneId.of("Asia/Shanghai"));
    private static final ThreadLocal<String> ACTOR = new ThreadLocal<>();
    private static volatile ContentDiscipline active;

    public record State(int strikes, long mutedUntil, long lastStrike) {
        public State {
            strikes = Math.max(0, strikes);
            mutedUntil = Math.max(0, mutedUntil);
            lastStrike = Math.max(0, lastStrike);
        }
    }

    private final Path file;
    private final ObjectMapper json;
    private Clock clock = Clock.systemUTC();
    private Map<String, State> rows;

    public ContentDiscipline(
        ObjectMapper json,
        @Value("${club.social-dir:./data/campus-social}") String dir
    ) throws IOException {
        this.json = json;
        file = Path.of(dir).resolve("content-discipline.json");
        rows = Files.exists(file)
            ? json.readValue(file.toFile(), new TypeReference<LinkedHashMap<String, State>>() {})
            : new LinkedHashMap<>();
    }

    ContentDiscipline withClock(Clock clock) {
        this.clock = clock;
        return this;
    }

    @PostConstruct
    void start() {
        active = this;
    }

    @PreDestroy
    void stop() {
        if (active == this) active = null;
    }

    public static void bind(String email) {
        if (email != null && !email.isBlank()) ACTOR.set(SchoolAccounts.key(email));
    }

    public static void unbind() {
        ACTOR.remove();
    }

    static void guard() {
        if (active != null) active.requireOpen(ACTOR.get());
    }

    static void violate() {
        if (active != null && ACTOR.get() != null) active.strike(ACTOR.get());
        throw SchoolAccounts.error(400, ContentModeration.MESSAGE);
    }

    public synchronized void requireOpen(String account) {
        if (account == null || account.isBlank()) return;
        var state = current(account);
        if (state.mutedUntil() > clock.instant().getEpochSecond()) throw SchoolAccounts.error(
            403,
            muteMessage(state.mutedUntil())
        );
    }

    public synchronized String until(String account) {
        if (account == null || account.isBlank()) return "";
        var state = current(account);
        return state.mutedUntil() > clock.instant().getEpochSecond()
            ? CLOCK.format(Instant.ofEpochSecond(state.mutedUntil()))
            : "";
    }

    public synchronized void removeAccount(String id) throws IOException {
        if (id == null || !rows.containsKey(id)) return;
        var next = new LinkedHashMap<>(rows);
        next.remove(id);
        persist(next);
    }

    private void strike(String account) {
        var now = clock.instant().getEpochSecond();
        var previous = current(account);
        int strikes = previous.strikes() + 1;
        long mutedUntil = strikes >= LIMIT ? now + MUTE.getSeconds() : 0;
        try {
            var next = new LinkedHashMap<>(rows);
            next.put(account, new State(strikes, mutedUntil, now));
            persist(next);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot record content discipline", e);
        }
        if (mutedUntil > 0) throw SchoolAccounts.error(403, muteMessage(mutedUntil));
        throw SchoolAccounts.error(
            400,
            ContentModeration.MESSAGE +
                "（第 " +
                strikes +
                "/" +
                LIMIT +
                " 次，满 " +
                LIMIT +
                " 次将禁言一周） / Strike " +
                strikes +
                "/" +
                LIMIT +
                ". Five attempts mute the account for one week."
        );
    }

    private State current(String account) {
        var state = rows.getOrDefault(account, new State(0, 0, 0));
        if (state.mutedUntil() > 0 && state.mutedUntil() <= clock.instant().getEpochSecond()) {
            return new State(0, 0, state.lastStrike());
        }
        return state;
    }

    private void persist(Map<String, State> next) throws IOException {
        Files.createDirectories(file.toAbsolutePath().getParent());
        Path tmp = Files.createTempFile(file.toAbsolutePath().getParent(), "discipline-", ".json");
        try {
            try {
                com.qpwflshclub.formal_club.Util.SecureFiles.restrict(tmp, "rw-------");
            } catch (UnsupportedOperationException ignored) {}
            json.writeValue(tmp.toFile(), next);
            Files.move(
                tmp,
                file,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
            rows = next;
        } finally {
            Files.deleteIfExists(tmp);
        }
    }

    private static String muteMessage(long mutedUntil) {
        String until = CLOCK.format(Instant.ofEpochSecond(mutedUntil));
        return (
            "因多次发送不当用语，账号已禁言至 " +
            until +
            "。 / This account is muted until " +
            until +
            " for repeated inappropriate language."
        );
    }
}
