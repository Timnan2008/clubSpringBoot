# 青浦世外新版社团网站 · 完整源码

Spring Boot / Thymeleaf 后端与 React 前端。包含社团目录及工作台、校园墙、评论与 @ 用户、站内通知、私信及附件、密码找回、个人资料与日历。

## 项目组成

| 目录 | 内容 |
| --- | --- |
| `frontend/` | 新版 React 页面、校园墙、聊天、通知、个人资料、动画与共享导航 |
| `src/main/` | Spring Boot 服务、Thymeleaf 模板、静态资源 |
| `booking/web/` | MRBS 预约系统完整 PHP 源码 |
| `booking/school/` | 学校预约界面、时段规则、教师队列、账号联动及注销清理 |
| `database/` | 主站无数据建表结构与旧版升级 SQL |
| `deploy/` | Nginx、systemd、环境变量示例及主站发布脚本 |
| `src/test/`、`frontend/tests/*.test.mjs`、`tests/e2e/` | 后端、前端及浏览器回归测试 |

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

## 预约系统集成

MRBS 预约系统的完整源码现在位于 `booking/`，与主站分开运行。主站 `club.booking.url` 配置预约服务地址。根目录 `npm run build` 会同时构建共享预约导航到 `booking/school/aero-shards.bundle.js`，无需原开发电脑的外部目录。

```sh
cp booking/.env.example booking/.env
# 为 booking/.env 中两个数据库密码填写不同的新值
cd booking
docker compose -p qpsw_mrbs -f compose.school.yml up -d
```

默认访问 `http://localhost:8765/`，复用 `http://localhost:8088/` 的主站登录。试运行时段为工作日 11:30–12:50、16:30–18:30，每段 20 分钟。完整规则与组件来源见 [预约系统说明](booking/README-青浦世外.md)。

## 部署和测试

部署步骤见 [deploy/README.md](deploy/README.md)，数据库说明见 [database/README.md](database/README.md)，浏览器测试见 [tests/e2e/README.md](tests/e2e/README.md)。

```sh
node --test frontend/tests/*.test.mjs
```

仓库包含程序源码、依赖锁文件和构建资源。账号密码、聊天记录、上传资料、密钥、服务器环境文件与数据库业务数据均由运行环境提供。MRBS 的上游许可证保留在 `booking/COPYING`、`booking/LICENSE`，各前端组件许可证保留在对应目录。
