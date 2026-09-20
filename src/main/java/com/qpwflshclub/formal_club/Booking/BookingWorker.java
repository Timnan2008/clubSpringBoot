package com.qpwflshclub.formal_club.Booking;

import com.qpwflshclub.formal_club.Booking.service.BookingService;
import java.time.Clock;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.scheduling.annotation.*;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "club.booking.backend", havingValue = "main")
public class BookingWorker {

    @Bean
    public Clock bookingClock() {
        return Clock.systemUTC();
    }

    @Bean
    public PendingWorker pendingBookingWorker(BookingService service) {
        return new PendingWorker(service);
    }

    /** Runs without any browser visit; overdue records are also recovered after a restart. */
    public static class PendingWorker {

        private final BookingService service;

        public PendingWorker(BookingService service) {
            this.service = service;
        }

        @Scheduled(
            fixedDelayString = "${club.booking.queue-delay-ms:30000}",
            initialDelayString = "${club.booking.queue-delay-ms:30000}"
        )
        public void resolve() {
            try {
                service.resolvePending();
            } catch (RuntimeException exception) {
                LoggerFactory.getLogger(BookingWorker.class).error(
                    "Booking queue resolution failed; retrying next cycle",
                    exception
                );
            }
        }
    }
}
