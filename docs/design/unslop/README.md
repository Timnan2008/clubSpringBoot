# Unslop 在社团项目中的使用

已安装 [heydamir/unslop](https://github.com/heydamir/unslop) 的 Codex 技能，作者为 Damir Sokolovsky（[@heydamir](https://x.com/heydamir)），许可为 [CC BY 4.0](LICENSE)。固定版本为 `620163eedb3529d9cd23a3994ed8d287d06f760d`；原版 16 个技能、脚本和参考文件原样保存在 `.agents/skills/unslop/`，逐文件校验记录在 [upstream.json](upstream.json)。

这是项目内的设计技能，无需常驻网页服务。原版说明及参考图保留作者署名，项目的适用规则写在根目录 [AGENTS.md](../../../AGENTS.md)，与原版分开维护。

## 使用

在 Codex 中打开本项目，下一轮即可使用 `$unslop`，例如：

> 用 $unslop 检查桌面端校园墙，先对照原网站。保留原网站风格、鼠标互动和身份头衔，只修排版、留白、文案与浅深色适配。

校验安装：

```sh
node tools/design/verify-unslop.mjs
```

保存一个公开网页或本地 HTML 的参考快照：

```sh
TMPDIR="$PWD/desktop/.cache/unslop/tmp" node .agents/skills/unslop/scripts/snapshot.mjs \
  https://example.com desktop/mac/qa/unslop/original.html --width 1440 --height 940
```

也可以运行 `npm run design:unslop:verify` 和 `npm run design:unslop:snapshot -- <输入> <输出.html>`。本项目已有 `playwright-core`，本机已有 Chrome，无需再下载一套 Chromium。其他电脑需要 Chrome，或给脚本设置 `CHROME_PATH`。

快照是静态参考，不能替代登录态、WebGL 背景和鼠标交互的实机检查。原脚本等待 `networkidle`，长连接或网络异常会导致超时；遇到这种情况使用现有 Electron 测试和网站源码对照，不把失败快照当成已核验结果。视频脚本属于可选功能，本次未启用。

2026-11-19 安装验证已通过：16 个原版文件及许可证的哈希一致，三个脚本的语法检查通过；原版快照工具成功保存本地 HTML，并在浏览器中重放，中文和样式保留、脚本移除。结果保存在 `desktop/mac/qa/unslop/installation-smoke.json`。原网站在线快照在等待 `networkidle` 时超时，因此本次未把它列为成功检查。

## 学到的方法与本项目的边界

按原版的顺序检查：间距 → 颜色 → 图标 → 文案 → 字体 → 布局 → 细节 → 视觉 → 动效。先修可读性和信息层级，再判断装饰是否有必要。已有品牌时使用轻量修整模式，避免更换整套视觉。

本项目的五行方向：

- 产品：青浦世外学生、教师和社团负责人使用的校园社团网站及桌面端。
- 性格：亲切、清晰、有校园活力。
- 环境：校徽、真实社团标识、校园公告、活动和同学的分享。
- 重点：首页及社团卡片保留网站的视觉；管理和阅读区域以真实内容为中心，背景和文字随主题适配。
- 特征：原网站的像素与 ASCII 鼠标互动，在已有位置保留，并服从用户的减少动态设置。

这些约束优先于原版的通用建议：不因“去 AI 感”删掉用户认可的 DarkVeil、像素交互或金色管理员头衔；不修改同学发布的表情和原文；不隐藏真实错误、权限限制或附件存在的事实；不使用新的假数据、装饰图和统计卡片填空。

## 当前界面的初步检查

范围：当前 1.2.5 代码、已有实机截图与网站原实现。本次安装未修改产品界面，也未把静态代码检查当作新一轮实机验收。

| 检查点                         | 依据                                                                                              | 后续处理方向                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 主题值存在多层覆盖             | `src/main.jsx` 按 `styles.css`、`theme.css`、`workbench.css` 顺序加载；`workbench.css` 再定义色阶 | 修改前查看最终生效值，整理重复定义；保持原网站的色彩关系，分别验浅深色                     |
| 顶部和页面内都有搜索           | `components.jsx` 的全局搜索及 `SocialPages.jsx` 的校园墙搜索                                      | 保留各自作用，区分范围和视觉层级，避免两个搜索框争夺注意力                                 |
| 首页有大写字距标签和独立留白值 | `Home.jsx` 的英文标签；`workbench.css` 中首页标题及边距                                           | 优先校正文字层级和间距节奏；不能因为技能反对背景特效就移除网站原背景                       |
| 页面仍展示开发状态文案         | `SocialPages.jsx` 的“附件预览暂未接入”和“桌面端邀请处理暂未开放”                                  | 改成简短、可理解的状态，并在具备实际功能时给出操作入口；不能静默删掉附件或邀请             |
| 真实头衔和用户原文             | `AuthorIdentity.jsx`、`frontend/AdminBadge.jsx`、`frontend/TeacherDay.jsx`                        | 保留角色、社团名和后台已发徽章；匿名继续隐藏身份。技能里的“去徽章、去表情”不适用于这些内容 |
| 交互具有明确来源               | `frontend/AsciiCursor.jsx`、`PixelTransition.jsx`、`DarkVeil.jsx` 与桌面端对应组件                | 保留网站交互，检查输入区遮挡、主题对比和减少动态，不换成新的通用装饰                       |

其中 `src/main.jsx` 指 `desktop/mac/src/main.jsx`。当前应沿原网站做局部修整，不再重画一套通用后台模板。
