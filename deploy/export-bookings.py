#!/usr/bin/env python3
"""Export booking business tables from the legacy Docker MySQL container to a private JSON file.
Run on the host owning MRBS. Does not export database users, passwords or sessions.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess


def export(container):
    fields = {
        "rooms": ("mrbs_room", ""),
        "entries": ("mrbs_entry", ", UNIX_TIMESTAMP(timestamp)*1000000 AS created_micros"),
        "repeats": ("mrbs_repeat", ""),
        "queue": ("school_teacher_queue", ", UNIX_TIMESTAMP(created_at)*1000000 AS created_micros"),
    }
    result = {}
    # The password is expanded inside the container; it is never printed or passed by the host.
    shell = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --default-character-set=utf8mb4 --batch --raw "$MYSQL_DATABASE" -e "$1"'
    for key, (table, extra) in fields.items():
        # JSON_OBJECT keeps embedded tabs/newlines intact while preserving all original columns.
        columns = subprocess.check_output(["docker", "exec", container, "sh", "-c", shell, "sh", f"SHOW COLUMNS FROM {table}"], text=True)
        names = [line.split("\t")[0] for line in columns.splitlines()[1:]]
        pairs = ",".join(f"'{name}',`{name}`" for name in names)
        if extra:
            expression = "UNIX_TIMESTAMP(timestamp)*1000000" if key == "entries" else "UNIX_TIMESTAMP(created_at)*1000000"
            pairs += f",'created_micros',{expression}"
        query = f"SELECT JSON_OBJECT({pairs}) AS row_json FROM {table} ORDER BY id"
        lines = subprocess.check_output(["docker", "exec", container, "sh", "-c", shell, "sh", query], text=True).splitlines()
        result[key] = [json.loads(line) for line in lines[1:]]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("container")
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    snapshot = export(args.container)
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2))
    print(json.dumps({key:len(rows) for key, rows in snapshot.items()}))
