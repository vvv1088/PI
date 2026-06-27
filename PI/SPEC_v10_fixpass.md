# SPEC — v10 Fix Pass(团队上线前修复)

> 基线:`PI/index.html`(= v9)。本 spec 经 V 审批后实现 → 更新 `index.html` + 快照 `versions/index_v10.html` + changelog。
> 原则:不碰锁定契约(除 ⑥⑦ 已获 owner 明确指示);RLS/权限不动(本轮不做权限隔离)。

## 范围:8 项(④ 已 defer)

---

### ① CI Watchlist「Ad Status」拆出「休眠」档
- **位置**:`lifeBadge()` line 1560(Ad Status 唯一渲染处,`renderBrands` line 1740 调用)。
- **改前**:active→Active(绿) / dormant(15–30d)→Inactive(灰) / dead(>30d)→Inactive(灰) / 无数据→"—"。
- **改后**:active(≤14d)→**Active**(绿 la) / dormant(15–30d)→**休眠**(琥珀 ld,复用已存在但未用的 `.life.ld`) / dead(>30d)→**Inactive**(灰 lx) / 无数据→**"—"**(不变)。
- **map 改为**:`{active:['Active','la'],dormant:['休眠','ld'],dead:['Inactive','lx']}`。
- **不影响**:筛选 `lifeMatch`(active/archive/all)走 `lifeStatus`,不走 `lifeBadge`,语义不变;archive 档仍 = 休眠+已停。
- **待确认**:用中文「休眠」还是英文「Dormant」(本 spec 暂用「休眠」,按 V 原话)。
- **实现前自检**:grep 确认 `lifeBadge` 仅 `renderBrands` 调用,无其它副作用。

### ② Idea 编辑器 Tag 选择器:全部显示、铺满留白
- **位置**:`.tagpick` CSS line 98(`openIdeaEditor` line 1910 用)。
- **根因**:`max-height:170px;overflow:auto` → 超出被滚动藏起。
- **改**:去掉 `max-height` 与 `overflow:auto`,让其自然铺开显示全部 tag;抽屉(`#d-body`)整体可滚。纯 CSS。

### ③ Hypothesis「理由」从 idea 反映 + 锁死只读
- **位置**:`promote()` line 942 写 `hf-why`;`hf-why` textarea line 634;`saveHypothesis` line 957 读 `why`。
- **前提(V 已确认)**:Hypothesis 只能由 idea 衍生(唯一入口 = idea 行「立假设」line 922→`promote`→`go('form')`;nav 无 form 入口;line 940「手动新建假设」是死代码)。**不存在手动新建假设。**
- **改**:创建流程(`window._promoteIdea` 有值)`hf-why` 预填 idea 的 `txt` 且 **永远 `readonly`** + 视觉锁定;用户只填「改变 X」(`hf-x`)。
- **唯一可编辑理由处 = Edit(⑤)**:Edit 模式 `_promoteIdea` 为空 → `hf-why` 可改(预填已存 evidence)。锁定条件统一用 `window._promoteIdea` 是否存在判断。
- **范围**:只锁「理由」自由文本(`hf-why`);「证据类型」下拉(`hf-evi`)不动。
- **顺带(待 V 定)**:line 940「手动新建假设」fallback + `saveHypothesis` 里 `pi?...:null` 的空 idea 容错是死代码,与单向锁矛盾。是否一并清掉/加 guard(让 form 无 idea 时不可保存)——低优先、不可达,V 定。

### ④ 「我相信」空槽渲染成大方块 —— 真 bug,本轮修
- **现象**:V live 截图确认 v9 里「我相信」空值是大虚线方块(非小 pill)。我先前误判为旧版,已纠正。
- **根因**:CSS line 300 通用 `.empty{...padding:40px...}`(给空状态 `<td class="empty">` 用)串台到 `<span class="slot empty">`(`updateAll` line 1501),撑大成方块。`.slot.empty`(line 158)未设 padding,挡不住(同特异性、line 300 在后,padding:40px 胜出)。
- **修法**:`.slot.empty`(line 158)末尾加 `padding:2px 8px`(特异性 0,2,0 > `.empty` 0,1,0,稳压;只影响此空槽,不动通用 `.empty`)。

