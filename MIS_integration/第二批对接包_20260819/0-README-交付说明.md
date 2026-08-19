# 第二批对接包 · 交付说明(给 Jayden)

> 2026-08-19,MIS 侧交付。前提:第一批 patch 0001–0005 已应用(你已确认 tsc/build 双过)。
> 两个 patch 都是在「基线 + 0001–0005」的代码树上做的,按 0002-rev2 → 0006 或任意顺序 `git am` 都行(互不触碰)。
> 两个 patch 交付前在同一棵树上自验:`npx tsc --noEmit` 与 `npm run build` 双过,零报错。

## 包内文件,一句话各是什么

| 文件 | 是什么 |
|---|---|
| `patches/0006-P2-audit-mis-service.patch` | 修复 MIS 写操作审计静默失效:建 mis-service 服务账号(SQL 在 patch 内 `db/manual-migrations/20260819_create_mis_service_user.sql`),verifyMisToken 合成 session 改用其数字 uid,getSessionUser 回落 Authorization 头;X-MIS-User 从死代码变生效。**验证步骤在本文件下方「0006 部署后生产验证」一节** |
| `patches/0002-rev2-S1-recheck-false-positive.patch` | 0002 脱敏清洗 SQL 的复核误报修正:原 `[^"]{9,}` 把已脱敏值(8 位+`...`)也当明文,DRY-RUN/UPDATE/复核三处条件加负向前瞻排除;**验证 = 跑文件末尾复核查询,归 0 才算干净**(rev1 下永远不归 0) |
| `specs/H节-账户状态流水与告警规格.md` | H 节实现规格:`account_status_log` 建表 DDL、30 分钟独立轮询的正确读写顺序(先读后 upsert,别复刻 A1 旧链的顺序 bug)、`/api/ad-accounts` 透出 `accountStatus`/`accountStatusText`、变更告警走 Alert 认领机制;**验收标准在该文件 §4** |
| `specs/契约文档v1-cdf_events与brand_notify_roster.md` | 两张 Supabase 新表的契约:名册表(你的告警层只读 @ 人)、cdf_events 建表 + 「升级 Designer」按钮的精确 INSERT(过渡期孤票规则)+ 你的专用写入凭据方案(只能 INSERT cdf_events + SELECT 名册,其他全无) |
| `specs/样品测试事件.sql` | 5 条 `is_test=true` 的 cdf_events 样品(五种 trigger_type 各一),给 Alden 联调;不会被生产轮询捡走 |

Supabase 侧(建表/建 role/样品数据)由 MIS 侧在自己项目里执行,你只拿 §4b 的凭据连接;MySQL 侧(0006 建号 SQL、0002 rev2 清洗)在你的库执行。

## 0006 部署顺序

1. `git am 0006-P2-audit-mis-service.patch`,照常 tsc/build。
2. 生产库跑 `db/manual-migrations/20260819_create_mis_service_user.sql`(幂等),记下返回的 `mis_service_user_id`。
3. `.env` 加 `MIS_SERVICE_USER_ID=<那个 id>`,重启应用。
4. 不加这个环境变量 = 行为与 0005 完全一致(写操作照旧不记审计);回滚 = 删变量重启,不用回滚代码。

## 0006 部署后生产验证(拿生产证据,不看代码)

前提:`MIS_ALLOW_REMARK_PUT=1`(E 节的唯一写例外)。

**第 1 步 — 用读 token + X-MIS-User: v 实际发一个写请求:**

```bash
curl -s -X PUT https://meta-ads.ohmediaa.com/api/analytics/spending/remark \
  -H "Authorization: Bearer <MIS_API_TOKEN 读token>" \
  -H "X-MIS-User: v" \
  -H "Origin: https://ci.boostmarketing.site" \
  -H "Content-Type: application/json" \
  -d '{"date":"<报表里存在的日期 YYYY-MM-DD>","adName":"<该日报表里存在的一条 ad_name>","remark":"0006 audit smoke test"}'
```

预期 HTTP 200 `{"success":true,...}`。(修复前这一步就直接 401——requireView 对 MIS 身份拿不到 session。)

**第 2 步 — 两条验证 SQL:**

```sql
-- ① 最新一条 action_logs 的 user_id 是否指向 mis-service 的 uid
SELECT al.id, al.user_id, u.username, al.action_type, al.created_at
FROM action_logs al JOIN users u ON u.id = al.user_id
ORDER BY al.id DESC LIMIT 1;
-- 预期:username='mis-service',action_type='SPENDING_REMARK_SET',created_at≈刚才

-- ② details 里 misOperator 是否 = 'v'
SELECT JSON_UNQUOTE(JSON_EXTRACT(details, '$.misOperator')) AS mis_operator
FROM action_logs ORDER BY id DESC LIMIT 1;
-- 预期:'v'
```

**收尾**:同一 curl 把 remark 置空字符串再发一次即可清掉测试备注(顺带多验一条 SPENDING_REMARK_CLEAR 审计)。

X-MIS-User 合法值清单(MIS 侧契约,系统只做格式校验 `^[\w.@-]{1,64}$`,加人不用改你的代码):`v` / `bryan` / `joey` / `gg` / `mis-auto`。
