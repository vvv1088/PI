# SPEC — New Hypothesis 重构(标签优先 + 维度声明 + 裁判 + Results 聚合)

> 基线:`PI/index.html`(v14)。本 spec 经 V 批准后实现 → `index.html` 更新 + 快照 + changelog。
> 设计依据:`mockup_tagfirst.html`(Results)+ `mockup_control.html`(裁判)。
> 决定见 memory:`project-hypothesis-tagfirst-redesign` / `project-matrix-single-variable-v1`。

## 0. 一句话
把 New Hypothesis 从"逼操作手做实验设计(变量/层级/变体/控制矩阵)"改成"**假设声明 1 个维度 + 素材打词表标签 + 系统当裁判查一致性 + Results 按标签挖规律**"。严谨性从输入端搬到分析端。

## 1. 范围
- **改**:Hypothesis 表单的"变量/素材矩阵"块、`saveHypothesis` 的生成逻辑、Creative 标签收口、新增"裁判"与"Results 按标签聚合"、Dictionary 加"维度"层。
- **不改(硬约束)**:**「目标」整套沿用现有 `index.html` 的格式与形式** —— 指标卡(主指标 + 防守底线 指标/符号/值)、改变 X、目标值(绝对 + % 切换)、slot 句子预览(`#sentence`)、Baseline 侧卡、容量体检(红黄绿)、判定规则侧卡。**逐字保留,不用 mockup 的简化版。**
- **不动**:CI、Admin、Idea Pool、auth/RBAC、baseline RPC(已接好的真实数据)。

## 2. 数据模型

### 2.1 Dictionary 加"维度"层(治理根)
- `dict_entries` 已有按 tab 的词条(Hook / Visual Style / Persona / Format / Offer / Game Type / Age…)。
- **维度清单 = 标记为"可作测试维度"的 tab**(7 个:Format / Hook / 视觉 / Offer / 人群 / 年龄段 / 游戏类型)。Metrics/Idea Source/CI Fields 等不进。
- 实现:给 `dict` tab 加一个 `is_test_dim`(或前端维护一个白名单常量 `TEST_DIMS`)。**"什么算维度、什么算值"由月会改 Dictionary 决定**(单一事实源,防 Joey/Bryan 各创)。

### 2.2 hypotheses 表
- **加**:`test_dim`(text)= 本次测的维度(如 `hook`)。
- **删用途**:`matrix`(jsonb)不再驱动生成(可保留列做历史,前端不再读/写矩阵)。
- 保留:statement/metric/val_from/val_to/guard/brand/month/status/idea_code/verdict… 全不动。

### 2.3 creatives 表(标签 backbone)
- 现有 `format`/`hook`/`visual_style` 标签**保留**;**补齐** `audience`(人群)/`age`/`game_type`/`offer` 标签列(若缺)。
- 每条 creative = 7 维度标签(词表值)+ `hyp_code`(归属假设)+ 真实表现(spend/fdc/cpa,由 ads_code 拉)+ 图/文案。
- **Hook + Format 必填**(Setup 时),其余选填。

## 3. 表单变化(Hypothesis)
- **删**:第 4 块"素材矩阵"整卡(变量数/变量A层级/变量B层级/每格变体/am-out)。
- **加**:第 1 块加一个 **「本次测的维度」下拉**(value 来自 `TEST_DIMS`,显示词表维度名)。改变 X 保留。
- **目标相关全保留原样**(见 §1 硬约束):指标卡、目标值(`hf-target` + `hf-pct` 绝对/%)、`#sentence` slot 渲染、Baseline 卡、容量体检、判定规则。
- 生成不再按 matrix.total 造骨架。改成:**「＋ 加素材」按钮**,逐条建 creative 骨架(挂 `hyp_code` + 当前 `test_dim`),团队去 Creative Setup 打标签 + 填图文。

## 4. 裁判(一致性检查)—— 新增
对一条假设 `h` 及其素材 `cr = creatives where hyp_code=h.code`:
- **该变的**:`distinct(cr, h.test_dim).length >= 2` ? ✅ : ⚠️「该维度没差异,没在测它」。
- **不该变的**:对每个 `d ≠ test_dim` 的维度,`distinct(cr, d).length > 1` → 🔴「混了 X 维度 → 混淆」,列出冲突维度。
- **裁决**:都满足 = ✅ 干净可比;否则 🔴 被污染 + 修法提示(对齐 or 拆假设)。
- 强耦合维度(如 Hook=名人背书 ↔ 视觉)→ 额外**警告**「这俩高度相关,归因有耦合」,不假装消除。
- 展示位置:Hypothesis 详情抽屉里 + 列表行一个状态点(干净/污染/缺差异)。
- **只警告,不阻断**保存(尊重 creative-first 现实;但红着提示该修)。

## 5. Results 按标签聚合 —— 主要新功能
- 跨**全部** creatives(不限单条假设):选一个维度 → 按该维度的取值分组,算 n / 总 spend / 总 fdc / 平均 CPA / 胜率(CPA ≤ 品牌基准的占比)。
- **切片**:按品牌 / 人群过滤,降混淆。
- **混淆标记**:某分组若跨多个其它维度值 → 标「混 N 形式」提示看切片。
- 数据来源:creatives 的标签 + 真实表现(ads_code → campaign_result;现阶段无则用已填值)。
- 替换现有 `renderResults`(目前是"派生 from verdict 的空态")。

## 6. 和 v14 衔接 / 迁移
- 现有 v14 的假设/素材数据:`test_dim` 给历史假设留空(裁判对它们显示"未声明维度,跳过检查");素材标签沿用现有 format/hook/vs。
- 上线前清测试数据时(另一个待办),顺带把保留的脏数据清掉。

## 7. 分期(建议)
1. **P1**:Dictionary 维度白名单 + Hypothesis 表单(删矩阵 / 加维度声明,目标部分原样)+ creatives 补标签列 + Hook/Format 必填。
2. **P2**:裁判(一致性检查 + 详情/列表展示)。
3. **P3**:Results 按标签聚合 + 切片 + 混淆标记。
- P1 上线即可用(假设变简单 + 素材有标签);P2/P3 是价值放大,可滚动上。

## 8. 风险 / 边界
- **命门 = 标签质量**:靠词表下拉 + Hook/Format 必填 + 以后 AI/ads_description 预填;月会治理维度/取值。
- **观察式分析有混淆**:靠裁判 + Results 切片 + Vny 判断兜,不假装受控实验级归因。
- **采纳**:操作手只多"选 1 个维度 + 打标签",已是最低负担;连这都不填则任何系统无效。
- 未做浏览器实测(本 spec 是设计,实现后逐项验)。
