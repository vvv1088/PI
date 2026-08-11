# Marketing Intelligence System — Runbook（运维手册）

> 日常运维 / 上线 / 重跑 / 排障的操作手册。接手维护的人优先看这本。
> 最后更新：2026-06-30

---

## 0. 速查：我想做 X，去哪做

| 我想… | 去哪 / 怎么做 |
|---|---|
| 改 dashboard 上线 | 改 `PI/index.html` → 验证 → 上传 cPanel（§1） |
| 立刻重抓某竞品 | dashboard → Watchlist → Rescan（或手动跑 CI 主管道，§3.1） |
| 重新生成周报 | 手动跑 Weekly Report workflow（§3.3） |
| 让 AI 想法立刻进池 | 手动跑 `PI · Weekly Summary → AI Ideas`（§3.5） |
| 加 / 改 / 删用户 | dashboard → Administration → Users（§4.1） |
| 改某人密码 | dashboard → Users → Reset PW（输新密码，别留空）（§4.1） |
| 清空测试数据上线 | §5 |
| 重新生成 demo | `python3 PI/demo_src/gen_demo.py`（§6） |
| 轮换 API key | §7 |

---

## 1. 上线 dashboard（改 index.html → cPanel）

**流程（每次改 `PI/index.html`）：**
1. **快照**：`cp PI/index.html PI/versions/index_vN.html`（N = 当前版本号）。
2. **改**。
3. **验证**：
   - 抽内联 JS 跑 `node --check`（脚本 body 在最后一个 `<script>` 与 `</script>` 之间）。
   - 无头渲染冒烟：用 chromium 加载一个 stub 版（把 supabase CDN 换成 mock）确认无 `pageerror`。（参考 `PI/demo_src/gen_demo.py` 的 mock 思路。）
4. **写 changelog**：`PI/CHANGELOG.md` 加一条；重大改动同步 `PI/docs/05_CHANGELOG.md`。
5. **commit + push** 到工作分支。
6. **上传 cPanel**：把 `PI/index.html` 上传到网站根目录覆盖（cPanel File Manager 或 FTP）。**这一步才让线上生效**——git push 不等于上线。
7. **强刷验证**：浏览器开站点，`?v=` 加个新数字强刷缓存，登录核对改动生效。

> ⚠️ rawgithack 预览（`raw.githack.com/.../PI/index.html`）方便看效果，但**正式站是 cPanel**，两者各自独立。

---

## 2. 关键地址 / 资源清单

| 资源 | 值 |
|---|---|
| 主 Supabase 库（CI+PI+Admin） | `bfukphakofrjalsqteda` |
| 基线 Supabase 库 | `kkypkudherpaxyoocyfa`（仅 `get_brand_baselines`） |
| CI n8n 实例 | `n8n.ohmediaa.com` |
| PI n8n 实例 | `adammkt.app.n8n.cloud` |
| 登录邮箱后缀 | `@nexmax.local` |
| Slack 周报频道 | `#feed-ci`（`#test-test` 保留测试） |
| dashboard 配置常量 | `index.html` `<script>` 顶部：`SUPABASE_URL/ANON`、`ADS_URL/ANON`、`WEBHOOK_URL`、`RESCAN_URL`、`AUTH_DOMAIN` |

**n8n workflow ID**：CI Full Pipeline `ZhGhwYTpAJP8erl0` / Visual Drainer `dwf40foON48xE7Fk` / Weekly Report `TjUIKMNFLwN4uYCM` / Discovery Scan `6i2ozROThaxVE8KC` / Manual Add `l7Kftsf7YUInNhtL` / Error Handler `mhSOQyDTirrSWjZU`；PI AI Ideas `Y3DlSzzdHS2mPZAd`。

---

## 3. 运行 / 重跑 n8n workflow

### 3.1 CI 主管道（抓取）`ZhGhwYTpAJP8erl0`
- 自动：周一 05:00。
- 手动：打开 workflow → Execute（Manual Trigger 那条）。约 15–25 分钟。
- 单品牌重抓：dashboard Watchlist → Rescan（走 Rescan Webhook，只抓该品牌）。

### 3.2 视觉补全 `dwf40foON48xE7Fk`
- 自动：每 30 分钟。一般不用手动。
- 想加速补全：手动 Execute 几轮（每轮 ≤30 条）。
- 取数条件在 `Get pending`：稳态 `visual_style=is.null`；做某字段（如 game_type）回填时临时改 `game_type=is.null` + 提 limit，灌完**记得改回稳态**。

