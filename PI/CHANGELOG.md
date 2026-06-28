# Changelog — Marketing Intelligent System

> 版本纪律(新):**当前版本永远 = `PI/index.html`**;每次改动前先快照旧版到 `PI/versions/index_vN.html`,改完写一条 changelog。
> 不再用"工作目录里散落多个 index_vN"的旧做法 —— 那是之前版本混乱的根源。

## 基线血缘(2026-06-25 还原)

通过 md5 / 行数比对确认,历史是一条干净直线,无分叉:

```
v5(1906行) → v6(1906行) → v7(1919行,=v7_1 同一份) → v8(1962行,=v8_1 同一份) → v9(2002行) ← 当前基线
```

- `index_v7_1.html` 与 `index_v7.html` 字节相同;`index_v8_1.html` 与 `index_v8.html` 字节相同 —— `_1` 仅为重复另存的副本,非分叉版本。
- 历史导出文件仍留在 `~/Downloads/`(v5–v9),未改动;可随时自行清理。

## [v17] — 2026-06-28 · 指标区 UI 微调(当前基线)

- 「本次测的维度 — …」标签 → 改为简洁的 **「测试维度」**。
- 指标区格子统一:目标值(绝对+%)与护栏 figure 输入框改为弹性填充、对齐;防守底线整行放满宽,避免 `Day-1 Quality Floor` 被截断。
- 去掉防守底线下拉里的中文括号注 `(第一天自主保底)`,只留 `Day-1 Quality Floor`。
- 复核(无头实测,非改动):**目标值 %↔绝对值双向同步**正常(INZ9 基准14:%50→21、值14→%0);**容量体检随预算/周期实时重算**正常(30/14天 🟡 → 100 🟢)。两者在 OK188 上看似无反应,是因 7-Day High-Value Rate「基准待定」+ 无单位成本(figure/基准 TBD、管道未提供)→ 无可换算的参照,**非 bug、不假填**。

## [v16] — 2026-06-28 · 指标按品牌方向锁定

> 范围严格限定:只改「指标」区(主指标名单 / 防守底线 / 算法标注 + 目标值挪位)。不碰判定层级、观察期、双轴护栏、诊断字段、任何阈值数字(figure 是独立下一步,本期一律 TBD)。

- **布局**:目标值(绝对 + %)从 card3 搬到 **card2**(主指标右侧);card3「假设」去掉目标值字段,只留 sentence + 改变 X + 理由。
- **主指标按品牌锁定**(`syncMetricByBrand` + `onBrandChange`,品牌 onchange 触发):
  - `OK188KH`(高价值)→ 只有 `7-Day High-Value Rate(7 天大脚率)`,锁定单选(disabled)。
  - `17WINKH`(走量)→ `FDC` / `CPA` 二选一。
  - `SBKH`(待定)→ disabled「待定(方向未定)」,不给名单。
  - `INZ9` 及非 USC 三品牌 → **完全原样**(FDC/REG/AFDA/FDAMT)。
- **防守底线**:`OK188`/`17WIN` 锁为 `Day-1 Quality Floor`(指标名 disabled、比较符固定 `>` 只读),figure 仍可填(现 TBD);移除这两个品牌的 AFDA。`INZ9`/其他原样(AFDA/FDC/CPA/D7CR、≥/≤)。
- **算法标注**(浅灰小字、纯展示、不参与计算/校验,`#metric-algo` / `#guard-algo`):
  - High-Value Rate → `同期新客中,7 天总存款 ≥ 高门槛 的人数 ÷ 新客总数 × 100%`
  - Day-1 Quality Floor → `同期新客中,第一天自己存款 > 最低线 的人数 ÷ 新客总数 × 100%`
  - 「高门槛」「最低线」保留文字、不填数字。
- **连带**:① sentence 的指标名跟随当前主指标(不再写死 FDC);② Baseline 跟随主指标 —— High-Value Rate 现数据管道无基准 → 显示「基准待定」并标注、**不假填**(⚠️ 见下「待 V/数据」)。
- **切品牌即清旧数值**:进 OK188/17WIN/SBKH 时清空 目标值/%/护栏 figure,不把旧指标的数字(FDC 18/80%、AFDA ≥4)平移到新指标;`editHypothesis` 同理(锁定品牌不回填被替换指标的数值)。
- **校验**:figure 本期 TBD —— 目标值 / 护栏阈值仅对非锁定品牌(INZ9/其他)仍必填;OK188/17WIN/SBKH 留空可存(草稿无校验;SBKH 因无合法指标,只能存草稿、到不了「待锁定」)。
- 验证:`node --check` 通过;无头浏览器渲染 OK188 / 17WIN 两态,锁定 / 名单 / op / 算法标注 / Baseline 全部对上,无 pageerror。
- **⚠️ 待 V / 数据**:`get_brand_baselines()` RPC 只返回 FDC/REG/AFDA/FDAMT,**不含 7-Day High-Value Rate**;HVR 是 7 天 cohort 指标,现管道算不出其基准 → 已按你要求留空标注、不假填。要它的 baseline,需新增 cohort 口径的取数(D1+D7、高门槛 figure 定了之后)。

