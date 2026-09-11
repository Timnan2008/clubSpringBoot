# 青浦世外社团网站

Spring Boot / Thymeleaf 后端与 React 前端。包含社团目录及工作台、校园墙、评论与 @ 用户、站内通知、私信及附件、密码找回、个人资料与日历。

## 构建

需要 Java 21 和现代 Node.js（建议 Node.js 24）。

```sh
npm ci
npm run build
./mvnw -DskipTests package
```

前端构建结果写入 `src/main/resources/static/javascript/`，并更新模板中的模块预加载链接。JAR 位于 `target/formal_club-0.0.1-SNAPSHOT.jar`。

## 运行配置

从 `secret.properties.example` 创建本机 `secret.properties`，配置数据库和邮件凭据。运行前通过环境变量设置 `SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`DB_PASSWORD` 和 `MAIL_PASSWORD`，连接自己的数据库。现有表结构需预先准备；项目保留 `spring.jpa.hibernate.ddl-auto=none`。

```sh
java -jar target/formal_club-0.0.1-SNAPSHOT.jar
```

默认端口为 8088。`data/` 中的账号、聊天、恢复密钥、社团工作台资料及 `uploads/` 均为私有运行数据，不提交 Git。备份和恢复部署时需同时保留这些运行数据与数据库。

密码找回后的聊天恢复采用服务器加密保管恢复密钥。聊天密钥与登录密码独立，恢复依赖已有备份；没有任何备份的旧密钥无法补回。服务器能够恢复这些密钥，因此此恢复方案不属于服务器无法访问密钥的纯端到端加密。

## 预约系统集成

MRBS 预约后端独立部署，不包含在此 Spring Boot 仓库中。用 `club.booking.url` 配置预约服务地址。共享预约导航源码为 `frontend/booking-nav.jsx`。单独克隆时，其构建结果输出到 `src/main/resources/static/javascript/booking/`；可用 `BOOKING_ASSET_FILE` 指定部署输出文件。如果相邻目录存在 `../outputs/qpsw-mrbs/school`，构建仍兼容原来的本地输出位置。

更多模块说明见 [frontend/README.md](frontend/README.md)。
