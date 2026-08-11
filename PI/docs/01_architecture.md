# Marketing Intelligence System (MIS) — Architecture Plan

> 范围：**整个系统** = Competitor Intelligence (CI) + Planning Intelligence (PI) + Administration。
> 适用对象：工程 / 接手维护的人。
> 最后更新：2026-06-30

---

## 0. 一句话定位

MIS 是一个**单文件 HTML dashboard**（`PI/index.html`，托管在 cPanel），背后接 Supabase + n8n + 多个 AI 模型，把"**看懂竞争对手在投什么**"（CI）和"**把洞察变成可执行的测试计划**"（PI）合在一个后台里：

- **CI** —— 自动抓取竞品 Facebook 广告 → AI 解析成结构化情报 → dashboard + 每周自动周报。
- **PI** —— 从想法(Idea) → 假设(Hypothesis) → 素材(Creative) → 结果(Result) 的实验闭环，带「一致性裁判」保证测试干净可比。
- **Administration** —— 角色权限、用户、操作日志、术语字典。

CI 负责"把情报收进来"，PI 负责"把情报变成下月 campaign"，二者通过 **AI 周报 → Idea Pool 自动建议**这条链开始打通。

---

## 1. 系统全景

```
┌──────────────────────────────────────────────────────────────────────┐
│  采集 & 处理层                                                          │
│                                                                        │
│  CI 管道 (n8n @ n8n.ohmediaa.com, 6 条 workflow)                       │
│    Apify ─► Claude(分类/文字情报) ─► Supabase                          │
│                         └─ Visual Drainer(异步) ─► Gemini(视觉)        │
│                                                                        │
│  PI 自动化 (n8n @ adammkt.app.n8n.cloud)                               │
│    Weekly Report ─► Claude(提炼精华) ─► ai_add_idea RPC ─► Idea Pool   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  数据层 (Supabase)                                                      │
│   主库 bfukphakofrjalsqteda:                                            │
│     CI:  competitor_ads + 视图 + monitor_brands + discovery_* +         │
│          weekly_reports + Storage bucket creatives                      │
│     PI:  ideas / hypotheses / creatives / dict_entries                  │
│     Admin: roles / role_permissions / profiles / audit_log + auth.users │
│   基线库 kkypkudherpaxyoocyfa: get_brand_baselines RPC (PI/CI 借用)     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  呈现层 (单文件 HTML dashboard @ cPanel,登录门后)                       │
│   CI:  Weekly Summary / Ads Library / Operators / Funnels /            │
│        Pending List / Watchlist                                        │
│   PI:  Idea Pool / Hypotheses(+New Hypothesis,+素材管理&标签) /        │
│        Creatives / Results / Dictionary                                │
│   Admin: Roles & Permissions / Users / Activity Log                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. 呈现层：一个文件，三大模块

`PI/index.html` 是**单文件、零构建**：所有 HTML/CSS/JS 内联。左侧导航分三组，每组对应若干 `.view` section（`go(v)` 切换显示 `#v-<v>`）：

| 组 | 页面 (nav → view id) |
|---|---|
| COMPETITOR INTELLIGENCE | Weekly Summary `v-reports` · Ads Library `v-gallery` · Operators `v-operators` · Funnels `v-funnel` · Pending List `v-candidates` · Watchlist `v-watch` |
| PLANNING INTELLIGENCE | Idea Pool `v-pool` · Hypotheses `v-hypo` · Creatives `v-creatives` · Results `v-results` · Dictionary `v-dict` （+ New Hypothesis 表单 `v-form`、素材管理&标签 `v-tagmatrix` 两个子页） |
| ADMINISTRATION | Roles & Permissions `v-roles` · Users `v-users` · Activity Log `v-audit` |

**登录门 + 权限**：进入任何页面前要登录（Supabase Auth，用户名 + 密码，邮箱形如 `username@nexmax.local`）。登录后按角色权限显示/隐藏增删改按钮（`data-perm` + `applyPerms`）。闲置 10 分钟自动登出。

---

## 3. CI 数据流（一条广告从抓取到呈现）