### 3.3 周报 `TjUIKMNFLwN4uYCM`
- 自动：周一 11:00（留 6h 让视觉先补一波）。
- 手动重跑：Execute；产物存 `weekly_reports`（dashboard Weekly Summary 可见）+ 发 `#feed-ci`。
- 报告被截断 → 调 `Generate Report` 的 `max_tokens`（当前 4000）。
- Slack 乱/太长 → 改 `Prep store`/`Post to Slack`（必须 point-form，**不发 markdown 表格**；prompt 见 §3.4）。

### 3.4 周报 Slack 改 point-form（在 CI 周报 workflow 里）
在 `Prep store` 和 `Post to Slack` 之间加一个「Slack digest」AI 节点（复制 `Generate Report` 以沿用凭据），prompt 让 Claude 把报告压成 Slack 点列式：
- Slack 加粗用 `*单星号*`、项目符号 `•`、**禁 markdown 表格**；四块：概况 / 值得盯(≤3) / 本周该测(2–3) / 提醒(0–2)；开头 `📊 *{市场} 竞品周报 · {日期}*`。
- `Post to Slack` 的 `text` 指向该节点输出（`{{ $json.content[0].text }}`）。USC + INZ9 两份会各发一条。

### 3.5 PI AI 想法 `Y3DlSzzdHS2mPZAd`（adam mkt 实例）
- **首次激活前**：打开 workflow → `Claude · distill ideas` 节点 → Credential 选 `Anthropic account`。
- 手动测试：Execute Workflow（会真往 Idea Pool 写几条、花一点 Claude 额度）。
- 确认 OK → Activate（之后每周一 09:00 自动）。
- 不想等 → 任意时间手动 Execute。
- 去重：`ai_add_idea` 近 10 天同文案不重复插，安全可多跑。

---

## 4. 常见 Admin 操作（dashboard）

### 4.1 用户 / 密码
- **建用户**：Administration → Users → ＋New User（用户名 + 姓名 + 角色，初始密码默认 123123 可改）。底层走 `admin_create_user` RPC。
- **改密码**：Users → Reset PW → **直接输新密码（≥4 位，别留空）**。走 `admin_set_password`。
- **改用户名/角色**：Users → Edit。
- **删用户**：Users → Delete（连登录一起删，`admin_delete_user`）。
> 这些 RPC 有 `is_admin()` 守卫，必须以管理员身份在 dashboard 操作。批量/应急可经 Supabase 直接改（见 §8）。

### 4.2 角色权限
Administration → Roles & Permissions：按 角色 × 模块 × 增/改/删 勾。Duplicate 快速建相似角色。删角色前要先把用户改到别的角色。

---

## 5. 上线前清空测试数据

目标：清掉人工测试造的 PI 数据，保留 AI scan 竞品数据 + 字典 + 用户。

**FK 安全顺序**（creatives → hypotheses → ideas，audit 独立）：
```sql
delete from public.creatives;
delete from public.hypotheses;
delete from public.ideas;
delete from public.audit_log;   -- 如需连操作日志一起清
```
**保留**：competitor_*、weekly_reports、dict_entries、profiles、roles、role_permissions。
> ⚠️ 不可逆。执行前确认。AI 想法（`ideas` 里 `by='AI'`）若要保留，不要全删 `ideas`，按 `created_by` 区分。

---

## 6. 重新生成 demo.html

改完 `index.html` 后，让 demo 跟上：
```
python3 PI/demo_src/gen_demo.py
```
- 自动：把 supabase CDN 换内存 mock（保留 marked/Chart CDN）、自动登录 Admin、webhook 置空（`PASTE_DEMO_DISABLED`）。
- 种子数据在 `gen_demo.py` 里维护（idea/hypothesis/creative 各状态 + 竞品广告多值 game_type）。
- 改完 commit `PI/demo.html`；rawgithack 自动可访问。

---

## 7. API key / 凭据轮换

