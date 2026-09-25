# 前端源码导航

这里是**可编辑源码**。React 19 组件由 esbuild 打包，再挂载到 Spring Boot 返回的 Thymeleaf 页面中；项目不是一个独立的单页路由应用。页面路径由 Java 控制器决定。

## 从页面找入口

| 要修改的页面 | 入口 | 主要组件 / 逻辑 |
| --- | --- | --- |
| 首页与背景 | `home.jsx` | `DarkVeil.jsx`、`ColorBends.jsx` |
| 公共导航与菜单 | `navigation.jsx` | `CardNav.jsx`、`Search.jsx`、`StaggeredMenu.jsx` |
| 登录、注册、密码找回 | `auth.jsx` | `Stepper.jsx`、`ForgotPassword.jsx`、`PasswordStrength.jsx` |
| 校园墙、帖子详情、私信 | `social.jsx` | 同一入口根据模板的 `data-mode` 区分墙和消息 |
| 帖子、评论及回复框 | `SocialPost.jsx` | `InlineReply.css`、`Mentions.jsx`、`PostMedia.jsx` |
| 私信附件与密钥 | `ChatAttachments.jsx` | `chat-attachments.mjs`、`message-crypto.js` |
| 用户资料与我的社团 | `account.jsx` | `PublicProfile.jsx`、`AppearanceEditor.jsx`、`AvatarEditor.jsx` |
| 社团目录与详情 | `catalog.jsx` | `ClubProfile.jsx`、`club-scroll.mjs` |
| 社团工作台 | `workspace.jsx` | `ClubOperations.jsx`、`JoinRequestsPanel.jsx` |
| 日历 | `calendar.jsx` | `DateJump.jsx`、`activity-language.mjs` |
| 清源建议 | `suggestion.jsx` | 建议提交及历史记录 |
| 主站羽毛球预约 | `booking.jsx` | 主站预约 API、数据库规则、个人预约记录 |
| 旧预约站共享导航 | `booking-nav.jsx` | 构建输出供独立的 PHP 预约站使用 |

## 共享规则

- `language.js` / `translations.json`：界面中英文选择；用户发帖、姓名等原始内容不翻译。
- `PersonIdentity.jsx` / `Avatar.jsx` / `TeacherDay.jsx`：身份文字、头像、徽章。服务器下发身份和权限，客户端展示不能授予权限。
- `mention-state.mjs`：已选择的 @ 用户按字符范围保存，后续输入不会反复匹配旧提及。
- `page-window.mjs`：页码窗口逻辑。
- `useAnimatedClose.js` / `MotionPrimitives.jsx`：公共动效。修改时保留减少动画偏好和卸载清理。
- `GlideSelect`、`HoldButton`、`RubberSegment`、`SpringCheck`、`PulseHeart`、`StatusMark`：基于用户提供的 React Bits 源码适配的交互控件，许可证同上。选择、日历视图、待办、点赞、长按确认和上传反馈分别由这些组件负责。
- `HoldButton.onHold` 应返回操作 Promise；拒绝或返回 `false` 表示失败，按钮恢复可重试。父页面捕获错误后也要返回 `false`，不能吞掉错误后显示成功。长按不会替代服务端权限检查或账号注销的密码确认。
- 点赞使用受控的 `liked/count`，服务器成功后更新；上传拿不到真实进度时使用 `StatusMark status="running"`，不传虚构百分比。
- `ControlRefinements.css` 处理这组控件与旧页面样式的兼容，以及学期材料布局。不要改动编程社背景鼠标效果。
- `PixelCard.jsx` 用于 OpenSTEAM（28 号社团）的独立 Logo 展示；进入、悬停和键盘聚焦触发像素效果，其他社团仍用原来的 `PixelTransition`。
- `PixelSnow.jsx` 只在 OpenSTEAM（28 号社团）详情页按需加载，深色背景也仅限该社团；其他社团保留默认浅色背景，编程社（1 号）保留原来的 ASCII 鼠标拖尾。shader 放在 `pixel-snow-shader.js`。背景位于内容下层，不接收点击；低分辨率画布限制渲染开销，隐藏或移出视口暂停，减少动态效果时静止显示，不支持 WebGL 时保留正常页面。退出页面会销毁 WebGL 资源。
- `AdminBadge.jsx` 根据服务器提供的 `role === "admin"` 显示金色流光标签；匿名帖子不展示该标签。标签仅用于身份展示，不参与权限判定。

## 样式怎么找

组件旁的同名 CSS 负责该组件。`social.css` 是社交页基础样式，`SocialTheme.css`、`SocialAdditions.css` 和 `ConversationRefinements.css` 包含后续主题及布局覆盖。排查覆盖时先看入口中的导入顺序，再查具体类名；不要在整理文件时排序或合并 CSS 规则，否则可能改变现有视觉效果。

背景 shader、鼠标效果和带有复杂数学公式的源码仍在相关组件内。长字符串不强行拆开，避免改变 shader、SVG 路径或翻译内容。

## 开发命令

在仓库根目录运行：

```sh
npm ci
npm run format          # 统一 JSX / JS / CSS / Java / HTML 格式
npm run format:check    # 只检查，不修改
npm run test:frontend
npm run test:controls   # Chrome 浏览器交互回归；CHROME_BIN 可指定可执行文件
npm run test:club-effects # 社团详情、像素动画、移动布局和管理员标签；使用模拟接口
npm run build
```

需要用真实服务器测试新版前端时，在构建后运行 `node scripts/preview-live.mjs`。它只监听 `127.0.0.1:8088`：`/javascript/ui/` 和 `/javascript/darkveil/` 读取本地构建，其余页面、接口、登录会话和媒体由 `https://qpwflhsclub.com` 提供。因此登录后提交的操作会写入真实服务器。服务不会保存账号密码，退出进程即可停止预览；也可用 `PORT=8089` 指定其他本地端口。

`build.mjs` 定义页面入口和产物路径。`build/preloads.mjs` 按 esbuild 依赖图刷新模板的模块预加载标签，并保持模板可读。构建完成后再用 Maven 打包 JAR。

`src/main/resources/static/javascript/ui/`、`darkveil/` 和 `booking/school/*.bundle.*` 是压缩产物，文件头会指回源码。**不要直接编辑或手工美化产物**，下一次构建会覆盖它们。构建结果保留在仓库中，服务器运行 JAR 无需 Node.js。

React Bits 与其他组件的许可证见本目录 `REACT-BITS-LICENSE.md`、`MOTION-PRIMITIVES-LICENSE.md`。

后端接口、数据存储和空文件说明见 [代码维护指南](../docs/代码维护指南.md)。

OpenClaw 已接入主站导航，与校园墙复用深色 CardNav。仅查看界面可运行 `PREVIEW_ACCOUNT=teacher npm run preview:site`，使用本地测试老师，阻止生产 API 和写入；不设置该变量时仍使用真实登录。详情见 [OPENCLAW.md](OPENCLAW.md)。