1. **取监测清单** — 从 `monitor_brands` 读 `is_active` 的竞品（品牌名 + 国家）。
2. **构造搜索 URL** — 每品牌按「`"品牌名"` 精确短语 + 国家」构造 Apify 参数（`search_type=keyword_exact_phrase`，**加双引号是命中率关键**）。
3. **Apify 抓取** — FB Ad Library scraper，每品牌最多 20 条原始广告。
4. **Enrichment** — 提取漏斗信号（域名 / Telegram / WhatsApp / referral code）；归一 operator_name（去搜索引号）。
5. **Claude 分类 & 文字情报** — 广告文字（截 600 字）→ Claude 判：是否博彩、是否属该对手、hook_type、selling_point(中)、language。**非博彩 / 不属该对手的在此过滤掉，不入库。**
6. **写入 competitor_ads** — upsert（按 `ad_archive_id` 去重），同时存素材原始链接供异步下载。
7. **（异步）Visual Drainer** — 每 30 分钟领"没视觉分析"的广告 → 下载素材 → base64 → Gemini 判 `visual_style` / `creative_theme` / `has_person/money` / `game_type`(多值) → 存档 Storage → 逐行回写。
8. **呈现** — dashboard 读视图渲染；每周一周报 workflow 让 Claude 生成 markdown 周报，存 `weekly_reports`，dashboard 渲染 + Slack 推精简版。

**关键时序**：主链路(1–6) 只处理文字，15–25 分钟跑完；视觉(7) 异步慢慢补。两者解耦、互不阻塞。

---

## 4. PI 数据流（一条洞察从想法到结论）

1. **Idea Pool** — 想法入池（来源：竞品情报 / 市场研究 / 内部数据 / 一线反馈 / 原创直觉）。想法**不绑品牌**、Tag 永不强制。
   - **AI 自动建议**：每周一从最新竞品周报提炼 2–3 条"精华"想法，`created_by='AI'` 自动入池（见 §6 PI 自动化 + `ai_add_idea`）。
2. **New Hypothesis** — 把想法立成假设：选品牌 → 指标按品牌方向**自动锁定**（如 OK188KH 主指标 = 7-Day High-Value Rate、防守底线 = Day-1 Quality Floor）→ 填起因/证据/测试类型/人群/年龄段。
3. **素材管理 & 标签**（Hypothesis 的对比页）— 勾「本次测试维度」（最多 2 个）：
   - 勾 1 个 = 单变量(自动生成 1 行素材)；勾 2 个 = 交叉测(自动生成 4 行 = 2×2)。
   - **一致性裁判** `checkHypoConsistency` 实时判：在测维度必须有差异、没测维度必须全组锁定一致、2 维必须凑成干净的 2×2。不干净就红条拦下、不能 Save 锁定。
4. **Creatives** — 每条素材有版本(versions)与投放回合(runs)；Draft 可改、Save 锁定。
5. **Results** — 汇总测试结论（verdict）。

**核心理念**：用「维度声明 + 一致性裁判」保证每个测试**只变该变的、锁住不该变的**，否则结论不可信。

---

## 5. 数据源（重要：用两个 Supabase 库）

| 用途 | 前端 client | Supabase project | 内容 |
|---|---|---|---|
| **主数据**（CI + PI + Admin） | `db` | **`bfukphakofrjalsqteda`** | competitor_ads + CI 视图、monitor_brands、discovery_*、weekly_reports；ideas / hypotheses / creatives / dict_entries；roles / role_permissions / profiles / audit_log；auth.users |
| **KPI 基线** | `adsDb` | `kkypkudherpaxyoocyfa` | `get_brand_baselines` RPC（品牌基线，给 PI New Hypothesis 表单显示基准；与竞品数据无关） |

> ⚠️ 排查"数据读不出来"最易误判的点：**几乎所有业务数据都在 `bfukphakofrjalsqteda`**。`adsDb`/`kkypkudherpaxyoocyfa` 全系统只被调用一次（`loadBaselines` 里的 `get_brand_baselines`）。

---

## 6. 后端自动化（n8n）

### 6.1 CI 管道 —— 6 条 workflow @ n8n.ohmediaa.com

| Workflow | ID | 职责 | 触发 |
|---|---|---|---|
| **Full Pipeline (MY+KH)** | `ZhGhwYTpAJP8erl0` | 抓取 → Claude 分类 → 文字情报入库（瘦身版，无媒体下载） | 周一 05:00 + Manual + Rescan Webhook |
| **Visual Drainer (30min)** | `dwf40foON48xE7Fk` | 异步补视觉 + 素材存档，每轮 ≤30 条 | 每 30 分钟 + Manual |
| **Weekly Report** | `TjUIKMNFLwN4uYCM` | 读数据 → Claude 生成双市场周报 → 存库 + Slack 精简推送 | 周一 11:00 |
| **Discovery Scan (keyword)** | `6i2ozROThaxVE8KC` | 种子词扫新竞品 → 候选池 | 每月 |
| **Manual Add — Webhook** | `l7Kftsf7YUInNhtL` | 接 dashboard 写操作（加竞品/候选/开关/确认拒绝） | Webhook `/webhook/manual-add` |
| **Error Handler — Alert to Slack** | `mhSOQyDTirrSWjZU` | 任一 workflow 出错报警 Slack | Error Trigger（active=false 正常） |