### ⑤ Hypothesis 删除 + 编辑
- **位置**:`renderHypo` line 1003 行 / `openDrawer` 详情 line 1034。两处现仅查看。
- **删除**(`hypo:delete`):仅当**该假设名下无 creative**(`creatives` 无 `hyp_code===h.id`)时显示删除按钮。
  - 实际效果:**草稿**假设(line 485 存草稿,不生成 creative)可删;**待锁定**(line 486,已自动生成 creative)不可删。
  - 动作:`db.from('hypotheses').delete().eq('code',h.id)` + `logAction('hypo','delete',code)` + `loadHypos()` + 重渲染。
- **编辑**(`hypo:edit`):**本阶段允许改所有字段**。
  - 入口:在 `openDrawer` 详情加「Edit」「Delete」按钮。
  - Edit 流程:`editHypothesis(i)` 把 `hypos[i]` 全字段回填进 New Hypothesis 表单 → 设 `window._editHypoCode=code` → `go('form')`;`saveHypothesis` 检测该 flag → **UPDATE**(`.eq('code',code)`)而非 INSERT。
  - **不重生成 creative**:现有 line 975-976 guard(已存在 creative 则不再插)天然防重复;edit 改 matrix 不会回溯增删 creative(本阶段接受,V 已认可「先放成这样」)。
  - 回填注意:`evidence`(= 证据类型 — why)、`guard`(= "AFDA ≥ 4")是合并字符串,回填需拆分,边缘情况可能不完美(标注,非阻断)。
- **后续**(V 说以后会收紧):熟悉规范后改为「仅无 creative 的可 Edit」。本轮不做。

### ⑥+⑦ Creative 列表前两列(owner 已明确指示,动锁定 code 的展示层)
- **位置**:`renderCreatives` line 1417-1418。数据模型 `gen_code`/`ads_code` **不变**,仅改列表展示。
- **第1列「Asset · Ads Code」** → 改成**手动填 Ads Code 的空位**:
  - 保留缩略图;`ads_code` 有值显示值,无值显示清晰的「＋ Ads Code」虚线占位(点击 → `editAdsCode` 填)。
  - 移除此列原本主显的 `gen_code` 与「Ads: ＋待填」小字旧写法。
- **第2列「Hypothesis / Run」** → 改成显示**自动 `gen_code`(如 HYP-001-V1)**,作为与上层 Hypothesis 的挂钩:
  - 显示 `gen_code`;其父级 `HYP-001` 做成可点链接 → 打开对应 hypothesis(`openDrawer`)。
  - 取代原本显示的 `c.hyp`(hyp_label)。
- **不影响**:详情页标题 `c.code`(= gen_code||ads_code)等数据引用不变。
- **待 V 最终点头**:以上对前两列的理解是否准确(这是锁定契约的展示层改动)。

### ⑧ 「去填第一版」按钮:Setup/Edit + 风格统一 + 英文
- **位置**:`renderCreatives` line 1425(列表行);`firstVersion` 标题 line 1310/1330;`openCreative` line 1118。
- **改**:
  - 列表行:无版本 → 「**Setup**」(`btn ghost sm`,跟其它行内按钮统一,去掉跳眼的实心色);有版本 → 「**Edit**」(`openCreative`/`editCreativeCopy`)。
  - 抽屉内:「填第一版」→「Setup」、「保存第一版」→「Save」、`openCreative` 的「＋ 填第一版」→「Setup」。
- **依据**:V —— "setup 过一次之后,后续都是 edit"。

---

## 实现与验收
- 全部改进**一个版本**:`index.html` 更新 → 快照 `versions/index_v10.html` → `CHANGELOG.md` 加 [v10] 条目。
- 自检:`node --check` 内联 JS;逐项对照本 spec;cross-section 流转(promote→form、drill→gallery、creative 链接→hypo)不破。
- 浏览器实测:由 V 部署到 cPanel + 硬刷新后用真实 auth/data 点测(本环境无登录态,我做静态 + 逻辑核验)。
