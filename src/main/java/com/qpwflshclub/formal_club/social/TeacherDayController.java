package com.qpwflshclub.formal_club.social;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
@RestController public class TeacherDayController {
 private final SchoolAccounts accounts;private final TeacherDayGifts gifts;
 public TeacherDayController(SchoolAccounts accounts,TeacherDayGifts gifts){this.accounts=accounts;this.gifts=gifts;}
 @GetMapping("/api/campus-social/teacher-day")public Object welcome(HttpServletRequest r){var user=accounts.current(r);return Map.of("celebrate",gifts.today()&&gifts.awarded(user),"account",accounts.view(user),"date","2026-09-10");}
}