### 6.2 PI 自动化 —— @ adammkt.app.n8n.cloud

| Workflow | ID | 职责 | 触发 |
|---|---|---|---|
| **PI · Weekly Summary → AI Ideas** | `Y3DlSzzdHS2mPZAd` | 每周读最新 `weekly_reports` → Claude 提炼 2–3 条精华 → `ai_add_idea` RPC 写入 Idea Pool（`by='AI'`，近 10 天去重） | 周一 09:00（建后停用，需人工激活 + 在 Claude 节点选 Anthropic 凭据） |

> 注：CI 在 ohmeidaa 实例、PI 自动化在 adam mkt 实例，是两个不同的 n8n。AI Ideas 工作流走 Supabase REST + 公开 anon key + `ai_add_idea`(SECURITY DEFINER) 安全写入。

---

## 7. 外部服务 / 模型

- **Apify** — FB Ad Library scraper（媒体下载不走 Apify，直接从 FB CDN 拉，成本极低）。
- **Claude Haiku** (`claude-haiku-4-5-20251001`) — CI 广告分类 + 文字情报。
- **Claude Sonnet** (`claude-sonnet-4-6`) — CI 周报生成 + Slack 精简版；PI AI Ideas 提炼。
- **Gemini** (`gemini-2.5-flash`) — CI 素材视觉分析。
- **Slack** — 周报推送（`#feed-ci`）、错误报警。

---

## 8. 关键设计决策

### CI
- **8.1 主管道"瘦身"**：媒体下载移出主链路（早期 170+ 条素材进内存转 base64 撑爆自托管 n8n OOM）。现在主管道只做"抓取→文字分类→入库"，15–25 分钟跑完、物理上不会 OOM。
- **8.2 Visual Drainer 异步**：独立每 30 分钟、每轮 ≤30 条，单轮完即释放内存，内存恒定、失败自愈（下轮重试）。
- **8.3 归因靠 operator + 漏斗后端信号**，不靠创意（博彩创意同质、FB 页面寿命短）。
- **8.4 AI 全量打标，人做重要性筛选**（但非博彩/不属对手的在 Claude 阶段先过滤）。
- **8.5 搜索加双引号精确短语**（命中率 9/22 → 18/22）。
- **8.6 game_type 多值、Gemini 看画面判**（看画面比看文案可靠；可同时 sports+live_casino）。
- **8.7 容错**：中间易失节点 `onError: continueRegularOutput`；Drainer 逐行 PATCH；终点写入节点**不加**容错（让 Error Handler 报警，不静默丢数据）。

### PI
- **8.8 指标按品牌方向锁定**：不同品牌主指标/防守底线不同（`BRAND_METRIC`），表单选品牌后自动套用、`op` 优先级高于只读，避免团队填错指标口径。
- **8.9 一致性裁判（P2）只警告 + Save 拦截**：维度声明后，素材必须"只变该变的"。状态机：`clean`(干净可比) / `nodiff`(勾了没差异) / `crossbad`(2×2 不齐) / `polluted`(没测的维度混了) / `insufficient`(素材<2) / `undeclared`(没勾维度)。
- **8.10 自动生成/回收素材行**：勾维度自动建行（1 维 1 行 / 2 维 4 行）；取消勾选回退时只删**空**行（有 versions/runs 的保留，不毁数据）。
- **8.11 锁定组下拉回退共同值**：没显式锁定时，若所有素材已是同一个值就显示该值，避免误显 unselected。
- **8.12 AI 周报想法**：HTML 只负责显示（`by==='AI'` 加徽章），生成是后端 n8n + `ai_add_idea` RPC（见 §6.2）。

### 部署 / 安全
- **8.13 单文件 + 配置常量集中**：所有环境地址/key 在 `<script>` 顶部常量区，换环境只动那几行。
- **8.14 公开 anon key + RLS**：前端只用 anon key；写权限靠 RLS 策略 + SECURITY DEFINER RPC（`admin_*`、`ai_add_idea`）控制。
- **8.15 demo.html**：演示版（`PI/demo.html`，由 `PI/demo_src/gen_demo.py` 生成）—— 内存 mock 替换 Supabase，自带种子数据、自动登录、不连后端，专供 rawgithack 演示，不污染生产。

