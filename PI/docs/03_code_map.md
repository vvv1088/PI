# Marketing Intelligence System — Code Map

> "找 bug / 做扩展"的查询手册：函数在哪、字段是什么、每条 workflow 有哪些节点、每个 RPC 干嘛。
> 范围：**整个项目**（CI + PI + Administration）。
> 最后更新：2026-06-30

---

## 1. 页面 ↔ view id ↔ 渲染函数

导航 `go(v, el)`：隐藏所有 `.view`、显示 `#v-<v>`。

### CI（6）
| 导航名 | view id | 主渲染函数 | 数据来源 |
|---|---|---|---|
| Weekly Summary | `v-reports` | `renderReport` / `renderReportTabs` / `pickReportTab` / `buildReportWeeks` | `weekly_reports` |
| Ads Library | `v-gallery` | `renderGallery` ← `filteredAds` | `v_ads_gallery` |
| Operators | `v-operators` | `renderOperators` | `v_operator_intel` |
| Funnels | `v-funnel` | `renderFunnel` | `v_ads_gallery`(聚合) |
| Pending List | `v-candidates` | `renderCandidates` | `discovery_candidates` |
| Watchlist | `v-watch` | `renderBrands` | `monitor_brands` |

### PI（5 + 2 子页）
| 导航名 | view id | 主渲染函数 | 容器 id | 数据来源 |
|---|---|---|---|---|
| Idea Pool | `v-pool` | `renderPool` | `poolBody` | `ideas` |
| Hypotheses | `v-hypo` | `renderHypo` | `hypoBody` | `hypotheses` |
| New Hypothesis（子页/表单） | `v-form` | `renderForm`/`resetHypoForm`/`updateAll` | — | `hypotheses`(写) + 基线 |
| 素材管理 & 标签（子页/对比页） | `v-tagmatrix` | `renderTagMatrix` | `tagmatrixBody` | `hypotheses`+`creatives` |
| Creatives | `v-creatives` | `renderCreatives` | `creativeBody` | `creatives` |
| Results | `v-results` | `renderResults` | `resultsBody` | `hypotheses`(verdict) |
| Dictionary | `v-dict` | `renderDict` | `dictTabs`/`dictBody`/`dictNote` | `dict_entries` |

### Administration（3）
| 导航名 | view id | 主渲染函数 | 容器 id | 数据来源 |
|---|---|---|---|---|
| Roles & Permissions | `v-roles` | `renderRoles` | `rolesBody` | `roles`+`role_permissions` |
| Users | `v-users` | `renderUsers` | `usersBody` | `profiles` |
| Activity Log | `v-audit` | `renderAudit` | `auditBody` | `audit_log` |

---

## 2. CI 函数清单（共用工具标「共用」）

### 渲染
- `renderGallery()` — Ads Library：先 `filteredAds()` 得 `galRows`，渲染行 + 底部"共 N 条" + `renderKpis(galRows)`。
- `filteredAds()` — 按 `fMarket/fOperator/fHook/fStyle/fFormat/fGameType/fSearch` 过滤 `ads`。**所有 Ads Library 筛选逻辑在这里。**
- `renderKpis(rows)` — 顶部 4 KPI（Total Ads / Active Operators / New This Week / Longest Running）；传 `galRows` 则跟随筛选并标 `(filtered)`。
- `renderOperators()` / `renderFunnel()` / `renderBrands()` / `renderCandidates()`。
- `renderReport()` / `renderReportTabs()` / `pickReportTab()` / `buildReportWeeks()` — 周报：选周 + 切市场 tab + marked 渲染 markdown。

### 数据解析 / 映射
- `hooksOf(a)` / `gameTypesOf(a)` — 逗号分隔多值解析。
- `gameZh(key)` — game_type 英→中（`GAME_ZH` 映射，先查 `DICT['Game Type']` 回退 `GAME_ZH`）。
- `langCode(l)` / `isNew(a)` / `media(a)` / `lifeStatus`/`lifeBadge`/`lifeMatch`(活跃度) / `hookCounts()`/`countBy()`(共用)。

### 筛选控件
- `buildFilters()` — 按当前市场重建 Operator/Hook/Style/GameType 下拉（级联）。
- `setOpts(id,label,vals)` — 通用重填下拉，保留仍有效的选中值（共用）。
- `drill(op)` / `clearDrill()` — 从别处点 operator 跳 Ads Library 预筛。

