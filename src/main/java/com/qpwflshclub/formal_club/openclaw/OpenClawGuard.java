package com.qpwflshclub.formal_club.openclaw;

import java.util.regex.Pattern;

/** Stops tool calls that could harm the server, another person, or a secret. */
final class OpenClawGuard {

    private static final Pattern COMMAND_NAME = Pattern.compile(
        "(?i)^(shell|bash|sh|exec|execute|eval|run_command|system_command|terminal)$"
    );

    private OpenClawGuard() {}

    static boolean unsafe(String name, String arguments) {
        String tool = name == null ? "" : name.strip();
        if (COMMAND_NAME.matcher(tool).matches()) return true;
        // Tool arguments are data, never shell input. Filtering words inside a
        // document, research query or code sample would reject harmless work.
        return false;
    }
}
