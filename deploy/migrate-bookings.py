#!/usr/bin/env python3
"""Import an exported MRBS snapshot into the main MySQL schema, without editing the source.

Connection is supplied through BOOKING_MIGRATION_DB_{HOST,PORT,NAME,USER,PASSWORD}.
Requires PyMySQL. Default is validation only; --apply commits one transaction.
Input contains private booking data; keep it outside Git with permissions 0600.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path

import pymysql


def owner_key(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def prepare(snapshot):
    rooms = {int(r["id"]): r for r in snapshot["rooms"]}
    entries = {int(r["id"]): r for r in snapshot["entries"]}
    rows = []
    archive = []
    for table, records in [("mrbs_room", snapshot["rooms"]), ("mrbs_entry", snapshot["entries"]),
                           ("mrbs_repeat", snapshot["repeats"]), ("school_teacher_queue", snapshot["queue"])]:
        for record in records:
            email = str(record.get("email", record.get("create_by", ""))).strip().lower()
            archive.append((table, int(record["id"]), owner_key(email) if email else None, canonical(record)))
    for record in snapshot["entries"]:
        rows.append(reservation(record, "mrbs_entry", "confirmed", rooms))
    for record in snapshot["queue"]:
        status = record["status"]
        if status == "confirmed":
            entry = entries.get(int(record.get("entry_id") or 0))
            if not entry or entry["create_by"].strip().lower() != record["email"].strip().lower() or any(
                int(entry[k]) != int(record[k]) for k in ["room_id", "start_time", "end_time"]
            ):
                raise ValueError("A confirmed queue record has no matching reservation")
            continue  # The linked entry is already imported. Keep the queue payload in SQL archive.
        if status not in ("pending", "unavailable"):
            raise ValueError("Unknown legacy queue status")
        rows.append(reservation(record, "school_teacher_queue", status, rooms))
    occupied = sorted((r for r in rows if r[7] == "confirmed"), key=lambda r: (r[0], r[5], r[6]))
    latest = {}
    for row in occupied:
        if row[5] < latest.get(row[0], -1):
            raise ValueError("Legacy confirmed reservations overlap; resolve before cutover")
        latest[row[0]] = row[6]
    return rooms, rows, archive


def reservation(record, source, status, rooms):
    court = int(record["room_id"])
    start, end = int(record["start_time"]), int(record["end_time"])
    email = str(record.get("email", record.get("create_by", ""))).strip().lower()
    if court not in rooms or not email or start >= end:
        raise ValueError("Invalid legacy owner, court or time interval")
    # Historical slots outside today's trial periods are preserved without rewriting their times.
    return (court, owner_key(email), email, str(record.get("display_name", record.get("name", ""))),
            source, start, end, status, str(record.get("description", "")),
            int(record["confirm_after"]) if source == "school_teacher_queue" else None,
            int(record.get("created_micros", start * 1000000)), f"{source}:{record['id']}", 0, int(record["id"]))


def migrate(snapshot, connection, apply=False):
    rooms, rows, archive = prepare(snapshot)
    connection.begin()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM club_booking_policy WHERE id=1 FOR UPDATE")
            if not cursor.fetchone():
                raise ValueError("Apply database/migrations/20260912-booking.sql first")
            cursor.execute("SELECT COUNT(*) FROM club_booking_reservation WHERE legacy_source IS NULL")
            if cursor.fetchone()[0]:
                raise ValueError("Native bookings already exist; refusing a late import")
            for table, record_id, owner, payload in archive:
                cursor.execute("SELECT payload FROM club_booking_legacy WHERE source_table=%s AND source_id=%s", (table, record_id))
                previous = cursor.fetchone()
                if previous and canonical(json.loads(previous[0])) != payload:
                    raise ValueError("Source changed since prior import; refusing to overwrite")
                cursor.execute("INSERT IGNORE INTO club_booking_legacy(source_table,source_id,owner_key,payload) VALUES(%s,%s,%s,%s)", (table, record_id, owner, payload))
            for court_id, room in rooms.items():
                cursor.execute("INSERT IGNORE INTO club_booking_court(id,name,name_en,enabled) VALUES(%s,%s,%s,%s)",
                               (court_id, room["room_name"], "Third-floor badminton court" if len(rooms) == 1 else room["room_name"], not bool(room.get("disabled", False))))
            cursor.execute("SELECT id,name,enabled FROM club_booking_court ORDER BY id")
            expected_courts = sorted((court_id, room["room_name"], not bool(room.get("disabled", False))) for court_id, room in rooms.items())
            if list(cursor.fetchall()) != expected_courts:
                raise ValueError("Target court names or enabled flags differ from source")
            for row in rows:
                court, owner, email, name, source, start, end, status, note, deadline, created, request, revision, legacy_id = row
                cursor.execute("""INSERT IGNORE INTO club_booking_reservation
                    (court_id,owner_key,owner_email,display_name,start_time,end_time,status,note,confirm_after,
                     created_micros,request_key,policy_revision,legacy_source,legacy_id)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (court, owner, email, name, start, end, status, note, deadline, created, request, revision, source, legacy_id))
            cursor.execute("SELECT COUNT(*) FROM club_booking_reservation")
            if cursor.fetchone()[0] != len(rows):
                raise ValueError("Target reservation count differs from snapshot")
            cursor.execute("SELECT COUNT(*) FROM club_booking_legacy")
            if cursor.fetchone()[0] != len(archive):
                raise ValueError("Target archival count differs from snapshot")
            # Verify ownership, intervals, status and notes for every imported reservation.
            for row in rows:
                court, owner, email, name, source, start, end, status, note, deadline, created, request, revision, legacy_id = row
                cursor.execute("SELECT court_id,owner_key,owner_email,display_name,start_time,end_time,status,note,confirm_after,created_micros FROM club_booking_reservation WHERE legacy_source=%s AND legacy_id=%s", (source, legacy_id))
                if cursor.fetchone() != (court, owner, email, name, start, end, status, note, deadline, created):
                    raise ValueError("Imported reservation differs from source")
        if apply:
            connection.commit()
        else:
            connection.rollback()
        return {"applied": apply, "courts": len(rooms), "reservations": len(rows), "archivedRecords": len(archive),
                "confirmedQueueLinkedWithoutDuplication": sum(q["status"] == "confirmed" for q in snapshot["queue"])}
    except BaseException:
        connection.rollback()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text())
    prefix = "BOOKING_MIGRATION_DB_"
    connection = pymysql.connect(host=os.environ.get(prefix+"HOST", "127.0.0.1"), port=int(os.environ.get(prefix+"PORT", "3306")),
        user=os.environ[prefix+"USER"], password=os.environ[prefix+"PASSWORD"], database=os.environ[prefix+"NAME"], charset="utf8mb4")
    try:
        print(json.dumps(migrate(snapshot, connection, args.apply)))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
