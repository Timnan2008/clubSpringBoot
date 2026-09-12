package com.qpwflshclub.formal_club.Booking;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import com.qpwflshclub.formal_club.Booking.repository.BookingRepository;
import com.qpwflshclub.formal_club.Booking.service.BookingService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.support.TransactionTemplate;

/** Real MySQL locking tests. The URL must name a disposable database ending in _test. */
@EnabledIfEnvironmentVariable(named = "BOOKING_TEST_URL", matches = ".+")
class BookingMysqlTest {

    JdbcTemplate jdbc;
    BookingRepository repository;
    TransactionTemplate transactions;
    BookingService service;
    AtomicReference<Instant> instant;
    Clock clock;
    static final BookingService.Actor STUDENT = new BookingService.Actor(
        "student@example.invalid",
        "Student",
        false
    );
    static final BookingService.Actor TEACHER = new BookingService.Actor(
        "teacher@example.invalid",
        "Teacher",
        true
    );

    @BeforeEach
    void setup() {
        String url = System.getenv("BOOKING_TEST_URL");
        if (
            !url.matches("jdbc:mysql://[^/]+/[A-Za-z0-9_]+_test(?:\\?.*)?")
        ) throw new IllegalArgumentException("Disposable test schema required");
        var source = new DriverManagerDataSource(
            url,
            System.getenv("BOOKING_TEST_USER"),
            System.getenv("BOOKING_TEST_PASSWORD")
        );
        new ResourceDatabasePopulator(
            new FileSystemResource("database/migrations/20260912-booking.sql")
        ).execute(source);
        jdbc = new JdbcTemplate(source);
        jdbc.update("DELETE FROM club_booking_reservation");
        jdbc.update("DELETE FROM club_booking_legacy");
        jdbc.update("DELETE FROM club_booking_court");
        jdbc.update(
            "INSERT INTO club_booking_court VALUES(1,'测试场地','Test court',1),(2,'第二场地','Second court',1)"
        );
        repository = new BookingRepository(jdbc, new ObjectMapper().findAndRegisterModules());
        transactions = new TransactionTemplate(new DataSourceTransactionManager(source));
        instant = new AtomicReference<>(Instant.parse("2026-09-12T06:00:00Z")); // Saturday 14:00 Shanghai
        clock = new Clock() {
            public ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            public Clock withZone(ZoneId zone) {
                return this;
            }

            public Instant instant() {
                return instant.get();
            }
        };
        service = new BookingService(repository, transactions, clock);
    }

    BookingService.Submit slot(int day, String time) {
        return slot(1, day, time);
    }

    BookingService.Submit slot(int court, int day, String time) {
        long start = LocalDate.of(2026, 9, day)
            .atTime(LocalTime.parse(time))
            .atZone(ZoneId.of("Asia/Shanghai"))
            .toEpochSecond();
        return new BookingService.Submit(
            court,
            start,
            start + 1200,
            "",
            1,
            UUID.randomUUID().toString()
        );
    }

    @Test
    void bypassingUiCannotBookClosedTimesWrongWeeksOrUnacknowledgedRules() {
        for (String time : List.of("11:20", "11:40", "12:50", "13:10", "16:10", "18:30"))
            assertThatThrownBy(() -> service.submit(STUDENT, slot(14, time))).hasMessageContaining(
                "INVALID_SLOT"
            );
        assertThatThrownBy(() -> service.submit(STUDENT, slot(21, "11:30"))).hasMessageContaining(
            "NEXT_WEEK_ONLY"
        );
        var valid = slot(14, "11:30");
        assertThatThrownBy(() ->
            service.submit(
                STUDENT,
                new BookingService.Submit(1, valid.start(), valid.end(), "", 0, valid.requestKey())
            )
        ).hasMessageContaining("RULES_ACK_REQUIRED");
        assertThat(repository.mine(STUDENT.key())).isEmpty();
    }

    @Test
    void studentWindowUsesShanghaiClockAndExclusiveClosingBoundary() {
        instant.set(Instant.parse("2026-09-12T04:59:59Z"));
        assertThatThrownBy(() -> service.submit(STUDENT, slot(14, "11:30"))).hasMessageContaining(
            "STUDENT_WINDOW_CLOSED"
        );
        instant.set(Instant.parse("2026-09-12T05:00:00Z"));
        service.submit(STUDENT, slot(14, "11:30"));
        instant.set(Instant.parse("2026-09-13T11:00:00Z"));
        assertThatThrownBy(() -> service.submit(STUDENT, slot(15, "11:30"))).hasMessageContaining(
            "STUDENT_WINDOW_CLOSED"
        );
    }

