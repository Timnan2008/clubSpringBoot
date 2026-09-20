package com.qpwflshclub.formal_club.social.controller;

import com.qpwflshclub.formal_club.social.TeacherDayGifts;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
public class TeacherDayController {

    private final SchoolAccounts accounts;
    private final TeacherDayGifts gifts;

    public TeacherDayController(SchoolAccounts accounts, TeacherDayGifts gifts) {
        this.accounts = accounts;
        this.gifts = gifts;
    }

    @GetMapping("/api/campus-social/teacher-day")
    public Object welcome(HttpServletRequest r) {
        var user = accounts.current(r);
        return Map.of(
            "celebrate",
            gifts.today() && gifts.awarded(user),
            "account",
            accounts.view(user),
            "date",
            "2026-09-10"
        );
    }
}
