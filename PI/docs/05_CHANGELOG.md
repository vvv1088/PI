# Marketing Intelligence System — CHANGELOG（合并版）

> ⚠️ **重建版 changelog**，根据开发过程整理，覆盖所有**重大**改动，不保证逐个小改完整；上线前的早期历史可能不全。
> 系统有两条相对独立的开发线：**CI**（按日期）和 **PI**（按版本号 vN，逐版细节见 `PI/CHANGELOG.md`）。本文件把两条线合在一起，外加跨模块改动。
> 排序：各 track 内时间倒序（最新在上）。最后更新：2026-06-30

---

## 跨模块 / 部署（2026-06-29 ～ 06-30）

- **CI ↔ PI 打通第一步：AI 周报想法**。新建 n8n 工作流 `PI · Weekly Summary → AI Ideas`（adam mkt 实例）：每周读最新竞品周报 → Claude 提炼 2–3 条精华 → `ai_add_idea` RPC 写入 Idea Pool（`by='AI'`、近 10 天去重）。配套新增 SECURITY DEFINER RPC `ai_add_idea`。HTML 侧无需改（AI 徽章一直都在）。建后停用，需人工激活 + 在 Claude 节点选 Anthropic 凭据。
- **Finalize 上线**：`PI/index.html` 定稿传 cPanel；清空生产测试数据（ideas/hypotheses/creatives/audit_log），保留竞品 AI scan + 字典 + 用户。
- **演示版 `PI/demo.html`**：内存 mock 替换 Supabase、自带种子数据、自动登录、不连后端，走 rawgithack 演示；由 `PI/demo_src/gen_demo.py` 生成（webhook 已置空，不会误发生产）。
- **整套项目文档**：`PI/docs/` 加 architecture / code_style_guide / code_map / user_guide / CHANGELOG（本文件），整合 CI（外部完整版）+ PI。

---

# CI Track（@ n8n.ohmediaa.com + 主库 bfukphakofrjalsqteda）

## 2026-06-30
### Slack 周报：精简化 + 换频道
- 周报 Slack 推送从"塞全文"改"精简摘要"。之前整篇带表格 markdown 倒进 Slack、表格不渲染糊成一坨。
- 改为只发：市场总览 + 重点对手(前3) + 本周可测(前2) + dashboard 链接，约 10 行一屏。完整版仍存库。
- 实现：纯改 `Post to Slack` 一个节点的转换逻辑（markdown 表 → `• 列1 — 列2` 要点、跳首个 H1、限条数）。
- 频道 `#test-test` → `#feed-ci`（换 webhook URL）。

### Game Type 维度：端到端 + 存量回填
- 新增 `game_type`（competitor_ads，text 逗号分隔多值）：slots/live_casino/sports/lottery/fishing/cockfight。
- 由 Gemini 看画面判（非文案），可多值；识别出具体类型时剔除 unknown。
- 改 Drainer 三处（Gemini Analyze prompt 多值枚举 → Gemini Merge unknown 清洗 → Supabase Patch 写入）。
- **重建 `v_ads_gallery` 把 game_type 透传前端**（关键：原表有列、视图不 SELECT 则前端拿不到）。
- 存量 609 条回填（临时放宽 Drainer 取数条件到 `game_type=is.null`、limit 30，靠 30 分钟 schedule 灌完后恢复）。
- 前端：Ads Library Game Type 下拉/列接真实数据，多个中文 pill（同 hook 模式）。

## 2026-06-11 ～ 06-12（dashboard 多轮打磨）
- KPI 跟随筛选重算、筛选态标 `(filtered)`；表格底部加"共 N 条，已全部显示"。
- 筛选器级联（选市场后下拉只列该市场范围内的值）。
- Ads Library 加 Format 筛选 + 列（media_type，Apify 自带）。
- Funnels：删 Ref 列；Telegram/域名改可点链接；按信号量排序。表头 Creative Theme → Description。
- Glossary：删弱标签区；加 Watchlist Source / Format / Game Type 区块。
- 周报格式硬化：§1 纵向表、§2–5 横向表、品牌名大写、禁宽表格（防 markdown 表塌成 "60440"）；`max_tokens` 2000 → 4000。

