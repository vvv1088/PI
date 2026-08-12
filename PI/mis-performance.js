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
  const lex = n => { try { const v = (0, eval)(n); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  /* v78:素材注册表 —— mock 模式用占位注册表(与 mock 花费自洽);live 用 MIS 真素材表 */
  function registry() {
    if (window.MIS_META.mode === 'mock' && window.MIS_MOCK) {
      try { return MIS_MOCK.route('/api/mis/creative-registry', {}); } catch (e) {}
    }
    const cs = lex('creatives'), hs = lex('hypos');
    const hypMap = {};
    hs.forEach(h => { hypMap[h.id] = { brand: h.brand, statement: h.x }; });
    return {
      creatives: cs.map(c => {
        const h = hs.find(x => (c.hyp || '').startsWith(x.id));
        return { ref: c.ref || null, ads: c.ads || null, gen: c.gen, hyp: h ? h.id : (c.hyp || '').split(' ')[0], label: c.label || '', brand: h ? h.brand : '' };
      }).filter(c => c.hyp),
      hypotheses: hypMap,
    };
  }
  async function loadLoop() {
    const brandSel = document.getElementById('plBrand');
    const rangeSel = document.getElementById('plRange');
    const brand = brandSel.value || 'ALL';
    const daysN = Number(rangeSel.value || 14);
    const to = new Date(), from = new Date(); from.setDate(from.getDate() - (daysN - 1));
    const fromS = misDateISO(from), toS = misDateISO(to);

    // 三路数据：花费（系统2）、成交（BO 通道）、素材注册表
    const [spend, bo] = await Promise.all([
      metaApi(`/api/analytics/spending?from=${fromS}&to=${toS}&pageSize=all`),
      metaApi(`/api/mis/bo-daily?from=${fromS}&to=${toS}${brand === 'ALL' ? '' : '&brand=' + brand}`),
    ]);
    /* v78:注册表 —— live/demo 直接用 MIS 的 creatives/hypos(ref_code 已正式发号);
     * mock 模式用占位注册表(保持 mock 数据自洽) */
    const reg = registry();

    // 填品牌下拉（首次）
    if (brandSel.options.length === 1) {
      const bs = [...new Set(reg.creatives.map(c => c.brand).filter(Boolean))];
      bs.forEach(b => brandSel.insertAdjacentHTML('beforeend', `<option>${esc(b)}</option>`));
      brandSel.value = brand;
    }

    /* v78:三层归因(MISNaming.resolveCreative)——
     * 1 严格 ref → 2 登记全名 → 3 只归品牌(进未归因清单) */
    const spendByGen = {};
    const unRows = [];   // 未落到素材的行
    spend.rows.forEach(r => {
      const a = window.MISNaming ? MISNaming.resolveCreative(r.ad_name) : { tier: 0 };
      if (a.tier === 1 || a.tier === 2) spendByGen[a.gen] = (spendByGen[a.gen] || 0) + Number(r.spending);
      else unRows.push({ name: r.ad_name, s: Number(r.spending), tier: a.tier, brand: a.brand || null });
    });
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
      const s = spendByGen[c.gen] || 0, b = (c.ref && boByRef[c.ref]) || { fd: 0, fdAmt: 0, d7: 0 };
      g.rows.push({ c, spend: s, fd: b.fd, fdAmt: b.fdAmt, d7: b.d7, cpa: b.fd ? s / b.fd : null });
    });

    // KPI 汇总
    let tSpend = 0, tFd = 0, tFdAmt = 0, tD7 = 0;
    Object.values(groups).forEach(g => g.rows.forEach(r => { tSpend += r.spend; tFd += r.fd; tFdAmt += r.fdAmt; tD7 += r.d7; }));
    document.getElementById('plKpis').innerHTML =
      kpi('$' + misMoney(tSpend), 'Spend') + kpi(misInt(tFd), 'FD 数') +
      kpi('$' + misMoney(tFdAmt), 'FD 金额') + kpi(tFd ? '$' + misMoney(tSpend / tFd) : '—', 'CPA') +
      kpi('$' + misMoney(tD7), 'D7 金额') + kpi(tSpend ? ((tFdAmt + tD7) / tSpend).toFixed(2) + 'x' : '—', '(FD+D7)/Spend');

    /* v84.1(V 反馈:Hypothesis/素材/Reference 三列排版乱):
     * 假设行只放 假设号·品牌·陈述(陈述截断不挤列);素材行缩进列干净分两段:
     * 素材列=编号+名字(截断),Reference 列=登记基名(nowrap,列宽固定),数字列宽度锁死 */
    const clip = (txt, w) => `<span class="sub" style="display:inline-block;max-width:${w}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom" title="${esc(txt)}">${esc(txt)}</span>`;
    let html = `<tr><th style="width:22px"></th><th>素材 Creative</th><th style="width:240px">Reference</th>
      <th style="width:96px;text-align:right">Spend</th>
      <th style="width:64px;text-align:right">FD</th><th style="width:84px;text-align:right">CPA</th>
      <th style="width:96px;text-align:right">FD 金额</th><th style="width:96px;text-align:right">D7 金额</th></tr>`;
    const gs = Object.values(groups).sort((a, b) => b.rows.reduce((s, r) => s + r.spend, 0) - a.rows.reduce((s, r) => s + r.spend, 0));
    if (!gs.length) html += `<tr><td colspan="8" class="empty">该品牌暂无带 ref code 的在投素材</td></tr>`;
    gs.forEach(g => {
      const gSpend = g.rows.reduce((s, r) => s + r.spend, 0), gFd = g.rows.reduce((s, r) => s + r.fd, 0);
      html += `<tr style="background:rgba(125,125,125,.06)"><td colspan="3" style="white-space:nowrap"><b class="mmr-link" onclick="goHyp('${esc(g.hyp)}')">${esc(g.hyp)}</b> · <span class="mmr-link" onclick="goBrand('${esc(g.brand)}')">${esc(g.brand)}</span>
        ${clip(g.statement, 360)}</td>
        <td style="text-align:right"><b>$${misMoney(gSpend)}</b></td>
        <td style="text-align:right"><b>${misInt(gFd)}</b></td>
        <td style="text-align:right"><b>${gFd ? '$' + misMoney(gSpend / gFd) : '—'}</b></td>
        <td style="text-align:right"><b>$${misMoney(g.rows.reduce((s, r) => s + r.fdAmt, 0))}</b></td>
        <td style="text-align:right"><b>$${misMoney(g.rows.reduce((s, r) => s + r.d7, 0))}</b></td></tr>`;
      g.rows.sort((a, b) => b.spend - a.spend).forEach(r => {
        html += `<tr><td></td><td style="white-space:nowrap"><b>${esc(r.c.gen)}</b> ${clip(r.c.label, 200)}</td>
          <td style="white-space:nowrap">${r.c.ref ? `<span class="code" style="font-size:11px">${esc(r.c.ref)}</span>` : (r.c.ads ? `<span class="mmr-badge mmr-n" title="旧广告按登记全名归因:${esc(r.c.ads)}">登记名</span>` : '—')}</td>
          <td style="text-align:right">$${misMoney(r.spend)}</td>
          <td style="text-align:right">${misInt(r.fd)}</td>
          <td style="text-align:right">${r.cpa != null ? '$' + misMoney(r.cpa) : '—'}</td>
          <td style="text-align:right">$${misMoney(r.fdAmt)}</td>
          <td style="text-align:right">$${misMoney(r.d7)}</td></tr>`;
      });
    });
    document.getElementById('plTable').innerHTML = html;

    /* v78:未归因清单(三层归因后仍未落到素材的行)——过渡期这就是工作清单:
     * 「已归品牌」= 旧广告,去对应素材登记现名即可;「完全未归」= 命名不规范,要人工排查 */
    const un = {};
    unRows.forEach(r => { const u = un[r.name] || (un[r.name] = { s: 0, tier: r.tier, brand: r.brand }); u.s += r.s; });
    const unNames = Object.keys(un);
    const unSpend = unNames.reduce((s, n) => s + un[n].s, 0);
    const warn = unNames.length
      ? `<div style="color:#b26a00;margin-bottom:6px">⚠ <b>${unNames.length} 条广告未落到素材</b>（区间内花费 $${misMoney(unSpend)} 不在上表）：`
        + `<details style="display:inline"><summary style="cursor:pointer;display:inline">查看清单</summary>${unNames.map(n =>
          `<div class="code" style="font-size:11px;margin-top:3px">${esc(n)} — $${misMoney(un[n].s)} · ${un[n].tier === 3 ? '已归品牌 ' + esc(un[n].brand || '') + '（去素材登记此名即可归因）' : '完全未归（命名不规范）'}</div>`).join('')}</details></div>`
      : '';

    /* v78(L5):品牌 MAIN pixel 健康徽章 —— 投放数字异常的第一排查项,不用切页 */
    let healthNote = '';
    if (brand !== 'ALL') {
      try {
        const bs = await metaApi('/api/brands?limit=200');
        const b = bs.items.find(x => x.code === brand);
        if (b) {
          const px = await metaApi(`/api/pixels?brand_id=${b.id}&role=MAIN&limit=10`);
          const main = px.items.find(p => p.status === 'ACTIVE') || px.items[0] || null;
          const st = main ? main.status : '无 MAIN';
          const color = st === 'ACTIVE' ? '#1a7f4e' : '#c62f36';
          healthNote = `<div style="margin-bottom:6px">品牌资产:MAIN Pixel <b style="color:${color}">${esc(st)}</b>${main ? ` <span class="code" style="font-size:11px">${esc(main.name)}</span>` : ''}${st !== 'ACTIVE' ? ' ⚠ 投放追踪可能中断,先查 Health 页' : ''} · <span class="mmr-link" onclick="goBrand('${esc(brand)}')">品牌全景 →</span></div>`;
        }
      } catch (e) {}
    }
    document.getElementById('plNote').innerHTML = healthNote + warn +
      esc((window.MIS_META.mode === 'mock' ? '⚠ 演示数据（mock）。' : '') +
      `区间 ${fromS} ~ ${toS}；花费=系统2 spending 接口；FD/D7=BO 通道（D 节拍板后接真）；归因=严格 ref → 登记全名 → 品牌。`);
  }

  /* ================= Spending 明细 ================= */
  let spState = { page: 1, size: '50' };
  async function loadSpending(page) {
    if (page) spState.page = page;
    const from = document.getElementById('spFrom').value, to = document.getElementById('spTo').value;
    const line = document.getElementById('spLine').value || 'ALL';
    const search = document.getElementById('spSearch').value.trim();
    const qs = new URLSearchParams({ page: String(spState.page), pageSize: spState.size });
    if (from) qs.set('from', from); if (to) qs.set('to', to);
    if (line && line !== 'ALL') qs.set('line', line);
    if (search) qs.set('search', search);
    const d = await metaApi('/api/analytics/spending?' + qs.toString());

    const lineSel = document.getElementById('spLine');
    if (lineSel.options.length === 1) d.lines.forEach(l => lineSel.insertAdjacentHTML('beforeend', `<option>${esc(l)}</option>`));

    /* v84(V 定):Line 列 = 从广告名 detect 品牌;命名没跟 format 的解析不出 → NULL。
     * KPI 直接叫 NULL(=本页 detect 不到品牌的行数);Remark 只给 NULL 行,二选一 test/ignore。 */
    const brandOf = name => (window.MISNaming ? (MISNaming.parseAdName(name).brand || null) : null);
    const nullRows = d.rows.filter(r => !brandOf(r.ad_name));
    document.getElementById('spKpis').innerHTML =
      kpi('$' + misMoney(d.grandTotal), 'Grand Total') + kpi(misInt(d.totalsByDate.length), 'Days') +
      kpi(misInt(d.totalsByLine.length), 'Lines') + kpi(misInt(d.total), 'Rows') +
      (nullRows.length ? kpi(`<span style="color:#b26a00">${nullRows.length}</span>`, 'NULL') : '');

    const canEditRemark = window.MIS_META.mode === 'mock' || window.MIS_META.allowRemarkEdit;
    /* v84.1(V 定):Ad Name 列收缩到内容宽(width:1%+nowrap),Line 就贴着名字;
     * Spending 与 Remark 之间用 padding 拉开正常间距 */
    let html = `<tr><th style="width:92px">Date</th><th style="width:1%;white-space:nowrap">Ad Name</th><th style="width:130px">Line</th>
      <th style="width:110px;text-align:right">Spending</th><th style="padding-left:28px">Remark${canEditRemark ? '' : '（只读）'}</th></tr>`;
    if (!d.rows.length) html += `<tr><td colspan="5" class="empty">无数据</td></tr>`;
    d.rows.forEach((r, i) => {
      const b = brandOf(r.ad_name);
      const lineCell = b ? esc(b) : '<span style="color:#b26a00;font-weight:600">NULL</span>';
      const rv = String(r.remark || '').toUpperCase();
      let remarkCell = '';
      if (!b) {   // 只有 NULL 行需要 remark:TEST(测试广告) / IGNORE(不用管)
        remarkCell = canEditRemark
          ? `<select onchange="MISPerf.saveRemark('${esc(r.date)}',this)" data-ad="${esc(r.ad_name)}">
               <option value=""${!rv ? ' selected' : ''}>—</option>
               <option value="TEST"${rv === 'TEST' ? ' selected' : ''}>TEST</option>
               <option value="IGNORE"${rv === 'IGNORE' ? ' selected' : ''}>IGNORE</option></select>`
          : esc(rv);
        if (r.remark_by) remarkCell += ` <span class="sub" style="display:inline">@${esc(r.remark_by)}</span>`;
      }
      html += `<tr><td style="white-space:nowrap">${esc(r.date)}</td><td style="white-space:nowrap">${esc(r.ad_name)}</td><td>${lineCell}</td>
        <td style="text-align:right">$${misMoney(r.spending)}</td>
        <td style="padding-left:28px">${remarkCell}</td></tr>`;
    });
    document.getElementById('spTable').innerHTML = html;

    /* v84.1(V 定):分页改「每页行数」选择器(50/100/200/Show all),不再是 1/2 翻页码 */
    const tp = d.totalPages || 1;
    const sizeSel = `Rows <select onchange="MISPerf.spSize(this.value)" style="margin:0 8px 0 4px">
        ${['50', '100', '200'].map(s => `<option value="${s}"${spState.size === s ? ' selected' : ''}>${s}</option>`).join('')}
        <option value="all"${spState.size === 'all' ? ' selected' : ''}>Show all</option></select>`;
    document.getElementById('spPager').innerHTML = spState.size === 'all'
      ? `${sizeSel}<span class="sub" style="display:inline">${misInt(d.total)} rows</span>`
      : `${sizeSel}<button class="btn ghost sm" ${spState.page <= 1 ? 'disabled' : ''} onclick="MISPerf.loadSpending(${spState.page - 1})">←</button>
         <span style="margin:0 8px">${spState.page} / ${tp}</span>
         <button class="btn ghost sm" ${spState.page >= tp ? 'disabled' : ''} onclick="MISPerf.loadSpending(${spState.page + 1})">→</button>`;
  }
  function spSize(v) { spState.size = v; loadSpending(1); }

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
  window.MISPerf = { loadLoop, loadSpending, saveRemark, exportCsv, spSize };
  MIS_MODULES.register('perf-loop', loadLoop);
  MIS_MODULES.register('perf-spending', () => loadSpending(1));
})();
