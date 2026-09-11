# 新版网站部署

本目录提供主站与预约系统的部署配置。主站、Nginx 和教师队列定时器配置来自现行服务。队列单元中的 `qpsw_mrbs_web_1` 是现行容器名；使用 Compose v2 时可在启动命令加入 `--compatibility` 保持该名称，或按实际容器名修改队列单元。所有 `docker compose` 命令也可使用独立的 `docker-compose` 执行。

1. 在仓库根目录执行 `npm ci && npm run build && ./mvnw -DskipTests package`。
2. 主站目录使用 `/opt/club-app`，JAR 名称为 `formal_club3.0.jar`。将 `club-app.env.example` 复制为服务器上的 `/opt/club-app/club-app.env` 并配置真实值，限制文件权限。初始化数据库和私有数据目录。
3. 将 `booking/` 完整复制到 `/opt/badminton-booking`。从 `.env.example` 创建 `.env`，填写不同的数据库密码。公开站点需要设置 `MRBS_URL_BASE=https://qpwflhsclub.com/booking`、主站登录地址和可从容器访问的 `CLUB_ACCOUNT_API`；主站端设置对应的 `club.booking.url`。
4. 在预约目录执行 `docker compose -p qpsw_mrbs -f compose.school.yml up -d`。预约端口只绑定 127.0.0.1，由 Nginx 转发。
5. 根据部署路径和域名调整 `systemd/`、`nginx/club-app.conf`。准备证书后使用 `nginx -t` 检查配置；安装 systemd 单元，执行 `systemctl daemon-reload`，启用 `club-app` 和 `club-teacher-queue.timer`。
6. 验证主站、登录、校园墙与 `/booking/`；同时确认教师队列定时器正常运行。重启后的 Spring Boot 启动可能超过 30 秒，应等待完整就绪检查。

## 更新已有主站

```sh
python3 deploy/deploy-main.py --host root@your-server --identity /path/to/private-key
```

脚本会读取当前线上 JAR 校验值，上传新 JAR、验证 SHA-256，备份旧 JAR 和私有文件，原子替换并等待就绪；失败时恢复旧版本。默认服务器路径同上。此脚本不更新数据库或预约容器；数据库备份与迁移须单独处理。备份目录仅服务器可读，不加入 Git。

预约源码修改后重新同步 `booking/school/` 并重启预约服务以清理 PHP 缓存。使用根目录构建的共享导航；`school/aero-shards/` 保留早期动画组件源码，其独立构建会覆盖同名导航包，应最后重新运行根目录 `npm run build`。
