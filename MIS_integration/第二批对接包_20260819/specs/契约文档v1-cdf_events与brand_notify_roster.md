# 契约文档 v1:cdf_events + brand_notify_roster

> 数据面:**我们的 Supabase(MIS 的 CI/PI 项目,project ref `bfukphakofrjalsqteda`)**。
> 消费方:Alden(CDF 派工)读事件开票;Jayden(告警链路)写升级事件、读名册。
> 2026-08-19。两张表在 Supabase 里目前均不存在,以下 DDL 为全新建表。

## 4a. brand_notify_roster(品牌通知名册)

**用途(双份)**:
① CDF 派工开 thread 时 @ 品牌成员(**Alden 消费**);
② Alert 认领机制 @ 人(**Jayden 告警层查询,只读**)。

```sql
create table if not exists brand_notify_roster (
  id            bigint generated always as identity primary key,
  brand         text    not null,             -- 与 MIS hypotheses.brand 同一套代号
  slack_user_id text    not null,             -- Slack member ID(U 开头),不是显示名
  role          text    not null default 'member',  -- 'owner' | 'member'(owner=品牌负责人,孤票 Approver 取 owner)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (brand, slack_user_id)
);
```

初始数据模板(slack_user_id 留占位,V 填;每品牌至少一名 owner):

```sql
insert into brand_notify_roster (brand, slack_user_id, role) values
  ('OK188KH', 'U_____________', 'owner'),
  ('OK188KH', 'U_____________', 'member'),
  ('17WINKH', 'U_____________', 'owner'),
  ('17WINKH', 'U_____________', 'member'),
  ('SBKH',    'U_____________', 'owner'),
  ('SBKH',    'U_____________', 'member'),
  ('INZ9',    'U_____________', 'owner'),
  ('INZ9',    'U_____________', 'member')
on conflict (brand, slack_user_id) do nothing;
```

换人 = `update … set active=false` + 插新行;两个消费方都必须过滤 `active=true`。

## 4b. 升级按钮 → cdf_events 插入规格(Jayden 告警链路用)

### 建表(全新)

```sql
create table if not exists cdf_events (
  id           bigint generated always as identity primary key,
  event_kind   text        not null,            -- 首批恒为 'create'(开票)
  trigger_type text        not null,            -- 'new_hypo' | 'disapproved' | 'scale_winner' | 'underperform' | 'account_incident'
  payload      jsonb       not null default '{}'::jsonb,
  ticket_key   text        null,                -- 回写位:下游开票后填票号;null = 未处理
  is_test      boolean     not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_cdf_events_unprocessed on cdf_events (created_at) where ticket_key is null and is_test = false;
```

约定:**一次升级 = 一行事件 = 一张票**(不做批次合并);Alden 轮询 `ticket_key is null and is_test=false`,开票后回写 `ticket_key`。

### 「升级 Designer」按钮按下时的精确 INSERT

```sql
insert into cdf_events (event_kind, trigger_type, payload)
values (
  'create',
  'disapproved',
  jsonb_build_object(
    'ad_id',              '120210000000000001',       -- 必填
    'ad_name',            'MY_INZ9_UGC_0819_v2',      -- 必填
    'brand',              'INZ9',                     -- 必填,与名册 brand 同代号
    'account_id',         '1998765220809792',         -- 必填
    'rejection_category', 'GAMBLING_POLICY',          -- 平台违规类别,拿得到就带,拿不到省略此键
    'detected_at',        '2026-08-19T08:00:00.000Z', -- 必填,ISO UTC
    'hypothesis_id',      null,                       -- 过渡期:可空
    'creative_code',      null                        -- 过渡期:素材编号可空
  )
);
```

**过渡期规则(下游按「无 hypo 孤票」处理)**:`hypothesis_id` / `creative_code` 可空;Approver 按名册取该 brand 的 `role='owner'` 填品牌负责人;票的 description 带 `ad_id` + 广告名。

### 写入凭据方案(Jayden 只能写 cdf_events 这一张表)

用**专用 Postgres role + 表级 GRANT**(比 RLS 简单直接;新 role 天生什么权限都没有,只给什么有什么):

```sql
-- V 在 Supabase SQL Editor 执行;密码自己生成 ≥32 位随机后线下交给 Jayden
create role jayden_cdf login password '<强随机密码>';
grant usage on schema public to jayden_cdf;
grant insert on table cdf_events to jayden_cdf;
grant select on table brand_notify_roster to jayden_cdf;   -- 告警层 @ 人要读名册
grant usage, select on sequence cdf_events_id_seq to jayden_cdf;  -- identity 主键需要
```

- 连接方式:Supabase 的 **Session pooler 连接串**(Dashboard → Connect,把用户名换成 `jayden_cdf.bfukphakofrjalsqteda`),n8n/后端直接 Postgres 节点连。
- 该 role **无 select/update/delete on cdf_events、无其他任何表权限**;想扩权限必须回到本契约改版。
- MIS 前端自己(anon key / PostgREST)对这两张表的访问不受影响——GRANT 只加不减。

## 4c. Format 映射表((MIS Format × Visual Style) → Jira Format 菜单选项)

**用途**:开票计价(消费方 Alden)。开票时按 `payload` 素材清单里每条素材的 `format` × `visual_style` 组合,查表得 Jira 票的 Format 菜单选项(默认档)。定稿(V 定):

| MIS Format | Visual Style | → Jira Format 选项(默认档) |
|---|---|---|
| IMAGE | ai_avatar | AI Image – Standard |
| IMAGE | deepfake | Deepfake – Single face |
| IMAGE | real_person / ugc / game_screenshot / winner_showcase / official_design | Single Image |
| IMAGE | animation | GIF Animation |
| VIDEO | ai_avatar | AI Avatar Video – Single |
| VIDEO | deepfake | Deepfake – Single face |
| VIDEO | real_person / ugc | Video Editing – Full edit |
| VIDEO | game_screenshot / winner_showcase | Video Editing – Simple cut |
| VIDEO | animation / official_design | Motion Graphics |
| CAROUSEL | 任意 | Carousel (set of 6) |
| DCO | 任意 | 按 payload 素材清单逐条映射(DCO 是投放格式非素材形态) |

**规则三条**:

1. 映射给的是**默认档**,Designer 拉票时改选类型/档位是合法动作;
2. **GIF 不进 MIS Format 字典**(PI 与 CI scraper 对齐,GIF 类需求归 VIDEO;Jira 菜单保留 GIF Animation 选项供改选);
3. 新增字典值 = 改此表 + 通知 Alden。
