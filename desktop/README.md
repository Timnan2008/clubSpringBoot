# 青浦世外社团 · Windows / Mac 客户端 1.2.2

Windows 和 Mac 共用 Electron + React 本地页面。原网站的源码和部署没有改。

这次按原网站恢复样式：

- 社团分类恢复大图竖版卡片、原来的搜索框、分类按钮、留白和悬停上移。
- 首页恢复网站标题、原版 DarkVeil 背景、公告栏和优秀社团展示。
- 社团详情接入网站原有的像素切换与猫咪图片；编程社保留 ASCII 鼠标轨迹，机器人社保留像素画布。
- 私信和登录沿用网站的圆角、排版与组件样式。外观设置仍可切深浅色、主题色和自定义背景，已有选择保留。
- 清掉空统计、无内容的作品入口、空文档区、不能提交的注册输入框、底部同步栏、重复加密说明和校园墙说明侧栏。
- 桌面请求补上固定校园地址的来源信息，修复私信“请求来源无效”。保留登录、会话令牌、固定接口和请求来源校验。

页面布局在 `desktop/mac/src/workbench.css`。从网站复制并适配的动效在 `desktop/mac/src/site`，保留了原组件许可。后续同步样式以仓库的 `frontend/catalog.css`、`auth.css`、`social.css` 和对应 React 组件为依据。

## 从 main 开始

先在 GitHub Desktop 中点 Fetch origin → Pull origin，或在仓库中运行 `git pull --ff-only origin main`。

Windows 在 VS Code 打开整个 `clubSpringBoot`，点 Terminal → New Terminal，逐行复制：

```powershell
cd desktop
npm ci
npm start
```

Mac 在仓库根目录逐行复制：

```sh
cd desktop/mac
npm ci
npm start
```

已经装好的软件默认连接正式校园服务，无需 Java、数据库、SSH 或密钥。用原来的校园账号登录。

## 大家具体改哪里

| 内容 | 位置（从仓库根目录开始） |
| --- | --- |
| Windows 启动和打包 | `desktop/main.js`、`desktop/package.json` |
| 两端共同的页面 | `desktop/mac/src/` |
| 两端共同的颜色与外观 | `desktop/mac/src/theme.css`、`Appearance.jsx` |
| 共同的布局和尺寸 | `desktop/mac/src/styles.css` |
| 导航、卡片、弹窗 | `desktop/mac/src/components.jsx` |
| 软件窗口、接口连接 | `desktop/mac/electron/` |
| 外观保存和图片导入 | `desktop/mac/electron/appearance.cjs` |
| 新增的账号、内容审核、建议、添加社团页面 | `desktop/mac/src/AdminPages.jsx` |

**`mac` 这个名字暂时保留，里面的页面已由 Windows 和 Mac 共用。改一份，两端生效。** 不再分别维护一套黑色和一套白色。

旧的 `shell.html`、`shell.js`、`shell.css`、`preload.js`、`theme-boot.js` 留作历史参考，当前入口和安装包不再使用。请不要继续在这些旧文件中改界面。

## 新的外观怎么用

1. 软件左侧点「设置」。
2. 「外观模式」选择浅色、深色或跟随系统。
3. 「主题颜色」点颜色圆圈；最后一个图标可以选择自己的颜色。
4. 「文字大小」选小、默认、大或更大。
5. 「工作台背景」选纯色、微光、海岸、山林，或点「选择图片」。
6. 下面可以调背景浓度和模糊；改完自动保存，关闭再打开仍保留。
7. 想恢复时点「恢复默认外观」。

图片仅保存在本机，不上传校园服务器；原图移动或删除后仍能显示。PNG / JPG / WebP 最大 20 MB，导入时转换并缩小至最长边 2560 像素。

## 原有功能与权限

社团、登录、个人资料、日程、校园墙、私信、预约和社团工作台继续使用原有后台接口。Windows 原管理入口已有本地页面：账号列表、身份调整、任免社长、添加社团、词库与限制记录、建议审核。入口随账号身份显示，操作仍由服务器核验权限；修改身份和删除等动作有软件内确认框。

本次未实现：新账号注册所需的人机验证、附件与工作台文档的上传/打开、任职邀请处理、更早聊天记录、预约 Excel 导出。账号管理目前支持查询、改身份和任免社长，不包含旧网页的批量导入或账号增删。上述部分不会跳到网站代替。

原 Windows 正式服务沿用旧客户端的 Cookie 会话目录；本地开发服务单独保存。外观按电脑保留，不会改变校园账号资料。

## 打包

Windows 在 `desktop` 中运行：

```powershell
npm run dist
```

安装包：`desktop/release/QingpuWFL-Club-Setup-1.2.2.exe`。需要免安装 ZIP 时运行 `npm run dist:zip`。当前为未签名预览版。

Mac 在 `desktop/mac` 中运行：

```sh
ELECTRON_CACHE="$PWD/.cache/electron" ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder" npm run dist:mac
```

产物：`desktop/mac/release/mac-arm64/青浦世外社团.app` 及同目录中的 DMG / ZIP。Apple 签名与公证尚未实施。

GitHub Actions 的「Desktop Windows build」会在 main 的 desktop 代码更新后检查并打包；完成后在对应运行页面下载 `QPWFL-Windows-1.2.2` 产物。不会自动发布网站或替换原网站下载文件。

## 检查

在 `desktop` 中运行：

```powershell
npm test
npm run build
npm run test:unified
```

10 项规则检查；统一版检查包括外观、背景导入、重启保存、三种窗口尺寸、Windows 窗口按钮和管理页面。Mac 的 `npm run test:app` 另检查公开数据与主要业务表单。真实校园公开数据只读；需要写入的流程使用隔离进程内的测试资料，不操作真实账号。

`npm run test:interface` 检查新界面的真实社团数据、快捷搜索、键盘打开详情、鼠标反馈、减少动态、浅深色和三种窗口尺寸。截图保存在 `desktop/mac/qa/site-alignment/`。

本机 Mac 的打包 App 已通过启动检查。GitHub 的 Windows 机器也已通过统一版操作检查，并生成 EXE 安装包和免安装 ZIP，可在 [Windows 构建记录](https://github.com/Timnan2008/clubSpringBoot/actions/workflows/desktop.yml) 查看结果及下载产物。自动检查不包含真实账号写入和安装向导；这两项仍需账号持有人在自己的电脑验收。

## 队友可直接转发的话

Windows 和 Mac 的软件界面已经统一，还是 Electron。大家先拉 main，之后界面统一在 desktop/mac/src 里面改，Windows 和 Mac 共用这一份。Windows 启动和打包入口仍在 desktop。设置里已经能换浅色、深色、主题色、字号和自己的背景图，改完自动保存。原网站没有改。大家改之前先说一下负责哪个页面，避免同时改同一个文件；改完提交时说清做了什么、还有什么没完成。
