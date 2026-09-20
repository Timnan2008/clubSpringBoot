package com.qpwflshclub.formal_club.config;

import com.qpwflshclub.formal_club.service.Suggestion.TurnstileService;
import com.qpwflshclub.formal_club.social.service.SchoolAccounts;
import jakarta.servlet.http.HttpServletRequest;

/** A short-lived, session-bound receipt for one signup. Never stores a reusable Turnstile token. */
public final class RegistrationVerification {

    static final String KEY = "registrationBotProof";

    record Proof(String email, String role, long expires) {}

    public static long require(
        HttpServletRequest request,
        String email,
        String role,
        String token,
        TurnstileService turnstile
    ) {
        String normalized = LoginEmails.normalize(email);
        if (
            !normalized.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") ||
            normalized.length() > 254 ||
            !("user".equals(role) || "teacher".equals(role))
        ) throw SchoolAccounts.error(400, "注册邮箱或身份无效 / Invalid signup email or role");
        var session = request.getSession();
        synchronized (session) {
            Object current = session.getAttribute(KEY);
            if (
                current instanceof Proof proof &&
                proof.expires() > System.currentTimeMillis() &&
                proof.email().equals(normalized) &&
                proof.role().equals(role)
            ) return proof.expires();
            session.removeAttribute(KEY);
            turnstile.verify(token, "register");
            long expires = System.currentTimeMillis() + 300000;
            session.setAttribute(KEY, new Proof(normalized, role, expires));
            return expires;
        }
    }

    public static void consume(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.removeAttribute(KEY);
    }
}
