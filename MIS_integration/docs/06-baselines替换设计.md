# baselines 替换设计:New Hypothesis 基线改由 PERFORMANCE 供数(等 V 拍板)

> 2026-08-11 出稿。历史待办 3。休眠版实现已随 v80 落地(`mis-baselines.js`,开关默认关)。

## 1. 现状

- 假设表单的「当前基线」(`data[brand][metric]`)来自**另一个 Supabase 项目**(Daily Report - Ads Raw Data)的 RPC `get_brand_baselines`,人工/脚本维护。
- 指标:FDC(周均 FD 数)、REG(月注册)、AFDA(均单)、FDAMT(周均 FD 金额)+ cost。
- 问题:数据链路独立于闭环报表,口径无法对账;RPC 维护是隐性人工成本。

## 2. 目标形态

基线 = **闭环报表同一数据源的滚动聚合**(花费=系统 2 spending,成交=BO 通道),`brand × metric` 自动计算:

| 指标 | 公式(近 4 个完整周) | 数据源 |
|---|---|---|
| FDC | 周均 FD 人数 = Σfd_count / 4 | BO |
| FDAMT | 周均 FD 金额 = Σfd_amount / 4 | BO |
| AFDA | Σfd_amount / Σfd_count | BO |
| FDC.cost(CPA) | Σspending / Σfd_count | 系统 2 + BO |
| REG | ⚠ BO 通道现行字段没有注册数——**要在对接清单 D 节的字段要求里补 reg_count**,否则 REG 继续走 RPC |

## 3. 切换机制(已实现,休眠)

- `mis-baselines.js` 提供 `MISBaselines.compute()`:按上表聚合,返回与 RPC 同构的 `{brand:{metric:{base,cost,unit}}}`。
- 开关 `MIS_META.useLiveBaselines`(默认 **false**):开启后 `loadBaselines()` 优先用计算值,**逐指标覆盖**,算不出的(如 REG)保留 RPC 值;表单基线旁标注数据源(闭环/RPC)。
- mock 模式下 compute 跑 mock 数据——仅用于验证公式与链路,**不建议 mock 期开启**(数字是演示值)。

## 4. 上线条件与下线 RPC

1. **硬前提:BO 通道 live(D 节拍板 + 部署)** —— FD 系指标全部依赖它;
2. 并行观察期:开关打开后,两源(计算 vs RPC)并行显示 4 周,偏差 <10% 视为对齐;
3. 对齐后 RPC 下线,`get_brand_baselines` 归档;REG 视 D 节是否补 reg_count 决定去留。

## 需要 V 决定

1. 公式表(§2)口径确认——尤其「近 4 个完整周」的窗口;
2. D 节字段要求补 `reg_count`(发给 Jayden 的追加项,一句话);
3. 并行观察期的偏差阈值(建议 10%)。
