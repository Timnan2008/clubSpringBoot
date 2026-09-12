package com.qpwflshclub.formal_club.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "club.booking.backend", havingValue = "main")
public class BookingRepository {

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public BookingRepository(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public record Policy(int revision, BookingPolicy settings) {}

    public record Court(int id, String name, String nameEn, boolean enabled) {}

    public record Reservation(
        long id,
        int courtId,
        String ownerKey,
        String ownerEmail,
        String displayName,
        long start,
        long end,
        String status,
        String note,
        Long confirmAfter,
        long createdMicros,
        String requestKey,
        int policyRevision
    ) {}

    private static final RowMapper<Reservation> RESERVATION = (r, n) ->
        new Reservation(
            r.getLong("id"),
            r.getInt("court_id"),
            r.getString("owner_key"),
            r.getString("owner_email"),
            r.getString("display_name"),
            r.getLong("start_time"),
            r.getLong("end_time"),
            r.getString("status"),
            r.getString("note"),
            (Long) r.getObject("confirm_after"),
            r.getLong("created_micros"),
            r.getString("request_key"),
            r.getInt("policy_revision")
        );

    /** All writers lock this row first, including the worker and account cleanup.
     * This serializes overlap and per-account quota checks across every court and app instance. */
    public Policy policy(boolean lock) {
        return jdbc.queryForObject(
            "SELECT revision, settings FROM club_booking_policy WHERE id=1" +
                (lock ? " FOR UPDATE" : ""),
            (r, n) -> {
                try {
                    return new Policy(
                        r.getInt(1),
                        json.readValue(r.getString(2), BookingPolicy.class)
                    );
                } catch (Exception e) {
                    throw new IllegalStateException("Cannot read booking policy", e);
                }
            }
        );
    }

    public List<Court> courts() {
        return jdbc.query(
            "SELECT id,name,name_en,enabled FROM club_booking_court ORDER BY id",
            (r, n) -> new Court(r.getInt(1), r.getString(2), r.getString(3), r.getBoolean(4))
        );
    }

    public Optional<Reservation> request(String owner, String key) {
        return jdbc
            .query(
                "SELECT * FROM club_booking_reservation WHERE owner_key=? AND request_key=?",
                RESERVATION,
                owner,
                key
            )
            .stream()
            .findFirst();
    }

    public List<Reservation> week(long start, long end) {
        return jdbc.query(
            "SELECT * FROM club_booking_reservation WHERE start_time < ? AND end_time > ? AND status IN ('confirmed','pending') ORDER BY start_time,id",
            RESERVATION,
            end,
            start
        );
    }

    public List<Reservation> mine(String owner) {
        return jdbc.query(
            "SELECT * FROM club_booking_reservation WHERE owner_key=? ORDER BY start_time DESC,id DESC",
            RESERVATION,
            owner
        );
    }

    public List<Reservation> pending(long now) {
        return jdbc.query(
            "SELECT * FROM club_booking_reservation WHERE status='pending' AND confirm_after<=? ORDER BY created_micros,id",
            RESERVATION,
            now
        );
    }

    public int used(String owner, long start, long end) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM club_booking_reservation WHERE owner_key=? AND status IN ('confirmed','pending') AND start_time>=? AND start_time<?",
            Integer.class,
            owner,
            start,
            end
        );
    }

    public boolean occupied(int court, long start, long end) {
        return (
            jdbc.queryForObject(
                "SELECT COUNT(*) FROM club_booking_reservation WHERE court_id=? AND status='confirmed' AND start_time < ? AND end_time > ?",
                Integer.class,
                court,
                end,
                start
            ) > 0
        );
    }

    public Reservation insert(
        int court,
        String owner,
        String email,
        String name,
        long start,
        long end,
        String status,
        String note,
        Long deadline,
        long createdMicros,
        String requestKey,
        int revision
    ) {
        jdbc.update(
            """
            INSERT INTO club_booking_reservation(court_id,owner_key,owner_email,display_name,start_time,end_time,
              status,note,confirm_after,created_micros,request_key,policy_revision)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            court,
            owner,
            email,
            name,
            start,
            end,
            status,
            note,
            deadline,
            createdMicros,
            requestKey,
            revision
        );
        return request(owner, requestKey).orElseThrow();
    }

    public void status(long id, String status) {
        jdbc.update("UPDATE club_booking_reservation SET status=? WHERE id=?", status, id);
    }

    public void deleteAccount(String owner) {
        jdbc.update("DELETE FROM club_booking_reservation WHERE owner_key=?", owner);
        jdbc.update("DELETE FROM club_booking_legacy WHERE owner_key=?", owner);
    }
}
