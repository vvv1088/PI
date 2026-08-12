# MIS × Meta Ads 系统对接清单（给 Jayden，一次性完整版）

> 目的：MIS 作为唯一前端，跨域调用 Meta Ads 系统现有接口取数与操作；系统 UI 最终退役。后端分工：MySQL、生产部署与现有 n8n workflow 在你；接口应用的代码改动由我们开发、你审核部署；我们后续新建的自动化放 marketing 侧 n8n。
> 原则：**后端逻辑复用不重写**——轮转/权限/审计/collation/时区这些逻辑全部留在你的接口里，MIS 只做前端。我们不碰生产。
> 本清单覆盖 P0（前提）+ P1（只读接入）全部事项及 P2（写操作）轮廓。除 P2 写接口明细（届时随映射表一次给齐）外，不会再有新增索取。

---

## A. 我们随包提供的对接资料

| 项 | 内容 |
|---|---|
| MIS 生产域名 | `https://ci.boostmarketing.site`（CORS 白名单用；若联调阶段需要临时加本地来源，届时另行提供） |
| P1 接口勾选清单 | 见本文 E 节，直接打勾即可 |
| Token 交接方式 | 不走聊天明文，建议一次性阅后即焚链接或当面交接（你定） |
| 联调时间窗 | 改造部署后约 1 小时联调（浏览器跨域实测），时间你挑 |

---

## B. P0：动工前两件（为什么在这份清单里：接下来 MIS 全部事实数据都压在你这套后端上，它的可用性从「一个系统的事」变成「两个系统的事」）

1. **备份落地确认**：MySQL `meta_ads_manager`（含 15 张非 Prisma 表）定期 dump + n8n `database.sqlite` + `config`（encryptionKey）。步骤你的 `13-运维手册` 任务 10 已有，我们只需要「已落地 + 频率」的确认。
2. **维护归属确认**（已对齐，落字）：
   - **MySQL**（库、数据、备份）与**服务器/容器层运维**（含 n8n 实例本身、`database.sqlite`、encryptionKey）：你
   - **现有 n8n workflow**（CAPI / CA / Graph API / Health Check / 看门狗）：维持在你的账号与维护下，改动经你。
     **为什么不移交**：现在把 workflow 移到我们账号，所有 credential（MySQL / CRM / 钱包库 / Slack / token 等十来条）都要在新账号下重新连接、逐条重新验证，还要占用你的时间逐条配合——纯成本、零收益。公司之后会做 n8n 统一，到时候一次性整理更划算，现在维持现状即可
   - **我们后续新建的 workflow**（如 BO 取数、MIS 相关自动化）：建在 marketing 侧 n8n，归我们维护；双方各自记录 workflow 归属，统一 n8n 时按记录一次搬齐
   - **接口应用（Next.js）**：代码改动由我们本地开发交付（`tsc` / `build` 自验通过），你审核后部署；生产运行环境在你

---

## C. P1 接入改造（一次代码改动 + 一次部署）

技术背景一句话：现有认证是 cookie `meta_ads_session`（HMAC、8h、`sameSite: lax`）——跨站请求浏览器不带 cookie，所以 MIS 从自己的域名调用必须走 header token，这就是「直接接上」今天不通的原因。

需要的改动：

1. **CORS**：对 API 路由返回 `Access-Control-Allow-Origin: https://ci.boostmarketing.site`（白名单精确匹配，不用 `*`），允许 `Authorization` header，处理 OPTIONS preflight。
2. **Token 认证**：新增 `Bearer <token>` 校验路径，映射到一个专用「服务账号」；现有 cookie 机制不动。要求：
   - P1 阶段 **scope 严格只读**（E 节打勾的 GET 路由）
   - token 可轮换（泄露时可作废重发）
   - 建议在 action_logs 里以服务账号身份记录调用（沿用你现有审计习惯）
3. **Scope 排除项（安全红线）**：
   - `GET /api/tokens`、`GET /api/tokens/[id]`（15/16 号，明文返回 token 值——除非你改成脱敏返回，否则 P1 不开放；MIS 的 Tokens 页先只显示元数据）
   - `GET /api/users`、`GET /api/action-logs`（P1 不需要）
   - 一切写接口（唯一可商榷例外见 E 节末尾 remark 项）
4. **查询负载说明（供你放心）**：全部是页面打开才触发的聚合/分页查询，无轮询、无定时拉取，频率远低于你们自己 UI 的日常使用。

**分工说明**：以上改造的代码可以由我们侧完成（本地开发、`tsc --noEmit` / `npm run build` 自验后交付），你审核后部署；你顺手直接做也可以——二选一，按你方便。

