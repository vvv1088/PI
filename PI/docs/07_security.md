# Marketing Intelligence System — Security & Permissions

> 系统的认证、授权、密钥、RLS、RPC 安全模型。改权限 / 排查"为什么能/不能做某事" / 做安全审查时看这本。
> 最后更新：2026-06-30

---

## 1. 认证（谁能进）

- **Supabase Auth，用户名 + 密码**。前端把用户名拼成邮箱 `username@nexmax.local`（`AUTH_DOMAIN`）后 `signInWithPassword`。
- 登录成功后 `loadAuthData()` 按 `auth.uid()` 匹配 `profiles` 行 → 设 `currentUser`；没匹配到 profile 的账号会被登出（"This account has no profile"）。
- **闲置自动登出**：10 分钟无鼠标/键盘/点击/滚动 → `logout()`（`resetIdleTimer`）。
- **登录/登出进 Activity Log**：`audit_log` 记 `auth/login`、`auth/logout`。
- 登录门是**全屏遮罩**（`#loginGate`），未登录看不到任何业务数据。

> 注意：登录门是前端门。真正的数据安全靠 **RLS + RPC**（下文），不是靠隐藏 UI。

---

## 2. 授权（能做什么）

### 2.1 角色模型
- `roles`（`key` / `name` / `is_admin`）+ `role_permissions`（`role_id` × `section` × `can_add`/`can_edit`/`can_delete`）+ `profiles`（每用户一个 `role_id`）。
- 权限**按角色 × 模块 × 动作**，不按人。section：`watchlist` / `pending` / `idea` / `hypo` / `creative` / `dict`。只读模块（Weekly Summary / Ads Library / Operators / Funnels / Results）不在权限表里。

### 2.2 前端如何用
- `curRole()` 取当前角色；`can(sec,act)` 查 `perms[sec][act]`。
- `applyPerms()` 按元素的 `data-perm="sec:act"` 显隐增删改按钮。
- `applyChrome()` 按 `is_admin` 显隐 Administration 整组。
- **注意**：`can()` 不会因 `is_admin=true` 自动放行所有动作——管理员也要在 `role_permissions` 里有对应权限才显示增删改按钮。`is_admin` 只控制"能不能进 Administration 组 + 能不能解锁已锁定的对比页"。

> ⚠️ 前端权限是**体验层**（隐藏按钮）。真正的写入约束在数据库层（RLS / RPC）。

---

## 3. 数据库写入安全

### 3.1 前端只持 anon key
- dashboard 和 PI n8n 工作流都只用 **anon key**（可公开，已在 index.html 明文）。
- anon 能做什么由 **RLS 策略** + 暴露给 anon 的 **RPC** 决定。读：业务视图/表对 anon 开放只读（周报、竞品聚合等只暴露聚合，不暴露原始会员明细）。

### 3.2 敏感写入走 SECURITY DEFINER RPC
带 `is_admin()` 守卫、以 definer 身份执行、绕过 RLS 但只做受控操作：

| RPC | 守卫 | 作用 |
|---|---|---|
| `admin_create_user(p_username,p_name,p_password,p_role_key)` | `is_admin()` | 建 `auth.users` + identity + `profiles`，密码 bcrypt(`crypt`+`gen_salt('bf')`) |
| `admin_set_password(p_user_id,p_password)` | `is_admin()` + 长度≥4 | 改 `encrypted_password` |
| `admin_set_username(p_user_id,p_username)` | `is_admin()` | 改 `profiles.username` + `auth.users.email` |
| `admin_delete_user(p_user_id)` | `is_admin()` | 删用户 |
| `ai_add_idea(p_txt,p_tags,p_pri,p_src)` | 无（但只做一件事） | 插 idea，强制 `created_by='AI'`、`status='待评估'`，近 10 天同文案去重。anon 可执行，供 n8n 写入 |

- `is_admin()`：`select exists(... profiles join roles where p.id = auth.uid() and r.is_admin)`。无登录上下文（`auth.uid()` 为空）时返回 false → 守卫的 RPC 报 `NOT_AUTHORIZED`。
- `ai_add_idea` 无 admin 守卫是**有意**的：它能力极窄（只能造一条 `by='AI'` 的待评估想法、还去重），给 n8n 用 anon key 即可，无需 service_role。

### 3.3 为什么 anon key 可以公开
anon key 只是"我是匿名访客"的身份令牌，本身不含权限——所有权限由 RLS/RPC 决定。所以它进 index.html（客户端必然可见）和 n8n header 都没问题。**service_role key 则绝不能进前端或公开 workflow**（它绕过所有 RLS）。

---

## 4. 密钥清单（在哪 / 敏感度）

| key | 位置 | 敏感度 | 备注 |
|---|---|---|---|
| 主库 anon key | `index.html` 常量 + PI n8n HTTP header | 公开 OK | RLS 把关 |
| 基线库 anon key | `index.html`（`ADS_ANON`） | 公开 OK | 仅调 `get_brand_baselines` |
| Supabase service_role | **不应出现在前端/公开 workflow** | 🔴 高 | 仅服务端/受控环境 |
| CI Claude key | n8n(ohmeidaa) credential `3ErmxMcTxl5smy8S` | 🔴 高 | 存 n8n credential，不入库不入前端 |
| CI Gemini key | n8n(ohmeidaa) credential `PqboDljMvT0QNLWt` | 🔴 高 | 同上 |
| PI Anthropic key | n8n(adam mkt) credential `vyRcH3C8XPVwRco3` | 🔴 高 | 同上 |
| **旧 Make 明文 Anthropic key** | Make「Weekly Summary Creator」blueprint（弃用场景） | 🔴 **泄露** | **待办：去 Anthropic 控制台吊销 + 换新**；该场景已不用 |

**原则**：高敏密钥只存 n8n credential / 服务端 secret；前端只放 anon key；任何明文 key 进了 blueprint/repo 视为泄露，需轮换。

---

## 5. 密码

- 存储：`auth.users.encrypted_password`，bcrypt（`extensions.crypt(pw, gen_salt('bf'))`）。
- 改密码唯一正路：dashboard Reset PW → `admin_set_password`（≥4 位）。
- **已修 bug（v31）**：前端 Reset PW 弹窗原本预填 `123123`，没清空重打就确认 = 设回 123123。已改成空默认 + 最少 4 位校验。**此修复需重新上传 cPanel 才在线上生效。**
- 新建用户初始密码默认 `123123`（临时，建完应让用户/管理员改）。

---

## 6. 审计

- `audit_log` 自动记每次 add/edit/delete + login/logout（`user_id`/`username`/`name`/`section`/`action`/`target`/`created_at`）。
- 前端 `logAction(sec,act,target)` 写入；Activity Log 页 `renderAudit` 展示最近 200 条。

---

## 7. 已知风险 / 待办

- 🔴 **轮换旧 Make 场景里的明文 Anthropic key**（最高优先）。
- 登录门为前端门：极端情况下绕过前端直接打 anon REST 仍受 RLS 限制——确保所有敏感表的 RLS 策略到位（写入只允许经 RPC）。
- `ai_add_idea` 对 anon 开放：能力已收窄（只造待评估 AI 想法 + 去重），风险面小；如担心被滥用刷想法，可加频率限制或要求一个共享 secret 头。
- service_role key 若曾用于任何前端/公开场景，应轮换并改走 RPC。
