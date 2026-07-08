# Marketing Intelligence System — Setup a New Environment

> 从零拉起一套 MIS（做 staging、灾备、或交接给别的团队）。按顺序走。
> 最后更新：2026-06-30

---

## 0. 你需要准备

- 一个 Supabase 项目（主库）+（可选）一个基线库。
- 一个 n8n 实例（或两个：CI / PI 可分开，也可合并）。
- API key：Anthropic（Claude）、Google（Gemini，仅 CI 视觉需要）、Apify token（仅 CI 抓取需要）。
- 一个 Slack incoming webhook（周报 / 报警，可选）。
- cPanel / 任意静态托管放 `index.html`。

---

## 1. 主库（Supabase `bfukphakofrjalsqteda` 的等价物）

> 最省事的"精确复制"：从现有主库 **导出 schema**（Supabase Dashboard → Database → 或 `pg_dump --schema-only`）再在新库 import。下面是**清单 + 关键对象 DDL**，便于核对和手搭。

### 1.1 表
- **CI**：`competitor_ads`（核心，字段见 `03_code_map.md` §5.1）、`competitor_operators`、`competitor_pages`、`monitor_brands`、`discovery_keywords`、`discovery_candidates`、`weekly_reports`。
- **PI**：`ideas`、`hypotheses`、`creatives`、`dict_entries`。
- **Admin**：`roles`、`role_permissions`、`profiles`（`id` FK → `auth.users.id`）、`audit_log`。

### 1.2 视图（前端读这些）
`v_ads_gallery`（**必须含 `game_type`**）、`v_operator_intel`、`v_report_data`、`v_analyzed`、`v_competitor_ads_clean`、`v_known_pages`。
> 加任何前端要用的新列，记得加进对应视图的 SELECT 末尾。

### 1.3 触发器
- `trg_idea_code` BEFORE INSERT ON `ideas` → `assign_idea_code()`（自动生成 `IDE-xxx`，插入时别手填 code）。hypotheses/creatives 同理有各自 code 生成机制。

### 1.4 关键 RPC（必建）
```sql
-- 管理员守卫
create or replace function public.is_admin() returns boolean
language sql security definer set search_path=public as $$
  select exists(select 1 from public.profiles p join public.roles r on r.id=p.role_id
                where p.id = auth.uid() and r.is_admin);
$$;

-- 建用户(节选要点：建 auth.users + identities + profiles，密码 bcrypt)
-- create or replace function public.admin_create_user(p_username text,p_name text,p_password text,p_role_key text) ...
--   if not is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
--   email = p_username || '@nexmax.local'; encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf'));

-- 改密码 / 改用户名 / 删用户：admin_set_password / admin_set_username / admin_delete_user(均带 is_admin 守卫)

-- AI 写想法(anon 可执行、去重)
create or replace function public.ai_add_idea(p_txt text, p_tags text[] default '{}', p_pri text default '中', p_src text default '竞品情报')
returns text language plpgsql security definer set search_path=public as $$
declare v_code text;
begin
  p_txt := btrim(coalesce(p_txt,''));
  if p_txt = '' then return null; end if;
  if exists(select 1 from public.ideas where txt = p_txt and created_at > now() - interval '10 days') then return null; end if;
  insert into public.ideas (txt, src, tags, pri, status, created_by)
  values (p_txt, coalesce(nullif(p_src,''),'竞品情报'), coalesce(p_tags,'{}'), coalesce(nullif(p_pri,''),'中'), '待评估', 'AI')
  returning code into v_code;
  return v_code;
end; $$;
grant execute on function public.ai_add_idea(text, text[], text, text) to anon, authenticated;
```
> `admin_*` 完整定义从现有库 `pg_get_functiondef` 导出最准。

### 1.5 RLS
- 给所有业务表开 RLS。读：对 anon 开放需要的只读策略（视图/聚合）。写：只允许经上述 RPC（敏感表不直接给 anon insert/update/delete），PI 表按需给 authenticated 受控写。**原则见 `07_security.md`。**

### 1.6 种子数据
- `dict_entries`：导入全套字典（Format/Hook/Visual Style/Offer/Persona/Age Range/Game Type/Metrics/Test Type/Trigger/Evidence/Idea Source/Capacity/CI Fields/Watchlist Source）。可从 `PI/demo_src/dict_entries.json` 取（99 条）。
- `roles` + `role_permissions`：至少建 `admin`（is_admin=true，全权限）+ 业务角色（po/pe/usc team）。
- 首个管理员用户：`select admin_create_user('eling','Eling','<pwd>','admin');`（或在无登录上下文里先临时 `set_config('request.jwt.claim.sub', ...)` 绕守卫，见 runbook §8）。
- `monitor_brands`：导入要监测的竞品清单（keyword + country + is_active）。

