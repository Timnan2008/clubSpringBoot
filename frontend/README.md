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
- `PersonalWelcome.jsx`：读取当前账号欢迎配置并向服务器领取一次性展示资格；不是依靠浏览器缓存判断已读。
- `useAnimatedClose.js` / `MotionPrimitives.jsx`：公共动效。修改时保留减少动画偏好和卸载清理。

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
npm run build
```

`build.mjs` 定义页面入口和产物路径。`build/preloads.mjs` 按 esbuild 依赖图刷新模板的模块预加载标签，并保持模板可读。构建完成后再用 Maven 打包 JAR。

`src/main/resources/static/javascript/ui/`、`darkveil/` 和 `booking/school/*.bundle.*` 是压缩产物，文件头会指回源码。**不要直接编辑或手工美化产物**，下一次构建会覆盖它们。构建结果保留在仓库中，服务器运行 JAR 无需 Node.js。

React Bits 与其他组件的许可证见本目录 `REACT-BITS-LICENSE.md`、`MOTION-PRIMITIVES-LICENSE.md`。

后端接口、数据存储和空文件说明见 [代码维护指南](../docs/代码维护指南.md)。
