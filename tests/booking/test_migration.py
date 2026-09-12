"""Real MySQL tests for dry runs, repeat imports, rollback and source reconciliation."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import unittest

import pymysql

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("migrate_bookings", ROOT / "deploy/migrate-bookings.py")
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


@unittest.skipUnless(os.environ.get("BOOKING_MIGRATION_TEST_DB"), "Set an isolated MySQL test database")
class MigrationTest(unittest.TestCase):
    def setUp(self):
        database = os.environ["BOOKING_MIGRATION_TEST_DB"]
        self.assertTrue(database.endswith("_test"))
        self.db = pymysql.connect(host="127.0.0.1", port=int(os.environ.get("BOOKING_TEST_PORT", "13306")),
            user=os.environ["BOOKING_TEST_USER"], password=os.environ["BOOKING_TEST_PASSWORD"], database=database, autocommit=True)
        sql = "\n".join(line for line in (ROOT / "database/migrations/20260912-booking.sql").read_text().splitlines() if not line.lstrip().startswith("--"))
        with self.db.cursor() as cursor:
            for statement in sql.split(";"):
                if statement.strip(): cursor.execute(statement)
            cursor.execute("DELETE FROM club_booking_reservation")
            cursor.execute("DELETE FROM club_booking_legacy")
            cursor.execute("DELETE FROM club_booking_court")
        self.snapshot = {"rooms": [{"id": 1, "room_name": "三楼羽毛球场", "disabled": 0}], "entries": [
            {"id": 10, "room_id": 1, "create_by": "Owner@Example.invalid", "name": "Owner", "description": "原始备注 · original note", "start_time": 1800000000, "end_time": 1800001200, "created_micros": 1700000000000000}],
            "queue": [{"id": 4, "email": "owner@example.invalid", "display_name": "Owner", "room_id": 1, "start_time": 1800000000, "end_time": 1800001200, "confirm_after": 1799990000, "status": "confirmed", "entry_id": 10, "created_micros": 1700000000000000}], "repeats": []}

    def tearDown(self):
        self.db.close()

    def count(self, table):
        with self.db.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            return cursor.fetchone()[0]

    def test_dry_run_and_repeated_import_do_not_duplicate_linked_queue_entries(self):
        result = migration.migrate(self.snapshot, self.db)
        self.assertFalse(result["applied"])
        self.assertEqual(self.count("club_booking_reservation"), 0)
        for _ in range(2):
            result = migration.migrate(self.snapshot, self.db, True)
            self.assertEqual(result["reservations"], 1)
            self.assertEqual(result["confirmedQueueLinkedWithoutDuplication"], 1)
        self.assertEqual(self.count("club_booking_legacy"), 3)

    def test_source_changes_cannot_silently_overwrite_an_import(self):
        migration.migrate(self.snapshot, self.db, True)
        changed = copy.deepcopy(self.snapshot)
        changed["entries"][0]["description"] = "changed"
        with self.assertRaisesRegex(ValueError, "Source changed"):
            migration.migrate(changed, self.db, True)
        with self.db.cursor() as cursor:
            cursor.execute("SELECT note FROM club_booking_reservation")
            self.assertEqual(cursor.fetchone()[0], "原始备注 · original note")

    def test_broken_confirmed_queue_link_aborts_before_any_insert(self):
        self.snapshot["queue"][0]["entry_id"] = 99
        with self.assertRaisesRegex(ValueError, "matching reservation"):
            migration.migrate(self.snapshot, self.db, True)
        self.assertEqual(self.count("club_booking_legacy"), 0)

    def test_overlapping_legacy_bookings_require_resolution(self):
        duplicate = dict(self.snapshot["entries"][0], id=11)
        self.snapshot["entries"].append(duplicate)
        with self.assertRaisesRegex(ValueError, "overlap"):
            migration.migrate(self.snapshot, self.db, True)
        self.assertEqual(self.count("club_booking_reservation"), 0)

    def test_pending_requests_and_all_original_fields_remain_in_sql(self):
        pending = dict(self.snapshot["queue"][0], id=5, email="teacher@example.invalid", status="pending", entry_id=None)
        self.snapshot["queue"].append(pending)
        migration.migrate(self.snapshot, self.db, True)
        with self.db.cursor() as cursor:
            cursor.execute("SELECT status FROM club_booking_reservation ORDER BY id")
            self.assertEqual(cursor.fetchall(), (("confirmed",), ("pending",)))
            cursor.execute("SELECT payload FROM club_booking_legacy WHERE source_table='mrbs_entry'")
            self.assertEqual(json.loads(cursor.fetchone()[0]), self.snapshot["entries"][0])


if __name__ == "__main__":
    unittest.main()
