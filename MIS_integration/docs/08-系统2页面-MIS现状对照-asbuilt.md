# 系统 2 页面 → MIS 现状对照（as-built，2026-10-03 整理，给 Jayden）

> 用途：说明你系统里的每一个页面在 MIS（二合一版 v85.1，见随包代码）里的最终去向——哪些原样搬、哪些**合并**、哪些**改名**、哪些**暂时下架**。方便你 review 代码包、以及日后规划自己 UI 的退役。
> 口径：所有页面的数据都走你的 35 个接口（经 `mis-meta-api.js` 的 `metaApi()`，目前 mock，token 到手切 live）；MIS 没有镜像你的任何数据。

## 一、你的 18 个页面逐一去向

### Configuration 组 → MIS「Meta Assets」板块（基本 1:1）

| 系统 2 页面 | MIS 位置 | 变化 |
|---|---|---|
| Brands | Meta Assets → Brands | 1:1 搬入;详情页**多了 4 个 MIS 侧面板**(MIS 决策数据/近30天花费/命名契约/CAPI)——只加不减 |
| Business Managers | Meta Assets → Business Managers | 1:1(含 FB 个人号内嵌管理) |
| Pixels | Meta Assets → Pixels | 1:1 |
| Ad Accounts | Meta Assets → Ad Accounts | 1:1(含品牌关联) |
| Developer Apps | Meta Assets → Developer Apps | 1:1 |
| Tokens | Meta Assets → Tokens | 1:1,但 live 下只显示脱敏元数据(明文值不进 MIS,见对接清单 C 节红线) |
| Pixel Shares | Meta Assets → Pixel Shares | 1:1(矩阵视图) |

### Operations 组 → MIS「Meta Assets」板块（两处合并）

| 系统 2 页面 | MIS 位置 | 变化 |
|---|---|---|
| Dashboard | Meta Assets → **Overview** | **合并**:吸收了原「Asset Status」的四类资产状态汇总卡,一页=总览+状态 |
| Health | Meta Assets → Health | 1:1(KPI+品牌×角色网格+日志) |
| Rotation | Meta Assets → Rotation | **合并**:原独立的「Rotation Log」页收进本页的 **Logs tab**(BM/Pixel/日志三个 tab 一页) |
| SOP | Meta Assets → SOP Tasks | 1:1(模板+实例) |

### System 组 → MIS「Administration」板块（两处深度合并）

| 系统 2 页面 | MIS 位置 | 变化 |
|---|---|---|
| Users | Administration → **Users(一张表)** | **深度合并**:MIS 用户和你的 9 个账号不再是两份名单——一人一行(Name/Username/Role),你的账号作为该用户的"过渡期关联"收在编辑抽屉里,live 后逐个认领→退役 |
| Action Logs | Administration → **Activity Log(单表)** | **深度合并**:你的 action_logs 和 MIS 审计合成一张流水表;Source 列按五大板块标(不分 MIS/Meta,出处只在详情浮层);三个英文下拉 filter(Source/User/Action);Details 弹浮层 |

### Analytics 组 → MIS「Analytics」板块（一处改名、四页暂下架）

| 系统 2 页面 | MIS 位置 | 变化 |
|---|---|---|
| Spending Report | Analytics → Spending | 保留,**页面行为有改**(见下「二」) |
| Ad Gallery | ~~Our Ads~~ | **先改名后下架**:搬入时改名「Our Ads」(避免和 MIS 竞品侧的 Ads Library 混淆);后按 V 决定从导航下架(代码保留,数据分析线后续交 vny 负责) |
| Account Overview | — | **暂下架**(同上,代码保留) |
| Brand Comparison | — | **暂下架**(同上) |
| Asset Lifecycle | Analytics → Asset Lifecycle | 保留 |

### MIS 自有新页（你系统没有的）

- Analytics → **Closed-Loop Report**（闭环报表）：你的 spending（花费侧）× BO 通道（成交侧，等 D 节）按素材/假设归因——这是融合的核心新页。

## 二、Spending 页相对你 UI 的行为差异（你会被问到的）

1. **Line 列含义变了**：不再显示你库里的 line 字段，而是**从 ad_name 实时 detect 品牌**（照归因 CASE 同款逻辑 + 新命名契约解析）；解析不出的显示 **NULL**。
2. **Remark 只给 NULL 行**，且是二选一下拉 **TEST / IGNORE**（走你的 #35 PUT remark 接口）——语义=标记"这笔花费不用对账"。
3. 分页改 Rows 选择器 50/100/200/**all**（即你接口原生的 pageSize 四档）。
4. KPI 区的「NULL」= 本页 detect 不到品牌的行数。

## 三、横切的改动（不是单页,但影响你对照代码）

1. **导航=五大板块**：Competitor Intelligence / Planning Intelligence / **Meta Assets**（你的资产+运维 11 页）/ **Analytics**（报表 3 页）/ Administration。你的页面全部落在后三块。
2. **权限**：你的 17 个 permission key 原词汇保留，映射进 MIS 角色体系（view/add/edit/delete 四词，存 Supabase role_meta_permissions）——live 桥接零翻译，权限校验仍靠你侧 token（双 token 设计，patch 0005）。
3. **素材状态映射**：MIS 的 Creatives 页会把你 `/api/analytics/ads` 返回的 effective_status 映射成中文状态（审核中/上线中/被拒/已暂停/有问题），并带"同账户批量被拒=疑似账户事件"的标记——这就是对接清单 H 节需求的消费场景。
4. **命名契约 v2**：新广告名 7 段 `市场_品牌_设定_格式_维度_内容_编号`（详见第二批对接包里的契约文档）；老广告名不改，解析兼容新旧。
5. **审计对人**：MIS 调你的写接口时带 `X-MIS-User` 头（patch 0004），你的 action_logs 记真实操作者。

## 四、版本与包

- 本文对应代码：**v85.1**（随包 `MIS-full-code-v85.1.zip`：index.html + 9 个 mis-*.js + src/ 源码 + 构建脚本 + demo + README）。
- demo 预览（mock 数据、无需部署）：打开包内 `PI/demo.html` 即可。
