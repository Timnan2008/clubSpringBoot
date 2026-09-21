package com.qpwflshclub.formal_club.Booking.service;

import com.qpwflshclub.formal_club.Booking.BookingPolicy;
import com.qpwflshclub.formal_club.Booking.repository.BookingRepository;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@ConditionalOnProperty(name = "club.booking.backend", havingValue = "main")
public class BookingService {

    public record Actor(String email, String name, boolean teacher, boolean overseer) {
        public Actor(String email, String name, boolean teacher) {
            this(email, name, teacher, false);
        }

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
        boolean canBook,
        String bookedBy
    ) {}

    public record Calendar(
        BookingRepository.Policy policy,
        List<BookingRepository.Court> courts,
        List<String> dates,
        List<String> times,
        List<Cell> cells,
        boolean studentOpen,
        boolean teacher,
        long serverTime,
        boolean overseer
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

    public record RosterBooking(
        long id,
        int courtId,
        String courtName,
        String courtNameEn,
        long start,
        long end,
        String status,
        String note,
        String displayName,
        String email
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
            var reservations = repository.week(policy.weekStart(monday), policy.weekEnd(monday));
            List<Cell> cells = new ArrayList<>();
            List<String> dates = new ArrayList<>();
            for (int day = 0; day < 7; day++) {
                LocalDate date = monday.plusDays(day);
                if (!policy.bookingDays().contains(date.getDayOfWeek().getValue())) continue;
                dates.add(date.toString());
                var daySlots = policy.slotsFor(date.getDayOfWeek());
                for (var court : courts)
                    for (var time : policy.slots()) {
                        if (!daySlots.contains(time)) continue;
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
                                !occupied && !mine && (actor.teacher() || policy.studentOpen(now)),
                                bookedBy(actor, overlaps)
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
                now.getEpochSecond(),
                actor.overseer()
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

    public List<RosterBooking> roster(Actor actor) {
        requireOverseer(actor);
        var courts = new HashMap<Integer, BookingRepository.Court>();
        repository.courts().forEach(c -> courts.put(c.id(), c));
        return repository
            .all()
            .stream()
            .map(r -> {
                var court = courts.get(r.courtId());
                return new RosterBooking(
                    r.id(),
                    r.courtId(),
                    court == null ? "" : court.name(),
                    court == null ? "" : court.nameEn(),
                    r.start(),
                    r.end(),
                    r.status(),
                    r.note(),
                    r.displayName(),
                    r.ownerEmail()
                );
            })
            .toList();
    }

    public byte[] export(Actor actor) {
        List<RosterBooking> items = roster(actor);
        var zone = repository.policy(false).settings().zoneId();
        DateTimeFormatter date = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter time = DateTimeFormatter.ofPattern("HH:mm");
        List<BookingWorkbook.Line> rows = new ArrayList<>();
        for (RosterBooking item : items) {
            var start = Instant.ofEpochSecond(item.start()).atZone(zone);
            var end = Instant.ofEpochSecond(item.end()).atZone(zone);
            rows.add(
                new BookingWorkbook.Line(
                    List.of(
                        date.format(start),
                        weekday(start.toLocalDate()),
                        time.format(start),
                        time.format(end),
                        item.courtName(),
                        Objects.toString(item.displayName(), ""),
                        Objects.toString(item.email(), ""),
                        statusLabel(item.status()),
                        item.note() == null ? "" : item.note()
                    )
                )
            );
        }
        return BookingWorkbook.write(
            "全部预约",
            List.of("日期", "星期", "开始", "结束", "场地", "预约人", "邮箱", "状态", "备注"),
            rows
        );
    }

    /** Session identity is passed by the controller, never accepted from a request payload. */
    public Result submit(Actor actor, Submit input) {
        if (input.requestKey() == null || !input.requestKey().matches("[A-Za-z0-9_-]{16,64}")) fail(
            400,
            "INVALID_REQUEST_KEY"
        );
        String note = input.note() == null ? "" : input.note().strip();
        if (note.length() > 500) fail(400, "NOTE_TOO_LONG");
        com.qpwflshclub.formal_club.social.ContentModeration.check(note);
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
            if (!policy.inTargetWeek(date, now)) fail(400, "NEXT_WEEK_ONLY");
            if (!actor.teacher() && !policy.studentOpen(now)) fail(403, "STUDENT_WINDOW_CLOSED");
            if (
                repository.used(actor.key(), policy.weekStart(monday), policy.weekEnd(monday)) >=
                policy.weeklyLimit()
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

    public Result cancel(Actor actor, long id) {
        return transactions.execute(tx -> {
            repository.policy(true);
            var reservation = repository
                .find(id)
                .orElseThrow(() -> SchoolAccounts.error(404, "NOT_FOUND"));
            if (!reservation.ownerKey().equals(actor.key()) && !actor.overseer()) fail(
                403,
                "FORBIDDEN"
            );
            if (!Set.of("confirmed", "pending").contains(reservation.status())) fail(
                409,
                "ALREADY_CLOSED"
            );
            if (reservation.start() <= clock.instant().getEpochSecond()) fail(409, "TOO_LATE");
            repository.status(id, "cancelled");
            return new Result(id, "cancelled");
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

    private static String bookedBy(Actor actor, List<BookingRepository.Reservation> overlaps) {
        if (!actor.overseer() || overlaps.isEmpty()) return "";
        return overlaps
            .stream()
            .filter(r -> r.status().equals("confirmed"))
            .map(BookingRepository.Reservation::displayName)
            .filter(name -> name != null && !name.isBlank())
            .findFirst()
            .orElseGet(() -> Objects.toString(overlaps.getFirst().displayName(), ""));
    }

    private static void requireOverseer(Actor actor) {
        if (!actor.overseer()) fail(403, "FORBIDDEN");
    }

    private static String weekday(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case MONDAY -> "周一";
            case TUESDAY -> "周二";
            case WEDNESDAY -> "周三";
            case THURSDAY -> "周四";
            case FRIDAY -> "周五";
            case SATURDAY -> "周六";
            case SUNDAY -> "周日";
        };
    }

    private static String statusLabel(String status) {
        return switch (status) {
            case "confirmed" -> "预约成功";
            case "pending" -> "教师挂起";
            case "unavailable" -> "未获分配";
            case "cancelled" -> "已取消";
            default -> status == null ? "" : status;
        };
    }

    private static void fail(int status, String code) {
        throw SchoolAccounts.error(status, code);
    }
}