## [v15] — 2026-06-28 · New Hypothesis 重构 P1a(假设端)

> SPEC:`SPEC_hypothesis_redesign.md`(标签优先 + 维度声明 + 裁判 + Results)。本次只做 P1 的「假设端」:删素材矩阵、加维度声明、素材改逐条建骨架。Creative Setup 打标签(P1b)、裁判(P2)、Results 聚合(P3)未做。
> ⚠️ **依赖 DB 迁移**:部署前必须先在 Supabase 跑 `migration_p1.sql`(加 `hypotheses.test_dim` + `creatives` 的 audience/age/game_type/offer 列),否则立假设保存失败。

- **删素材矩阵卡(card4)** + `matrix()` 函数 + `updateAll` 里的 `matrix()` 调用。
- **card1 删逐属性 select**:`hf-format`/`hf-persona`/`hf-age`/`hf-game`/`hf-vs`/`hf-hook`/`hf-offer`(连带 `offerRow` + `hookChange()` 及其 3 处调用)——这些属性下沉为 Creative 标签。**留** `hf-brand`(baseline key)。
- **card1 加「本次测的维度」下拉 `hf-dim`**:选项 = `TEST_DIMS` 白名单 7 维(Format/Hook/视觉/Offer/人群/年龄/游戏),key 与 creatives 标签列名对齐(供 P2 裁判)。默认 unselected,Save 必填(沿用 v12 防漏填)。
- **目标整套逐字保留**:指标卡、改变 X、目标值(绝对+%)、`#sentence` slot、Baseline 卡、容量体检、判定规则 —— 一行未动(SPEC 硬约束)。
- **素材生成改逐条建骨架**:`saveHypothesis` 删「按 matrix.total 批量生成 creative」循环;hypothesis row 不再写 format/hook/vs/persona/age/game/offer/matrix,改写 `test_dim`。新增详情抽屉「＋ 加素材」按钮(`addCreativeSkeleton`)逐条建 creative 骨架(挂 hyp_code + V 编号),团队再去 Creative Setup 打标签 / 填图文。**注**:删 auto-gen 后这是当前唯一的 creative 创建入口。
- **联动收口**:`resetHypoForm`/`validateHypo`/`editHypothesis` 去掉已删字段、加 `hf-dim`;`loadHypos` map `test_dim`→`testDim`(旧列映射保留作历史兼容);`renderHypo` 列表加维度 pill;`openDrawer` 把「目标人群」行换成「本次测维度」、加 `applyPerms()`。
- **未改**:`renderResults`(P3 重写,现仍兼容 null hook/vs)、Creative Setup 表单(P1b 加标签)、裁判(P2)。
- 验证:抽内联 JS `node --check` 通过;未做浏览器实测(本环境无 Supabase MCP / 无法起预览)。
- **待 V 定**:① card1 的 hf-type/hf-trigger/hf-evi 去留(本版先保留);② P1b Creative Setup 标签下拉的词表来源(复用原硬编码列表 vs 动态读 DICT)。

## [v14] — 2026-06-26
- **未选品牌时 baseline 文案**:`updateAll` 加 `else if(!brand)` 分支,未选品牌显示「请先选择品牌」而非误导性的「无基准·探索」(后者仅在选了品牌但该品牌无数据时出现)。
- **INZ9 币种标注**:RPC 给 INZ9 的 AFDA/FDAMT 单位返回 `RM`/`RM/周`(USC 维持 `$`/`$/周`),表单 baseline 显示该单位 —— 免团队把 INZ9 的 165 误读成美元。背景:广告费两边均 USD(故 CPA/cost 可跨品牌比),首存额各自本币(USC USD / INZ9 MYR,不可直接比),已 V 确认。

## [v13] — 2026-06-26

