# 上下文 Handoff v2 — Marketing Intelligent System(PI)

> 用法:整份贴进新 chat 开头。延续 V(Eling)和 Claude 协作 build 营销系统。
> **当前基线 = `PI/index.html` = v14**(2026-06-26)。工作目录 `/Users/elingv/Downloads/PI/`。

---

## 0. 协作硬规则(已在 project memory,自动加载;这里复述)
- 全程**中文行文**,术语/代码/路径/字段名保留英文。
- **orchestrate + delegate**:重活派 subagent;验证/判断/对外决策自己来;**spec-first**(先定口径再动手)。
- **verify-after-delegating**:agent 跑完亲自复核(重跑/对基线/live curl/读 file:line),不信"已完成"。
- **stop-and-report**:越界即停;改算法/契约/数据语义等拿不准的先问 V,不瞎猜。
- **不留技术债**;潜伏 bug 如实报(哪怕范围外)。
- **新模块**:先读码→出 spec→V 批准→才实现。
- **文档**:维护 architecture / code_style / code_map / user_guide / changelog;新文档先提议。
- memory 里另有项目决定:`project-matrix-single-variable-v1`、`project-hypothesis-tagfirst-redesign`。

**环境自动带(不用重写指令)** —— 只要新 chat 在项目目录 `/Users/elingv/Downloads/PI` 打开:
- 上述协作规则 + 项目决定在 **project memory**,自动加载。
- **`.claude/agents/` 66 个自定义 subagent、Skills、MCP servers(Supabase / Atlassian / n8n 等)= 环境/项目自带,自动可用**,不需重新交代"要调 agent / 读 skill"。
- ⚠️ 唯一前提:**新 chat 必须在同一项目目录开**,否则 memory 与 `.claude/agents` 可能不加载。

---

## 1. 当前代码状态(v14)

**基线文件:`PI/index.html`(2041+ 行单文件 HTML + 内联 CSS/JS)。**
- 版本快照在 `PI/versions/index_v8…v14.html`;变更全记在 `PI/CHANGELOG.md`。
- 本地预览:`cd /Users/elingv/Downloads/PI && python3 -m http.server 8765`,开 `localhost:8765/index.html`。**新 chat 要重启这个服务**(之前那个进程可能已停)。
- 登录:`eling`/`123123`(Admin),或 joey/bryan/gg。
- 验证手段:抽内联 JS 跑 `node --check`;对 `versions/` 出 diff;anon curl 测 RPC。

**v9→v14 做了什么(都已 ship 进 v14,纯前端 + 1 个 DB RPC):**
- v10:团队上线前 fix pass(Idea 编辑、Tag 多选、creative 版本持久化、Setup CTA…)。
- v11:Watchlist 状态拆 Active/Dormant/Inactive/No ads;Idea Tag 选择器网格化;Hypothesis Edit/Delete(空骨架才可删 + 级联);Creative 列表 pending/挂钩;Setup/Edit 按钮。
- v12:Creative Edit 修复;Hypothesis 创建时间;Draft/Save 改名;**New Hypothesis 防漏填**(全 unselected + Save 校验必填 + 红 `*`);Idea 删除(仅本人 + 无 hypothesis)+ Tag 必填。
- v13:**Baseline 实时数据接入**(见 §2);Hypothesis 列表加创建时间。
- v14:INZ9 币种标注(RM);未选品牌显示"请先选择品牌";创建时间改成 Hypothesis/Metric 之间的「Create Date」列;Idea 编辑也加归属门。

---

## 2. 技术参照(关键,别记错)

### Supabase(两个项目)
- **`bfukphakofrjalsqteda`("Competitor Intelligence")**:CI 数据 + 全部 auth/RBAC/PI 持久化。`index.html` 主 client `db` 连这个,anon key 硬编码。
- **`kkypkudherpaxyoocyfa`("Ads Raw Data")**:真实投放/会员数据。表:`usc_campaign_result`(USC 三品牌)/`inz9_campaign_result`(_adj 归因列)/`usc_member_list`/`inz9_member_list`/`ads_description`(206/217 有真实图 URL,按 ads_code)。
  - **已建 RPC `get_brand_baselines()`**(SECURITY DEFINER,anon/authenticated 可 EXECUTE):按品牌返回 FDC/REG/AFDA/FDAMT 的 base+cost+unit;USC 用 raw、INZ9 用 _adj;窗口 = max("Date") 往前 30 天;INZ9 的 AFDA/FDAMT 单位标 `RM`(币种:广告费两边 USD,首存 USC=USD / INZ9=MYR)。
  - `index.html` 里第二个 client `adsDb` + `loadBaselines()`(initApp 调用)→ 拉 RPC 替换硬编码 `data`(`const`→`let`)。