### 写操作（→ webhook）
- `addCompetitor()` / `addCandidate()` / `toggleBrand()` / `confirmCand()` / `rejectCand()` / `rescanBrand()`。
- `hook(payload)` — 写操作底层 POST 封装（→ `WEBHOOK_URL`）。

### 加载
- `loadAll()` — 并发拉 CI 全部（`v_ads_gallery`/`v_operator_intel`/`weekly_reports`/`discovery_candidates`/`monitor_brands`）。
- `loadBaselines()` — `adsDb.rpc('get_brand_baselines')`（**全系统唯一用 `adsDb` 处**）。

### 全局
`ads`、`operators`、`reports`、`candidates`、`brands`、`galRows`。

---

## 3. PI 函数清单

### 加载
- `loadPIData()` = `Promise.all([loadDict(), loadIdeas(), loadHypos(), loadCreatives()])`。
- `loadIdeas()` → `ideas`（map：code/txt/src/tags/pri/by/date/age/st）。
- `loadHypos()` → `hypos`（map 含 `testDims`(test_dim split)、`lockedTags`(locked_tags)、品牌/指标/persona/age 等）。
- `loadCreatives()` → `creatives`（map 含 `gen`/`hyp`/`format`/`hook`/`visual_style`/`offer`/`game_type`/`versions`/`runs`/`st`）。
- `loadDict()` → `DICT`（按 tab 分组，元素 `{c,n,d,u,on}`）。

### Idea Pool
- `renderPool()` — 渲染想法表；读 `f-src`/`f-arch` 过滤；`by==='AI'` 显示 `.byai` 徽章；超期(>60天)标红。
- `quickAddIdea()` — 一句话快速加想法（src='原创直觉'，by=当前用户）。
- `openIdeaEditor()` / `saveIdea()` / `archiveIdea(id)` / `delIdea(id)` / `filterOverdue()` / `refreshOverdue()`。
- AI 想法由后端写入（`ai_add_idea`，`by='AI'`），前端只显示。

### New Hypothesis（表单）
- `resetHypoForm()` / `validateHypo()` / `saveHypothesis()` / `editHypothesis(id)`。
- `onBrandChange()` / `syncMetricByBrand()` — 选品牌后按 `BRAND_METRIC` 锁定主指标 + 防守底线（`HVR`=7-Day High-Value Rate、`DQF`=Day-1 Quality Floor）。
- `updateAll(skipSync)` — 表单联动重算（基线文案、指标区、容量体检）；未选品牌显示"请先选择品牌"。

### Hypotheses 列表 / 详情
- `renderHypo()` — 列表（含 `测·维度` pill）；`openHypo`/抽屉详情；`go('hypo')` 返回。

### 素材管理 & 标签（对比页，`tm*`）
- `openTagMatrix(hypId)` — 进对比页（**先 `closeDrawer()`** 收起抽屉，v27 修）。
- `renderTagMatrix()` — 渲染：测试维度勾选区 + 全组锁定区 + 素材表 + 一致性红条。
- `checkHypoConsistency(hyp, overrideCr)` — **一致性裁判**，返回 `state`：`undeclared`/`insufficient`/`nodiff`/`crossbad`/`polluted`/`clean`。2 维额外校验干净 2×2（每维恰 2 值、4 组合齐全、无空）。
- `judgeMeta(jc)` — state → 徽章（含 `crossbad: 🔴 2×2 不齐`）。
- `tmToggleDim(dimKey)` — 勾/取消测试维度（最多 2）；之后 `tmEnsureRows`(补) + `tmTrimRows`(回退删空行) + 重渲染。
- `tmEnsureRows(hyp,target)` — 自动补素材行到目标数（1 维 1 / 2 维 4）。
- `tmTrimRows(hyp,target)` — 维度减少时删多余的**空**行（无 versions/runs，按 V 序倒序，保护已填）。
- `tmCellChange(sel)` — 改在测维度下拉值 → 存 db + **`renderTagMatrix()` 重算红条**（v27 修陈旧 bug）。
- `tmSetLock(dimKey,val)` — 设全组锁定值，套用所有素材行 + 重渲染。
- `tmCommonVal(dimKey,cr)` — 锁定组下拉回退：素材全相同则返回该值，否则 ''。
- `tmSaveLock()` — Save 锁定（不一致拦下；锁后只读、仅 Admin 解锁，存 `locked_tags._locked`）。
- `tmUnlock()` — 解锁回 Draft（仅 Admin）。
- `tmEditable()` / `tmSaveHyp(hyp,patch)` — 可编辑判定 / 存假设字段。
- 常量：`MATRIX_DIMS`（5 维 `[key,label,required]`）、`MATRIX_DIM_KEYS`、`DIM_DICT_TAB`（维度 key → 字典 tab）、`dimLabel`/`dimTabOpts`/`dictName`/`optsHtml`。

