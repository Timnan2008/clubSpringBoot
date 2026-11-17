# 青浦世外社团 · Mac 客户端

这是原 `clubSpringBoot` 仓库里的独立 Mac 客户端。网站仍使用原来的 Spring Boot 项目；已有 Windows 客户端仍在 `desktop/`。此目录拥有自己的依赖、构建与输出目录。

默认连接 **https://qpwflhsclub.com**，使用原网站账号。使用已打包的 App 不需要在电脑上启动 Java、数据库或 SSH。

## 开发启动

在仓库根目录打开终端，逐行运行（需要 Node.js 22 或更新版本）：

```sh
npm --prefix desktop/mac ci
npm --prefix desktop/mac start
```

日常改完代码重新运行第二行即可。关闭窗口后可以从 Dock 再打开；按 Command + Q 完全退出。

## 安装包

在 Mac 上，进入此目录后执行：

```sh
cd desktop/mac
ELECTRON_CACHE="$PWD/.cache/electron" ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder" npm run dist:mac
```

生成当前电脑架构的 `.app`、`.dmg` 和 `.zip`，都放在 `release/`。Apple 芯片电脑对应 `arm64`，Intel 对应 `x64`。在 Apple 芯片 Mac 上生成 Intel 包的命令是 `npm run dist:mac:intel`；Intel 包尚未做实机验证。

本次提供的是 **0.1.0 未签名预览版**，未做 Apple Developer 签名、公证、自动更新或 App Store 上架。这些是对外正式分发前的后续工作。

## 已有内容

- 自己绘制的紫黑色桌面界面、Mac 原生窗口按钮、校徽 App 图标。
- 首页、发现社团、我的社团、活动日程、消息与通知、设置，共六个页面。
- 从原站读取社团目录、图片和公告；搜索与分类筛选、详情弹窗、Command + K 全局搜索。
- 登录后通过原站接口读取自己的社团、本月日历、通知与会话摘要。没有登录时显示登录入口与空状态，不填虚构数字。
- 登录、入社、完整资料、社团工作台、日历编辑、完整聊天，通过 App 内的校园服务窗口使用原站流程。加密聊天仍由原站处理。
- 正式服务 / 本机开发服务切换、刷新、退出此客户端账号、紧凑模式、减少动态效果。

账号密码只在原站登录页面输入。客户端没有收录 SSH 密钥、数据库密码或 `secret.properties`。

## 文件在哪

| 路径 | 内容 |
| --- | --- |
| `electron/main.cjs` | 窗口、校园服务连接、登录会话 |
| `electron/preload.cjs` | 本地界面可调用的有限能力 |
| `electron/policy.cjs` | 固定接口与网址限制 |
| `src/` | React 页面、数据状态、样式 |
| `assets/` | 沿用的学校校徽与新 App 图标 |
| `scripts/` | 构建、图标生成与说明 PDF 生成 |
| `tests/` | 接口边界和真实 Electron 操作检查 |
| `docs/` | 给使用者看的完成清单和截图 |
| `release/` | 本机生成的安装包，Git 忽略 |
| `.local/`、`.cache/`、`qa/` | 开发登录、依赖缓存、检查记录，Git 忽略 |

## 检查

在 `desktop/mac` 内运行：

```sh
npm test
npm run build
npm run test:app
```

真实 Electron 检查默认使用单独的 QA 登录目录，连接正式站读取公开目录与公告，不提交入社、活动等真实业务。检查包括搜索、分类入口、详情、访客页面、设置、三种窗口尺寸、登录窗口隔离。`qa/smoke-result.json` 记录结果。测试不会输入账号或密码，因此 **真实账号登录后的完整业务还需账号持有人实际验收**。

所有业务写入仍由原站窗口处理；原站自身的错误、权限及停机也会影响客户端。当前是客户端预览，尚未将全部业务表单重写为桌面界面。

## 参考说明

视觉依据为用户提供的社团桌面概念图；业务接口与学校校徽来自同仓库原网站。以下资料仅用于了解交互或开发方式，没有直接复制它们的应用源码：

- [ThreeUI / MengTo](https://github.com/MengTo/threeui)
- [Motionsites 开源服务端](https://github.com/kvalen-code/Motionsites-Dev)
- [Motionsites 官方入口](https://motionsites.ai/mcp)（账户与付费内容未接入）
- [Mineradio](https://github.com/XxHuberrr/Mineradio)
- [Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)
- [electron-builder Mac 打包说明](https://www.electron.build/mac/)

Phosphor 图标与 React 等库的许可证随依赖保留。学校校徽沿用原站，仅用于本项目的学校客户端。