### 工具(同原 handoff)
- Confluence:cloudId `abf9cc08-e266-45bd-93b8-836e4a8c7aaa`;Vny 的《USC业务指标术语表》pageId `1500217940`(指标定义/公式权威源)。
- n8n `n8n.ohmediaa.com`;Jira NMMKT。
- 原始 handoff(人/公司/品牌/KPI/learnings 等未变部分):`~/Downloads/MIS_context_handoff.md`。

---

## 3. ⭐ 正在进行的大事:New Hypothesis 重构(标签优先)

**背景**:发现现有"素材矩阵(变量/层级/变体/控制)"本质是实验设计(DOE),**对操作手(Joey/Bryan/GG)海拔太高,会各填各的、数据碎片化、价值发挥不出来**。经长讨论收敛出新地基。

**收敛后的设计(详见 `PI/SPEC_hypothesis_redesign.md`):**
1. **标签优先**:标准化单位 = 每条素材的**词表标签**,不是"填对实验设计"。严谨性放分析端。
2. **假设变轻**:删掉素材矩阵;改成只**声明 1 个「本次测的维度」**(单变量,memory 已定)。
3. **维度 = Dictionary 词表类别,取值 = 词条**(7 个:Format/Hook/视觉/Offer/人群/年龄/游戏);licensing=Hook「合法执照」、代言人=Hook「名人背书」;升不升独立维度由月会/Dictionary 治理(单一事实源,防各创)。
4. **系统当裁判(一致性检查)**:对"假设↔素材"查:① 声明维度有没有差异(没有=没在测);② 其它维度是否一致(乱了=混淆,标红+修法:对齐 or 拆假设)。强耦合维度只警告。**只警告不阻断**(尊重 creative-first)。
5. **Results 按标签跨全部素材聚合**(价值搬这):按维度看胜率/CPA + 切片 + 混淆标记。替换现在的空态 Results。
6. **素材属性住 Creative Setup**(format/hook/视觉/图/文案,Hook+Format 必填),不在假设预声明。

**硬约束(V 定)**:**「目标」整套(指标/防守底线/目标值绝对+%/slot 句子/Baseline/容量体检/判定规则)逐字沿用现有 `index.html` 原格式,不用 mockup 的简化版。** 只换"变量/矩阵"块。

**分期**(SPEC §7):P1 表单(删矩阵+加维度声明,目标原样)+ 素材标签 + Dictionary 维度白名单 → 上线即可用;P2 裁判;P3 Results 聚合。

**Demo mockups(都在 `PI/`,localhost:8765/xxx.html 看;不影响 index.html):**
- `mockup_tagfirst.html` — Results 按标签挖规律(价值)。
- `mockup_control.html` — 声明维度 + 裁判(真实词表 7 维度)。
- `mockup_full.html` — **完整版**:重构后整张表单,目标部分原格式 + 维度 + 素材标签 + 裁判。
- (过程稿:`mockup_planA / optimized / lite / minimal / dict`,可忽略。)

**状态:SPEC 已出、mockup 已看,等 V 最终批准 → 才开始改 `index.html`(现仍 v14、一行没动)。** 下一步从 P1 开始。

---

## 4. 待办清单(按优先级)
1. **New Hypothesis 重构**:V 批 SPEC → 从 P1 实现(见 §3)。← 当前焦点
2. **上线前清测试数据**:V 说"清",用 Supabase MCP 清掉 V 加的测试 idea/hypothesis/creative,**只留 AI scan 的**。务必等 V 明确指令,在那之前不碰。
3. **权限/view 隔离**:某 user 只看部分 section(真隔离需改 RLS / UX 隐藏待定)—— V 押后,要做时再讨论。
4. **n8n**:AI 周一扫描**不要给手动想法打 tag**(前端 v12 已标必填+改提示,后端逻辑待用 n8n MCP 改)。
5. **遗留**:creative `runs` 未持久化;Ads Library `select('*')` 无分页(数据大了会重);6 个 CI views advisor ERROR(靠 cPanel 密码保护)。
6. 原 handoff §7 的更大 roadmap(AI 周一扫描自动加 idea、Hypothesis DETAIL 显示新维度、USC KPI 框架、Bryan FB 账户架构、Make→n8n 迁移、Telegram 二级渠道…)。

---

## 5. `PI/` 目录现状
```
index.html              ← 当前唯一工作版 = v14
versions/index_v8…v14   ← 历史快照
CHANGELOG.md            ← 完整变更记录
user_guide.md           ← 团队操作手册(白话)
SPEC_v10_fixpass.md     ← v10 修复 spec
SPEC_hypothesis_redesign.md ← ⭐ 重构 spec(当前焦点)
mockup_*.html           ← 重构 demo(见 §3)
HANDOFF.md              ← 本文件
.claude/agents/         ← 66 个自定义 subagent(engineering 33 + marketing 33)
```

