#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""清理「幽灵登记」：删号只删了数据库行、私有登记表没清干净时，重新注册会被挡住。

背景：`data/accounts/profiles.json` 记着「邮箱 -> 学生号/昵称」，学生号唯一。
如果账号是从旧版「用户管理」删除接口（DELETE /api/user/delete）删掉的，数据库行没了，
这个文件里的记录还在，于是：
  * 重新注册 → 「此邮箱已注册 / 这个学生号已绑定账户」
  * 登录     → 数据库查不到人 → 「用户名或密码错误」

本脚本按数据库里真实存在的账号，把对不上的登记删掉（会先备份）。
默认只「试运行」，确认无误再加 --apply 真正写入；写完记得重启服务（本文件只在启动时读一次）。

用法（在服务器上）：
    python3 clean-ghost-registrations.py                  # 试运行，只报告
    python3 clean-ghost-registrations.py --apply          # 真正清理 + 自动备份
备选参数：
    --profiles PATH   档案文件路径（默认 /opt/club-app/data/accounts/profiles.json）
    --env PATH        环境变量文件（默认 /opt/club-app/club-app.env，读 DB 连接用）
    --student-number N  只清理占用这个学生号的登记（更保守）
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import time

DEFAULT_PROFILES = "/opt/club-app/data/accounts/profiles.json"
DEFAULT_ENV = "/opt/club-app/club-app.env"


def key(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


def read_env(path):
    values = {}
    if not os.path.exists(path):
        return values
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def live_keys(env):
    """数据库里真实存在的账号 key 集合。"""
    try:
        import pymysql
    except ImportError:
        sys.exit("需要 MySQL 驱动：pip3 install pymysql")

    url = env.get("SPRING_DATASOURCE_URL", "")
    host, port, db = "127.0.0.1", 3306, ""
    if url.startswith("jdbc:mysql://"):
        body = url[len("jdbc:mysql://"):]
        body = body.split("?", 1)[0]
        if "/" in body:
            hostport, db = body.split("/", 1)
            if ":" in hostport:
                host, port = hostport.split(":", 1)
                port = int(port)
            else:
                host = hostport
    conn = pymysql.connect(host=host, port=port, user=env.get("SPRING_DATASOURCE_USERNAME", "root"),
                           password=env.get("DB_PASSWORD", ""), database=db,
                           connect_timeout=8, read_timeout=20, charset="utf8mb4")
    keys = set()
    try:
        with conn.cursor() as cur:
            for sql in ["SELECT email FROM `user`", "SELECT teacher_email FROM user_teacher",
                        "SELECT club_president_email FROM user_club_president",
                        "SELECT admin_email FROM user_admin"]:
                cur.execute(sql)
                for (email,) in cur.fetchall():
                    if email:
                        keys.add(key(email))
    finally:
        conn.close()
    return keys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profiles", default=os.environ.get("CLUB_PROFILES_FILE", DEFAULT_PROFILES))
    ap.add_argument("--env", default=DEFAULT_ENV)
    ap.add_argument("--student-number", default="")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.profiles):
        sys.exit("找不到档案文件：%s（可以用 --profiles 指定别的路径）" % args.profiles)
    entries = json.load(open(args.profiles, encoding="utf-8"))
    live = live_keys(read_env(args.env))
    if len(live) < 20:
        sys.exit("从数据库只读到 %d 个账号，太少，怀疑连接串不对，已中止（不会改任何东西）" % len(live))

    ghosts = []
    for k, profile in entries.items():
        if k in live:
            continue
        if args.student_number and profile.get("studentNumber") != args.student_number:
            continue
        ghosts.append(k)

    print("档案文件      :", args.profiles)
    print("登记总数      :", len(entries))
    print("数据库账号数  :", len(live))
    print("幽灵登记数    :", len(ghosts))
    for k in ghosts:
        p = entries[k]
        print("   - 学生号=%-12s 昵称=%s" % (p.get("studentNumber", ""), p.get("nickname", "")))

    if not ghosts:
        print("没有需要清理的登记。")
        return
    if len(ghosts) > max(5, len(entries) // 5):
        sys.exit("幽灵登记占比过高（%d/%d），为安全起见中止，请人工确认后再处理"
                 % (len(ghosts), len(entries)))
    if not args.apply:
        print("\n这是试运行，未修改任何文件。确认上面就是要清的东西后，加 --apply 执行。")
        return

    backup = "%s.bak-%s" % (args.profiles, time.strftime("%Y%m%d-%H%M%S"))
    shutil.copy2(args.profiles, backup)
    for k in ghosts:
        entries.pop(k)
    tmp = args.profiles + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(entries, fh, ensure_ascii=False)
    os.replace(tmp, args.profiles)
    print("\n已清理 %d 条，备份在 %s" % (len(ghosts), backup))
    print("接下来重启服务让新内容生效：systemctl restart club-app")


if __name__ == "__main__":
    main()
