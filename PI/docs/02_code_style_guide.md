# Marketing Intelligence System — Code Style Guide

> 范围：**整个项目**的代码约定（dashboard 前端 + n8n Code 节点 + Supabase/SQL + webhook + 文档纪律）。
> 适用对象：在 MIS 上写 / 改代码的人。
> 最后更新：2026-07-08（v32–v61 QA 大修后新增约定已并入 §2.2/§2.4/§2.6/§5/§6/§7）

---

## 1. 总原则

- **单文件、零构建。** dashboard 是一个 `PI/index.html`，HTML/CSS/JS 全内联，不用打包器、不用框架。改完浏览器打开即可验证。
- **改前先快照、改后先验证。** 改 `index.html` 前先 `cp index.html versions/index_vN.html`；改完跑 `node --check`（抽内联 JS）+ 无头渲染冒烟；改 n8n 节点改完用 `get_workflow_details` 读回核对。
- **一次只改一处生产配置，验证后再下一步。**
- **不可逆操作（删表、删数据、删 workflow、清空业务表）前必须明确确认。**
- **每次改 `index.html` 写一条 `PI/CHANGELOG.md`**；重大文档变化同步 `docs/`。

---

## 2. Dashboard 前端（JS）

### 2.1 风格
- **纯原生 JS，ES5/ES6 混用**，无框架。顶层函数用 `function name(){}`（箭头函数只在回调/map 里用）。
- **紧凑写法**：相关短语句可写同一行（项目既有风格），但新增复杂逻辑适当换行保持可读。
- **全局状态用顶层 `let`**：
  - CI：`ads`、`operators`、`reports`、`candidates`、`brands`、`galRows`。
  - PI：`ideas`、`hypos`、`creatives`、`DICT`、`data`(品牌基线)、`budgets`、`bgAssign`、`monthlyPlans`、`roles`、`users`、`currentUser`、`auditLog`。
- **DOM 用原生 API**：`document.getElementById(...)`、`.innerHTML = ...`。不引入 jQuery。

### 2.2 命名约定
| 类型 | 约定 | 例 |
|---|---|---|
| 渲染函数 | `render<模块>` | `renderGallery`、`renderOperators`、`renderPool`、`renderHypo`、`renderCreatives`、`renderTagMatrix`、`renderRoles`、`renderUsers`、`renderAudit` |
| 数据解析 | `<名词>Of` / 动词 | `hooksOf(a)`、`gameTypesOf(a)`、`filteredAds()` |
| 加载 | `load*` | `loadAll`(CI)、`loadPIData`/`loadIdeas`/`loadHypos`/`loadCreatives`/`loadDict`、`loadAuthData`、`loadBaselines` |
| 构建下拉/选项 | `build*` / `*Opts` | `buildFilters`、`buildReportWeeks`、`setOpts`、`dimTabOpts`、`optsHtml` |
| 显示映射（英→中/标签） | `<域>Zh` / `<名>Label`/`Name` | `gameZh`、`langCode`、`dimLabel`、`dictName` |
| 小工具 | 短动词 | `esc`、`pc`、`kpi`、`daysAgo`、`isNew`、`media`、`lb`、`toast`、`go` |
| CI 写操作（webhook） | 动词 | `addCompetitor`、`toggleBrand`、`confirmCand`、`rejectCand`、`rescanBrand`、`hook` |
| PI 写操作（直连 db） | 动词 | `quickAddIdea`、`saveHypothesis`、`tmSaveLock`、`saveFirstVersion`、`saveCreativeCopy` |
| 素材对比页（tag matrix） | `tm*` | `tmToggleDim`、`tmEnsureRows`、`tmTrimRows`、`tmCellChange`、`tmSetLock`、`tmSaveLock`、`tmUnlock`、`tmCommonVal`、`tmSaveHyp` |
| Budget 页 | `bg*` | `bgCanEdit`、`bgStatus`、`bgEditCell`、`bgSaveCell`、`bgDecide`、`bgReopen`、`bgHistory`、`bgSpent`、`renderBgAssign` |
| Monthly Overview | `mp*` / `*MonthlyPlan*` | `renderMonthlyPlan`、`confirmMonthlyPlan`、`mpMonthOfLaunch`、`loadMonthlyPlans` |
| 顾客阶段 / 排期 | `stage*` / `sched*` | `stageOpts`、`stageZh`、`stageColor`、`schedCell`、`hypSchedOf`、`parseMD`/`fmtMD` |
| Admin 写操作（RPC） | 动词 | `saveRole`、`dupRole`、`delRole`、`saveUser`、`delUser`、`resetUserPw` |
| filter DOM id | `f<维度>` | `fMarket`、`fOperator`、`fHook`、`fStyle`、`fFormat`、`fGameType`、`f-src` |