---

## 9. 已知边界 / 现状

- **WhatsApp 信号**：字段与提取逻辑在，但当前 KH/MY 对手 0 条带 WhatsApp；Funnels 暂不显示该列。
- **game_type 回填**：存量 ~604/609 已回填；少数会在后续 Drainer 轮次补齐。
- **PI ↔ CI 闭环**：已通过 AI 周报想法打通"情报→想法"第一步；"想法→假设→campaign"仍靠人在 PI 里推进。
- **Slack 周报**：发 `#feed-ci`，精简版（总览 + 重点对手 + 本周可测）；完整版在 dashboard。Slack 不渲染 markdown 表格，故 Slack 必须发 point-form（见 user guide / changelog）。
- **PI Weekly Summary 的 Slack 美化**：在 ohmeidaa 周报 workflow 的 `Post to Slack` 节点处改（point-form prompt），dashboard 端无需改。

---

## 10. 部署与环境

- **生产**：`PI/index.html` 上传 cPanel；连真实 Supabase。上线前已清空测试 ideas/hypotheses/creatives/audit_log，仅留 AI scan 竞品数据 + 字典 + 用户。
- **演示**：`PI/demo.html` 走 rawgithack（`https://raw.githack.com/vvv1088/PI/<branch>/PI/demo.html`），自带数据、不连后端。
- **版本纪律**：当前版本永远 = `PI/index.html`；改前快照旧版到 `PI/versions/index_vN.html`，改完写 `PI/CHANGELOG.md`（见 docs/05_CHANGELOG.md）。


---

## 2026-07-08 更新(v32–v61)

### 新页面(全部仍在单文件 index.html 内)
- **Budget Allocation**(PI 组):品牌×月预算表。分工到人(`budget_assignments`:每品牌 mkt/usc/决策人),Marketing 填「申请」→ USC 填「核批」(金额+理由必填)→ 核批<申请自动「待决策」→ 决策人拍板(锁定,可「重开」);USC 先填为「待申请」。已投放按素材周花费自动汇总。
- **Budget Permission**(Administration):Admin 配每品牌三方负责人。
- **Monthly Overview**(PI 组):当月总览(预算+排期假设+素材就绪度+体检条),各品牌 Marketing 负责人线下审批后「确认发送」→ 落 `monthly_plans` 留痕 + Slack 通知。
- **判定闭环**:假设抽屉「判定」表单(结论/置信度/学到什么/下月约束)→ 状态「已沉淀」→ Results 汇总;判定成立可一键转「主力运行」。

### 数据层新增(主库)
- `hypotheses` 加列:`customer_stage`(顾客阶段,Dictionary 新类 Customer Stage 5 档)、`plan_launch`(预计上线日 ISO)、`plan_test_days`(测试周期,同时驱动 Capacity Check)。
- 新表:`budgets`(unique(month,brand),申请/核批/最终三段各带 by/reason/at)、`budget_assignments`(brand PK)、`monthly_plans`((month,brand) PK,确认留痕+summary 快照)、`app_config`(通知密钥)。
- **budgets 写入走 SECURITY DEFINER RPC**(`budget_save_cell / budget_decide / budget_reopen`,服务端强制分工校验),表直写收紧为 admin;素材图片改传 Storage `creatives/pi/` 存公链。

### 通知链路(新,跑在 adam mkt n8n,与 ohmeidaa 的 CI 六条互不干扰)
```
dashboard 事件(确认发送/预算待决/已定)
   → n8n「MIS Slack Notify」(webhook mis-notify:格式化+@人+按品牌分频道)
   → Slack 原生节点(MIS Bot 应用直发)
n8n「MIS Daily Reminders」每天 09:00 → Supabase RPC mis_reminders(密钥校验)
   → 逐条转发 mis-notify(到期未判定/该上线/预算瓶颈催办 20·23·26·29/发送计划催办 25·27·30/待决策超48h/效果告警/周一汇总)
```
频道:USC → #ops-marketing-usc-mis;INZ9 → #ops-marketing-inz9-mis。

### 生命周期自动接线(此前是断头路)
锁定标签矩阵→「已锁定」;素材版本上线→「测试中」;判定→「已沉淀」;从想法立假设→想法「已立项」。
