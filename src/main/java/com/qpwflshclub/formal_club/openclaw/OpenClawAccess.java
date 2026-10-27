package com.qpwflshclub.formal_club.openclaw;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component("openClawAccess")
public class OpenClawAccess {

    private final SchoolAccounts accounts;

    static void requireAdministrator(UserBase user) {
        if (!(user instanceof Admin)) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Agent Ollie 仅向管理员开放 / Agent Ollie is available to administrators only"
        );
    }

    public OpenClawAccess(SchoolAccounts accounts) {
        this.accounts = accounts;
    }

    public boolean allowed(UserBase user) {
        return user instanceof Admin;
    }

    /** Navigation and API access share the same authenticated administrator boundary. */
    public UserBase requirePage(HttpServletRequest request) {
        UserBase user = accounts.current(request);
        requireAdministrator(user);
        return user;
    }

    public UserBase require(HttpServletRequest request) {
        return requirePage(request);
    }
}
