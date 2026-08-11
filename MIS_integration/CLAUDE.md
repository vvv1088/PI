# CLAUDE.md — MIS 融合系统 2 工作区

给 AI agent 的项目须知。每次会话自动加载，先读完再动手。
（本工作区 2026-08-11 由前一阶段的 Claude 会话整理交接，全部决策与产出见 `docs/00-背景与决策.md`。）

---

## 这是什么

**MIS（Marketing Intelligence System）正在吸收「Meta Ads 统一管理系统」（下称系统 2），成为 marketing 唯一操作系统。** 系统 2 的 UI 最终退役，其 Next.js 应用降级为「隐形后端」，MIS 前端跨域调用其接口取事实数据。

两个系统、两套后端，**都不迁移、不合并**：

| 层 | 承载 | 归属 |
|---|---|---|
| MIS 前端（本工作区 `mis-ui/`） | cPanel 静态站 `https://ci.boostmarketing.site` | 我们，自己部署，迭代自由 |
| Supabase | MIS 自己的「决策数据」：CI 竞品情报、ideas/hypotheses/creatives、预算、权限、登录 | 我们 |
| 系统 2 Next.js 接口（35 个 route） | 「事实数据」：资产、花费、状态 | 代码改动我们写，**Jayden 审核部署**；生产我们不碰 |
| MySQL + 服务器 + 系统 2 现有 n8n workflow | 事实库与自动化管线 | **Jayden**，改动经他 |
| 我们新建的 n8n workflow | BO 取数等 | 我们，建在 marketing 侧 n8n（adammkt cloud） |

## 两条工作线（本工作区的一切工作属于其一）

**线 A：MIS UI 开发**（主战场，`mis-ui/`）
- v70 已完成：PERFORMANCE（Closed-Loop Report / Spending）+ ASSETS（Health / Rotation Log / Asset Status）共 5 个视图，跑在 mock 上
- 数据一律经 `mis-meta-api.js` 的 `metaApi()`；mock 响应结构**严格对齐**系统 2 仓库 `docs/handover/06-API接口手册.md`

**线 B：系统 2 侧代码交付**（在系统 2 的仓库里做，不在本工作区）
- 系统 2 仓库有自己的 CLAUDE.md，**那边的一切规矩以它为准**（tsc/build 必过、commit 写根因→证据→改法→验证、变更记录先行）
- 产出物是 patch / 分支，交 Jayden 审核部署；已交付第一个：`patches/0001-MIS-CORS-service-token.patch`

---

## 铁律

1. **MIS 的新代码一律进新文件**（`mis-*.js`），`index.html` 只准加挂载点和引用。它已经 3000 行 / 423KB，增量不进单文件。
2. **mock 结构不许想当然。** 每个 mock 路由的响应形状照 06-API接口手册原文写（含 bigint→字符串、时间→ISO UTC）。手册没写的字段（资产列表项）标注「待 live 联调核对」。
3. **Supabase 与 MySQL 各管各的**：决策数据不迁 MySQL，事实数据不镜像进 Supabase。谁再提合库/镜像，翻 `docs/00` 的防反复清单。
4. **系统 2 生产我们不碰**：不连生产库、不执行部署；要生产数据验证就把 SQL 写清楚给 Jayden 代跑。
5. **改完必跑冒烟**：`mis-ui/tools/smoke-test.js`（Playwright 无头，5 视图渲染 + console 零报错才算过）。「代码看起来对」不算验证。
6. **发版=整个文件夹**：index.html + 全部 mis-*.js 一起传 cPanel；版本纪律从单文件快照改为文件夹快照。
7. **时区**：系统 2 接口吐 UTC ISO 字符串，展示用 `fmtTs()`（浏览器本地=UTC+8）；`ad_insights_daily_gmt8` 已是 +8 口径。
8. **命名契约是 join 键**：广告名内嵌 ref code，闭环报表靠它把花费落到 hypothesis/素材。ref code 体系已存在，不要发明第二套。

---

## mock → live 切换（等 Jayden 部署接入改造并发 token）

改 `mis-ui/mis-meta-api.js` 顶部：`mode:'live'` + `token:'<service token>'`（+ 若他开了备注写入则 `allowRemarkEdit:true`）。
BO 数据（FD/D7）现走占位路由 `/api/mis/bo-daily`（mock 内），真通道等对接清单 D 节拍板后在同一处补 live 实现——闭环页代码不用动。

## 当前进度快照（2026-08-11）

- ✅ 对接清单已发 Jayden（`docs/02`，7 项一次拿齐），**等他回复** —— P0/P1 的唯一外部依赖
- ✅ 接入改造 patch 已出（`patches/`，tsc/build 已过），等他审核部署
- ✅ v70 五视图 mock 版完成并冒烟通过；交互预览已给 v 看过
- ⏳ 第三批待办：权限映射设计（系统 2 的 9 账号→MIS 角色）、拆文件+最简构建方案（P2 前必须）、baselines 替换设计（New Hypothesis 基线改由 PERFORMANCE 供数）
- ⏳ v70 尚未合回 PI 正式仓库 / 未上 cPanel

## 别踩的坑（从系统 2 的血泪史继承）

- 这类系统的故障都是**静默失败**：mock 与真数据形状差一个字段，页面照样渲染、数字悄悄错。所以第 2 条铁律是铁律。
- 系统 2 的 `/api/tokens`、`/api/action-logs` 会明文吐机密——MIS 的 token 权限已排除它们，**不要**为任何功能申请打开。
- Spending 接口的分页参数（`page`/`pageSize`，认 `50/100/200/all`）与其他资源（`page`/`limit`）**不是一套**，见手册 §1.5 vs §9.7。
