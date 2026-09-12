package com.qpwflshclub.formal_club.booking;

import com.qpwflshclub.formal_club.social.SchoolAccounts;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@ConditionalOnProperty(name = "club.booking.backend", havingValue = "main")
public class BookingService {

    public record Actor(String email, String name, boolean teacher) {
        public String key() {
            return SchoolAccounts.key(email);
        }
    }

    public record Submit(
        int courtId,
        long start,
        long end,
        String note,
        int rulesVersion,
        String requestKey
    ) {}

    public record Result(long id, String status) {}

    public record Cell(
        int courtId,
        long start,
        long end,
        String status,
        int pending,
        boolean mine,
        boolean canBook
    ) {}

    public record Calendar(
        BookingRepository.Policy policy,
        List<BookingRepository.Court> courts,
        List<String> dates,
        List<String> times,
        List<Cell> cells,
        boolean studentOpen,
        boolean teacher,
        long serverTime
    ) {}

    public record MyBooking(
        long id,
        int courtId,
        String courtName,
        String courtNameEn,
        long start,
        long end,
        String status,
        String note,
        Long confirmAfter
    ) {}

    private final BookingRepository repository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public BookingService(
        BookingRepository repository,
        TransactionTemplate transactions,
        @Qualifier("bookingClock") Clock clock
    ) {
        this.repository = repository;
        this.transactions = transactions;
        this.clock = clock;
    }

    public Calendar calendar(Actor actor) {
        return transactions.execute(tx -> {
            var configured = repository.policy(false);
            var policy = configured.settings();
            Instant now = clock.instant();
            LocalDate monday = policy.nextWeek(now);
            var courts = repository
                .courts()
                .stream()
                .filter(BookingRepository.Court::enabled)
                .toList();
            var reservations = repository.week(
                monday.atStartOfDay(policy.zoneId()).toEpochSecond(),
                monday.plusDays(5).atStartOfDay(policy.zoneId()).toEpochSecond()
            );
            List<Cell> cells = new ArrayList<>();
            List<String> dates = new ArrayList<>();
            for (int day = 0; day < 5; day++) {
                LocalDate date = monday.plusDays(day);
                if (!policy.bookingDays().contains(date.getDayOfWeek().getValue())) continue;
                dates.add(date.toString());
                for (var court : courts)
                    for (var time : policy.slots()) {
                        long start = date.atTime(time).atZone(policy.zoneId()).toEpochSecond();
                        long end = start + policy.slotMinutes() * 60L;
                        var overlaps = reservations
                            .stream()
                            .filter(
                                r -> r.courtId() == court.id() && r.start() < end && r.end() > start
                            )
                            .toList();
                        boolean occupied = overlaps
                            .stream()
                            .anyMatch(r -> r.status().equals("confirmed"));
                        boolean mine = overlaps
                            .stream()
                            .anyMatch(r -> r.ownerKey().equals(actor.key()));
                        int pending = (int) overlaps
                            .stream()
                            .filter(r -> r.status().equals("pending"))
                            .count();
                        cells.add(
                            new Cell(
                                court.id(),
                                start,
                                end,
                                occupied ? "confirmed" : pending > 0 ? "pending" : "available",
                                pending,
                                mine,
                                !occupied && !mine && (actor.teacher() || policy.studentOpen(now))
                            )
                        );
                    }
            }
            return new Calendar(
                configured,
                courts,
                dates,
                policy.slots().stream().map(LocalTime::toString).toList(),
                cells,
                policy.studentOpen(now),
                actor.teacher(),
                now.getEpochSecond()
            );
        });
    }

    public List<MyBooking> mine(Actor actor) {
        var courts = new HashMap<Integer, BookingRepository.Court>();
        repository.courts().forEach(c -> courts.put(c.id(), c));
        return repository
            .mine(actor.key())
            .stream()
            .map(r -> {
                var court = courts.get(r.courtId());
                return new MyBooking(
                    r.id(),
                    r.courtId(),
                    court.name(),
                    court.nameEn(),
                    r.start(),
                    r.end(),
                    r.status(),
                    r.note(),
                    r.confirmAfter()
                );
            })
            .toList();
    }

