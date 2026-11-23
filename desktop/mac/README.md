# 青浦世外社团 · 统一客户端 1.2.5

当前目录中的 React 页面与 Electron 接口已由 **Windows、Mac 共用**。Windows 启动入口在上一层 `desktop/main.js`，Mac 启动入口在 `electron/main.cjs`。

从仓库根目录运行：

```sh
cd desktop/mac
npm ci
npm start
```

完整的文件位置、协作方式、外观操作、Windows 与 Mac 打包和功能限制，请看上一层 [统一客户端说明](../README.md)。

- 页面：`src/`。
- 外观：`src/Appearance.jsx`、`src/theme.css`；布局与交互：`src/workbench.css`、`src/Home.jsx`、`src/site/`。本机保存：`electron/appearance.cjs`。
- 业务接口：`electron/client.cjs`、`electron/policy.cjs`。
- Mac 打包：`npm run dist:mac`。
- 规则检查：`npm test`；主要页面检查：`npm run test:app`；统一版检查：`npm run test:unified`；新界面检查：`npm run test:interface`；校园墙与私信排版检查：`npm run test:layout`。

所有界面在本地渲染；主进程通过固定 API 获取校园数据。没有远程网页窗口、iframe、webview，也不把 SSH / 数据库凭据放入客户端。密文聊天沿用原站协议，服务器仍保管恢复密钥并做内容检查，不表示服务器无法读取消息。

`release/` 保存安装包，`.local/` 保存本机资料，`.cache/` 保存构建缓存，`qa/` 保存检查截图，均不进入 Git。`docs/` 中的旧版 0.2.0 PDF 保留为历史记录；本次统一版说明在 `desktop/docs/`。

## 校园墙与预约：本地只读预览

在 `desktop/mac` 安装依赖后启动（不启动 Spring Boot）：

```sh
npm ci
npm run preview          # 学生
npm run preview:teacher  # 教师
npm run preview:admin    # 管理员
```

这些命令打开本机 Electron 窗口，启动后进入校园墙。左侧「羽毛球场预约」查看学生预约；管理员在同页切换「预约管理」。教师可从校园墙进入「内容审核」，教师默认没有预约管理权限，正式使用时以后台的 `calendar.overseer` 授权为准。

预览顶部始终标明「只读预览」和身份。所有内容均为本地示例，主进程不使用校园请求客户端，并拦截 HTTP / HTTPS / WebSocket 请求；写操作返回只读提示，不模拟提交成功。预览使用独立本机配置目录，默认深色与紫色。切换身份前关闭当前预览。修改源码后退出并重新运行对应命令。

普通 `npm start` 仍是连接校园服务的完整客户端，不用于只读验收。不要运行后端、部署或用真实账号测试提交。校园墙支持按后端授权显示删除和管理员置顶；预约管理接入既有 `/api/booking/all`，支持搜索、日期与状态筛选、刷新和取消前确认。没有增加后端接口或改动社团工作台。

本机也可直接双击 `只读预览-学生.command`、`只读预览-教师.command` 或 `只读预览-管理员.command`。每次会重新构建本地界面。离线实机验证：`npm run test:preview`。
