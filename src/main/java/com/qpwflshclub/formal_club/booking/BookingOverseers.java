package com.qpwflshclub.formal_club.booking;

import com.qpwflshclub.formal_club.config.LoginEmails;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class BookingOverseers {

    private final Set<String> emails;

    public BookingOverseers(@Value("${club.booking.overseers:}") String raw) {
        Set<String> next = new LinkedHashSet<>();
        for (String part : raw.split(",")) {
            String email = LoginEmails.normalize(part);
            if (!email.isEmpty()) next.add(email);
        }
        emails = Set.copyOf(next);
    }

    public boolean allows(UserBase user) {
        return (
            user != null &&
            (user.getUserRight() == 3 || emails.contains(LoginEmails.normalize(user.getEmail())))
        );
    }
}
