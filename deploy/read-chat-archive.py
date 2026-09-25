#!/usr/bin/env python3
"""Read encrypted private-message backups. Run only over SSH on the app host.

The website never serves these rows. MySQL stores AES-256-CBC hex; this script
loads /opt/club-app/data/campus-social/recovery/archive.key and decrypts locally.

Examples (on the server):
  python3 /opt/club-app/read-chat-archive.py
  python3 /opt/club-app/read-chat-archive.py --account 3c177b45
  python3 /opt/club-app/read-chat-archive.py --q 关键词
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

DEFAULT_ENV = "/opt/club-app/club-app.env"
DEFAULT_KEY = "/opt/club-app/data/campus-social/recovery/archive.key"


def read_env(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def jdbc_parts(url: str) -> tuple[str, int, str]:
    host, port, database = "127.0.0.1", 3306, "club_demo"
    if url.startswith("jdbc:mysql://"):
        body = url[len("jdbc:mysql://") :].split("?", 1)[0]
        if "/" in body:
            hostport, database = body.split("/", 1)
            if ":" in hostport:
                host, port_s = hostport.split(":", 1)
                port = int(port_s)
            else:
                host = hostport
    return host, port, database


def decrypt(key_hex: str, iv_hex: str, body_hex: str) -> str:
    if not iv_hex or not body_hex:
        return ""
    result = subprocess.run(
        [
            "openssl",
            "enc",
            "-d",
            "-aes-256-cbc",
            "-K",
            key_hex,
            "-iv",
            iv_hex,
        ],
        input=bytes.fromhex(body_hex),
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(description="Decrypt chat_archive rows on this host.")
    parser.add_argument("--env", default=DEFAULT_ENV)
    parser.add_argument("--key", default=DEFAULT_KEY)
    parser.add_argument("--account", default="", help="Match sender or recipient hash prefix")
    parser.add_argument("--q", default="", help="Search decrypted text (server-side after decrypt)")
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()

    key_path = Path(args.key)
    if not key_path.is_file():
        print("missing archive.key", file=sys.stderr)
        return 1
    key_hex = key_path.read_bytes().hex()
    if len(key_hex) != 64:
        print("archive.key must be 32 bytes", file=sys.stderr)
        return 1

    env = read_env(args.env)
    host, port, database = jdbc_parts(env.get("SPRING_DATASOURCE_URL", ""))
    user = env.get("SPRING_DATASOURCE_USERNAME", "club_app")
    password = env.get("SPRING_DATASOURCE_PASSWORD") or env.get("DB_PASSWORD") or ""
    sql = (
        "SELECT id, sender, recipient, created_at, readable, recalled, iv, body "
        "FROM chat_archive ORDER BY created_at DESC"
    )
    child_env = os.environ.copy()
    child_env["MYSQL_PWD"] = password
    raw = subprocess.run(
        [
            "mysql",
            "-h",
            host,
            "-P",
            str(port),
            "-u",
            user,
            "--batch",
            "--raw",
            "-N",
            database,
            "-e",
            sql,
        ],
        capture_output=True,
        text=True,
        env=child_env,
        check=False,
    )
    if raw.returncode != 0:
        sys.stderr.write(raw.stderr)
        return raw.returncode

    needle = args.q.strip().lower()
    account = args.account.strip().lower()
    shown = 0
    for line in raw.stdout.splitlines():
        cols = line.split("\t")
        if len(cols) < 8:
            continue
        ident, sender, recipient, created, readable, recalled, iv, body = cols[:8]
        if account and account not in sender.lower() and account not in recipient.lower():
            continue
        text = decrypt(key_hex, iv, body) if readable not in {"0", "false"} else ""
        if needle and needle not in text.lower() and needle not in sender.lower() and needle not in recipient.lower():
            continue
        flag = "recalled" if recalled not in {"0", "false"} else "ok"
        print(f"{created}\t{flag}\t{sender[:12]}\t{recipient[:12]}\t{text}")
        shown += 1
        if shown >= args.limit:
            break
    print(f"# {shown} row(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