    @Test
    void quotaIncludesPendingRequestsAndDuplicateSubmissionIsIdempotent() {
        var request = slot(14, "11:30");
        var first = service.submit(TEACHER, request);
        assertThat(service.submit(TEACHER, request)).isEqualTo(first);
        assertThatThrownBy(() ->
            service.submit(TEACHER, slot(2, 14, "11:50"))
        ).hasMessageContaining("DAILY_LIMIT");
        service.submit(TEACHER, slot(15, "11:30"));
        service.submit(TEACHER, slot(16, "11:30"));
        assertThatThrownBy(() -> service.submit(TEACHER, slot(17, "11:30"))).hasMessageContaining(
            "WEEKLY_LIMIT"
        );
        assertThat(repository.mine(TEACHER.key())).hasSize(3);
    }

    @Test
    void concurrentRequestsForOneSlotProduceExactlyOneReservation() throws Exception {
        var other = new BookingService.Actor("other@example.invalid", "Other", false);
        List<String> outcomes = race(
            () -> service.submit(STUDENT, slot(14, "11:30")),
            () -> service.submit(other, slot(14, "11:30"))
        );
        assertThat(outcomes.stream().filter("ok"::equals).count()).isEqualTo(1);
        assertThat(
            outcomes
                .stream()
                .filter(s -> s.contains("SLOT_TAKEN"))
                .count()
        ).isEqualTo(1);
        assertThat(
            jdbc.queryForObject("SELECT COUNT(*) FROM club_booking_reservation", Integer.class)
        ).isEqualTo(1);
    }

    @Test
    void concurrentRequestsAcrossCourtsCannotBypassDailyQuota() throws Exception {
        List<String> outcomes = race(
            () -> service.submit(STUDENT, slot(14, "11:30")),
            () -> service.submit(STUDENT, slot(2, 14, "11:30"))
        );
        assertThat(outcomes.stream().filter("ok"::equals).count()).isEqualTo(1);
        assertThat(
            outcomes
                .stream()
                .filter(s -> s.contains("DAILY_LIMIT"))
                .count()
        ).isEqualTo(1);
    }

    @Test
    void workerAllocatesWithoutBrowserPreservesStudentPriorityAndSurvivesServiceRestart() {
        service.submit(TEACHER, slot(14, "11:30"));
        service.submit(STUDENT, slot(14, "11:30"));
        service.submit(TEACHER, slot(15, "11:30"));
        var other = new BookingService.Actor(
            "other-teacher@example.invalid",
            "Other teacher",
            true
        );
        instant.set(instant.get().plusSeconds(1));
        service.submit(other, slot(15, "11:30"));
        instant.set(Instant.parse("2026-09-13T11:00:00Z"));
        var restarted = new BookingService(repository, transactions, clock);
        new BookingWorker.PendingWorker(restarted).resolve();
        assertThat(
            repository.mine(TEACHER.key()).stream().map(BookingRepository.Reservation::status)
        ).containsExactly("confirmed", "unavailable");
        assertThat(repository.mine(other.key()).getFirst().status()).isEqualTo("unavailable");
        assertThat(restarted.resolvePending()).isZero();
    }

    @Test
    void accountCleanupDeletesBookingsAndArchivedPrivatePayloadsWithoutTouchingOtherUsers() {
        var other = new BookingService.Actor("other@example.invalid", "Other", false);
        service.submit(STUDENT, slot(14, "11:30"));
        service.submit(other, slot(15, "11:30"));
        jdbc.update("INSERT INTO club_booking_legacy VALUES('mrbs_entry',1,?,'{}')", STUDENT.key());
        service.deleteAccount(STUDENT.email());
        assertThat(repository.mine(STUDENT.key())).isEmpty();
        assertThat(repository.mine(other.key())).hasSize(1);
        assertThat(
            jdbc.queryForObject("SELECT COUNT(*) FROM club_booking_legacy", Integer.class)
        ).isZero();
    }

    @Test
    void calendarDoesNotExposeOtherAccountsOrTheirNotesAndHistoryIsOwnerScoped() {
        service.submit(TEACHER, slot(14, "11:30"));
        var calendar = service.calendar(STUDENT);
        assertThat(calendar.cells()).hasSize(100); // 2 courts x 5 days x 10 slots
        assertThat(calendar.toString()).doesNotContain(TEACHER.email(), TEACHER.name());
        assertThat(service.mine(STUDENT)).isEmpty();
        assertThat(service.mine(TEACHER)).hasSize(1);
    }

    List<String> race(Callable<?> first, Callable<?> second) throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var gate = new CountDownLatch(1);
            var tasks = new ArrayList<Future<String>>();
            for (var action : List.of(first, second))
                tasks.add(
                    pool.submit(() -> {
                        gate.await();
                        try {
                            action.call();
                            return "ok";
                        } catch (Exception e) {
                            return e.getMessage();
                        }
                    })
                );
            gate.countDown();
            return List.of(
                tasks.get(0).get(20, TimeUnit.SECONDS),
                tasks.get(1).get(20, TimeUnit.SECONDS)
            );
        }
    }
}
