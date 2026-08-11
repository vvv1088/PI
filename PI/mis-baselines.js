/* =====================================================================
 * mis-baselines.js — v80 基线供数(历史待办 3 的休眠版实现)
 *
 * 把假设表单的「当前基线」从人工 RPC(get_brand_baselines)切到闭环同源
 * 计算(花费=系统 2 spending,成交=BO 通道),brand × metric 滚动聚合。
 * 设计详见 MIS_integration/docs/06-baselines替换设计.md。
 *
 * 休眠开关:MIS_META.useLiveBaselines(默认 false)。
 *   开启后 loadBaselines() 用 compute() 结果逐指标覆盖 RPC 值;
 *   算不出的指标(如 REG,BO 通道暂无注册数)保留 RPC 值。
 * 硬前提:BO 通道 live(对接清单 D 节)—— mock 期开启只会得到演示数字。
 * ===================================================================== */
window.MISBaselines = (function () {
  'use strict';

  /* 近 4 个完整周(周一起算):返回 [from, to] ISO 日期 */
  function windowDates() {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;              // 0=周一
    const lastMonday = new Date(now); lastMonday.setDate(now.getDate() - day);   // 本周一
    const to = new Date(lastMonday); to.setDate(to.getDate() - 1);               // 上周日 = 窗口末
    const from = new Date(to); from.setDate(from.getDate() - 27);                // 4 周窗口
    return [misDateISO(from), misDateISO(to)];
  }

  /* 计算 {brand: {FDC:{base,cost,unit}, FDAMT:…, AFDA:…}}(REG 不产,保留 RPC) */
  async function compute() {
    const [from, to] = windowDates();
    const [spend, bo] = await Promise.all([
      metaApi(`/api/analytics/spending?from=${from}&to=${to}&pageSize=all`),
      metaApi(`/api/mis/bo-daily?from=${from}&to=${to}`),
    ]);
    // 花费按品牌归集(三层归因的品牌层)
    const spendByBrand = {};
    spend.rows.forEach(r => {
      const p = window.MISNaming ? MISNaming.parseAdName(r.ad_name) : {};
      if (p.brand) spendByBrand[p.brand] = (spendByBrand[p.brand] || 0) + Number(r.spending);
    });
    // BO 按品牌归集
    const boByBrand = {};
    bo.rows.forEach(r => {
      const t = boByBrand[r.brand] || (boByBrand[r.brand] = { fd: 0, fdAmt: 0 });
      t.fd += Number(r.fd_count || 0); t.fdAmt += Number(r.fd_amount || 0);
    });
    const out = {};
    Object.keys(boByBrand).forEach(b => {
      const t = boByBrand[b], sp = spendByBrand[b] || 0;
      out[b] = {
        FDC:   { base: Math.round(t.fd / 4 * 10) / 10, cost: t.fd ? Math.round(sp / t.fd * 100) / 100 : null, unit: '周均', src: 'loop' },
        FDAMT: { base: Math.round(t.fdAmt / 4 * 100) / 100, cost: null, unit: '$/周', src: 'loop' },
        AFDA:  { base: t.fd ? Math.round(t.fdAmt / t.fd * 100) / 100 : null, cost: null, unit: '$', src: 'loop' },
      };
    });
    return out;
  }

  /* 把计算值逐指标合并进 RPC 基线对象(REG 等缺口保留原值) */
  async function overlay(rpcData) {
    if (!window.MIS_META || !MIS_META.useLiveBaselines) return rpcData;
    try {
      const live = await compute();
      const merged = rpcData && typeof rpcData === 'object' ? rpcData : {};
      Object.keys(live).forEach(b => {
        merged[b] = merged[b] || {};
        Object.keys(live[b]).forEach(m => {
          if (live[b][m] && live[b][m].base != null) merged[b][m] = live[b][m];
        });
      });
      return merged;
    } catch (e) { console.warn('MISBaselines.overlay 失败,保留 RPC 基线:', e); return rpcData; }
  }

  return { compute, overlay, windowDates };
})();
