package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qpwflshclub.formal_club.social.repository.ChatArchiveRepository;
import com.qpwflshclub.formal_club.social.repository.ChatArchiveRow;
import com.qpwflshclub.formal_club.social.service.SocialStore;
import java.io.IOException;
import java.nio.file.*;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Instant;
import java.util.*;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;

/**
 * 私信归档：社交 JSON 仍只留端到端密文；这里用托管密钥解开后再用本机 archive.key
 * 做 AES-256-CBC 加密，写入 MySQL {@code chat_archive}。网页和 HTTP 都不返回正文。
 * 查阅只走 SSH 登录后查库（见 {@code deploy/read-chat-archive.py}）。撤回只打标。
 */
@Service
public class ChatArchive implements ApplicationRunner {

    public record Entry(
        String id,
        String sender,
        String recipient,
        String createdAt,
        String text,
        boolean readable,
        boolean recalled,
        String archivedAt
    ) {}

    private static final String DDL = """
    CREATE TABLE IF NOT EXISTS chat_archive (
      id VARCHAR(80) NOT NULL,
      sender VARCHAR(64) NOT NULL,
      recipient VARCHAR(64) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      readable TINYINT(1) NOT NULL,
      recalled TINYINT(1) NOT NULL,
      archived_at VARCHAR(64) NOT NULL,
      iv VARCHAR(32) NOT NULL,
      body TEXT NOT NULL,
      PRIMARY KEY (id),
      KEY idx_chat_archive_created (created_at),
      KEY idx_chat_archive_sender (sender),
      KEY idx_chat_archive_recipient (recipient)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """;

    private final Path legacyFile;
    private final ObjectMapper json;
    private final SocialStore store;
    private final ChatPlaintext plaintext;
    private final ChatArchiveSeal seal;
    private final Rows rows;
    private final DataSource dataSource;

    public ChatArchive(SocialStore store, ChatPlaintext plaintext, String dir) {
        this(store, plaintext, null, null, dir);
    }

    @Autowired
    public ChatArchive(
        SocialStore store,
        ChatPlaintext plaintext,
        @Autowired(required = false) ChatArchiveRepository repository,
        @Autowired(required = false) DataSource dataSource,
        @org.springframework.beans.factory.annotation.Value(
            "${club.social-dir:./data/campus-social}"
        ) String dir
    ) {
        this.store = store;
        this.plaintext = plaintext;
        this.dataSource = dataSource;
        json = new ObjectMapper();
        Path root = Path.of(dir).toAbsolutePath().normalize();
        legacyFile = root.resolve("chat-archive.json");
        seal = new ChatArchiveSeal(root);
        rows = repository == null ? new MemoryRows() : new JpaRows(repository);
    }

    public Path keyFile() {
        return seal.file();
    }

    public Path legacyFile() {
        return legacyFile;
    }

