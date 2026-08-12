# baselines 替换设计:New Hypothesis 基线改由 PERFORMANCE 供数(V 已拍板 2026-08-12)

> 2026-08-11 出稿,08-12 按 V 决定修订:窗口口径确认;BO 通道本来就有注册数(reg_count),REG 一并计算;
> 不设并行观察期,BO live 后直接切新数据。休眠版实现在 `mis-baselines.js`(开关默认关)。

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
| REG | 月化注册 = Σreg_count / 28 × 30(V 确认 BO 现行字段已有注册数,不需要 D 节追加) | BO |

## 3. 切换机制(已实现,休眠)

- `mis-baselines.js` 提供 `MISBaselines.compute()`:按上表聚合,返回与 RPC 同构的 `{brand:{metric:{base,cost,unit}}}`。
- 开关 `MIS_META.useLiveBaselines`(默认 **false**):开启后 `loadBaselines()` 优先用计算值,**逐指标覆盖**,算不出的指标保留 RPC 值;表单基线旁标注数据源(闭环/RPC)。
- mock 模式下 compute 跑 mock 数据——仅用于验证公式与链路,**不建议 mock 期开启**(数字是演示值)。

## 4. 上线动作(V 已定:直接切,不并行)

1. **硬前提:BO 通道 live(D 节拍板 + 部署)** —— 全部指标依赖它;
2. BO live 当天打开 `useLiveBaselines`,基线即换新算法,**无并行观察期**;
3. RPC `get_brand_baselines` 随即归档下线。

## V 的决定(2026-08-12)

1. 「近 4 个完整周」窗口口径 ✅ 通过;
2. reg_count:BO 通道**本来就有**,D 节不需要追加;REG 纳入计算(月化口径见 §2);
3. 不设并行观察/偏差阈值,直接按新接的数据切换。