| key | 在哪 | 怎么换 |
|---|---|---|
| Supabase anon key | `index.html` 常量 + n8n HTTP 节点 header | Supabase 改 key 后同步两处 |
| CI Claude / Gemini | n8n（ohmeidaa）credential `3ErmxMcTxl5smy8S` / `PqboDljMvT0QNLWt` | n8n 里更新 credential 值 |
| PI Anthropic | n8n（adam mkt）credential `vyRcH3C8XPVwRco3` | 同上 |
| **⚠️ 旧 Make 场景里的明文 Anthropic key** | Make「Weekly Summary Creator」blueprint（已弃用） | **建议去 Anthropic 控制台吊销并换新**（该 key 仍明文暴露在那个旧场景里） |

> anon key 是**可公开**的（设计如此，写权限靠 RLS + SECURITY DEFINER RPC，见 `07_security.md`），放进 index.html / n8n header 没问题。service_role key 绝不能进前端 / 公开 workflow。

---

## 8. Supabase 直连应急 / 备份

- **应急改数据**：经 Supabase SQL Editor / MCP `execute_sql`。注意带 `is_admin()` 守卫的 RPC 在无登录上下文调会报 `NOT_AUTHORIZED`；可在事务里 `set_config('request.jwt.claim.sub', <admin uid>, true)` 临时以管理员身份调，或直接写底层表。
- **备份**：定期导出 `competitor_ads`、`weekly_reports`、`ideas/hypotheses/creatives`、`dict_entries`、`roles/role_permissions/profiles`。Supabase 自带 PITR（按计划档位），重大变更前可手动 snapshot。
- **DDL**：用 `apply_migration`；多语句普通 SQL 用 `execute_sql`（`apply_migration` 曾超时）。

---

## 9. 监控 / 报警

- CI 任一 workflow 出错 → Error Handler `mhSOQyDTirrSWjZU` 报警到 Slack（它 active=false 正常，被其它 workflow 的 `errorWorkflow` 引用）。
- PI AI Ideas 工作流目前无独立报警；激活后留意 n8n 执行记录（失败的话最常见是 Anthropic 凭据没选 / 模型 id）。
- 数据健康：Ads Library KPI（Total Ads / New This Week）+ Storage `creatives` 桶文件数（= 视觉补全进度）。


---

## 2026-07-08 更新:Slack 通知运维(v61 上线)

### 改消息文案 / 频道
- 全部在 n8n(adam mkt)「**MIS Slack Notify**」的 **Format Slack Message** Code 节点里:消息模板、Slack ID 映射(IDS)、品牌→频道路由(channel 常量)。改完 **Save + Publish**。
- 每日提醒的文案在主库 RPC `mis_reminders` 里(Supabase SQL 编辑器改函数体)。

### 测试怎么发(不打扰正式频道)
给 webhook payload 加 `"channel_override":"C0B99UBP34H"`(#test-test)即可;n8n 页面 Execute 或对 `https://adammkt.app.n8n.cloud/webhook/mis-notify` POST。

### Bot token 失效 / 换 bot
api.slack.com/apps → **MIS Bot** → OAuth & Permissions → 复制 **Bot User OAuth Token(xoxb-)** → n8n Credentials「MIS Bot」替换保存。注意 scope 要在 **Bot Token Scopes**(不是 User)且含 `chat:write`;bot 加新频道用频道 → Integrations → Add apps。

### 提醒时间 / 月度节奏
「MIS Daily Reminders」触发器 = 每天 09:00(要改在 Schedule 节点)。月度节奏(2026-08-10 改版)全部写在 `mis_reminders` RPC:**预算瓶颈催办** 20/23/26/29 号(每品牌只催卡住的一步:申请没填@mkt→核批没填@usc→待决策@zq)、**发送计划催办** 25/27/30 号(@mkt)、**待决策超 48 小时**每日兜底(@zq);短月(2 月)29/30 档自动落到当月最后一天。
> ⚠️ 历史坑(2026-08-10 修):Daily Reminders 的 Split Messages 节点曾只读第一个 item,导致所有提醒静默丢弃——改动该节点后务必手动 Execute + `channel_override` 到 #test-test 验证真的有消息发出,不要只看执行 success。

### n8n 配额
2026-07-08 已升级付费档;若再见「Execution limit reached」→ app.n8n.cloud → Usage and plan 检查/升档(通知、每日提醒、AI 想法全在此账号)。

### 新表清数据注意
`budgets / budget_assignments / monthly_plans` 均带留痕语义,勿随意 delete;budgets 直写仅 admin(业务改数走界面/RPC)。