### 2.3 多值字段的标准处理（CI + PI 通用）
逗号分隔多值字段（`hook_type`、`game_type`）统一一套模式：
```js
function gameTypesOf(a){ return (a.game_type||'').split(',').map(s=>s.trim()).filter(Boolean); }
```
- 解析：`split(',') → trim → filter(Boolean)`
- 显示：每值映射中文 → 竖排多个 pill（套 `.hooks` 容器 + pill class）；空值显示 `-`
- 筛选：`gameTypesOf(a).includes(选中值)`（按"包含"，不是相等）
- **新增任何多值字段照此模式做。**

### 2.4 安全 / 健壮
- 所有插入 HTML 的数据文本必须过 `esc()` 转义。**`esc()` 已含单引号转义（v49 XSS 大修）**——但仍然**禁止把用户/外部数据拼进内联事件参数**（`onclick="fn('${x}')"` 这种）；需要传参用索引/id 查全局数组，不传原文（竞品抓取文案经内联 onclick 注入就是这么发生的）。
- 字段取值带兜底：`(a.field||'')`、`a.field==null?'-':...`，永远假设字段可能为 null。
- **禁止用 localStorage / sessionStorage**（部分环境不可用）；状态留在 JS 变量。
- **PI 一致性/渲染同步**：任何改素材维度值/锁定值/勾选维度的写操作之后，**必须重渲染对应页**（如 `tmCellChange`/`tmSetLock`/`tmToggleDim` 末尾调 `renderTagMatrix()`），否则一致性红条会停在旧状态（v27 修过这个 bug）。
- **防连点**：所有会写库的按钮 handler 套 `guard()`（v53 加）——连点会造成重复插入/重复通知。
- **权限门成对接线**：新增任何增删改入口，UI 侧加 `data-perm="sec:act"`（或渲染时 `can()` 判断），**数据库侧确认 RLS/RPC 有对应约束**。只藏按钮不算权限（QA 两轮里最多的一类漏洞）。
- **编辑回填保留原值**：编辑表单保存时只写用户改过的字段，未在表单里出现的字段（如 hypothesis 的 mode/月份/owner）**不得被默认值覆盖**（v50 修过：编辑一次假设把 owner 洗掉）。
- **登录态过期**：长时间挂页后的写操作要处理 auth 过期（提示重新登录，不静默失败）。

### 2.5 数据加载顺序
- CI：`loadAll()` 用 `Promise.all([...])` 并发拉所有 CI 表/视图，任一 error → `showErr()`；加载后归一（`operator_name` 转大写）再渲染。
- 登录后 `initApp()` 串起：`loadPIData()` → 各 render → `applyChrome()` → `loadBaselines()` → `loadAll()`。
- 渲染顺序：先 KPI、再 filters、再各页渲染函数。

### 2.6 v32–v61 新增模式（照此写）
- **通知 fire-and-forget**：业务事件通知走 `misNotify(payload)` → `MIS_NOTIFY_URL`；`catch` 吞错**不阻塞业务写入**；demo 版不发；测试时 payload 加 `channel_override`（#test-test）。消息文案/频道路由不在前端改，在 n8n「MIS Slack Notify」的 Format 节点改。
- **图片上传**：先 `shrinkImage()`（canvas 压缩）再 `uploadImage()` 传 Storage `creatives/pi/` 存公链，失败才回退 base64。**不要把大 base64 直接塞进业务表**（v54 之前的性能坑）。
- **排期/日期**：月-日解析统一走 `parseMD`/`fmtMD`；周口径用 `isoWeekOf`。素材排期**继承假设**（`hypSchedOf`），不在素材上另存一份。
- **单一数据源原则**：同一个数值出现在两处 UI（如 测试周期 同时驱动 Schedule 和 Capacity Check）时，存一个字段、两处读取，不建第二个字段。
- **并发写冲突**：多人可能同时编辑的行（budgets），保存前比对服务端最新值/状态，不一致时提示刷新而非直接覆盖。

