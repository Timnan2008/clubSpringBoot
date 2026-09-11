# 隔离环境浏览器测试

这些脚本固定访问 `http://localhost:8088`，会创建测试帖子和评论，并在结束时删除测试帖子；不得将地址替换成真实业务站点。

在隔离数据库中准备可发帖的测试账号，把 `accounts.example.json` 复制为 `accounts.local.json` 并填写凭据。该本地文件已加入忽略规则。Chrome 路径默认使用 macOS 安装位置，其他系统通过 `CHROME_PATH` 指定。

```sh
npm ci
node tests/e2e/reply-flow.cjs
node tests/e2e/reply-dismiss.cjs
```

可用 `E2E_USER_FILE` 指向已有隔离账号配置。覆盖发送后收起、失败保留草稿、按评论保留独立草稿、框外点击、页面滚动、输入框内部滚动、收起动画，以及桌面和手机布局。截图输出到被 Git 忽略的 `artifacts/`。
