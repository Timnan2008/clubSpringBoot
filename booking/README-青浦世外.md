# 青浦世外高中羽毛球场预约系统

本目录是 GitHub 开源项目 MRBS 1.12.2 的完整源码，并通过独立配置文件改成学校预约场景。页面和预约流程均来自 MRBS 原项目。

界面已通过 MRBS 官方支持的自定义 CSS/JavaScript 入口完成黑白重构：中文周历、加宽的表格留白、悬停出现预约入口、页内预约弹窗、“查看我的预约”和移动端适配。背景使用 React Bits 的 AeroShards，已关闭光晕、Bloom、颗粒和色差，并把播放速度调至 `0.45`；标题入场使用速度加快的 BlurText。React、ReactDOM、Motion 与 `vgpu` 已打包为浏览器可直接加载的独立资源。预约、冲突检测、权限及管理功能仍由 MRBS 提供。

## 本地启动

```bash
cp .env.example .env
# 在 .env 中设置数据库密码
docker compose -p qpsw_mrbs -f compose.school.yml up -d
```

打开 <http://localhost:8765/>。

学生端直接进入唯一可预约周。预约身份复用青浦世外高中社团官网登录状态，点击时段后弹窗只显示当前账户和可选备注；“查看我的预约”也按官网账户查询。

已配置：一片“3楼羽毛球场”；本周只能预约下一周周一至周五；试运行阶段仅开放午休 11:30–12:50 和晚间休息 16:30–18:30，每次固定 20 分钟；每个官网账户每周最多三次，同一天最多一次。预约成功后时段显示为灰色“不可预约”，普通预约者不能修改或删除。

## 重建 React Bits 前端包

原始 AeroShards 注册表响应、组件源码、BlurText、GooeyNav 及适配入口保存在 `school/aero-shards/`。修改配置或组件后运行：

```bash
cd school/aero-shards
npm ci
npm run build
```

官网菜单的「羽毛球场预约」入口为 `/page/booking`。预约所有 PHP 页面均要求官网密码登录后生成的 `JSESSIONID`，仅有邮箱 Cookie 不会获得预约身份。未登录会回到官网登录，完成后自动返回预约系统。`CLUB_ACCOUNT_API` 指向 `/booking/account`，`CLUB_LOGIN_URL` 配置登录返回地址；本地两套系统统一使用 `localhost`。退出官网后预约权限立即失效。

日历按完整二十分钟区间显示（如 11:30～11:50）。每次提交前弹出预约须知；返回、关闭或按 Escape 均不会提交，确认后才发送预约请求。服务端要求本次请求携带须知确认字段。弹窗告知违规后果，实际违规认定及禁约处理由学校负责。

新版共享导航由仓库根目录的 `frontend/booking-nav.jsx` 构建。根目录执行 `npm run build` 是当前部署使用的构建方式；`school/aero-shards/` 保留早期背景组件及其源码。