> **更新（2026-08-12）：本节的改造代码已随包交付** —— `patches/0001`（CORS + 只读 token）即 C 节的完整实现；`0002`/`0003` 是顺手带上的两个修复（审计脱敏、轮转加固）；`0004`（X-MIS-User 审计对人）、`0005`（双 token 写通道预埋，见 F 节新版）一并 review。按 0001→0005 顺序 `git am`，全部 tsc+build 双过。环境变量共四个：`MIS_ALLOWED_ORIGIN`、`MIS_API_TOKEN`、`MIS_API_WRITE_TOKEN`、可选 `MIS_ALLOW_REMARK_PUT`，`.env.example` 里都有说明。

---

## D. BO 数据库通道（FD/D7 等成交数据，三选一 + 回答两问）

背景：35 个接口全部只查你的 MySQL，也就是 Meta 侧数据；成交侧的权威数据在 **BO 数据库**（FD 金额/人数、D7 等），你的库不存。闭环报表（花费 × 成交）缺这半边。口径定义我们已有，不需要你出。

**三选一（你按网络与权限现实挑）：**

- **a. 系统 2 加 1–2 个只读聚合接口**：`brand × date` 粒度返回 FD 金额/人数、D7 值。意味着 app 要新增一条 BO 只读连接（env + 连接配置）。如果 BO 库只能从 xden 内网到达，这条最顺。
- **b. 给 adammkt cloud 的 n8n 发 BO 只读凭据**，我们自建取数 webhook。前提：BO 库要能从 n8n cloud 的网络到达（公网可达或有隧道）——这点需要你确认。
- **c. BO 权限不在你手上**：引荐 BO/数据团队对接人，我们直接去谈。

**两问（零工作量，只要答案）：**

1. INZ9 的 FD/D7 权威数据在哪个库哪张表？（钱包库 / PG 数仓 / Xden CRM？）
2. USC 三个品牌（17WINKH / OK188KH / SBKH）的 FD/D7 权威数据在哪？（现有 n8n 凭据看起来都偏 INZ9 侧）

---

## E. P1 拟复用接口清单（对着打勾：✅ 直接可用 / ⚠️ 需小改 / ❌ 不开放）

资产只读（ASSETS 模块）：

| # | 路由 | 用途 | 你的判断 |
|---|---|---|---|
| 2/3 | `GET /api/brands`、`/[id]` | 品牌列表/详情 | |
| 4 | `GET /api/brands/[id]/capi-events` | CAPI 事件开关状态（P1 只读显示） | |
| 5/6 | `GET /api/business-managers`、`/[id]` | BM 列表/详情 | |
| 7 | `GET /api/business-managers/[id]/fb-accounts` | BM 下 FB 个人号 | |
| 8/9 | `GET /api/pixels`、`/[id]` | Pixel 列表/详情 | |
| 10/11 | `GET /api/ad-accounts`、`/[id]` | 广告账户列表/详情 | |
| 12 | `GET /api/ad-accounts/[id]/brands` | 账户↔品牌关联 | |
| 13/14 | `GET /api/developer-apps`、`/[id]` | 开发者应用 | |
| 17/18 | `GET /api/pixel-shares`、`/[id]` | Pixel↔账户共享 | |
| 21 | `GET /api/rotation/logs` | 轮转历史 | |
| 22/23 | `GET /api/sop/templates`、`/api/sop/instances` | SOP 模板/任务（只读部分） | |
| 24 | `GET /api/health` | 每日体检日志 | |

报表（PERFORMANCE 模块）：

| # | 路由 | 用途 | 你的判断 |
|---|---|---|---|
| 28 | `GET /api/analytics/accounts` | 账户花费/转化趋势 | |
| 29/30 | `GET /api/analytics/ads`、`/[id]/detail` | 广告区间指标/日明细 | |
| 31 | `GET /api/analytics/brands` | 品牌对比矩阵 | |
| 32 | `GET /api/analytics/lifecycle` | 资产存活周期 | |
| 33/34 | `GET /api/analytics/spending`、`/export` | 花费明细/导出 | |

**唯一的写例外（可商榷）**：`PUT /api/analytics/spending/remark`（35 号）——finance 在花费报表里写备注用。若你愿意 P1 就开（低风险、写 `spending_remarks` 且入审计），MIS 报表就带编辑；不愿意则 P1 只显示备注、编辑功能到 P2 再开。

序列化注意（我们已知，无需你处理）：bigint → 字符串、Date → ISO UTC；MIS 侧自行处理。

---

## F. P2 写通道（2026-08-12 新版：随 patch 0005 一次预埋，取代原「分批开放」方案）

