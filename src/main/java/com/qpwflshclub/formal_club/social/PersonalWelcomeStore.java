package com.qpwflshclub.formal_club.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PersonalWelcomeStore {

    public record Welcome(String id, String title, String message, String imageAlt) {}

    private final Path root;
    private final ObjectMapper json;

    public PersonalWelcomeStore(
        ObjectMapper json,
        @Value("${club.personal-welcome-dir:./data/accounts/welcome}") String dir
    ) {
        this.json = json;
        this.root = Path.of(dir).toAbsolutePath();
    }

    private Path folder(String account) {
        if (!account.matches("[a-f0-9]{64}")) throw SchoolAccounts.error(404, "Welcome not found");
        return root.resolve(account);
    }

    public Welcome find(String account) throws IOException {
        Path file = folder(account).resolve("welcome.json");
        if (!Files.isRegularFile(file)) return null;
        var value = json.readValue(Files.readAllBytes(file), Welcome.class);
        if (
            value.id() == null ||
            !value.id().matches("[A-Za-z0-9_-]{1,64}") ||
            value.title() == null ||
            value.title().length() > 120 ||
            value.message() == null ||
            value.message().length() > 500
        ) throw new IOException("Invalid personal welcome configuration");
        return value;
    }

    public boolean seen(String account, String welcome) {
        return Files.exists(folder(account).resolve("seen-" + welcome));
    }

    public synchronized boolean claim(String account, Welcome welcome) throws IOException {
        Path marker = folder(account).resolve("seen-" + welcome.id());
        try {
            Files.writeString(marker, "seen", StandardOpenOption.CREATE_NEW);
            return true;
        } catch (FileAlreadyExistsException alreadySeen) {
            return false;
        }
    }

    public byte[] image(String account) throws IOException {
        Path file = folder(account).resolve("image.jpg");
        if (find(account) == null || !Files.isRegularFile(file)) throw SchoolAccounts.error(
            404,
            "Welcome image not found"
        );
        return Files.readAllBytes(file);
    }

    public void removeAccount(String account) throws IOException {
        Path dir = folder(account);
        if (Files.isDirectory(dir)) try (var files = Files.list(dir)) {
            for (Path file : files
                .filter(p -> p.getFileName().toString().startsWith("seen-"))
                .toList())
                Files.deleteIfExists(file);
        }
        Files.deleteIfExists(dir.resolve("welcome.json"));
        Files.deleteIfExists(dir.resolve("image.jpg"));
        Files.deleteIfExists(dir);
    }
}
