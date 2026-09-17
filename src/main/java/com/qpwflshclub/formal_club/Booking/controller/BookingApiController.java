package com.qpwflshclub.formal_club.Booking.controller;

import com.qpwflshclub.formal_club.Booking.service.BookingService;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import com.qpwflshclub.formal_club.workspace.WorkspaceAccess;
import jakarta.servlet.http.*;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/booking")
@ConditionalOnProperty(name = "club.booking.backend", havingValue = "main")
public class BookingApiController {

    private final SchoolAccounts accounts;
    private final WorkspaceAccess access;
    private final BookingService bookings;

    /** 违禁词闸门：预约备注（note）也要过一遍检查。 */
    @org.springframework.beans.factory.annotation.Autowired
    private com.qpwflshclub.formal_club.social.service.ModerationGate moderation;

    public BookingApiController(
        SchoolAccounts accounts,
        WorkspaceAccess access,
        BookingService bookings
    ) {
        this.accounts = accounts;
        this.access = access;
        this.bookings = bookings;
    }

    private BookingService.Actor actor(HttpServletRequest request) {
        var user = accounts.current(request);
        return new BookingService.Actor(
            user.getEmail(),
            user.getUsername(),
            user.getUserRight() == 2
        );
    }

    @GetMapping
    public Object bootstrap(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, private");
        var actor = actor(request);
        return Map.of(
            "calendar",
            bookings.calendar(actor),
            "account",
            accounts.view(accounts.current(request)),
            "token",
            access.token(request)
        );
    }

    @GetMapping("/mine")
    public Object mine(HttpServletRequest request, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, private");
        return bookings.mine(actor(request));
    }

    @PostMapping("/reservations")
    public Object submit(
        @RequestBody BookingService.Submit input,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        response.setHeader("Cache-Control", "no-store, private");
        var actor = actor(request);
        access.mutation(request);
        // 备注是学生自己打的字，命中违禁词会被拦截并记一次过
        if (moderation != null) moderation.inspect(
            actor.key(),
            com.qpwflshclub.formal_club.social.service.ModerationGate.BOOKING,
            input.note()
        );
        return bookings.submit(actor, input);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> error(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
            .header("Cache-Control", "no-store")
            .body(
                Map.of(
                    "code",
                    exception.getReason() == null ? "BOOKING_ERROR" : exception.getReason()
                )
            );
    }
}
