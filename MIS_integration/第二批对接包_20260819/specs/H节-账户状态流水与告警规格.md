# H 节规格：账户级状态流水 + 接口透出 + 变更告警

> MIS 侧出规格,Jayden 实现。对应对接清单 H 节。2026-08-19。

## 0. 背景与前提(实现前必读)

**现状**(以你的仓库与交接文档为据):

- `ad_accounts_legacy.account_status` 由 A1 子管线每小时刷新(`Upsert Ad Accounts`),**库里的状态是准的**;但无变更流水、无告警、配置层接口不透出。
- A1 里其实有一条 `Detect Status Changes → Format Slack Alert → Slack Account Alert` 的告警链,**从未触发过**:`Upsert Ad Accounts` 按画布纵坐标先执行,把新状态写进库之后 `Get DB Account Status` 才去读,API 值 vs 库值永远相等(见 09-GraphAPI数据采集.md §A1 的 ⚠️ 说明)。本规格落地时**这条旧链要一并停用**,避免修好后双发告警。
- **关键约束(Jayden 已确认)**:A3 广告状态采集 SQL 只查 `account_status=1 AND is_active=1` 的账户 → 账户被封后其名下广告状态**永久冻结在封号前的值** → 「广告集体变 DISAPPROVED」在封号瞬间**不会出现** → **账户级告警必须独立轮询账户状态,不得从广告状态推导**。
- 检测节奏:账户状态链与广告状态链一起拆到**独立的 Schedule Trigger,30 分钟一轮**(Jayden 并入 H 节一起做)。

## 1. 流水表 `account_status_log`

照现有 `ad_status_log` 的模式(`ad_id / ad_account_id / status / previous_status / change_type / checked_at`)搬到账户级:

```sql
-- 类型对齐说明:account_id 必须与生产 ad_accounts_legacy.ad_account_id 同类型
-- (先 SHOW CREATE TABLE ad_accounts_legacy 核一眼;下面按 BIGINT UNSIGNED 写,
--  若生产是 varchar(50) 则改成一样的 varchar(50),别引入隐式转换)。
CREATE TABLE IF NOT EXISTS account_status_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id  BIGINT UNSIGNED NOT NULL,          -- = ad_accounts_legacy.ad_account_id
  old_status  SMALLINT UNSIGNED NULL,             -- Meta account_status 旧值(首次发现为 NULL)
  new_status  SMALLINT UNSIGNED NOT NULL,         -- Meta account_status 新值(1/2/3/7/8/9/100/101…)
  detected_at DATETIME(3) NOT NULL,               -- UTC(与 checked_at 同约定)
  PRIMARY KEY (id),
  KEY idx_account_detected (account_id, detected_at),
  KEY idx_detected (detected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- 不设唯一键:同一账户可多次变更;**防重靠写入逻辑**(只在 API 值 ≠ 库值时插一行),与 `ad_status_log` 一致。
- `SMALLINT UNSIGNED`:Meta 的 account_status 枚举有 100/101/201/202 等值,TINYINT 会截。
- 归属:非 Prisma 管理(与 ad_status_log 同组),用手工 DDL 建表;若走 migration,照抄 `20260514000200` 的 information_schema + PREPARE/EXECUTE 幂等模式。

**写入顺序(修根因,别照抄 A1 旧链)**:30 分钟触发器里必须**先读库、再比对、后 upsert**:

```
Fetch /me/adaccounts (fields=account_status)
  → 读 ad_accounts_legacy 现值        ← 先读
  → 逐账户比对,不同 → INSERT account_status_log(old=库值,new=API值,detected_at=UTC now)
  → Upsert ad_accounts_legacy          ← 后写
  → 变更行 → 告警(见 §3)
```

顺便提醒 09 文档记过的机制:`/me/adaccounts` 对「掉出 BM 的账户」是**安静消失**不是报错;本表只记状态值变更,「账户从 API 列表消失」暂由 Daily Watchdog 的 account_no_data 兜底,不塞进本表(要做也是另一个 change_type,先不做)。

## 2. 现有接口透出

`GET /api/ad-accounts`(列表)与 `GET /api/ad-accounts/[id]`(详情)的 response 每行增加:

| 字段 | 类型 | 来源 |
|---|---|---|
| `accountStatus` | number \| null | `ad_accounts_legacy.account_status`,按配置表 `ad_accounts.adAccountId = ad_accounts_legacy.ad_account_id` 关联;legacy 里没有该账户 → null |
| `accountStatusText` | string \| null | `ad_accounts_legacy.account_status_text`(表里现成有) |

- 实现建议:`listResource("adAccounts")` 取回后,一次 `prisma.$queryRaw` 按 adAccountId 批量取 legacy 两列合并进 response(别逐行 N+1);legacy 表只读,不进 Prisma schema。
- 序列化沿用现有约定(06 手册 §1.2):bigint→字符串、时间→ISO 8601 UTC。`accountStatus` 是小整数,保持 number。
- MIS 侧消费:资产健康视图直接显示账户真实状态,不再只看配置层的 ACTIVE/DISABLED/BANNED 人工标记。

## 3. 变更告警

- 触发:§1 的 30 分钟一轮里,凡插入了 `account_status_log` 行(即状态真实变化)→ 发 Slack alert。
- **走 Alert 认领机制,附认领按钮**(认领机制的需求文档另发,此处只引用;上线时序上若认领机制未就绪,先发普通消息,消息体不变,按钮后补)。
- 消息体最少含:`account_id`、account_name、`old_status → new_status`(带 account_status_text 文字)、关联品牌(有 brand_ad_accounts 配置就带,没有就省)、detected_at(转 MYT 显示)。
- 方向性:**所有状态变化都发**(不只 1→非1;从 2 恢复 1 同样要知道),严重级别可按 new_status 是否 =1 区分措辞。
- 旧的 A1 `Format Slack Alert / Slack Account Alert`(INZ9 webhook)在新链上线同批停用。

## 4. 验收(生产证据)

1. 手工把某测试账户在 Meta 侧改状态(或等一次自然变更):30 分钟内 `account_status_log` 出现一行 old/new 正确的记录,Slack 收到一条带认领按钮的告警。
2. `GET /api/ad-accounts` 任取一行,`accountStatus`/`accountStatusText` 与 `SELECT account_status, account_status_text FROM ad_accounts_legacy WHERE ad_account_id=…` 一致。
3. 封号场景专项:被封账户名下广告在 `ads` 表的状态**不变**(冻结属预期),但账户告警已发——证明告警不依赖广告状态推导。