    /** Session identity is passed by the controller, never accepted from a request payload. */
    public Result submit(Actor actor, Submit input) {
        if (input.requestKey() == null || !input.requestKey().matches("[A-Za-z0-9_-]{16,64}")) fail(
            400,
            "INVALID_REQUEST_KEY"
        );
        String note = input.note() == null ? "" : input.note().strip();
        if (note.length() > 500) fail(400, "NOTE_TOO_LONG");
        return transactions.execute(tx -> {
            var configured = repository.policy(true);
            var previous = repository.request(actor.key(), input.requestKey());
            if (previous.isPresent()) {
                var value = previous.get();
                if (
                    value.courtId() != input.courtId() ||
                    value.start() != input.start() ||
                    value.end() != input.end() ||
                    !value.note().equals(note)
                ) fail(409, "REQUEST_KEY_REUSED");
                return new Result(value.id(), value.status());
            }
            var policy = configured.settings();
            Instant now = clock.instant();
            if (input.rulesVersion() != policy.rulesVersion()) fail(400, "RULES_ACK_REQUIRED");
            if (
                repository
                    .courts()
                    .stream()
                    .noneMatch(c -> c.id() == input.courtId() && c.enabled())
            ) fail(404, "COURT_UNAVAILABLE");
            if (!policy.validSlot(input.start(), input.end())) fail(400, "INVALID_SLOT");
            LocalDate date = Instant.ofEpochSecond(input.start())
                .atZone(policy.zoneId())
                .toLocalDate();
            LocalDate monday = policy.nextWeek(now);
            if (date.isBefore(monday) || !date.isBefore(monday.plusDays(5))) fail(
                400,
                "NEXT_WEEK_ONLY"
            );
            if (!actor.teacher() && !policy.studentOpen(now)) fail(403, "STUDENT_WINDOW_CLOSED");
            if (
                repository.used(
                    actor.key(),
                    monday.atStartOfDay(policy.zoneId()).toEpochSecond(),
                    monday.plusDays(5).atStartOfDay(policy.zoneId()).toEpochSecond()
                ) >= policy.weeklyLimit()
            ) fail(409, "WEEKLY_LIMIT");
            if (
                repository.used(
                    actor.key(),
                    date.atStartOfDay(policy.zoneId()).toEpochSecond(),
                    date.plusDays(1).atStartOfDay(policy.zoneId()).toEpochSecond()
                ) >= policy.dailyLimit()
            ) fail(409, "DAILY_LIMIT");
            if (
                !actor.teacher() && repository.occupied(input.courtId(), input.start(), input.end())
            ) fail(409, "SLOT_TAKEN");
            var created = repository.insert(
                input.courtId(),
                actor.key(),
                actor.email(),
                Objects.toString(actor.name(), ""),
                input.start(),
                input.end(),
                actor.teacher() ? "pending" : "confirmed",
                note,
                actor.teacher() ? policy.teacherDeadline(date) : null,
                now.toEpochMilli() * 1000,
                input.requestKey(),
                configured.revision()
            );
            // A teacher can submit after Sunday 19:00. Resolve it in this same transaction.
            resolveLocked(now, policy);
            var result = repository.request(actor.key(), input.requestKey()).orElseThrow();
            return new Result(result.id(), result.status());
        });
    }

    public int resolvePending() {
        return transactions.execute(tx ->
            resolveLocked(clock.instant(), repository.policy(true).settings())
        );
    }

    private int resolveLocked(Instant now, BookingPolicy policy) {
        var pending = repository.pending(now.getEpochSecond());
        var enabled = new HashSet<Integer>();
        repository
            .courts()
            .stream()
            .filter(BookingRepository.Court::enabled)
            .forEach(c -> enabled.add(c.id()));
        for (var reservation : pending) {
            boolean unavailable =
                reservation.start() <= now.getEpochSecond() ||
                !enabled.contains(reservation.courtId()) ||
                !policy.validSlot(reservation.start(), reservation.end()) ||
                repository.occupied(reservation.courtId(), reservation.start(), reservation.end());
            repository.status(reservation.id(), unavailable ? "unavailable" : "confirmed");
        }
        return pending.size();
    }

    public void deleteAccount(String email) {
        transactions.executeWithoutResult(tx -> {
            repository.policy(true);
            repository.deleteAccount(SchoolAccounts.key(email));
        });
    }

    private static void fail(int status, String code) {
        throw SchoolAccounts.error(status, code);
    }
}
