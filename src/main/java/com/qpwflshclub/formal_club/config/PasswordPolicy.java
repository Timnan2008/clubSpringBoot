package com.qpwflshclub.formal_club.config;

import com.qpwflshclub.formal_club.social.service.SchoolAccounts;

public final class PasswordPolicy {

    private PasswordPolicy() {}

    public static boolean valid(String p) {
        return p != null && p.length() >= 8 && p.length() <= 128;
    }

    public static void require(String p) {
        if (!valid(p)) throw SchoolAccounts.error(400, "密码需为 8–128 位 / Use 8–128 characters");
    }
}
