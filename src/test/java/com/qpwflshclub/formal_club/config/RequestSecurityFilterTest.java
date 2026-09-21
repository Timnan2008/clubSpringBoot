package com.qpwflshclub.formal_club.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.*;

class RequestSecurityFilterTest {

    private MockHttpServletRequest request(String method) {
        var request = new MockHttpServletRequest(method, "/api/user/login");
        request.setScheme("https");
        request.setSecure(true);
        request.setServerName("qpwflhsclub.com");
        request.setServerPort(443);
        return request;
    }

    private boolean accepted(MockHttpServletRequest request) throws Exception {
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        new RequestSecurityFilter().doFilter(request, response, chain);
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeader("Content-Security-Policy")).contains(
            "frame-ancestors 'self'"
        );
        if (chain.getRequest() == null) assertThat(response.getStatus()).isEqualTo(403);
        return chain.getRequest() != null;
    }

    @ParameterizedTest
    @ValueSource(
        strings = {
            "https://evil.example",
            "https://qpwflhsclub.com.evil.example",
            "https://qpwflhsclub.com@evil.example",
            "https://qpwflhsclub.com:444",
            "http://qpwflhsclub.com",
            "null",
            "https://qpwflhsclub.com/path",
            "https://qpwflhsclub.com#fragment",
            "https://qpwflhsclub.com?query",
        }
    )
    void forgedOriginsCannotReachMutations(String origin) throws Exception {
        var request = request("POST");
        request.addHeader("Origin", origin);
        request.addHeader("Sec-Fetch-Site", "same-origin");
        assertThat(accepted(request)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = { "POST", "PUT", "PATCH", "DELETE" })
    void sameOriginMutationsWorkAndMissingProvenanceFailsClosed(String method) throws Exception {
        var request = request(method);
        assertThat(accepted(request)).isFalse();
        request.addHeader("Origin", "https://qpwflhsclub.com");
        assertThat(accepted(request)).isTrue();
    }

    @Test
    void supportsSameOriginFetchAndLegacyReferer() throws Exception {
        var fetch = request("POST");
        fetch.addHeader("Sec-Fetch-Site", "same-origin");
        assertThat(accepted(fetch)).isTrue();
        var form = request("POST");
        form.addHeader("Referer", "https://qpwflhsclub.com/page/user/login?lang=zh");
        assertThat(accepted(form)).isTrue();
        form.addHeader("Sec-Fetch-Site", "same-site");
        assertThat(accepted(form)).isFalse();
    }

    @Test
    void doesNotTrustClientForwardedHeaders() throws Exception {
        var request = request("POST");
        request.addHeader("Origin", "https://evil.example");
        request.addHeader("X-Forwarded-Host", "evil.example");
        request.addHeader("X-Forwarded-Proto", "https");
        assertThat(accepted(request)).isFalse();
    }

    @Test
    void publicReadsWorkButCrossSiteLogoutAndTraceAreBlocked() throws Exception {
        var request = request("GET");
        request.addHeader("Sec-Fetch-Site", "cross-site");
        assertThat(accepted(request)).isTrue();
        request.setRequestURI("/api/user/logout");
        assertThat(accepted(request)).isFalse();
        request.setRequestURI("/api/user/%6cogout");
        request.setServletPath("/api/user/logout");
        assertThat(accepted(request)).isFalse();
        var trace = request("TRACE");
        trace.addHeader("Sec-Fetch-Site", "same-origin");
        assertThat(accepted(trace)).isFalse();
    }

    @Test
    void directLocalDevelopmentWorks() throws Exception {
        var request = request("POST");
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(8088);
        request.addHeader("Origin", "http://localhost:8088");
        assertThat(accepted(request)).isTrue();
    }
}
