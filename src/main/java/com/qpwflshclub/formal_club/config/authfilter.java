package com.qpwflshclub.formal_club.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.pojo.ResponseMessage;
import com.qpwflshclub.formal_club.pojo.User.UserBase;
import com.qpwflshclub.formal_club.service.User.IUserService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

@Component
@Order(1)
public class AuthFilter implements Filter {

    @Autowired
    private IUserService userService;

    private static final Set<String> PUBLIC_GET_PATHS = Set.of(
            "/api/club/all",
            "/api/club/search",
            "/api/suggestion/pass_only",
            "/api/user/logout"
    );

    private static final Set<String> PUBLIC_GET_PREFIXES = Set.of(
            "/api/club/id/",
            "/api/club/name-en/"
    );

    private static final Set<String> PUBLIC_POST_PATHS = Set.of(
            "/api/user/login",
            "/api/user/add/user",
            "/api/email/send",
            "/api/email/verify",
            "/api/suggestion"
    );

    private static final Set<String> PUBLIC_PUT_PREFIXES = Set.of(
            "/api/club/like/",
            "/api/club/dislike/"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        if (!path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        if (isPublicPath(path, method)) {
            chain.doFilter(request, response);
            return;
        }

        String email = extractEmailFromCookie(httpRequest);
        if (email == null || email.isBlank()) {
            writeUnauthorizedResponse(httpResponse, "未登录或会话已过期");
            return;
        }

        UserBase user = userService.findByEmail(email);
        if (user == null) {
            writeUnauthorizedResponse(httpResponse, "用户不存在或会话无效");
            return;
        }

        httpRequest.setAttribute("currentUser", user);
        chain.doFilter(request, response);
    }

    private boolean isPublicPath(String path, String method) {
        if ("GET".equals(method)) {
            if (PUBLIC_GET_PATHS.contains(path)) return true;
            for (String prefix : PUBLIC_GET_PREFIXES) {
                if (path.startsWith(prefix)) return true;
            }
            if (path.startsWith("/api/suggestion/") && !path.equals("/api/suggestion/all")) {
                return true;
            }
        }
        if ("POST".equals(method)) {
            return PUBLIC_POST_PATHS.contains(path);
        }
        if ("PUT".equals(method)) {
            for (String prefix : PUBLIC_PUT_PREFIXES) {
                if (path.startsWith(prefix)) return true;
            }
        }
        return false;
    }

    private String extractEmailFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if ("user_session".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void writeUnauthorizedResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        ResponseMessage<?> rm = new ResponseMessage<>(401, message, null);
        response.getWriter().write(new ObjectMapper().writeValueAsString(rm));
    }
}