### Creatives
- `renderCreatives()` — 列表；无版本显示 Setup、有版本显示 Edit。
- `firstVersion(i)` / `saveFirstVersion(i,mode)` — 首版（Draft/Save）。
- `editCreativeCopy(i)` / `saveCreativeCopy(i,mode)` / `creativeContentMissing()`。

### Results / Dictionary
- `renderResults()` — 测试结论汇总。
- `renderDict()` — 字典：tab 切换（`dictTab`）+ 词条增改（`addDictEntry` 等）。

### 全局
`ideas`、`hypos`、`creatives`、`DICT`、`data`(基线对象，默认硬编码 OK188KH/INZ9，`loadBaselines` 覆盖)、`sibling`(品牌兄弟映射)、`BRAND_METRIC`/`METRIC_FULL`/`GUARD_FULL`/`HVR`/`DQF`。

---

## 4. Admin / Auth 函数

- `doLogin()` — `signInWithPassword(username+AUTH_DOMAIN, pwd)` → `loadAuthData()` → `initApp()`；记 `auth/login`。
- `logout()` — 记 `auth/logout` → `signOut` → reload。
- `loadAuthData()` — 并发拉 `roles`/`role_permissions`/`profiles` + `auth.getUser()`；据 uid 匹配 profile 设 `currentUser`、组装 `roles`(含 perms)、`users`。
- `curRole()` / `can(sec,act)` / `applyPerms()`(按 `data-perm` 显隐) / `applyChrome()`(头像/角色/Admin 组显隐 + 重渲 Admin 页)。
- `logAction(sec,act,target)` — 写 `audit_log` + 本地 `auditLog`。
- `resetIdleTimer()` — 闲置 10 分钟自动 `logout()`（鼠标/键盘/点击/滚动重置）。
- 角色：`renderRoles`/`openRoleEditor`/`renderRoleEditor`/`togglePerm`/`saveRole`/`dupRole`/`delRole`。常量 `PERM_SECTIONS`/`READ_ONLY`/`ACT_LABEL`/`allPerms`。
- 用户：`renderUsers`/`openUserEditor`/`saveUser`/`delUser`/`resetUserPw`。
- 日志：`renderAudit`/`fmtTs`/`secName`。

---

## 5. 表 — 字段字典

### 5.1 competitor_ads（CI 核心表）
| 字段 | 含义 | 来源阶段 |
|---|---|---|
| `ad_archive_id` | FB 广告唯一 ID（去重键） | Apify |
| `operator_name` | 对手品牌名（去引号、大写归一） | Enrichment |
| `country` | KH / MY | Enrichment |
| `page_id`/`page_name` | 投放 FB 主页 | Apify |
| `ad_text` | 广告正文 | Apify |
| `hook_type` | 营销钩子（**多值**，15 枚举） | Claude |
| `selling_point` | 卖点（中文一句） | Claude |
| `language` | 文案语言 | Claude |
| `media_type` | VIDEO/IMAGE/DCO/CAROUSEL | Apify |
| `image_url`/`video_url` | 素材原始链接（会过期） | Apify |
| `snapshot_url` | 快照链接 | Apify |
| `visual_style` | 视觉风格（**单值**，6 枚举） | Gemini |
| `creative_theme` | 画面内容概括（中文） | Gemini |
| `has_person`/`has_money` | 画面有真人/钱 | Gemini |
| `game_type` | 游戏类型（**多值**，6+unknown） | Gemini |
| `stored_image_url`/`stored_video_url` | 存档 Storage 公链 | Drainer |
| `extracted_domain`/`_telegram`/`_whatsapp`/`_ref_code` | 漏斗信号 | Enrichment |
| `start_date`/`end_date`/`duration_days` | 投放周期 | Apify/计算 |
| `is_active`/`is_gambling` | 在投/博彩 | 计算/Claude |
| `first_seen`/`last_seen` | 首/最近抓到 | 系统 |

**枚举**：
- `hook_type`(15)：deposit_bonus, free_credit, rebate, vip, slots, live_casino, sports, sports_sponsorship, celebrity, money_promise, prediction, urgency, social_proof, trust, luck
- `visual_style`(6)：real_person, ugc, official_design, game_screenshot, animation, winner_showcase
- `game_type`(6+兜底)：slots, live_casino, sports, lottery, fishing, cockfight (+ unknown)