- **Hypothesis 列表「Create Date」列**:创建时间从 code 下方副标题 → 改为 Hypothesis 与 Metric 之间的独立列(表头 `Create Date`;空态 colspan 9→10)。
- **Baseline 实时数据接入(新模块)** —— 口径据 Vny《USC业务指标术语表》+ 30 天窗口:
  - Ads Raw Data 项目(`kkypkudherpaxyoocyfa`)新建 `SECURITY DEFINER` RPC `get_brand_baselines()`(anon/authenticated EXECUTE),按品牌返回 FDC/REG/AFDA/FDAMT 的 base+cost+unit;USC 用 raw 列、INZ9 用 `_adj` 归因列;窗口 = 各表 `max("Date")` 往前 30 天(`>`,30 个日历日)。
  - HTML 加第二个 supabase client `adsDb` + `loadBaselines()`,登录后拉 RPC 替换硬编码 `data`(`const`→`let`)。17WINKH/SBKH 原为 null,现有真实值。
  - 三重验证:Database Optimizer subagent 起草+只读验证 → 我独立重跑聚合逐数对上 → applied 后 service 调用 + anon key curl 实调,均确认。
- **协作**:本模块按硬规则派了 Database Optimizer subagent(此前 v10–v12 单文件外科改动一直自己下刀+复核,已向 V 说明并待其定 delegation 偏好)。

**已知 / 待 V·Vny 确认**:
- **INZ9 的 AFDA≈165 / FDAMT≈4045** 远高于 USC(AFDA 5~6)—— 几乎确定是币种不同(KH vs MYR),不影响每品牌自洽的 baseline/容量体检,但跨品牌 AFDA/FDAMT 不可直接比;请确认是币种而非数据 bug。
- baseline 聚合经 anon key 可读(behind cPanel + 登录门);只暴露聚合,不暴露原始会员明细。
- 上线前清测试数据(idea/hypothesis/creative,只留 AI scan)仍待做。
- v13 未做浏览器实测(RPC 已 anon curl 实证可调)。

## [v12] — 2026-06-25

v11 团队实测反馈第二轮。纯前端,数据模型不变。

- **#2 Creative Edit 修复**:`editCreativeCopy` 末尾自开抽屉 —— 修掉从列表点 Edit"没反应"(v11 ⑧ 引入,内容塞进了关着的抽屉)。
- **#3 Hypothesis 创建时间**:`loadHypos` 取 `created_at`,详情抽屉显示「创建时间」。
- **#4 表单按钮改名**:「存草稿」→ `Draft`、「完成草稿 → 待锁定」→ `Save`。
- **#5 New Hypothesis 防漏填**:
  - `prepHypoSelects`/`resetHypoForm` —— 打开表单时所有 select 默认 `— unselected —`、输入框清空(保留 placeholder);`promote`/`editHypothesis` 调用。
  - `validateHypo` —— Save(待锁定)校验全部必填,缺项给字段加红 `*`(`.reqstar`)+ 红框(`.reqbad`)并 toast,**不保存**;Draft(草稿)不校验。移除原 `if(!x)` 硬拦。
  - 必填 = 除「理由」(idea 自动锁定)外全部;**防守底线改必填**并去掉「无」选项;Offer 仅 Hook=优惠直给 时出现且必填。
  - `matrix`/`capacity` 加空值守卫(显示 `—` / 「请填日预算与周期」,不再出 NaN);`resetHypoForm` 隐藏 offerRow 防残留误判。
- **Idea Pool**:
  - 加 **Delete**(`delIdea`):仅「**自己提出**(`by===当前用户`)+ **未衍生 hypothesis**」可删;AI/别人的无删除。
  - **手动想法 Tag 必填**:编辑器 Tag 标「必填」、改提示;`saveIdea` 校验 Tag 非空。
- **(round-2 小修)**:Hypothesis 创建时间也显示在列表行(`renderHypo`,之前只在详情抽屉);Idea「编辑」也加归属门 —— 只能编辑自己提出的(`renderPool` 按钮 + `openIdeaEditor` 双重校验)。

**已知 / 留待**:
- 「AI 扫描不给手动想法打 Tag」在 **n8n**(后端),本轮未动 —— 需要时用 n8n MCP 另开。
- Idea 删除的"只能删自己的"目前是前端 UX 门;真隔离需 RLS 行级策略(随权限隔离一起做)。
- Edit 回填 month/market/mode 按编辑时重算(可接受)。
- v12 未做浏览器实测 —— 待 V 刷新点测(尤其表单校验流程)。

## [v11] — 2026-06-25

v10 团队实测反馈修复(6 项)。纯前端,数据模型 `gen_code`/`ads_code` 不变(只是把 `ads_code` 填写入口从行内挪进表单)。

