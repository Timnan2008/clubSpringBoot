#!/usr/bin/env python3
"""Run on the production host after staging the JAR, SQL, export/import tools and PyMySQL.
Requires root to switch nginx/systemd. Keeps the old database and a rollback backup.
All booking writes are gated until the main database has been imported and checked.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request

import pymysql


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def read_environment(path):
    values = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        try: value = json.loads(value)
        except json.JSONDecodeError: value = value.strip("'\"")
        values[key] = str(value)
    return values


def ready():
    for _ in range(100):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8088/api/club/all", timeout=2) as response:
                body = json.load(response)
            if body.get("code") == 200 and len(body.get("data", [])) >= 43:
                return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("Main application readiness timed out")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", type=Path)
    parser.add_argument("--expected-sha", required=True)
    parser.add_argument("--database", default="club_demo")
    parser.add_argument("--legacy-web", default="qpsw_mrbs_web_1")
    parser.add_argument("--legacy-db", default="qpsw_mrbs_db_1")
    args = parser.parse_args()
    os.umask(0o077)
    app = Path("/opt/club-app")
    jar = app / "formal_club3.0.jar"
    env_file = app / "club-app.env"
    nginx = Path("/etc/nginx/sites-enabled/club-app").resolve()
    old_nginx = nginx.read_text()
    old_env = env_file.read_text()
    sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
    if sha(jar) != args.expected_sha:
        raise RuntimeError("Production JAR changed; re-inventory before retrying")
    run("systemctl", "is-active", "--quiet", "club-app", "nginx")
    prefix = "    location ^~ /booking/ {"
    if old_nginx.count(prefix) != 1 or "proxy_pass http://127.0.0.1:8765/;" not in old_nginx:
        raise RuntimeError("Unexpected nginx booking configuration")
    gates = "    location ^~ /api/booking { return 503; }\n    location = /page/booking { return 503; }\n    location = /api/campus-social/me/account { return 503; }\n"
    final_nginx = re.sub(r"    location \^~ /booking/ \{.*?\n    \}",
        "    location ^~ /booking/ {\n        if ($request_method !~ ^(GET|HEAD)$) { return 409; }\n        return 302 /page/booking;\n    }", old_nginx, count=1, flags=re.S)
    config = read_environment(env_file)
    database_env = dict(os.environ, MYSQL_PWD=config["SPRING_DATASOURCE_PASSWORD"])
    connection = pymysql.connect(host="127.0.0.1", user=config["SPRING_DATASOURCE_USERNAME"],
        password=config["SPRING_DATASOURCE_PASSWORD"], database=args.database, charset="utf8mb4", autocommit=True)
    backup = app / "backups" / args.stage.name
    backup.mkdir(mode=0o700)
    shutil.copy2(jar, backup / "previous.jar")
    shutil.copy2(env_file, backup / "club-app.env")
    shutil.copy2(nginx, backup / "nginx.conf")
    timer_enabled = subprocess.run(["systemctl", "is-enabled", "--quiet", "club-teacher-queue.timer"]).returncode == 0
    timer_active = subprocess.run(["systemctl", "is-active", "--quiet", "club-teacher-queue.timer"]).returncode == 0
    with (backup / "main-before.sql").open("wb") as output:
        run("mysqldump", "--single-transaction", "--no-tablespaces", "-h127.0.0.1", "-u"+config["SPRING_DATASOURCE_USERNAME"], args.database, env=database_env, stdout=output)
    shutil.make_archive(str(backup / "private-data"), "gztar", app / "data")
    opened = False
    try:
        nginx.write_text(old_nginx.replace(prefix, gates+prefix))
        run("nginx", "-t");run("systemctl", "reload", "nginx")
        run("systemctl", "stop", "club-teacher-queue.timer", "club-teacher-queue.service")
        run("docker", "stop", args.legacy_web, stdout=subprocess.DEVNULL)
        print("Booking writes frozen; exporting the final legacy snapshot", flush=True)
        shell = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --single-transaction --no-tablespaces -uroot "$MYSQL_DATABASE"'
        with (backup / "legacy-before.sql").open("wb") as output:
            run("docker", "exec", args.legacy_db, "sh", "-c", shell, stdout=output)
        snapshot = module("booking_export", args.stage / "export-bookings.py").export(args.legacy_db)
        (backup / "legacy-snapshot.json").write_text(json.dumps(snapshot, ensure_ascii=False))
        statements = "\n".join(line for line in (args.stage / "20260912-booking.sql").read_text().splitlines() if not line.lstrip().startswith("--"))
        with connection.cursor() as cursor:
            for statement in statements.split(";"):
                if statement.strip(): cursor.execute(statement)
        migration = module("booking_migration", args.stage / "migrate-bookings.py")
        migration.migrate(snapshot, connection, False)
        result = migration.migrate(snapshot, connection, True)
        (backup / "migration-result.json").write_text(json.dumps(result, indent=2))
        print(json.dumps(result), flush=True)
        updated = re.sub(r"^CLUB_BOOKING_BACKEND=.*\n?", "", old_env, flags=re.M)
        env_file.write_text(updated.rstrip()+"\nCLUB_BOOKING_BACKEND=\"main\"\n")
        staged_jar = args.stage / "app.jar"
        new_sha = sha(staged_jar)
        shutil.copy2(staged_jar, app / "booking-next.jar")
        os.replace(app / "booking-next.jar", jar)
        os.chmod(jar, 0o644)
        run("systemctl", "restart", "club-app")
        print("Main application restarted; waiting for readiness", flush=True)
        ready()
        # No visitor can create native bookings before this final count verification.
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM club_booking_reservation")
            if cursor.fetchone()[0] != result["reservations"]:
                raise RuntimeError("Reservation count changed before opening booking writes")
            cursor.execute("SELECT COUNT(*) FROM club_booking_legacy")
            if cursor.fetchone()[0] != result["archivedRecords"]:
                raise RuntimeError("Legacy archive count changed")
        if sha(jar) != new_sha:
            raise RuntimeError("Deployed JAR checksum mismatch")
        run("systemctl", "disable", "club-teacher-queue.timer", stdout=subprocess.DEVNULL)
        nginx.write_text(final_nginx)
        run("nginx", "-t");run("systemctl", "reload", "nginx")
        opened = True
        receipt = dict(result, release=args.stage.name, sha256=new_sha, backup=str(backup),
            legacyWritesStopped=True, backend="Spring Boot", database=args.database, publicBookingOpened=True)
        (backup / "cutover-result.json").write_text(json.dumps(receipt, indent=2))
        print(json.dumps(receipt), flush=True)
    except BaseException:
        if not opened:
            print("Cutover failed before opening writes; restoring the old service", flush=True)
            shutil.copy2(backup / "previous.jar", jar)
            env_file.write_text(old_env)
            run("systemctl", "restart", "club-app")
            ready()
            run("docker", "start", args.legacy_web, stdout=subprocess.DEVNULL)
            if timer_enabled: run("systemctl", "enable", "club-teacher-queue.timer", stdout=subprocess.DEVNULL)
            if timer_active: run("systemctl", "start", "club-teacher-queue.timer")
            nginx.write_text(old_nginx)
            run("nginx", "-t");run("systemctl", "reload", "nginx")
        # Once opened, automatic rollback could lose new reservations; leave main storage active.
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