> 注：CI 的 `hook_type`/`visual_style` 枚举（用于竞品广告分类）与 PI 字典 `Hook`/`Visual Style`（用于自家素材打标）取值集**不完全相同**——CI 由 AI 按竞品画面打，PI 由人按自家维度选。

### 5.2 PI 表
- **ideas**：`code`(触发器 `trg_idea_code` 生成)、`txt`、`src`(来源中文名)、`tags text[]`、`pri`(高/中/低)、`status`(待评估/已立项/搁置/已归档…)、`created_by`(人名 或 `AI`)、`created_at`。
- **hypotheses**：`code`、`statement`、`brand`、`metric`/`val_from`/`val_to`/`mode`、`test_type`、`persona`、`age_range`、`evidence`、`guard`、`trigger_type`、`status`、`idea_code`/`idea_label`、`test_dim`(逗号分隔在测维度)、`locked_tags jsonb`(全组锁定值 + `_locked`)、`tests jsonb`、`verdict jsonb`、`format`/`hook`/`visual_style`/`offer`/`game_type`(假设级默认)。
- **creatives**：`gen_code`(唯一)、`ads_code`、`hyp_code`/`hyp_label`、`label`、`status`、`format`/`hook`/`visual_style`/`offer`/`game_type`/`audience`/`age`(维度标签)、`versions jsonb`、`runs jsonb`、`spend`/`fdc`/`cpa`/`stc`、`thumb`。
- **dict_entries**：`tab`、`code`、`name`、`descr`、`usage`、`active`、`sort`。tab 含 Format/Hook/Visual Style/Offer/Persona/Age Range/Game Type/Metrics/Test Type/Trigger/Evidence/Idea Source/Capacity/CI Fields/Watchlist Source。

### 5.3 Admin 表
- **roles**：`id`、`key`、`name`、`is_admin`。
- **role_permissions**：`role_id`、`section`(watchlist/pending/idea/hypo/creative/dict)、`can_add`/`can_edit`/`can_delete`。
- **profiles**：`id`(=`auth.users.id`)、`username`、`name`、`role_id`。
- **audit_log**：`user_id`、`username`、`name`、`section`、`action`、`target`、`created_at`。

---

## 6. 视图（前端读这些，不读原表）

| 视图 | 用途 | 关键点 |
|---|---|---|
| `v_ads_gallery` | Ads Library + Funnels 数据源 | **加新列要在这个视图 SELECT 里加**，否则前端拿不到 |
| `v_operator_intel` | Operators 总览 | 按 operator 聚合 |
| `v_report_data` | 周报生成数据源 | Weekly Report workflow 读它 |
| `v_analyzed` / `v_competitor_ads_clean` / `v_known_pages` | 辅助/清洗 | 内部用 |

---

## 7. Workflow 节点图

### CI（@ n8n.ohmediaa.com）
**7.1 Full Pipeline (MY+KH) `ZhGhwYTpAJP8erl0`**
`Get brands → Build brand URLs → Apify scrape(onError continue) → Enrichment → Batch ads → Claude Parse(Haiku, onError continue) → Merge & Filter → Aggregate rows → Supabase Upsert(无 onError)`

**7.2 Visual Drainer (30min) `dwf40foON48xE7Fk`**
`Get pending → Build list → Download media(onError) →` 分两路 `[To base64 → Gemini Analyze(retry 5/20s) → Gemini Merge → Supabase Patch(逐行 PATCH)]` 和 `[Upload to Storage]`

**7.3 Weekly Report `TjUIKMNFLwN4uYCM`**
`Report Schedule(周一11:00) → Get report data → Prep prompt(max_tokens 4000) → Generate Report(Sonnet) → Prep store →` 分两路 `[Store Report → weekly_reports]` 和 `[Post to Slack(→ #feed-ci)]`
> Slack 必须 point-form（不发 markdown 表格）。改 Slack 格式 = 改 `Prep store`/`Post to Slack` 处的 prompt（见 user guide）。

**7.4 Discovery Scan `6i2ozROThaxVE8KC`**（月度）/ **7.5 Manual Add Webhook `l7Kftsf7YUInNhtL`**（按 `action` 分支）/ **7.6 Error Handler `mhSOQyDTirrSWjZU`**（Error Trigger → Slack，active=false 正常）。

