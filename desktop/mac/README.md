# 青浦世外社团 · Mac 客户端 0.2.0

在原 `clubSpringBoot` 仓库的 `desktop/mac` 中开发。此目录有独立依赖、构建和安装包；原网站 Java、前端页面和队友的 Windows 客户端均不改动。

默认连接 https://qpwflhsclub.com，沿用校园账号与业务接口。安装后的 App 不需要本机 Java、数据库或 SSH。所有界面来自本地 React 文件，不加载网站页面，不打开远程服务窗口、浏览器、iframe 或 webview。

## 启动与打包

在仓库根目录运行：

```sh
npm --prefix desktop/mac ci
npm --prefix desktop/mac start
```

在 Mac 打包（产物、依赖缓存都留在此项目）：

```sh
cd desktop/mac
ELECTRON_CACHE="$PWD/.cache/electron" ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder" npm run dist:mac
```

Apple 芯片输出 `release/mac-arm64/青浦世外社团.app`、`release/QPWFL-Club-0.2.0-arm64.dmg` 和 ZIP。Intel 构建使用 `npm run dist:mac:intel`，尚未做 Intel 实机检查。当前为未签名预览版；Apple 签名、公证、自动更新和上架未实施。

## 本次迁移

- 首页：真实社团推荐、公告、个人日程和通知数量。
- 创造、活动、服务、学术四类独立页面；全部社团搜索、完整介绍、负责人和加入申请。
- 自己的登录表单、保持登录、邮箱验证码找回密码、退出、个人资料。
- 我的社团、社团工作台：有权限的账号查看成员、活动、文档名称、审核入社申请、创建活动。
- 校园墙：搜索和分页、文字动态、点赞、回复。
- 站内私信：联系人搜索、会话、文字加密收发和已读；通知列表及标记已读。
- 月历：按月查看社团与个人日程，添加、修改和删除个人日程。
- 羽毛球场：读取服务器真实场地、时段和规则，提交及取消预约，查看自己的记录。原服务未开放时显示错误或空状态。
- 青源智造：软件内独立页面，项目内容暂为空。
- 正式 / 本机开发服务、全局搜索、紧凑模式、减少动态效果。

**未开放的部分：**桌面端新账号注册（原站强制人机验证，未绕过）、附件上传与预览、文档打开、任职邀请处理、更早私信记录加载；这些入口不会跳转到网站。注册资料仅为界面，不提交。真实账号业务仍按原服务的权限与校验执行，原服务停机也会影响数据。

## 连接与安全边界

单个本地 Electron 窗口，隔离上下文、沙箱、无 renderer Node 权限、阻止导航及新窗口；CSP 禁用 frame/object 和 renderer 网络请求。主进程只接受固定命名的读取及写入操作，校验编号、日期；持有登录 Cookie 和会话写入令牌。登录响应只返回成功状态，不把后端用户密码记录传到界面。

聊天加密模块从同仓库 `frontend/message-crypto.js` 复用协议，原文件不改；本机密钥按正式 / 本机服务分开保存，与既有网站私信格式兼容。与原服务一致：消息密文存储，服务器保管恢复密钥，并会对明文做内容检查；这不代表服务器无法读取消息。客户端不含 SSH 密钥、数据库密码或 `secret.properties`。

## 文件与检查

| 位置 | 内容 |
| --- | --- |
| `electron/main.cjs`、`preload.cjs` | 本地窗口与有限 IPC |
| `electron/client.cjs`、`policy.cjs` | 登录会话、固定接口、写入令牌与错误处理 |
| `src/` | 独立 React 页面、表单、样式、加密协议 |
| `assets/` | 学校校徽、App 图标 |
| `scripts/` | 构建、图标、完成清单 PDF |
| `tests/` | 安全边界及真实 Electron UI 检查 |
| `docs/` | 给使用者看的 PDF 与公开页面截图 |
| `release/` | 安装包，Git 忽略 |
| `.local/`、`.cache/`、`qa/` | 项目内登录资料、缓存和检查截图，Git 忽略 |

```sh
npm test
npm run build
npm run test:app
```

Electron 检查先连接正式服务读取公开社团和公告，检查四类社团、详情、登录 / 注册 / 找回表单、访客状态、设置及三种窗口尺寸。再在独立 QA 进程中使用内存测试数据，检查私人表单和加密聊天；不会使用真实校园账号执行写入。检查单窗口、零远程页面导航、无 iframe/webview，结果保存到 `qa/smoke-result.json`。真实账号登录、邮件发送、入社及预约仍需账号持有人验收，不声称已通过真实业务端到端检查。

源码上传到同仓库 `codex/mac-desktop` 分支。安装包不放入 Git 源码历史。

## 设计与来源

视觉依据为用户提供的紫黑色社团桌面概念图，业务接口和学校校徽来自同仓库原网站。ThreeUI、Motionsites、Mineradio 和 Electron 官方资料仅作开发参考，没有复制它们的应用源码；未接入付费 MCP 服务。React、Electron、Phosphor 等依赖许可证保留在对应包中。