## 2026-06-10 ～ 06-11（架构大改：瘦身 + 异步排水器）
- **主管道瘦身解决 OOM**：媒体下载 + 视觉分析移出主管道（170+ 条进内存转 base64 撑爆自托管 n8n）。主管道只留"抓取 → Claude 文字分类 → 入库"，15–25 分钟跑完、不再 OOM；入库存素材原始链接供异步下载。
- **新增 Visual Drainer**：独立每 30 分钟、每轮 ≤30 条，下载 → 存档 → Gemini → 回写；内存恒定、失败自愈。写库改**逐行 PATCH** 绕开 PostgREST "All object keys must match"。
- 时刻表：主管道周一 05:00、周报周一 11:00（留 6h 缓冲让视觉先补）。

## 2026-06-09 ～ 06-10（搜索精度 + 发现机制）
- 搜索改 `"品牌名"` + `keyword_exact_phrase`，命中率 9/22 → 18/22；Enrichment 去引号。
- Discovery Scan：月度种子词扫新 operator → 候选池 → Pending List 人工确认/拒绝。
- Manual Add Webhook：dashboard 写操作统一走 `/webhook/manual-add`，按 `action` 分支。

## 2026-06-08 ～ 06-09（系统初建）
- 建 `competitor_ads` + 去重键 `ad_archive_id` + 各视图。
- 主管道首版（Apify → Claude 分类 → 入库）；单文件 dashboard 首版；周报 workflow 首版；Error Handler。
- 数据模型确立：以 operator 为追踪单位、靠后端漏斗信号归因、AI 全量打标人做筛选。

---

# PI Track（主库 bfukphakofrjalsqteda；逐版细节见 `PI/CHANGELOG.md`）

| 版本 | 日期 | 摘要 |
|---|---|---|
| **v31** | 06-29 | 修复「Reset PW 改完变回 123123」（前端 prompt 默认值预填 123123 的坑；后端正常）+ AI 周报想法接回 Idea Pool（4 条 + `ai_add_idea` RPC） |
| **v30** | 06-29 | Finalize：独立 `demo.html` + 生成器留档 + 清空生产测试数据 |
| **v29** | 06-29 | Ads Library Game Type 接真实数据（`gameTypesOf`/`gameZh`/多值中文 pill/`includes` 筛选/下拉补 unknown） |
| **v28** | 06-29 | 交叉测 2×2 网格校验（`crossbad`：每维恰 2 值、4 组合齐全、无空，否则拦下） |
| **v27** | 06-29 | 对比页三 bug：一致性红条陈旧（`tmCellChange` 补 `renderTagMatrix`）/ 锁定组下拉回退共同值（`tmCommonVal`）/ `openTagMatrix` 收抽屉 |
| **v26** | 06-29 | 登录页精简（删灰副标题 + 底部 hint）+ 对比页红条间距 + 取消勾选自动减空行（`tmTrimRows`） |
| **v25** | 06-28 | 命名/按钮统一（素材管理 & 标签 / Draft·Save 英文 + 右上角）+ New Hypothesis 重排 + 闲置自动登出 + 登录登出进 Activity Log |
| **v24** | 06-28 | 对比页 Draft/锁定（仅 Admin 改，`locked_tags._locked`）+ Creative Draft/Save + 选维度自动生成行（`tmEnsureRows`） |
| **v23** | 06-28 | UI 优化批次（指标格收窄 / 抽屉三排 / 表头 🔒▲ / 测试维度最多 2 个） |
| **v22** | 06-28 | 多选测试维度（`test_dim` 逗号分隔）+ 全组锁定 + 人群/年龄上移到 New Hypothesis |
| **v21** | 06-28 | 抽屉去重 + HVR 占位基准 8%（`loadBaselines` 注入 placeholder） |
| **v20** | 06-28 | 素材标签从逐条 Setup 搬到假设级「对比页」`#v-tagmatrix` |
| **v19** | 06-28 | 指标格子对齐（主指标/防守底线两行三格列对齐） |
| **v18** | 06-28 | P1b 素材标签（动态读 DICT）+ P2 一致性裁判（`checkHypoConsistency`） |
| **v17** | 06-28 | 指标区 UI 微调 |
| **v16** | 06-28 | 指标按品牌方向锁定（`BRAND_METRIC`：OK188KH=HVR、17WINKH=FDC/CPA、防守底线锁 DQF） |
| **v15** | 06-28 | New Hypothesis 重构 P1a（假设端：删素材矩阵 + 维度声明 + 逐条建骨架） |
| **v14** | 06-26 | 未选品牌 baseline 文案；INZ9 币种标注（RM/周） |
| **v13** | 06-26 | Hypothesis 列表 Create Date 列；Baseline 实时接入（`get_brand_baselines` RPC，USC raw / INZ9 `_adj`，30 天窗口） |
| **v12** | 06-25 | v11 团队实测反馈第二轮（含 Creative Edit 抽屉修复） |
| **v11** | 06-25 | 团队实测反馈第一轮 |
| **v10** | 06-25 | 单文件外科改动批次 |
| **v9** | 06-25 | 基线版（2002 行）|

