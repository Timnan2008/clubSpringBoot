package com.qpwflshclub.formal_club.openclaw;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component("openClawAccess")
public class OpenClawAccess {

    private final SchoolAccounts accounts;
    static final java.time.Instant DISABLED_AT = java.time.Instant.parse("2026-09-27T16:00:00Z");

    static boolean enabledAt(java.time.Instant now) {
        return now.isBefore(DISABLED_AT);
    }

    static void requireEnabled() {
        if (!enabledAt(java.time.Instant.now())) throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Agent 已于 2026 年 9 月 28 日起全面停用 / Agent is disabled from September 28, 2026"
        );
    }

    public OpenClawAccess(SchoolAccounts accounts) {
        this.accounts = accounts;
    }

    public boolean allowed(UserBase user) {
        return (
            enabledAt(java.time.Instant.now()) &&
            (user instanceof Admin || user instanceof Teacher || user instanceof ClubPresident)
        );
    }

    public UserBase require(HttpServletRequest request) {
        UserBase user = accounts.current(request);
        requireEnabled();
        if (!allowed(user)) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Agent Ollie 仅向社长、副社长、老师和管理员开放"
        );
        return user;
    }
}
