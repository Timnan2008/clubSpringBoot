package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Server-assigned badges cannot be changed through profile or appearance settings. */
@Service
public class LockedBadges {

    private final Path root;
    private final ObjectMapper json;

    public LockedBadges(
        ObjectMapper json,
        @Value("${club.locked-badges-dir:./data/accounts/locked-badges}") String dir
    ) {
        this.json = json;
        root = Path.of(dir).toAbsolutePath();
    }

    private Path file(String id) {
        if (!id.matches("[a-f0-9]{64}")) throw SchoolAccounts.error(404, "Account not found");
        return root.resolve(id + ".json");
    }

    public List<String> forAccount(String id) {
        Path file = file(id);
        if (!Files.isRegularFile(file)) return List.of();
        try {
            return json
                .readValue(Files.readAllBytes(file), new TypeReference<List<String>>() {})
                .stream()
                .filter("male-bestie"::equals)
                .distinct()
                .toList();
        } catch (IOException e) {
            throw new IllegalStateException("Cannot load assigned account badges", e);
        }
    }

    public void removeAccount(String id) throws IOException {
        Files.deleteIfExists(file(id));
    }
}