---

## 6. 部署
手动上传 HTML 到 cPanel(`ci.boostmarketing.site`)→ **硬刷新 Cmd+Shift+R 清缓存**(反复踩的坑)。V 的部署模型:把完整 `public_html/` 放 locker → 一次性 zip 上传。一次只动一处 production,改完验证再下一步。

---

## 7. ⚠️ 已踩过的坑 / 别重来(重要)

### 7.1 New Hypothesis 重构:这些方案都试过且被否,别再提
我们绕了约 7 版 mockup,每版发现一个洞。**别让新 chat 重新探索这些死路:**
- **planA / optimized / 完整结构化版**(变量绑维度 + 自动按层级生成素材 + 强制控制置灰):**否**。原因:① 维度不正交(Hook=名人背书 必带名人画面 → "只动一个变量"是假象,归因不干净);② 素材(图/文案)永远手工,系统只能预填标签、不能生成素材,"自动生成"价值被夸大;③ 自由变量(代言人/落地页/CTA)不在预设维度 → 整套失效;④ 改变 X 与层级取值语义重叠打架;⑤ 变体在系统里仍是纯计数;⑥ 和"团队在 Meta 先做、再回填"的 creative-first 工作流相向。
- **lite(自由文字变量/层级 + 去掉控制)**:**否**。free text → 碎片化(提款到账/秒提款/提款秒到账 算 3 个),Joey/Bryan 各填各的,Results 没法聚合;且丢了"控制变量必须固定"。
- **minimal(素材属性全甩给 Creative 自由填)**:**否**。丢了控制 → 团队 2 照片 1 视频,测试当场作废;且属性和变量重复。
- **dict(词表背书下拉)**:方向对(标准化),但**还缺控制/一致性强制** → V 问"你怎么做控制"。
- ✅ **收敛 = tagfirst + control(见 §3)**:标签优先 + 声明 1 维度 + **系统当裁判查一致性** + Results 聚合 + 目标原格式。

### 7.2 META 教训(避免再犯同类错)
- **别给操作手做 DOE 工具**。标准化锚在"素材词表标签",严谨性放分析端,系统当裁判保一致。
- **churn 本身是症状**:一直补字段说明模型海拔错配 → 要质疑地基(模型适不适合用的人),不是继续打补丁。
- **必须把人性考虑进去**:操作手忙、第一次用、creative-first、会走捷径填糊弄。"自己写得自己爽"的优雅设计 = 没人填对 = 系统没价值。
- **V 要先确认逻辑再动手**:别"画 mockup → 发现洞 → 重画"。先把"谁填/怎么填/数据怎么变成知识"敲定,再谈字段/界面。
- **不当 yes-man**:主动找漏洞、对 V 的填法也直接指错(例:V 把变量命名成 "trusted" 这种"效果"而非"客观属性",当场纠)。

### 7.3 技术陷阱清单(已修/已知,别再踩)
- **只改 `PI/index.html`**。曾误改 `~/Downloads/index_v9.html`(历史导出)→ 浪费时间归位。工作文件永远是 `PI/index.html`。
- **本地预览用 Bash `python3 -m http.server 8765`(在 PI/ 下)**。`mcp__Claude_Preview__preview_start` 起 python 会 PermissionError(sandbox),**别用它**;要在浏览器实测 DOM/eval 另想办法。
- **改完必做**:抽内联 JS(`grep -n '^<script>$'` → `^</script>$`,sed 这段)跑 `node --check`;`cp` 到 `versions/index_vN.html`;写 `CHANGELOG.md`。
- **两个 supabase client**:`db`(CI/auth/PI,bfukphakofrjalsqteda)+ `adsDb`(Ads Raw Data,kkypkudherpaxyoocyfa)。`data` 是 `let`(loadBaselines 用 RPC 覆盖)。
- **Ads Raw Data 的原始表 anon 读不了**(RLS 开但无 policy);baseline 只通过 SECURITY DEFINER RPC `get_brand_baselines()` 暴露。别想从前端 anon 直读原始表。
- **`.slot.empty` 必须显式 `padding:2px 8px`**(通用 `.empty{padding:40px}` 会串台撑成大方块)—— 已修,别删。
- **`editCreativeCopy` 末尾要自己开 drawer**(它也从列表行调)—— 已修。
- **表单 select 默认 unselected**(v12 防漏填);未选品牌时 baseline 显示「请先选择品牌」是**设计,不是 bug**。
- **evidence 存成 `"<证据类型> — <why>"`(em-dash U+2014)**;editHypothesis 用 `\s*—\s*` 解析。
- **INZ9 首存 = MYR(RM)、USC = USD;广告费两边 USD** → CPA/cost 可跨品牌比,AFDA/FDAMT 不可。
- **baseline 窗口** = `"Date" > max("Date") - interval '30 days'`(30 个日历日)。
- **ads_code 唯一、可空**,Setup/Edit 表单手填(v12)。
- **creative 级联删除**需 `creative:delete` 权限。