---

## 3. Dashboard 前端（CSS）

- **CSS 变量集中在 `:root`**：颜色/间距走变量（`--bg`、`--panel`、`--border`、`--accent`、`--good`/`--green`、`--bad`/`--red`、`--violet`、`--amber`…），不散落硬编码色值。
- **class 短小语义化**：`.card`、`.pl`(pill 基类)、`.hook`/`.style`/`.cta`/`.kh`/`.my`/`.new`/`.win`/`.dur`、`.hooks`(竖排 pill 容器)、`.byai`(AI 徽章)、`.on`/`.off`、`.btn`/`.btn.ghost`、`.empty`、`.err`、`.sm`、`.cn`、`.life`。
- **pill 体系**：所有标签用 `.pl` 基类 + 类型修饰类。新标签类型沿用这套。
- **表格**：`table-layout:fixed` + `<colgroup>` 控列宽；表头 sticky。**加列时同步更新 colgroup 列宽（总和≈100%）和所有 colspan。**

---

## 4. n8n Code 节点（JS）

### 4.1 通用
- Code 节点 `$input.all()` 取入参，返回 `[{json:{...}}, ...]`。
- **跨节点按 index 对齐**用 `$('节点名').all()`，同一个 i 索引（如 Drainer `$('Build list').all()[i]`）。
- **健壮解析 AI JSON** 一律 try/catch，失败给空兜底：
```js
let v={}; try{ v=JSON.parse(t.replace(/```json/g,'').replace(/```/g,'').trim()); }catch(e){ v={}; }
```
- 入参可能单项/多项时做双形态兼容。

### 4.2 写库
- **逐行 PATCH 优于批量 upsert**：各行字段集合可能不一致时（Gemini 部分成功），用 `PATCH ...?ad_archive_id=eq.{{id}}` 逐行写，避开 PostgREST "All object keys must match"。
- 批量 upsert（主管道）仅当所有行字段一致时用，`?on_conflict=ad_archive_id`，header `Prefer: resolution=merge-duplicates,return=minimal`。

### 4.3 容错配置
- 中间易失节点（Apify、Claude Parse、Gemini、Download、Upload）设 `onError: continueRegularOutput`。
- 外部 API HTTP 节点设 `retryOnFail: true` + 合理 `maxTries`/`waitBetweenTries`（Gemini 5 次/20s 退避应对 503）。
- **终点写入节点不加容错**（失败要让 Error Handler 报警，不能静默吞）。
- 高频 workflow（Drainer）关 `saveExecutionProgress`/`saveDataSuccessExecution`。

### 4.4 AI 调用约定
- **Claude**：`anthropic-version: 2023-06-01` header；分类用 Haiku、生成用 Sonnet；input 截断控 token（广告正文截 600 字）。
- **Gemini**：`inline_data` 传 base64 + mime；prompt 末尾要求"只回 JSON、无 markdown"；枚举字段在 prompt 里**锁死取值范围**，多值要求逗号分隔无空格。
- **PI AI Ideas 工作流**：jsonBody 用整体表达式返回对象（n8n 自动 JSON 序列化、安全转义 report_md），prompt 要求"严格只输出 JSON 数组"；解析节点 try/catch + 剥代码围栏。

---

## 5. Supabase / SQL

- **字段命名 snake_case**（`operator_name`、`ad_archive_id`、`game_type`、`val_from`、`test_dim`、`locked_tags`）。
- **多值字段用 text 存逗号分隔**（`hook_type`、`game_type`）——与前端解析、既有字段一致；不用数组类型。（PI 例外：`ideas.tags` 用 `text[]`，`hypotheses.tests`/`locked_tags` 用 jsonb。）
- **去重键**：`competitor_ads` 以 `ad_archive_id`；`ideas`/`hypotheses`/`creatives` 用 `code`/`gen_code`（由触发器 `trg_idea_code` 等自动生成，**插入时不要手填 code**）。
- **视图**：前端读视图而非原表（`v_ads_gallery`、`v_operator_intel`）。**新增列要前端能用，必须把列加进对应视图 SELECT**（否则原表有、前端拿不到——`game_type` 加列时就栽在这）。
- **改视图加列**：`CREATE OR REPLACE VIEW` 不允许中间插列，新列加在 SELECT **末尾**，或 `DROP + CREATE`。
- **权限写入走 SECURITY DEFINER RPC**：`admin_create_user/admin_set_password/admin_set_username/admin_delete_user`（带 `is_admin()` 守卫）、`ai_add_idea`（anon 可执行、近 10 天去重）；**v56 起预算类同理**：`budget_save_cell/budget_decide/budget_reopen`（服务端强制分工/理由/锁校验，`budgets` 表直写收紧为 admin）、`mis_reminders(p_secret)`（anon 可执行但需 `app_config` 密钥）。前端只用 anon key，写权限靠 RLS + 这些 RPC。
- **约定：凡"谁能写哪格"有业务规则的表，规则必须写进 RPC，前端 `can()`/`bgCanEdit()` 只做体验层**——不要新增"前端判断 + 表直写"的组合。
- 多语句 SQL 优先 `execute_sql`（`apply_migration` 曾超时）；DDL 用 `apply_migration`。

---

## 6. Webhook 约定（CI）

- dashboard 写操作走一个 webhook（`WEBHOOK_URL` → `/webhook/manual-add`），payload 带 `action` 区分（`add_competitor`/`add_candidate`/`toggle_brand`/`confirm_candidate`/`reject_candidate`）。
- 单品牌重抓走 `RESCAN_URL` → `/webhook/rescan-brand`，payload `{brand}`。
- 前端 `hook(payload)` 统一封装 POST + 错误处理；写完 `await loadAll()` 刷新。
- **PI 写操作不走 webhook**，直接 `db.from(...).insert/update/delete` 或 `db.rpc(...)`（PI 数据在主库、有 RLS/RPC 把关）。
- **例外：Slack 通知走 `MIS_NOTIFY_URL`**（→ adam mkt n8n `/webhook/mis-notify`），payload 带 `kind` 区分（`plan_confirmed`/`budget_decide`/`budget_settled`/`raw`），fire-and-forget（见 §2.6）。

---

## 7. 配置常量（dashboard `<script>` 顶部集中声明）

```
SUPABASE_URL / SUPABASE_ANON   → 主库 bfukphakofrjalsqteda（db；CI + PI + Admin 全在这）
ADS_URL / ADS_ANON             → kkypkudherpaxyoocyfa（adsDb，仅 get_brand_baselines）
WEBHOOK_URL                    → /webhook/manual-add
RESCAN_URL                     → /webhook/rescan-brand
MIS_NOTIFY_URL                 → adam mkt n8n /webhook/mis-notify（Slack 通知，v60 加）
AUTH_DOMAIN                    → '@nexmax.local'（用户名拼成登录邮箱）
```
**改库 / 换环境只动这几个常量，不要把地址散写进函数。**

---

## 8. demo.html 生成纪律

- demo 版**不要手改** `PI/demo.html`；改 `index.html` 后跑 `python3 PI/demo_src/gen_demo.py` 重新生成，保持 demo 与生产逻辑一致。
- 生成器做两件特殊处理：① 把 supabase CDN 脚本换成内存 mock（保留 marked/Chart CDN）；② 把 `WEBHOOK_URL` 置空（`PASTE_DEMO_DISABLED`），避免演示误发生产。
- 种子数据在 `gen_demo.py` 里维护（覆盖各种 idea/hypothesis/creative 状态 + 竞品广告多值 game_type）。