1. **双 token 设计**（patch 0005 已实现）：部署时生成两把不同的钥匙——`MIS_API_TOKEN`（只读）和 `MIS_API_WRITE_TOKEN`（可写白名单内的资产 CRUD / 轮转 execute / SOP；tokens/users/action-logs 无论哪把钥匙永远拒绝）。写 token 我们先离线保管、不上线；启用那天是我们前端自己换钥匙发版，**你这边零动作、零二次部署**——原方案"1–2 周一次小部署"作废。
2. **权限桥接**：per-用户的权限差异在 MIS 前端按角色表达（我们已建 role_meta_permissions，17 个 key 沿用你的词汇）；写操作审计对人靠 X-MIS-User 头（patch 0004）。你侧无需再做映射校验。
3. **终局**：你的 UI 下线，域名 302 → MIS 或直接停；接口与自动化继续跑。
4. **变更纪律**：接入改造等改动请照常记入 `_变更记录.md`（沿用你的文档规范）。

---

## G. 第三系统：Page / Profile 存活监测（交接包外，需要你补充范围）

背景：另有一套独立监测在探测 FB Page / Profile 是否仍 active、被 ban 时发告警。它不在这次交接包的范围里（`02 §1.3` 把 `selenium_chrome`、`n8n2` 等都标为「与本项目无关」），但融合终局是资产健康在 MIS 一处可见，所以要把它纳入对接。

**请回答（零/低工作量）：**

1. 它的形态：n8n workflow（哪个实例、哪几条）？独立应用/脚本？是否经 `selenium_chrome`？
2. 监测结果**是否落库**？落在哪个库哪张表？还是只发 Slack 不留痕？
3. 告警发哪个 Slack 频道？监测频率？
4. 监测清单（哪些 page/profile）维护在哪里——表里还是写死在 workflow 里？
5. 请把它的 workflow JSON / 代码导出补进交接包，并注明跑在哪个实例（n8n:5678 你的账号下？n8n2:5679？）——2026-08-11 的交接包里没有它：13 张 zip 内清单、17 篇文档、11 条 workflow、33 张表逐一核对过，最接近的四样（Graph_API 的 Detect Status Changes、Health Check、`bm_fb_accounts`、/analytics/lifecycle）都是 Graph API 查资产或人工登记，不是 crawl 查 page/profile

**视答案的一小步（P1 顺带做）：**

- 若有落库 → 按 C 节同样方式开只读窗口（或并入 E 节清单），MIS 的 ASSETS 视图直接显示 page/profile 状态
- 若不落库 → 建议补一步「写入状态表」（你侧实现，粒度：asset × 最近检查时间 × 状态）。否则 MIS 里无数据可显示，告警也无法回溯

---

## H. 广告状态 vs 账户状态：我们需要能区分（2026-08-12 新增需求）

背景：后续会上一条「素材被拒 → 自动开 Jira ticket 给 designer 改图」的流程。要让它跑对，我们必须分得开**广告自己被拒**和**广告账户出事（被封/欠款）导致底下广告集体变 DISAPPROVED**——分不开，designer 就会收到一堆不是素材问题的假票。我们分析了两个 detector channel 7/1–8/12 的 862 条 alert：DISAPPROVED 共 395 条，其中 **46% 是同账户同小时批量翻拒**（最大一起 18 条），这类基本都是账户级事件的连坐。

**需求（要什么，不限定怎么做）：**

1. **账户级状态可见**：当 Meta 把某个广告账户判成 DISABLED / UNSETTLED 等,我们需要能 (a) 从接口读到各账户的当前真实状态,(b) 知道"它变了"——有告警或有变更历史可查。我们查过现状:`ad_accounts_legacy.account_status` 每小时在刷新,但没有变更流水表、没有 Slack 告警、现有接口也没有把它吐出来的出口——信息进库就停在库里了。
2. **被拒可归因**：一条广告变 DISAPPROVED 时,能区分"素材真被拒"和"账户连坐"。
3. **被拒有原因**（供 designer 工单内容）：真被拒的广告,能拿到 Meta 给的拒登原因。

**参考做法（仅供参考——你有更顺的路完全按你的来）：**

- 账户状态变更照 `ad_status_log` 的现成模式落一张流水表 + 发 Slack（一个 n8n 节点的事）；
- 任一现有接口把 `ad_accounts_legacy` 的 `account_status` / `account_status_text` 带出来（比如 analytics/accounts 加两个字段）；
- 广告变 DISAPPROVED 时顺手拉 Graph API 的 `ad_review_feedback` 存一列。

另外提醒一个我们核对时发现的连带现象（文档 §12 也记了）：账户 `account_status≠1` 后广告数据停止刷新——所以账户一出事,它名下广告的状态就冻结了,这也是为什么账户级可见性单独重要。

---

## 完整性说明

本清单按 P0→P2 全程「每一个需要你出手/出答案的时刻」倒推整理：P0 两件、P1 的改造（代码已随包）与通道、P2 已随 patch 0005 一次预埋（原「届时另给写接口明细」不再需要）。此后的新增需求只有 H 节一项（账户/广告状态区分）。若 D 节选了 c（权限不在你），BO 侧会另起一条与你无关的线。G 节是交接包**范围之外**的系统，其明细只能由你划定——这是清单里唯一依赖你补充范围的部分。
