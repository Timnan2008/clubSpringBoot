package com.qpwflshclub.formal_club.openclaw;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import com.qpwflshclub.formal_club.User.pojo.ClubPresident;
import com.qpwflshclub.formal_club.User.pojo.Teacher;
import com.qpwflshclub.formal_club.User.pojo.UserBase;

/** Stable account-scoped key; numeric primary keys are only unique inside their role table. */
final class OpenClawIdentity {

    private OpenClawIdentity() {}

    static long id(UserBase user) {
        if (user == null || user.getId() <= 0 || user.getId() >= 1L << 56) {
            throw new IllegalArgumentException("Invalid account");
        }
        long role =
            user instanceof Admin
                ? 1L
                : user instanceof Teacher
                  ? 2L
                  : user instanceof ClubPresident
                    ? 3L
                    : 4L;
        return (role << 56) | user.getId();
    }
}
