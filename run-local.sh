#!/usr/bin/env bash
# 本地一键启动社团网站（端口 8088）
# 不修改网站任何文件/配置：仅用环境变量把数据库指到本机 MariaDB。
# 用法：在项目根目录执行  bash run-local.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> 1/4 检查 MariaDB"
if ! mariadb -u root -e 'SELECT 1' >/dev/null 2>&1; then
  echo "    MariaDB 未运行，正在启动 ..."
  brew services start mariadb >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    mariadb -u root -e 'SELECT 1' >/dev/null 2>&1 && break
    sleep 2
  done
fi
mariadb -u root -e 'SELECT 1' >/dev/null 2>&1 || { echo "    MariaDB 启动失败"; exit 1; }
echo "    MariaDB 在线"

echo "==> 2/4 准备本地数据库 club_demo"
PW=$(grep '^DB_PASSWORD=' secret.properties | cut -d= -f2- | xargs)
mariadb -u root -e "CREATE DATABASE IF NOT EXISTS club_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'club_app'@'localhost' IDENTIFIED BY '$PW'; CREATE USER IF NOT EXISTS 'club_app'@'127.0.0.1' IDENTIFIED BY '$PW'; GRANT ALL PRIVILEGES ON club_demo.* TO 'club_app'@'localhost'; GRANT ALL PRIVILEGES ON club_demo.* TO 'club_app'@'127.0.0.1'; FLUSH PRIVILEGES;"
TABLES=$(mariadb -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='club_demo'")
if [ "$TABLES" = "0" ]; then
  echo "    空库，导入 database/schema.sql ..."
  mariadb -u root club_demo < database/schema.sql
fi
echo "    已就绪（$TABLES 张表）"

echo "==> 3/4 检查可执行 jar"
if [ ! -f target/formal_club-0.0.1-SNAPSHOT.jar ]; then
  echo "    缺少 jar，开始构建（npm run build + mvnw package）..."
  npm run build
  ./mvnw -DskipTests package
fi
echo "    jar 已存在"

echo "==> 4/4 启动应用（先停掉旧实例，避免端口占用）"
OLD=$(lsof -t -i :8088 -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$OLD" ]; then
  echo "    停止旧实例 PID=$OLD"
  kill $OLD 2>/dev/null || true
  sleep 2
fi
export SPRING_DATASOURCE_URL='jdbc:mysql://127.0.0.1:3306/club_demo?serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
export SPRING_DATASOURCE_USERNAME='club_app'
export SPRING_DATASOURCE_PASSWORD="$PW"
export SPRING_JPA_DATABASE_PLATFORM='org.hibernate.dialect.MariaDBDialect'
nohup java -jar target/formal_club-0.0.1-SNAPSHOT.jar > /tmp/club_run.log 2>&1 &
echo "    已启动 PID=$!，日志 /tmp/club_run.log"
echo
echo "==> 完成。稍等几秒后访问： http://localhost:8088"
