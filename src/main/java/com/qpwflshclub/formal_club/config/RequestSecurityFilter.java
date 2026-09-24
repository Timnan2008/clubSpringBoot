package com.qpwflshclub.formal_club.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.net.URI;
import java.util.Set;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Browser request provenance is checked before restoring a session or parsing an upload.
 * Existing workspace/booking mutation tokens remain an additional requirement.
 */
@Component
@Order(-10)
public class RequestSecurityFilter implements Filter {

    private static final Set<String> SAFE = Set.of("GET", "HEAD", "OPTIONS");

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
        throws IOException, ServletException {
        var request = (HttpServletRequest) req;
        var response = (HttpServletResponse) res;
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "SAMEORIGIN");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader(
            "Content-Security-Policy",
            "frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
        );
        // Logout is a legacy GET action and must also be protected from cross-site navigation.
        boolean mutation =
            !SAFE.contains(request.getMethod()) ||
            request.getRequestURI().equals("/api/user/logout") ||
            request.getServletPath().equals("/api/user/logout");
        if (request.getMethod().equals("TRACE") || (mutation && !sameOrigin(request))) {
            response.setStatus(403);
            response.setHeader("Cache-Control", "no-store");
            response.setContentType("application/json;charset=UTF-8");
            response
                .getWriter()
                .write(
                    "{\"code\":403,\"message\":\"请求来源无效，请刷新页面后重试 / Invalid request origin\",\"data\":null}"
                );
            return;
        }
        chain.doFilter(req, res);
    }

    private boolean sameOrigin(HttpServletRequest request) {
        String site = request.getHeader("Sec-Fetch-Site");
        if ("cross-site".equals(site) || "same-site".equals(site)) return false;
        String origin = request.getHeader("Origin");
        if (origin != null) return matches(origin, request, true);
        String referer = request.getHeader("Referer");
        if (referer != null) return matches(referer, request, false);
        // Modern same-origin fetch can omit Origin. Missing all provenance fails closed.
        return "same-origin".equals(site);
    }

    private boolean matches(String raw, HttpServletRequest request, boolean originOnly) {
        try {
            URI source = URI.create(raw);
            if (
                source.getHost() == null ||
                source.getUserInfo() != null ||
                source.getFragment() != null
            ) return false;
            if (
                originOnly &&
                (source.getQuery() != null ||
                    (source.getRawPath() != null && !source.getRawPath().isEmpty()))
            ) return false;
            String scheme = source.getScheme();
            if (!"https".equals(scheme) && !"http".equals(scheme)) return false;
            int port =
                source.getPort() < 0 ? ("https".equals(scheme) ? 443 : 80) : source.getPort();
            // Proxy forwarding is handled by Tomcat, restricted to the local trusted proxy.
            // Never accept arbitrary client X-Forwarded-Host / X-Forwarded-Proto here.
            return (
                scheme.equals(request.getScheme()) &&
                source.getHost().equalsIgnoreCase(request.getServerName()) &&
                port == request.getServerPort()
            );
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