### PI（@ adammkt.app.n8n.cloud）
**7.7 PI · Weekly Summary → AI Ideas `Y3DlSzzdHS2mPZAd`**（停用，待激活）
`Weekly Mon 09:00 → Get latest weekly reports(HTTP GET Supabase, anon) → Claude distill ideas(HTTP Anthropic, 凭据 vyRcH3C8XPVwRco3) → Parse ideas JSON(Code) → Insert idea(HTTP POST rpc/ai_add_idea)`
> 激活前需在 UI 给 `Claude · distill ideas` 节点选 Anthropic 凭据。

---

## 8. RPC

| RPC | 库 | 作用 | 权限 |
|---|---|---|---|
| `get_brand_baselines()` | kkypkudherpaxyoocyfa | 返回品牌 KPI 基线 | anon/authenticated |
| `is_admin()` | bfukphakofrjalsqteda | 当前 `auth.uid()` 是否管理员角色 | 内部守卫 |
| `admin_create_user(p_username,p_name,p_password,p_role_key)` | 同上 | 建 auth.users + identity + profile | SECURITY DEFINER + `is_admin()` 守卫 |
| `admin_set_password(p_user_id,p_password)` | 同上 | 改密码（bcrypt） | 同上 |
| `admin_set_username(p_user_id,p_username)` | 同上 | 改用户名 + email | 同上 |
| `admin_delete_user(p_user_id)` | 同上 | 删用户 | 同上 |
| `ai_add_idea(p_txt,p_tags,p_pri,p_src)` | 同上 | 插 idea（`created_by='AI'`、`status='待评估'`、近 10 天同文案去重） | SECURITY DEFINER，anon 可执行 |

---

## 9. 凭据（n8n credential ID，排查连接问题用）

### CI（ohmeidaa 实例）
| 服务 | 类型 | ID |
|---|---|---|
| Supabase | supabaseApi | `yzUgQToJt7pIFHRx` |
| Gemini | httpHeaderAuth | `PqboDljMvT0QNLWt` |
| Claude | httpHeaderAuth | `3ErmxMcTxl5smy8S` |

### PI（adam mkt 实例）
| 服务 | 类型 | ID |
|---|---|---|
| Anthropic | anthropicApi | `vyRcH3C8XPVwRco3` |
| Supabase(clinics, 非本项目) | supabaseApi | `IVx1UFqz9Yk5PnMV` |

**模型**：CI 分类 Claude Haiku `claude-haiku-4-5-20251001`；CI 周报 / PI AI Ideas Claude Sonnet `claude-sonnet-4-6`；CI 视觉 Gemini `gemini-2.5-flash`。

---

## 10. 常见排查入口（symptom → 先看哪里）

| 现象 | 先查 |
|---|---|
| Ads Library 某新字段空白 | `v_ads_gallery` 视图 SELECT 是否含该列 + `filteredAds`/渲染是否读它 |
| 视觉数据不回填 | Drainer 执行记录 → Gemini 节点 / Supabase Patch；`Get pending` 取数条件 |
| 数据读不出来 | 确认前端用 `db`(bfukphakofrjalsqteda) 而非 `adsDb` |
| 主管道很慢/卡死 | 媒体支线是否被重新接回主管道（应只有文字链路） |
| 周报截断 | `Generate Report` 的 `max_tokens` |
| Slack 周报乱/太长 | `Post to Slack` 转换逻辑（必须 point-form、不发 markdown 表） |
| 抓取命中率低 | `Build brand URLs` 是否用 `"品牌"` 精确短语 |
| **PI 一致性红条不刷新/误报** | 改值的写操作末尾是否调 `renderTagMatrix()`；`checkHypoConsistency` 读的是 `c[dim]`（维度内部 key），核对数据值 |
| **取消勾选维度行数不回退** | `tmToggleDim` 是否调 `tmTrimRows`；只删空行(无 versions/runs) |
| **改密码"变回 123123"** | 前端 `resetUserPw` 的 prompt 默认值（不应预填 123123）；后端 `admin_set_password`/`is_admin` 正常 |
| **登录后看不到 Admin 组/某按钮** | `applyChrome`(Admin 组按 `is_admin`) + `applyPerms`(按 `role_permissions`) |
| **AI 想法不进 Idea Pool** | PI AI Ideas 工作流是否激活 + Anthropic 凭据是否选；`ai_add_idea` 去重窗口；`by==='AI'` 显示逻辑 |
| Game Type 列显示 `-` | `v_ads_gallery` 含 `game_type` 列 + 该广告 `game_type` 是否已被 Gemini 填（旧数据 null） |