- **#1 Watchlist「No ads」**:Ad Status 无匹配 ads 数据时由 "—" 改显 `No ads`(`renderBrands`)。
- **#2 Idea Tag 选择器网格化**:`.tagpick` 改 CSS grid 等宽列(`minmax(190px,1fr)`)+ `.tagopt` flex 填满,位置统一不再杂乱。
- **#5 Hypothesis Edit/Delete 移到右上角**:与「我相信…」标题同排、右对齐(`openDrawer`)。
- **删除逻辑重构(解决 Human Error 矛盾)**:删除门槛从"有无 creative"改为"creative 有没有被动过" —— 所有 creative 都是空骨架(无 `versions`、无 `runs`)时可删,并**级联删除空骨架**;任一 creative 被用过(填版本 / 有 run)则禁删,提示改用 Edit。`canDel` 控制 Delete 按钮显隐。
- **#6/#7 Ads Code 改表单录入**:列表第1列空值显示 `pending`(纯标签,去掉点不动的 prompt 按钮);Ads Code 输入框加进 Setup(`firstVersion`)+ Edit(`editCreativeCopy`)表单,保存写 `ads_code`(两处均预填现值,防覆盖)。

**已知 / 留待**:
- `editAdsCode` 函数现已无调用方(孤立),保留未删(无害)。
- 级联删除需要 `creative:delete` 权限——非 Admin 若只有 `hypo:delete`,会因 RLS 删失败(不产生孤儿,整体回滚报错)。
- v11 未做浏览器实测——待 V 刷新点测。

## [v10] — 2026-06-25

团队上线前 fix pass,8 项(基于 v9,详见 `SPEC_v10_fixpass.md`)。纯前端,数据模型 `gen_code`/`ads_code` 零改动。

- **① CI Watchlist Ad Status**:`lifeBadge` 拆三档 —— ≤14d Active / 15–30d **Dormant**(琥珀 ld)/ >30d Inactive / 无匹配 ads 数据 "—"。
- **② Idea Tag 选择器**:`.tagpick` 去掉 `max-height/overflow`,全部 tag 一次显示、铺满留白。
- **③ Hypothesis 理由锁定**:从 idea 立假设时 `hf-why` = idea 文案、只读;仅 Edit 模式可改(以 `window._promoteIdea` 判定)。
- **④ 「我相信」大方块修复**:`.slot.empty` 补 `padding:2px 8px`,挡掉通用 `.empty{padding:40px}` 串台(根因是 CSS 串台,非旧版——先前误判已纠正)。
- **⑤ Hypothesis 删除 + 编辑**:详情抽屉加 Edit(回填表单 → `saveHypothesis` 走 UPDATE,保留 idea 挂钩/created_by,不重生成 creative)+ Delete(仅无 creative 的草稿可删,否则显示「已挂 N 个 creative · 不可删」)。
- **⑥⑦ Creative 列表两列**:第1列空出供手填 Ads Code(空显「＋ Ads Code」虚线占位);第2列显示系统码 `gen_code`,可点跳回上层 Hypothesis(新增 `linkHyp`/`gotoHypo`)。
- **⑧ Setup/Edit 按钮**:列表无版本→Setup、有版本→Edit(均 ghost 统一);抽屉「填第一版/保存第一版」→ Setup/Save、`openCreative` 同步。

**已知限制 / 留待**:
- Edit 回填:format/game/vs/offer 用 token 匹配 option、evi 用文本匹配,已防字段静默回归;month/market/mode 会按编辑时重算(可接受)。
- 「手动新建假设」死代码(line 940)未清(不可达,V 决定保留)。
- creative `runs` 仍未持久化(§5 遗留,不在本轮)。
- Ads Library `select('*')` 仍无分页 —— 数据大了会重,本轮有意缓做。
- v10 未做浏览器实测 —— 待 V 部署/本地刷新点测。

## [v9] — 2026-06-25

- 状态:唯一最新版;内联 JS(1143 行)`node --check` 通过。
- 来源:`~/Downloads/index_v9.html`(158199 B,md5 `9b9547046851dcf6c602e9c2c5c0a98d`)。
- 基于 v8 的 5 项改动(详见 handoff §5):Idea 编辑入口、Idea 手动 Tag 多选、Creative 旧版"上线中"修复 + `saveVersion` 持久化、Creative 列表"去填第一版"CTA、Users 列重排。
- ⚠️ 已知未做:浏览器内 auth 流程实测;creative `runs` 未持久化(仍内存);`pe` 缺 `creative:edit`。

## [基线确立] — 2026-06-25

- 工作目录从 `PI/index_v8.html`(过期)切换到 `PI/index.html`(= v9 权威副本)。
- `PI/index_v8.html` → 归档至 `PI/versions/index_v8.html`;v9 快照存 `PI/versions/index_v9.html`。
- 确立单一基线规则:当前 = `PI/index.html`,字节核验与 `~/Downloads/index_v9.html` 一致。
