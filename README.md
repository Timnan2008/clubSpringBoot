# 青浦世外新版社团网站 · 完整源码

Spring Boot / Thymeleaf 后端与 React 前端。包含 Agent Ollie、社团目录及工作台、校园墙、评论与 @ 用户、站内通知、私信及附件、密码找回、个人资料与日历。

## 从哪里开始读代码

先看 [前端页面与组件导航](frontend/README.md) 和 [代码维护指南](docs/代码维护指南.md)。指南说明了后端模块、请求流向、空文件用途，以及源码与构建产物的区别。统一格式使用 `npm run format`，只检查使用 `npm run format:check`。

## 项目组成

| 目录 | 内容 |
| --- | --- |
| `frontend/` | 新版 React 页面、校园墙、聊天、通知、个人资料、动画与共享导航 |
| `src/main/` | Spring Boot 服务、Thymeleaf 模板、静态资源 |
| `booking/web/` | 旧版 MRBS 预约系统源码，保留用于迁移和回退 |
| `booking/school/` | 旧版预约适配与复用背景组件 |
| `database/` | 主站无数据建表结构与旧版升级 SQL |
| `deploy/` | Nginx、systemd、环境变量示例及主站发布脚本 |
| `src/test/`、`frontend/tests/*.test.mjs`、`tests/e2e/` | 后端、前端及浏览器回归测试 |

Agent 的请求流程、联网限制和历史存储边界见 [Agent 维护说明](docs/Agent维护.md)。

## 构建

需要 Java 21 和现代 Node.js（建议 Node.js 24）。

```sh
npm ci
npm run build
./mvnw -DskipTests package
```

前端构建结果写入 `src/main/resources/static/javascript/`，并更新模板中的模块预加载链接。JAR 位于 `target/formal_club-0.0.1-SNAPSHOT.jar`。

## 运行配置

从 `secret.properties.example` 创建本机 `secret.properties`，配置数据库和邮件凭据。运行前通过环境变量设置 `SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`DB_PASSWORD` 和 `MAIL_PASSWORD`，连接自己的数据库。新数据库可使用 `database/schema.sql` 建表（不含账号或业务数据）；项目保留 `spring.jpa.hibernate.ddl-auto=none`。已有数据库升级前需先检查 `database/README.md`。

```sh
java -jar target/formal_club-0.0.1-SNAPSHOT.jar
```

默认端口为 8088。`data/` 中的账号、聊天、恢复密钥、社团工作台资料及 `uploads/` 均为私有运行数据，不提交 Git。备份和恢复部署时需同时保留这些运行数据与数据库。

密码找回后的聊天恢复采用服务器加密保管恢复密钥。聊天密钥与登录密码独立，恢复依赖已有备份；没有任何备份的旧密钥无法补回。服务器能够恢复这些密钥，因此此恢复方案不属于服务器无法访问密钥的纯端到端加密。

## 主站预约后端

新版预约页面与接口统一运行在 Spring Boot，场地、规则、预约及教师队列统一存放在主站 MySQL。代码位于 Java 的 `booking/` 包和 `frontend/booking.jsx`。不再通过 PHP 提交预约或等待浏览器触发教师分配。

先执行 `database/migrations/20260912-booking.sql`，迁移旧数据并核对，再设置 `CLUB_BOOKING_BACKEND=main`。保留 `ddl-auto=none`；不会在请求过程中自动建表。访问路径仍为 `/page/booking`。

完整模块、接口、数据库和迁移回退说明见 [预约后端维护指南](docs/预约后端.md)。`booking/` 下的旧 MRBS 源码与数据库初始化文件保留供迁移回退使用，不能与新版同时开放写入。

## 部署和测试

部署步骤见 [deploy/README.md](deploy/README.md)，数据库说明见 [database/README.md](database/README.md)，浏览器测试见 [tests/e2e/README.md](tests/e2e/README.md)。

```sh
node --test frontend/tests/*.test.mjs
```

仓库包含程序源码、依赖锁文件和构建资源。账号密码、聊天记录、上传资料、密钥、服务器环境文件与数据库业务数据均由运行环境提供。MRBS 的上游许可证保留在 `booking/COPYING`、`booking/LICENSE`，各前端组件许可证保留在对应目录。