    public String ciphertext(String id) {
        ChatArchiveRow row = rows.get(id);
        return row == null ? "" : Objects.toString(row.body, "");
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            ensureTable();
            migrateLegacyFile();
            catchUp();
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "Chat archive catch-up skipped: {}",
                e.toString()
            );
        }
    }

    public synchronized List<Entry> all() throws IOException {
        List<Entry> out = new ArrayList<>();
        for (ChatArchiveRow row : rows.values()) out.add(toEntry(row));
        return List.copyOf(out);
    }

    public synchronized Entry capture(SocialStore.Message message, String candidate)
        throws IOException {
        if (message == null) return null;
        String text = Objects.toString(candidate, "");
        if (ChatPlaintext.isEncrypted(text) && plaintext != null) {
            String decrypted = plaintext.decrypt(message.sender(), message.recipient(), text);
            if (decrypted != null) text = decrypted;
        }
        boolean readable = !text.isBlank() && !ChatPlaintext.isEncrypted(text);
        if (!readable && ChatPlaintext.isEncrypted(message.text()) && plaintext != null) {
            String decrypted = plaintext.decrypt(
                message.sender(),
                message.recipient(),
                message.text()
            );
            if (decrypted != null) {
                text = decrypted;
                readable = true;
            }
        }
        if (!readable && !ChatPlaintext.isEncrypted(message.text()) && !message.text().isBlank()) {
            text = message.text();
            readable = true;
        }
        ChatArchiveRow previous = rows.get(message.id());
        String previousText = previous != null && previous.readable ? open(previous) : "";
        if (previous != null && previous.readable && !readable) {
            text = previousText;
            readable = true;
        }
        boolean recalled = message.recalled() || (previous != null && previous.recalled);
        if (
            previous != null &&
            previous.readable == readable &&
            previousText.equals(readable ? text : "") &&
            previous.recalled == recalled
        ) return toEntry(previous);
        ChatArchiveRow next = new ChatArchiveRow();
        next.id = message.id();
        next.sender = message.sender();
        next.recipient = message.recipient();
        next.createdAt = message.createdAt();
        next.readable = readable;
        next.recalled = recalled;
        next.archivedAt = previous == null ? Instant.now().toString() : previous.archivedAt;
        if (readable) {
            if (previous != null && previous.readable && previousText.equals(text)) {
                next.iv = previous.iv;
                next.body = previous.body;
            } else {
                ChatArchiveSeal.Envelope sealed = seal.wrap(text);
                next.iv = sealed.iv();
                next.body = sealed.body();
            }
        } else {
            next.iv = "";
            next.body = "";
        }
        rows.put(next);
        return toEntry(next);
    }

    public synchronized void markRecalled(String id) throws IOException {
        ChatArchiveRow previous = rows.get(id);
        if (previous == null || previous.recalled) return;
        previous.recalled = true;
        rows.put(previous);
    }

    public synchronized int catchUp() throws IOException {
        if (store == null || plaintext == null) return 0;
        int added = 0;
        for (SocialStore.Message message : store.snapshot().messages()) {
            ChatArchiveRow existing = rows.get(message.id());
            if (existing != null) {
                if (message.recalled() && !existing.recalled) markRecalled(message.id());
                if (existing.readable) continue;
            }
            capture(message, message.text());
            added++;
        }
        return added;
    }

    public synchronized int migrateLegacyFile() throws IOException {
        if (!Files.exists(legacyFile)) return 0;
        List<Entry> legacy = json.readValue(
            Files.readAllBytes(legacyFile),
            new TypeReference<ArrayList<Entry>>() {}
        );
        int moved = 0;
        for (Entry entry : legacy) {
            if (entry == null || entry.id() == null || entry.id().isBlank()) continue;
            if (rows.get(entry.id()) != null) continue;
            ChatArchiveRow row = new ChatArchiveRow();
            row.id = entry.id();
            row.sender = Objects.toString(entry.sender(), "");
            row.recipient = Objects.toString(entry.recipient(), "");
            row.createdAt = Objects.toString(entry.createdAt(), "");
            row.readable = entry.readable() && !Objects.toString(entry.text(), "").isBlank();
            row.recalled = entry.recalled();
            row.archivedAt = Objects.toString(entry.archivedAt(), Instant.now().toString());
            if (row.readable) {
                ChatArchiveSeal.Envelope sealed = seal.wrap(entry.text());
                row.iv = sealed.iv();
                row.body = sealed.body();
            } else {
                row.iv = "";
                row.body = "";
            }
            rows.put(row);
            moved++;
        }
        shred(legacyFile);
        return moved;
    }

    private void ensureTable() {
        if (dataSource == null) return;
        try (
            Connection connection = dataSource.getConnection();
            Statement statement = connection.createStatement()
        ) {
            statement.execute(DDL);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn(
                "Chat archive table missing: {}",
                e.toString()
            );
        }
    }

    private Entry toEntry(ChatArchiveRow row) throws IOException {
        return new Entry(
            row.id,
            row.sender,
            row.recipient,
            row.createdAt,
            open(row),
            row.readable,
            row.recalled,
            row.archivedAt
        );
    }

    private String open(ChatArchiveRow row) throws IOException {
        if (row == null || !row.readable) return "";
        return seal.unwrap(row.iv, row.body);
    }

    private static void shred(Path file) throws IOException {
        if (!Files.exists(file)) return;
        long size = Files.size(file);
        if (size > 0 && size < 8_000_000) {
            Files.write(file, new byte[(int) size]);
        }
        Files.deleteIfExists(file);
    }

    private interface Rows {
        ChatArchiveRow get(String id);
        void put(ChatArchiveRow row);
        Collection<ChatArchiveRow> values();
    }

    private static ChatArchiveRow copy(ChatArchiveRow row) {
        ChatArchiveRow copy = new ChatArchiveRow();
        copy.id = row.id;
        copy.sender = row.sender;
        copy.recipient = row.recipient;
        copy.createdAt = row.createdAt;
        copy.readable = row.readable;
        copy.recalled = row.recalled;
        copy.archivedAt = row.archivedAt;
        copy.iv = row.iv;
        copy.body = row.body;
        return copy;
    }

    private static final class MemoryRows implements Rows {

        private final Map<String, ChatArchiveRow> map = new LinkedHashMap<>();

        @Override
        public ChatArchiveRow get(String id) {
            ChatArchiveRow row = map.get(id);
            return row == null ? null : copy(row);
        }

        @Override
        public void put(ChatArchiveRow row) {
            map.put(row.id, copy(row));
        }

        @Override
        public Collection<ChatArchiveRow> values() {
            List<ChatArchiveRow> out = new ArrayList<>();
            for (ChatArchiveRow row : map.values()) out.add(copy(row));
            return out;
        }
    }

    private static final class JpaRows implements Rows {

        private final ChatArchiveRepository repository;

        JpaRows(ChatArchiveRepository repository) {
            this.repository = repository;
        }

        @Override
        public ChatArchiveRow get(String id) {
            return repository.findById(id).orElse(null);
        }

        @Override
        public void put(ChatArchiveRow row) {
            repository.save(row);
        }

        @Override
        public Collection<ChatArchiveRow> values() {
            List<ChatArchiveRow> out = new ArrayList<>();
            repository.findAll().forEach(out::add);
            return out;
        }
    }
}
