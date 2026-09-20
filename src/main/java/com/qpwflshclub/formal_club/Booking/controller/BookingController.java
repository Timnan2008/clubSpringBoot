package com.qpwflshclub.formal_club.Booking.controller;

import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.User.service.IUserService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class BookingController {

    @Value("${club.booking.backend:legacy}")
    private String backend = "legacy";

    private final IUserService users;
    private final String bookingUrl;

    public BookingController(
        IUserService users,
        @Value("${club.booking.url:http://localhost:8765/}") String bookingUrl
    ) {
        this.users = users;
        this.bookingUrl = bookingUrl;
    }

    private UserBase account(HttpServletRequest request) {
        var session = request.getSession(false);
        if (
            session == null || !(session.getAttribute("authenticatedEmail") instanceof String email)
        ) return null;
        return users.findByEmail(email);
    }

    @GetMapping("/page/booking")
    public String booking(HttpServletRequest request) {
        return account(request) == null
            ? "redirect:/page/user/login?next=%2Fpage%2Fbooking"
            : "main".equals(backend)
              ? "page/booking"
              : "redirect:" + bookingUrl;
    }

    // The PHP app forwards only the opaque JSESSIONID; an email cookie cannot authenticate a booking.
    @GetMapping("/booking/account")
    public ResponseEntity<?> currentAccount(HttpServletRequest request) {
        UserBase user = account(request);
        if (user == null) return ResponseEntity.status(401)
            .header("Cache-Control", "no-store")
            .body(Map.of("code", 401, "message", "请先登录社团官网"));
        return ResponseEntity.ok()
            .header("Cache-Control", "no-store")
            .body(
                Map.of(
                    "code",
                    200,
                    "data",
                    Map.of(
                        "email",
                        user.getEmail(),
                        "username",
                        user.getUsername() == null ? user.getEmail() : user.getUsername(),
                        "usernameEn",
                        user.getUsernameEn() == null ? "" : user.getUsernameEn(),
                        "userRight",
                        user.getUserRight()
                    )
                )
            );
    }
}
