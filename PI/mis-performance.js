/* =====================================================================
 * mis-performance.js — PERFORMANCE 模块（v70 新增）
 * 两个视图：
 *   v-perf-loop     闭环报表：花费 × FD/D7 落到 hypothesis / creative
 *   v-perf-spending Spending 明细：分页 / remark / CSV 导出
 * 数据一律经 metaApi()（mis-meta-api.js）。
 * ===================================================================== */
(function () {
  'use strict';

  /* ================= 视图骨架注入 ================= */
  function mount() {
    const loop = document.getElementById('v-perf-loop');
    if (loop) loop.innerHTML = `
      <div class="head"><div>
        <h1>Closed-Loop Report</h1>
        <div class="sub">花费 × FD / D7，按 ref code 落到 hypothesis 与素材 —— 品牌层总量看 PBI，这里只回答「哪个测试值得加码」</div>
      </div>
      <div class="filters">
        <select id="plBrand" onchange="MISPerf.loadLoop()"><option value="ALL">All Brands</option></select>
        <select id="plRange" onchange="MISPerf.loadLoop()">
          <option value="7">近 7 天</option><option value="14" selected>近 14 天</option><option value="30">近 30 天</option>
        </select>
        <button class="btn ghost sm" onclick="MISPerf.loadLoop()">↻ 刷新</button>
      </div></div>
      <div class="kpis" id="plKpis"></div>
      <div class="tablewrap"><table id="plTable"></table></div>
      <div class="note" id="plNote"></div>`;

    const sp = document.getElementById('v-perf-spending');
    if (sp) sp.innerHTML = `
      <div class="head"><div>
        <h1>Spending</h1>
        <div class="sub">按 date × ad × line 的花费明细，含人工备注 —— 与系统 2 报表同一接口同一口径</div>
      </div>
      <div class="filters">
        <input type="date" id="spFrom" onchange="MISPerf.loadSpending(1)">
        <input type="date" id="spTo" onchange="MISPerf.loadSpending(1)">
        <select id="spLine" onchange="MISPerf.loadSpending(1)"><option value="ALL">All Lines</option></select>
        <input type="text" id="spSearch" placeholder="搜广告名…" style="width:150px"
               onkeydown="if(event.key==='Enter')MISPerf.loadSpending(1)">
        <button class="btn ghost sm" onclick="MISPerf.exportCsv()">⇩ CSV</button>
      </div></div>
      <div class="kpis" id="spKpis"></div>
      <div class="tablewrap"><table id="spTable"></table></div>
      <div class="tablebar" id="spPager"></div>`;
  }

  /* ================= 闭环报表 ================= */
  async function loadLoop() {
    const brandSel = document.getElementById('plBrand');
    const rangeSel = document.getElementById('plRange');
    const brand = brandSel.value || 'ALL';
    const daysN = Number(rangeSel.value || 14);
    const to = new Date(), from = new Date(); from.setDate(from.getDate() - (daysN - 1));
    const fromS = misDateISO(from), toS = misDateISO(to);

    // 三路数据：花费（系统2）、成交（BO 通道）、素材注册表（Supabase creatives；mock 期走占位）
    const [spend, bo, reg] = await Promise.all([
      metaApi(`/api/analytics/spending?from=${fromS}&to=${toS}&pageSize=all`),
      metaApi(`/api/mis/bo-daily?from=${fromS}&to=${toS}${brand === 'ALL' ? '' : '&brand=' + brand}`),
      metaApi('/api/mis/creative-registry'),
    ]);

    // 填品牌下拉（首次）
    if (brandSel.options.length === 1) {
      const bs = [...new Set(reg.creatives.map(c => c.brand))];
      bs.forEach(b => brandSel.insertAdjacentHTML('beforeend', `<option>${esc(b)}</option>`));
      brandSel.value = brand;
    }

    // 花费按 ref code 归集（命名契约：ad_name 尾段 = ref code）
    const refOf = n => { const m = reg.creatives.find(c => n.includes(c.ref)); return m ? m.ref : null; };
    const spendByRef = {};
    spend.rows.forEach(r => { const ref = refOf(r.ad_name); if (ref) spendByRef[ref] = (spendByRef[ref] || 0) + Number(r.spending); });
    const boByRef = {};
    bo.rows.forEach(r => {
      const t = boByRef[r.ref_code] || (boByRef[r.ref_code] = { fd: 0, fdAmt: 0, d7: 0 });
      t.fd += r.fd_count; t.fdAmt += Number(r.fd_amount); t.d7 += Number(r.d7_amount);
    });

    // 组装：hypothesis → creatives
    const groups = {};
    reg.creatives.forEach(c => {
      if (brand !== 'ALL' && c.brand !== brand) return;
      const g = groups[c.hyp] || (groups[c.hyp] = { hyp: c.hyp, brand: c.brand, statement: (reg.hypotheses[c.hyp] || {}).statement || '', rows: [] });
      const s = spendByRef[c.ref] || 0, b = boByRef[c.ref] || { fd: 0, fdAmt: 0, d7: 0 };
      g.rows.push({ c, spend: s, fd: b.fd, fdAmt: b.fdAmt, d7: b.d7, cpa: b.fd ? s / b.fd : null });
    });

    // KPI 汇总
    let tSpend = 0, tFd = 0, tFdAmt = 0, tD7 = 0;
    Object.values(groups).forEach(g => g.rows.forEach(r => { tSpend += r.spend; tFd += r.fd; tFdAmt += r.fdAmt; tD7 += r.d7; }));
    document.getElementById('plKpis').innerHTML =
      kpi('$' + misMoney(tSpend), 'Spend') + kpi(misInt(tFd), 'FD 数') +
      kpi('$' + misMoney(tFdAmt), 'FD 金额') + kpi(tFd ? '$' + misMoney(tSpend / tFd) : '—', 'CPA') +
      kpi('$' + misMoney(tD7), 'D7 金额') + kpi(tSpend ? ((tFdAmt + tD7) / tSpend).toFixed(2) + 'x' : '—', '(FD+D7)/Spend');

    // 表格
    let html = `<tr><th>Hypothesis</th><th>素材</th><th>Ref</th><th style="text-align:right">Spend</th>
      <th style="text-align:right">FD</th><th style="text-align:right">CPA</th>
      <th style="text-align:right">FD 金额</th><th style="text-align:right">D7 金额</th></tr>`;
    const gs = Object.values(groups).sort((a, b) => b.rows.reduce((s, r) => s + r.spend, 0) - a.rows.reduce((s, r) => s + r.spend, 0));
    if (!gs.length) html += `<tr><td colspan="8" class="empty">该品牌暂无带 ref code 的在投素材</td></tr>`;
    gs.forEach(g => {
      const gSpend = g.rows.reduce((s, r) => s + r.spend, 0), gFd = g.rows.reduce((s, r) => s + r.fd, 0);
      html += `<tr style="background:rgba(125,125,125,.06)"><td colspan="3"><b>${esc(g.hyp)}</b> · ${esc(g.brand)}
        <span class="sub" style="display:inline">${esc(g.statement)}</span></td>
        <td style="text-align:right"><b>$${misMoney(gSpend)}</b></td>
        <td style="text-align:right"><b>${misInt(gFd)}</b></td>
        <td style="text-align:right"><b>${gFd ? '$' + misMoney(gSpend / gFd) : '—'}</b></td>
        <td style="text-align:right"><b>$${misMoney(g.rows.reduce((s, r) => s + r.fdAmt, 0))}</b></td>
        <td style="text-align:right"><b>$${misMoney(g.rows.reduce((s, r) => s + r.d7, 0))}</b></td></tr>`;
      g.rows.sort((a, b) => b.spend - a.spend).forEach(r => {
        html += `<tr><td></td><td>${esc(r.c.gen)} <span class="sub" style="display:inline">${esc(r.c.label)}</span></td>
          <td><span class="code">${esc(r.c.ref)}</span></td>
          <td style="text-align:right">$${misMoney(r.spend)}</td>
          <td style="text-align:right">${misInt(r.fd)}</td>
          <td style="text-align:right">${r.cpa != null ? '$' + misMoney(r.cpa) : '—'}</td>
          <td style="text-align:right">$${misMoney(r.fdAmt)}</td>
          <td style="text-align:right">$${misMoney(r.d7)}</td></tr>`;
      });
    });
    document.getElementById('plTable').innerHTML = html;

    /* v73:未归因告警 —— 广告名解析不出 ref code 的花费(拼错/不规范命名会静默丢归因,这里显式报出) */
    const un = {};
    spend.rows.forEach(r => { if (!refOf(r.ad_name)) { const u = un[r.ad_name] || (un[r.ad_name] = { s: 0 }); u.s += Number(r.spending); } });
    const unNames = Object.keys(un);
    const unSpend = unNames.reduce((s, n) => s + un[n].s, 0);
    const warn = unNames.length
      ? `<div style="color:#b26a00;margin-bottom:6px">⚠ <b>${unNames.length} 条广告名无法归因到素材</b>（区间内花费 $${misMoney(unSpend)} 不在上表）：`
        + `<details style="display:inline"><summary style="cursor:pointer;display:inline">查看清单</summary>${unNames.map(n => `<div class="code" style="font-size:11px;margin-top:3px">${esc(n)} — $${misMoney(un[n].s)}</div>`).join('')}</details></div>`
      : '';
    document.getElementById('plNote').innerHTML = warn +
      esc((window.MIS_META.mode === 'mock' ? '⚠ 演示数据（mock）。' : '') +
      `区间 ${fromS} ~ ${toS}；花费=系统2 spending 接口；FD/D7=BO 通道（D 节拍板后接真）；join 键=广告名内 ref code。`);
  }

  /* ================= Spending 明细 ================= */
  let spState = { page: 1 };
  async function loadSpending(page) {
    if (page) spState.page = page;
    const from = document.getElementById('spFrom').value, to = document.getElementById('spTo').value;
    const line = document.getElementById('spLine').value || 'ALL';
    const search = document.getElementById('spSearch').value.trim();
    const qs = new URLSearchParams({ page: String(spState.page), pageSize: '50' });
    if (from) qs.set('from', from); if (to) qs.set('to', to);
    if (line && line !== 'ALL') qs.set('line', line);
    if (search) qs.set('search', search);
    const d = await metaApi('/api/analytics/spending?' + qs.toString());

    const lineSel = document.getElementById('spLine');
    if (lineSel.options.length === 1) d.lines.forEach(l => lineSel.insertAdjacentHTML('beforeend', `<option>${esc(l)}</option>`));

    /* v73:命名体检 —— 当前页行里广告名连品牌都解析不出的(命名缺市场/品牌段),显式提示 */
    const badRows = (window.MISNaming ? d.rows.filter(r => !MISNaming.parseAdName(r.ad_name).ok) : []);
    document.getElementById('spKpis').innerHTML =
      kpi('$' + misMoney(d.grandTotal), 'Grand Total') + kpi(misInt(d.totalsByDate.length), 'Days') +
      kpi(misInt(d.totalsByLine.length), 'Lines') + kpi(misInt(d.total), 'Rows') +
      (badRows.length ? kpi(`<span style="color:#b26a00">${badRows.length}</span>`, '本页命名不规范行') : '');

    const canEditRemark = window.MIS_META.mode === 'mock' || window.MIS_META.allowRemarkEdit;
    let html = `<tr><th>Date</th><th>Ad Name</th><th>Line</th><th style="text-align:right">Spending</th><th>Remark${canEditRemark ? '' : '（只读）'}</th></tr>`;
    if (!d.rows.length) html += `<tr><td colspan="5" class="empty">无数据</td></tr>`;
    d.rows.forEach((r, i) => {
      /* v77:方案 A —— 整合前品牌的历史行标「已整合」,数据留在旧名下 */
      let retiredTag = '';
      if (window.MISNaming) { const p = MISNaming.parseAdName(r.ad_name); if (p.brandStatus === 'retired') retiredTag = ` <span class="mmr-badge mmr-n" title="品牌已整合(${esc(p.brand)}),历史数据保留">已整合</span>`; }
      html += `<tr><td>${esc(r.date)}</td><td>${esc(r.ad_name)}${retiredTag}</td><td>${esc(r.line || '-')}</td>
        <td style="text-align:right">$${misMoney(r.spending)}</td>
        <td>${canEditRemark
          ? `<input type="text" value="${esc(r.remark || '')}" placeholder="备注…" style="width:170px"
               onchange="MISPerf.saveRemark('${esc(r.date)}',this)" data-ad="${esc(r.ad_name)}">`
          : esc(r.remark || '')}${r.remark_by ? ` <span class="sub" style="display:inline">@${esc(r.remark_by)}</span>` : ''}</td></tr>`;
    });
    document.getElementById('spTable').innerHTML = html;

    const tp = d.totalPages || 1;
    document.getElementById('spPager').innerHTML =
      `<button class="btn ghost sm" ${spState.page <= 1 ? 'disabled' : ''} onclick="MISPerf.loadSpending(${spState.page - 1})">←</button>
       <span style="margin:0 8px">${spState.page} / ${tp}</span>
       <button class="btn ghost sm" ${spState.page >= tp ? 'disabled' : ''} onclick="MISPerf.loadSpending(${spState.page + 1})">→</button>`;
  }

  async function saveRemark(date, inputEl) {
    const ad = inputEl.getAttribute('data-ad'), remark = inputEl.value.trim();
    try {
      await metaApi('/api/analytics/spending/remark', { method: 'PUT', body: { date, ad_name: ad, remark } });
      toast('备注已保存');
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }

  async function exportCsv() {
    const from = document.getElementById('spFrom').value, to = document.getElementById('spTo').value;
    const line = document.getElementById('spLine').value || 'ALL';
    const qs = new URLSearchParams({ pageSize: 'all' });
    if (from) qs.set('from', from); if (to) qs.set('to', to);
    if (line && line !== 'ALL') qs.set('line', line);
    const d = await metaApi('/api/analytics/spending?' + qs.toString());
    const rows = [['date', 'ad_name', 'line', 'spending', 'remark', 'remark_by']]
      .concat(d.rows.map(r => [r.date, r.ad_name, r.line || '', r.spending, r.remark || '', r.remark_by || '']));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `spending_${from || 'all'}_${to || 'all'}.csv`;
    a.click();
  }

  /* ================= 注册 ================= */
  mount();
  window.MISPerf = { loadLoop, loadSpending, saveRemark, exportCsv };
  MIS_MODULES.register('perf-loop', loadLoop);
  MIS_MODULES.register('perf-spending', () => loadSpending(1));
})();
