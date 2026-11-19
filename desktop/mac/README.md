# 青浦世外社团 · 统一客户端 1.2.4

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