### 1.7 Storage
- 建 bucket `creatives`（CI 素材存档，公链）。

---

## 2. 基线库（可选，仅 PI New Hypothesis 基线用）
- 等价于 `kkypkudherpaxyoocyfa`：建 `get_brand_baselines()` RPC（按品牌返回 FDC/REG/AFDA/FDAMT 的 base/cost/unit）。
- 没有的话：`index.html` 里 `data` 全局有硬编码默认基线兜底，表单仍可用（只是基线非实时）。

---

## 3. n8n

### 3.1 凭据
- Supabase（supabaseApi 或直接用 anon key 走 HTTP header）。
- Anthropic（anthropicApi）。
- Gemini、Apify（仅 CI）。
- Slack webhook（HTTP，URL 即可）。

### 3.2 CI 6 条 workflow
从现有实例 **导出 JSON** 再 import 最省事（Full Pipeline / Visual Drainer / Weekly Report / Discovery Scan / Manual Add / Error Handler）。import 后逐个把凭据重新指到新环境的 credential，schedule 按需调。节点职责见 `03_code_map.md` §7。

### 3.3 PI AI Ideas workflow
- 用 `03_code_map.md` §7.7 的结构重建：Schedule(周一09:00) → HTTP GET `weekly_reports`(anon) → Anthropic(distill) → Code(parse) → HTTP POST `rpc/ai_add_idea`。
- HTTP 节点 header 用新库 anon key；Anthropic 节点选新 Anthropic 凭据。
- 建后**停用**，手动 Execute 验证再 Activate。

---

## 4. dashboard（index.html）

改 `<script>` 顶部常量指向新环境：
```
SUPABASE_URL / SUPABASE_ANON   → 新主库
ADS_URL / ADS_ANON             → 新基线库(或留旧/占位)
WEBHOOK_URL                    → 新 CI n8n 的 /webhook/manual-add
RESCAN_URL                     → 新 CI n8n 的 /webhook/rescan-brand
AUTH_DOMAIN                    → 登录邮箱后缀(默认 @nexmax.local)
```
然后按 `06_runbook.md` §1 验证 + 上传托管。

---

## 5. 验证清单（拉起后逐项过）

- [ ] 能登录（首个 admin），登录后能看到 Administration 组。
- [ ] Dictionary 各 tab 有词条（下拉能选）。
- [ ] 手动跑一次 CI 主管道 → Ads Library 出广告。
- [ ] 跑一次视觉 Drainer → game_type/visual_style 回填（Ads Library 出 pill）。
- [ ] 跑一次周报 → Weekly Summary 出报告 + Slack 收到 point-form。
- [ ] PI：建 idea → 立 hypothesis → 进对比页勾维度 → 一致性红条逻辑正常 → Save 锁定。
- [ ] 跑一次 PI AI Ideas → Idea Pool 出 `AI` 徽章想法。
- [ ] Users：建用户、Reset PW（输新密码）、用新密码登录成功。

---

## 6. 演示版（可选）
- 跑 `python3 PI/demo_src/gen_demo.py` 生成 `demo.html`（自带数据、不连后端），放 rawgithack 或本地，给演示用。改 `index.html` 后重跑保持同步。


---

## 2026-07-08 更新:新环境需多建的东西(v32–v61)

1. **表/列**:`hypotheses` 加 `customer_stage/plan_launch/plan_test_days`;建 `budgets`(unique(month,brand))、`budget_assignments`、`monthly_plans`((month,brand) PK)、`app_config`(写入 mis_notify_secret 随机值)。
2. **RPC**:`budget_save_cell / budget_decide / budget_reopen / mis_reminders`(从现库 `pg_get_functiondef` 导出最准);RLS 照 07_security 的表。
3. **词条**:Dictionary 加 `Customer Stage` 5 档(dict_entries.json 已含)。
4. **Storage**:bucket `creatives` 加 authenticated 上传策略(路径 `pi/%`)。
5. **Slack app**:建「MIS Bot」(Bot Token Scopes: `chat:write`;App Home 设 Display Name 否则加不进频道),xoxb token 存 n8n 凭据;bot 加进目标频道。
6. **n8n workflow×2**:`MIS Slack Notify`(webhook mis-notify → Format Code → Slack 节点)、`MIS Daily Reminders`(每天 09:00 → HTTP rpc/mis_reminders → 拆条 → 转发 mis-notify);频道 ID/人员映射在 Format 节点改。
7. **前端常量**:`MIS_NOTIFY_URL` 指向新 n8n 的 webhook。