> v8 及更早：单文件 dashboard + PI 雏形初建（基线血缘见 `PI/CHANGELOG.md` 顶部）。

---

## 附：枚举与配置演进备忘

- **CI hook_type**：15 类固定枚举（多值）。**CI visual_style**：6 类（单值）。**CI game_type**：6 类 + unknown（多值，06-30 加入）。**media_type/Format**：VIDEO/IMAGE/DCO/CAROUSEL（Apify 自带）。
- **PI 字典**（dict_entries，月会增删）：Format / Hook / Visual Style / Offer / Persona / Age Range / Game Type / Metrics / Test Type / Trigger / Evidence / Idea Source / Capacity / CI Fields / Watchlist Source。
- **PI 一致性状态**：clean / nodiff / crossbad / polluted / insufficient / undeclared。
- **品牌指标锁定**（`BRAND_METRIC`）：OK188KH 主指标 = 7-Day High-Value Rate、防守底线 = Day-1 Quality Floor；17WINKH = FDC/CPA + DQF。
- **数据源**：业务数据全在 `bfukphakofrjalsqteda`（前端 `db`）；KPI 基线在 `kkypkudherpaxyoocyfa`（`adsDb`，仅 `get_brand_baselines`）。
- **n8n 实例**：CI 在 n8n.ohmediaa.com，PI 自动化在 adammkt.app.n8n.cloud。


---

## PI track 增量:v32–v61(2026-07-07 ~ 07-08)

一天内 30 个版本,大项(逐版细节见根目录 `PI/CHANGELOG.md`):
- **功能**:顾客阶段(hypothesis 层+Dictionary)、预计排期(日历+测试周期,与容量体检合一)、素材 Schedule/结束运行/周花费、判定 UI(闭环打通)、Budget Allocation(分工/审批/决策/留痕/自动汇总)、Budget Permission、Monthly Overview(按品牌确认发送)、Slack 通知全链路(事件+每日提醒,MIS Bot 直发,分 USC/INZ9 频道)。
- **QA 大修(两轮,60+ 项)**:XSS 全站转义+esc 修复、权限门补齐(标签矩阵/素材/字典/Budget 矩阵行接线)、编辑假设不再改写 mode/月份/owner、Run 落库、Results 胜率修正、月份/素材筛选动态化、周报去重、假统计条改真数、gallery 防抖+分页、死代码清理、状态机断头路接通(锁定→已锁定/上线→测试中/立假设→已立项)。
- **安全/性能**:Budget 写入升级 SECURITY DEFINER RPC + RLS 收紧;图片压缩+迁 Storage;登录态过期处理;防连点;Budget 并发冲突检测。
