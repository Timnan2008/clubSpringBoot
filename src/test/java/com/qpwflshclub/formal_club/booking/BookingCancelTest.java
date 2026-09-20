package com.qpwflshclub.formal_club.booking;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class BookingCancelTest {

    BookingRepository repository;
    BookingService service;
    static final BookingService.Actor OWNER = new BookingService.Actor(
        "student@example.invalid",
        "Student",
        false
    );
    static final long START = Instant.parse("2026-09-14T03:30:00Z").getEpochSecond();

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() {
        repository = mock(BookingRepository.class);
        var transactions = mock(TransactionTemplate.class);
        when(transactions.execute(any())).thenAnswer(invocation ->
            invocation.<TransactionCallback<Object>>getArgument(0).doInTransaction(null)
        );
        when(repository.policy(true)).thenReturn(
            new BookingRepository.Policy(
                1,
                new BookingPolicy(
                    "Asia/Shanghai",
                    20,
                    3,
                    1,
                    List.of(1, 2, 3, 4, 5),
                    List.of(6, 7),
                    LocalTime.of(13, 0),
                    LocalTime.of(19, 0),
                    LocalTime.of(19, 0),
                    List.of(new BookingPolicy.Period(LocalTime.of(11, 30), LocalTime.of(12, 50))),
                    List.of(),
                    null,
                    null,
                    null,
                    4
                )
            )
        );
        service = new BookingService(
            repository,
            transactions,
            Clock.fixed(Instant.parse("2026-09-12T06:00:00Z"), ZoneOffset.UTC)
        );
    }

    BookingRepository.Reservation row(String ownerKey, String status, long start) {
        return new BookingRepository.Reservation(
            9,
            1,
            ownerKey,
            "student@example.invalid",
            "Student",
            start,
            start + 1200,
            status,
            "",
            null,
            1,
            "request-key",
            4
        );
    }

    @Test
    void ownerAndOverseerCanCancelBeforeStart() {
        when(repository.find(9L)).thenReturn(Optional.of(row(OWNER.key(), "confirmed", START)));
        assertThat(service.cancel(OWNER, 9L)).isEqualTo(new BookingService.Result(9L, "cancelled"));
        verify(repository).status(9L, "cancelled");
        var other = new BookingService.Actor("other@example.invalid", "Other", false);
        assertThatThrownBy(() -> service.cancel(other, 9L)).hasMessageContaining("FORBIDDEN");
        var overseer = new BookingService.Actor("Mengchuan@shwfl.edu.cn", "孟川", true, true);
        assertThat(service.cancel(overseer, 9L)).isEqualTo(
            new BookingService.Result(9L, "cancelled")
        );
    }

    @Test
    void startedOrClosedReservationsCannotBeCancelled() {
        when(repository.find(9L)).thenReturn(
            Optional.of(
                row(OWNER.key(), "pending", Instant.parse("2026-09-12T06:00:00Z").getEpochSecond())
            )
        );
        assertThatThrownBy(() -> service.cancel(OWNER, 9L)).hasMessageContaining("TOO_LATE");
        when(repository.find(9L)).thenReturn(Optional.of(row(OWNER.key(), "cancelled", START)));
        assertThatThrownBy(() -> service.cancel(OWNER, 9L)).hasMessageContaining("ALREADY_CLOSED");
        when(repository.find(8L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.cancel(OWNER, 8L)).hasMessageContaining("NOT_FOUND");
        verify(repository, never()).status(anyLong(), any());
    }
}
