package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.User.pojo.UserBase;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OfficerAssignments {

    public record Office(String account, int club, String position) {}

    private final Path file;
    private final ObjectMapper mapper;
    private List<Office> rows;

    public OfficerAssignments(
        ObjectMapper mapper,
        @Value("${club.accounts-dir:./data/accounts}") String root
    ) {
        this.mapper = mapper;
        file = Path.of(root).resolve("officer-assignments.json");
    }

    public synchronized List<Office> all() {
        try {
            if (rows == null) rows = Files.exists(file)
                ? List.copyOf(mapper.readValue(file.toFile(), new TypeReference<List<Office>>() {}))
                : List.of();
            return rows;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public List<Office> forAccount(String id) {
        return all()
            .stream()
            .filter(o -> o.account().equals(id))
            .toList();
    }

    public synchronized void assign(String account, int club, String position) throws IOException {
        if (
            !Set.of("president", "vice_president").contains(Objects.toString(position, ""))
        ) throw SchoolAccounts.error(400, "无效的社团职务");
        var next = new ArrayList<>(all());
        next.removeIf(o -> o.account().equals(account) && o.club() == club);
        next.add(new Office(account, club, position));
        persist(next);
    }

    public synchronized boolean remove(String account, int club) throws IOException {
        var next = new ArrayList<>(all());
        if (!next.removeIf(o -> o.account().equals(account) && o.club() == club)) return false;
        persist(next);
        return true;
    }

    private void persist(List<Office> next) throws IOException {
        Files.createDirectories(file.toAbsolutePath().getParent());
        Path tmp = Files.createTempFile(file.toAbsolutePath().getParent(), "officers-", ".tmp");
        try {
            mapper.writeValue(tmp.toFile(), next);
            Files.move(
                tmp,
                file,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
            rows = List.copyOf(next);
        } finally {
            Files.deleteIfExists(tmp);
        }
    }

    public static boolean named(UserBase p) {
        return named(p == null ? "" : p.getUsername(), p == null ? "" : p.getUsernameEn());
    }

    public static boolean named(String name, String nameEn) {
        String value = Objects.toString(name, "").strip();
        if (value.isBlank()) value = Objects.toString(nameEn, "").strip();
        return (
            !value.isBlank() &&
            !value.matches(".*(?:副社长|社长)\\s*\\d*") &&
            !value.matches("(?i).*(?:vice[ -]?)?president\\s*\\d*")
        );
    }

    public synchronized void removeAccount(String id) throws IOException {
        var next = new ArrayList<>(all());
        next.removeIf(v -> v.account().equals(id));
        persist(next);
    }
}
