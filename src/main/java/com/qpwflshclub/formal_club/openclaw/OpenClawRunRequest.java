package com.qpwflshclub.formal_club.openclaw;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.lang.reflect.Proxy;
import java.util.*;

/** Immutable request identity for a server job; never retains a recycled servlet request. */
final class OpenClawRunRequest {

    static HttpServletRequest capture(HttpServletRequest request) {
        Map<String, Object> sessionValues = new HashMap<>();
        HttpSession original = request.getSession(false);
        if (original != null) for (String name : List.of("authenticatedEmail", "workspaceToken")) {
            Object value = original.getAttribute(name);
            if (value != null) sessionValues.put(name, value);
        }
        HttpSession session = (HttpSession) Proxy.newProxyInstance(
            HttpSession.class.getClassLoader(),
            new Class<?>[] { HttpSession.class },
            (proxy, method, args) ->
                switch (method.getName()) {
                    case "getAttribute" -> sessionValues.get((String) args[0]);
                    case "getAttributeNames" -> Collections.enumeration(sessionValues.keySet());
                    case "setAttribute" -> {
                        sessionValues.put((String) args[0], args[1]);
                        yield null;
                    }
                    case "removeAttribute" -> {
                        sessionValues.remove((String) args[0]);
                        yield null;
                    }
                    default -> throw new UnsupportedOperationException(
                        "Background session: " + method.getName()
                    );
                }
        );
        Map<String, String> headers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (String name : List.of("X-Workspace-Token", "Cookie")) {
            String value = request.getHeader(name);
            if (value != null) headers.put(name, value);
        }
        String language = request.getParameter("lang");
        return (HttpServletRequest) Proxy.newProxyInstance(
            HttpServletRequest.class.getClassLoader(),
            new Class<?>[] { HttpServletRequest.class },
            (proxy, method, args) ->
                switch (method.getName()) {
                    case "getSession" -> session;
                    case "getHeader" -> headers.get((String) args[0]);
                    case "getAttribute" -> "openclaw.background".equals(args[0])
                        ? Boolean.TRUE
                        : null;
                    case "getParameter" -> "lang".equals(args[0]) ? language : null;
                    case "getMethod" -> "POST";
                    case "getRequestURI" -> "/api/openclaw/runs";
                    case "toString" -> "Background Agent request";
                    default -> throw new UnsupportedOperationException(
                        "Background request: " + method.getName()
                    );
                }
        );
    }
}
