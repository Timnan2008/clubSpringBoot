package com.qpwflshclub.formal_club.config;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.qpwflshclub.formal_club.service.Suggestion.TurnstileService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class RegistrationVerificationTest {

    @Test
    void receiptAvoidsRedeemingTokenTwiceAndIsConsumedAfterSignup() {
        var request = new MockHttpServletRequest();
        var turnstile = mock(TurnstileService.class);
        RegistrationVerification.require(
            request,
            "student@example.com",
            "user",
            "fresh",
            turnstile
        );
        RegistrationVerification.require(
            request,
            "STUDENT@example.com",
            "user",
            "fresh",
            turnstile
        );
        verify(turnstile, times(1)).verify("fresh", "register");
        RegistrationVerification.consume(request);
        doThrow(new IllegalArgumentException("replay")).when(turnstile).verify("fresh", "register");
        assertThatThrownBy(() ->
            RegistrationVerification.require(
                request,
                "student@example.com",
                "user",
                "fresh",
                turnstile
            )
        ).hasMessage("replay");
    }

    @Test
    void receiptCannotCrossEmailRoleBrowserOrExpiry() {
        var original = new MockHttpServletRequest();
        var turnstile = mock(TurnstileService.class);
        RegistrationVerification.require(
            original,
            "student@example.com",
            "user",
            "fresh",
            turnstile
        );
        doThrow(new IllegalArgumentException("fresh token required"))
            .when(turnstile)
            .verify(null, "register");
        var cases = new MockHttpServletRequest[] {
            new MockHttpServletRequest(),
            new MockHttpServletRequest(),
            new MockHttpServletRequest(),
            new MockHttpServletRequest(),
        };
        cases[0]
            .getSession()
            .setAttribute(
                RegistrationVerification.KEY,
                original.getSession().getAttribute(RegistrationVerification.KEY)
            );
        cases[1]
            .getSession()
            .setAttribute(
                RegistrationVerification.KEY,
                original.getSession().getAttribute(RegistrationVerification.KEY)
            );
        cases[3]
            .getSession()
            .setAttribute(
                RegistrationVerification.KEY,
                new RegistrationVerification.Proof(
                    "student@example.com",
                    "user",
                    System.currentTimeMillis() - 1
                )
            );
        assertThatThrownBy(() ->
            RegistrationVerification.require(cases[0], "other@example.com", "user", null, turnstile)
        ).hasMessage("fresh token required");
        assertThatThrownBy(() ->
            RegistrationVerification.require(
                cases[1],
                "student@example.com",
                "teacher",
                null,
                turnstile
            )
        ).hasMessage("fresh token required");
        assertThatThrownBy(() ->
            RegistrationVerification.require(
                cases[2],
                "student@example.com",
                "user",
                null,
                turnstile
            )
        ).hasMessage("fresh token required");
        assertThatThrownBy(() ->
            RegistrationVerification.require(
                cases[3],
                "student@example.com",
                "user",
                null,
                turnstile
            )
        ).hasMessage("fresh token required");
    }

    @Test
    void failedCaptchaCreatesNoReceipt() {
        var request = new MockHttpServletRequest();
        var turnstile = mock(TurnstileService.class);
        doThrow(new IllegalArgumentException("invalid")).when(turnstile).verify("bad", "register");
        assertThatThrownBy(() ->
            RegistrationVerification.require(
                request,
                "student@example.com",
                "user",
                "bad",
                turnstile
            )
        ).hasMessage("invalid");
        assertThat(request.getSession().getAttribute(RegistrationVerification.KEY)).isNull();
    }
}