---

## 8. 重构实现地图(P1 字段/函数级,直接照着改)

> 函数名用 `grep` 定位(行号会随版本漂)。原则:**目标那套(card2/card3/侧栏)逐字不动,只删矩阵 + 加维度声明 + 素材标签收口。**

**表单 `#v-form` HTML:**
- **card1「基本」**:**删**逐属性 select —— `hf-format`/`hf-hook`/`hf-vs`/`hf-persona`/`hf-age`/`hf-game`/`hf-offer`(它们变成 Creative 标签)。**留** `hf-brand`(baseline 的 key)。**加** `hf-dim`(本次测的维度 select,选项 = TEST_DIMS)。`hf-evi`(证据)可留作轻元数据;`hf-type`/`hf-trigger` 可删或留极简。
- **card2「指标」**:**留**(`hf-metric` + `hf-guard-m/op/v`)。
- **card3「假设」**:**留**(`#sentence` slot 渲染 + `hf-x` + `hf-target`/`hf-pct` 绝对+% + `hf-why`)。
- **card4「素材矩阵」**:**整卡删**(`am-v`/`am-la`/`am-lb`/`am-n`/`am-out` + `#am-lb-fld`)。
- **侧栏**:Baseline / Capacity / 判定规则 **留**。

**JS:**
- **删** `matrix()` 函数 + `updateAll()` 里对 `matrix()` 的调用。
- **`resetHypoForm` / `validateHypo`**:去掉 `am-*` 和已删属性字段;把 `hf-dim` 加进必填。
- **`saveHypothesis`**:去掉 matrix 计算 + 按 `matrix.total` 自动生成 creative 的循环;`row` 加 `test_dim:g('hf-dim')`;hypothesis row 不再写 format/hook/vs(置 null 或删)。素材改成**「＋ 加素材」按钮**逐条建骨架(挂 `hyp_code` + `test_dim`),不再批量生成。
- **`editHypothesis`**:去掉已删字段的回填;加 `hf-dim` 回填。
- **`loadHypos`**:map `test_dim`;不再依赖 `matrix`。
- **`promote`**:`resetHypoForm` 后只设 `hf-why`(idea 文案,锁定)+ `hf-x` 清空,其余无属性字段可设。
- **`renderHypo` / `openDrawer`**:显示 `test_dim` + (P2)裁判状态。
- **Dictionary**:加 `TEST_DIMS` 常量(前端白名单:维度 key → DICT tab 名),7 个:Format/Hook/视觉/Offer/人群/年龄/游戏。

**DB:**
- `hypotheses` 加列 `test_dim text`。
- `creatives` 确保有标签列:`format`/`hook`/`visual_style`(已有)+ 补 `audience`/`age`/`game_type`/`offer`(缺则 add)。
- Setup/Edit(`firstVersion`/`editCreativeCopy` + `saveFirstVersion`/`saveCreativeCopy`):Hook+Format 必填校验;标签从 DICT 词表选。

**P2 裁判**:新函数 `checkHypoConsistency(hyp)` —— `cr=creatives where hyp_code`;`distinct(cr,test_dim)>=2`(该变)且每个其它维度 `distinct=1`(该一致),否则列冲突维度。渲染进 `openDrawer` + `renderHypo` 行内状态点。**只警告不阻断。**

**P3 Results**:重写 `renderResults` —— 跨全部 creatives,按选定维度分组算 n/spend/fdc/avgCPA/胜率(CPA≤品牌基准占比)+ 品牌/人群切片 + "混 N 维度"标记。数据:creatives 标签 + 真实表现(ads_code→campaign_result)。

---

## 9. 已定死、别再讨论的决定
- **单变量**(变量数=1),多变量以后再加。
- **目标整套保留 index.html 原格式**(不用 mockup 简化版)。
- **维度 = Dictionary 词表类别;licensing=Hook「合法执照」、代言人=Hook「名人背书」**;是否升独立维度 = 月会/Dictionary 治理(单一事实源)。
- **控制 = 声明 1 维度 + 系统裁判查一致性**(不放任 free text、不强压 DOE 矩阵)。
- **假设 = 测试设计;Creative = 素材属性;图/文案 = 每支手工**。三者各归各位。
- **裁判只警告不阻断**(尊重 creative-first)。
- INZ9 币种 = MYR、USC = USD(广告费均 USD)。
- 清测试数据**只在 V 明确说"清"时做**,只留 AI scan。
