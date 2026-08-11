/* =====================================================================
 * mis-analytics.js — v71 系统 2「Analytics」四页搬家
 *   v-an-accounts   Ad Account Overview：单账户 summary + 花费/转化趋势 + 自定义转化
 *   v-an-ads        Ad Gallery：广告卡片墙 + 点开看日花费与状态历史
 *   v-an-brands     Brand Comparison：品牌日花费堆叠 + 品牌汇总 + 账户×品牌矩阵
 *   v-an-lifecycle  Asset Lifecycle：三类资产的存活/封禁统计
 * （Spending Report 在 v70 已作为 Performance → Spending 搬入，不重复。）
 * 图表：内置轻量 SVG line / bar（无外部依赖），配色照系统 2 chart-cards。
 * ===================================================================== */
(function () {
  'use strict';

  const PALETTE = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#65a30d'];
  const BAD = { ACTIVE: 'g', OK: 'g', BANNED: 'r', FAILED: 'r', DELETED: 'r', DISAPPROVED: 'r',
    DISABLED: 'n', INACTIVE: 'n', ARCHIVED: 'n', PAUSED: 'y', WITH_ISSUES: 'y', CAMPAIGN_PAUSED: 'y' };
  const badge = v => v == null || v === '' ? '<span class="sub" style="display:inline">—</span>'
    : `<span class="mmr-badge mmr-${BAD[v] || 'n'}">${esc(v)}</span>`;
  const money2 = n => (Math.round(Number(n) * 100) / 100).toFixed(2);

  /* ================= 轻量 SVG 图表 ================= */
  function chart(kind, data, xKey, series, height) {
    const W = 920, H = height || 280, PL = 46, PR = 12, PT = 14, PB = 34;
    if (!data.length || !series.length) return '<div class="empty">No data</div>';
    let max = 0;
    data.forEach(d => series.forEach(s => { const v = Number(d[s.key] || 0); if (v > max) max = v; }));
    if (max <= 0) max = 1;
    max *= 1.08;
    const iw = W - PL - PR, ih = H - PT - PB;
    const X = i => PL + (data.length === 1 ? iw / 2 : i * iw / (data.length - 1));
    const XB = i => PL + i * iw / data.length;
    const Y = v => PT + ih - v / max * ih;
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = PT + ih * i / 4;
      const val = max * (1 - i / 4);
      g += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="rgba(128,128,140,.18)" stroke-dasharray="3 3"/>`;
      g += `<text x="${PL - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#8a8a94">${val >= 1000 ? Math.round(val / 100) / 10 + 'k' : Math.round(val * 10) / 10}</text>`;
    }
    const step = Math.max(1, Math.ceil(data.length / 10));
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== data.length - 1) return;
      const x = kind === 'bar' ? XB(i) + iw / data.length / 2 : X(i);
      g += `<text x="${x}" y="${H - PB + 16}" text-anchor="middle" font-size="9.5" fill="#8a8a94">${esc(String(d[xKey]).slice(5))}</text>`;
    });
    if (kind === 'line') {
      series.forEach((s, si) => {
        const pts = data.map((d, i) => `${X(i)},${Y(Number(d[s.key] || 0))}`).join(' ');
        g += `<polyline points="${pts}" fill="none" stroke="${PALETTE[si % PALETTE.length]}" stroke-width="2"/>`;
      });
    } else {
      const bw = iw / data.length;
      const cell = Math.max(2, (bw - 6) / series.length);
      data.forEach((d, i) => {
        series.forEach((s, si) => {
          const v = Number(d[s.key] || 0);
          if (!v) return;
          g += `<rect x="${XB(i) + 3 + si * cell}" y="${Y(v)}" width="${Math.max(1.5, cell - 1)}" height="${PT + ih - Y(v)}" fill="${PALETTE[si % PALETTE.length]}"><title>${esc(String(d[xKey]))} ${esc(s.label)}: ${v}</title></rect>`;
        });
      });
    }
    const legend = series.map((s, si) => `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;margin-right:12px">
      <span style="width:10px;height:10px;border-radius:2px;background:${PALETTE[si % PALETTE.length]};display:inline-block"></span>${esc(s.label)}</span>`).join('');
    return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:560px;display:block">${g}</svg></div>
      <div style="margin-top:6px">${legend}</div>`;
  }
  const chartCard = (title, inner) => `<div class="card" style="padding:14px;margin-bottom:14px"><b style="font-size:12.5px">${esc(title)}</b><div style="margin-top:10px">${inner}</div></div>`;

  const defDate = off => { const d = new Date(); d.setDate(d.getDate() - off); return misDateISO(d); };
  const quickBtns = ns => `
    <button class="btn ghost sm" onclick="${ns}.quick(0,0)">Today</button>
    <button class="btn ghost sm" onclick="${ns}.quick(1,1)">Yesterday</button>
    <button class="btn ghost sm" onclick="${ns}.quick(7,0)">7D</button>
    <button class="btn ghost sm" onclick="${ns}.quick(30,0)">30D</button>`;

  /* ================= Account Overview ================= */
  const AC = { accId: '', from: defDate(7), to: defDate(0), timezone: 'gmt8' };
  async function loadAccounts() {
    const el = document.getElementById('v-an-accounts');
    if (!el) return;
    const accs = (await metaApi('/api/ad-accounts?limit=200')).items;
    const d = AC.accId ? await metaApi(`/api/analytics/accounts?ad_account_id=${AC.accId}&from=${AC.from}&to=${AC.to}&timezone=${AC.timezone}`) : null;
    // 转化趋势按 action_name 透视成多序列
    let convData = [], convSeries = [];
    if (d && d.conversionTrend.length) {
      const byDate = {}, labels = new Set();
      d.conversionTrend.forEach(r => {
        const label = r.action_name || r.action_type;
        labels.add(label);
        (byDate[r.date] = byDate[r.date] || { date: r.date })[label] = Number(r.count || 0);
      });
      convData = Object.keys(byDate).sort().map(k => byDate[k]);
      convSeries = [...labels].slice(0, 6).map(l => ({ key: l, label: l }));
    }
    el.innerHTML = `
      <div class="head"><div><h1>Ad Account Overview</h1><div class="sub">Single ad account, daily insights and conversions.</div></div>
        <div class="filters">
          <select onchange="MISAn.acSet('accId',this.value)">
            <option value="" disabled${AC.accId ? '' : ' selected'}>Select ad account</option>
            ${accs.map(a => `<option value="${esc(a.id)}"${AC.accId === String(a.id) ? ' selected' : ''}>${esc(a.name)} (act_${esc(a.adAccountId)})</option>`).join('')}</select>
          <input type="date" value="${AC.from}" onchange="MISAn.acSet('from',this.value)">
          <input type="date" value="${AC.to}" onchange="MISAn.acSet('to',this.value)">
          <select onchange="MISAn.acSet('timezone',this.value)">
            <option value="gmt8"${AC.timezone === 'gmt8' ? ' selected' : ''}>GMT+8</option>
            <option value="account"${AC.timezone === 'account' ? ' selected' : ''}>Account TZ</option></select>
          ${quickBtns('MISAn.ac')}</div></div>
      ${d && d.summary ? `<div class="kpis">
        ${kpi(money2(d.summary.spend), 'Spend')}
        ${kpi(misInt(d.summary.impressions), 'Impressions')}
        ${kpi(misInt(d.summary.clicks), 'Clicks')}
        ${kpi(misInt(d.summary.conversions), 'Conversions')}
        ${kpi(misInt(d.summary.adsCount), 'Ads（全时段）')}</div>` : '<p class="sub" style="display:block">先选择一个广告账户。</p>'}
      ${d && d.spendTrend.length ? chartCard('Spend Trend', chart('line', d.spendTrend, 'date', [{ key: 'spend', label: 'Spend' }, { key: 'clicks', label: 'Clicks' }])) : ''}
      ${convData.length ? chartCard('Conversion Trend', chart('line', convData, 'date', convSeries)) : ''}
      ${d && d.customConversions.length ? `<div class="card" style="padding:14px"><b style="font-size:12.5px">Custom Conversions</b>
        <div class="tablewrap" style="margin-top:8px"><table>
          <tr><th>Name</th><th>Conversion ID</th><th>Count</th><th>Value</th></tr>
          ${d.customConversions.map(c => `<tr><td>${esc(c.name)}</td><td><span class="code" style="font-size:11px">${esc(c.conversion_id)}</span></td><td>${misInt(c.total_count)}</td><td>${money2(c.total_value)}</td></tr>`).join('')}</table></div></div>` : ''}`;
  }

  /* ================= Ad Gallery ================= */
  const AG = { accId: '', brandId: '', status: '', from: defDate(30), to: defDate(0), sort: 'spend' };
  async function loadAds() {
    const el = document.getElementById('v-an-ads');
    if (!el) return;
    const [accs, brands] = await Promise.all([
      metaApi('/api/ad-accounts?limit=200'), metaApi('/api/brands?limit=200'),
    ]);
    const sp = new URLSearchParams({ from: AG.from, to: AG.to, sort: AG.sort });
    if (AG.accId) sp.set('ad_account_id', AG.accId);
    if (AG.brandId) sp.set('brand_id', AG.brandId);
    if (AG.status) sp.set('status', AG.status);
    const d = await metaApi('/api/analytics/ads?' + sp.toString());
    el.innerHTML = `
      <div class="head"><div><h1>Ad Gallery</h1><div class="sub">Ad cards with spend, clicks, and conversions.（点卡片看日花费与状态历史）</div></div>
        <div class="filters">
          <select onchange="MISAn.agSet('accId',this.value)"><option value="">All ad accounts</option>
            ${accs.items.map(a => `<option value="${esc(a.id)}"${AG.accId === String(a.id) ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
          <select onchange="MISAn.agSet('brandId',this.value)"><option value="">All brands</option>
            ${brands.items.map(b => `<option value="${esc(b.id)}"${AG.brandId === String(b.id) ? ' selected' : ''}>${esc(b.code)}</option>`).join('')}</select>
          <select onchange="MISAn.agSet('status',this.value)"><option value="">All statuses</option>
            ${['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'].map(s => `<option${AG.status === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          <input type="date" value="${AG.from}" onchange="MISAn.agSet('from',this.value)">
          <input type="date" value="${AG.to}" onchange="MISAn.agSet('to',this.value)">
          <select onchange="MISAn.agSet('sort',this.value)">
            <option value="spend"${AG.sort === 'spend' ? ' selected' : ''}>Sort: Spend</option>
            <option value="created"${AG.sort === 'created' ? ' selected' : ''}>Sort: Created</option></select>
          ${quickBtns('MISAn.ag')}</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px">
        ${d.items.map(ad => `
          <div class="card" style="padding:0;overflow:hidden;cursor:pointer" onclick="MISAn.adDetail('${esc(ad.id)}')">
            <div style="aspect-ratio:16/9;background:rgba(128,128,140,.12);display:flex;align-items:center;justify-content:center">
              ${ad.image_url ? `<img src="${esc(ad.image_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '<span class="sub" style="display:inline">No image</span>'}</div>
            <div style="padding:10px 12px">
              <div style="font-size:12.5px;font-weight:600;line-height:1.35;max-height:34px;overflow:hidden">${esc(ad.name || '(no name)')}</div>
              <div style="margin:6px 0">${badge(ad.status)} ${ad.derived_brand_code ? badge(ad.derived_brand_code).replace('mmr-n', 'mmr-b') : ''}${(function () {
                if (!window.MISNaming) return '';
                const a = MISNaming.resolveCreative(ad.name);
                return (a.tier === 1 || a.tier === 2) && a.hyp ? ` <span class="mmr-badge mmr-y" style="cursor:pointer" title="${esc(a.gen)} · ${esc(a.label)}" onclick="event.stopPropagation();goHyp('${esc(a.hyp)}')">🧪 ${esc(a.hyp)}</span>` : '';
              })()}</div>
              <div class="sub" style="display:grid;grid-template-columns:1fr 1fr 1fr;font-size:11px">
                <span>Spend ${money2(ad.spend)}</span><span>Clicks ${misInt(ad.clicks)}</span><span>Conv ${misInt(ad.conversions)}</span></div></div></div>`).join('')
        || '<p class="sub" style="display:block">No ads.</p>'}</div>
      <div id="anAdModal"></div>`;
  }
  async function adDetail(id) {
    const d = await metaApi(`/api/analytics/ads/${id}/detail`);
    const wrap = document.getElementById('anAdModal');
    if (!wrap) return;
    wrap.innerHTML = `<div class="mmr-modal-ov show" onclick="if(event.target===this)this.classList.remove('show')">
      <div class="mmr-modal wide">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <h2 style="margin:0">${esc(d.ad ? d.ad.name : 'Not found')}</h2>
          <button class="btn ghost sm" onclick="this.closest('.mmr-modal-ov').classList.remove('show')">Close</button></div>
        ${d.dailySpend.length ? `<div style="margin-top:12px">${chartCard('Daily Spend（全时段）', chart('line', d.dailySpend, 'date', [{ key: 'spend', label: 'Spend' }, { key: 'clicks', label: 'Clicks' }], 240))}</div>` : '<p class="sub" style="display:block;margin-top:12px">No spend data.</p>'}
        <div class="card" style="padding:14px"><b style="font-size:12.5px">Status History</b>
          ${d.statusHistory.length ? d.statusHistory.map(s => `
            <div class="mmr-rowcard" style="margin-top:8px"><span class="sub" style="display:inline">${esc(s.changed_at)}</span>
              <span>${badge(s.old_status)} → ${badge(s.new_status)}</span></div>`).join('')
          : '<p class="sub" style="display:block;margin-top:8px">No status changes.</p>'}</div></div></div>`;
  }

  /* ================= Brand Comparison ================= */
  const BC = { from: defDate(30), to: defDate(0), sel: null, adStatus: '', accountStatus: '' };
  async function loadBrands() {
    const el = document.getElementById('v-an-brands');
    if (!el) return;
    const brands = (await metaApi('/api/brands?limit=200')).items;
    if (!BC.sel) { BC.sel = {}; brands.forEach(b => { BC.sel[String(b.id)] = true; }); }
    const ids = Object.keys(BC.sel).filter(k => BC.sel[k]).join(',');
    const sp = new URLSearchParams({ from: BC.from, to: BC.to });
    if (ids) sp.set('brand_ids', ids);
    if (BC.adStatus) sp.set('ad_status', BC.adStatus);
    if (BC.accountStatus) sp.set('account_status', BC.accountStatus);
    const d = await metaApi('/api/analytics/brands?' + sp.toString());
    // 日花费透视成 brand_code 多序列
    const m = new Map();
    (d.dailySpend || []).forEach(r => {
      const key = String(r.date);
      if (!m.has(key)) m.set(key, { date: key });
      m.get(key)[r.brand_code || '-'] = Number(r.spend || 0);
    });
    const stacked = [...m.values()].sort((a, b) => a.date.localeCompare(b.date));
    const codes = [...new Set((d.dailySpend || []).map(r => r.brand_code || '-'))];
    const mx = d.matrix || { brands: [], accounts: [], brandTotals: {}, grandTotal: 0 };
    el.innerHTML = `
      <div class="head"><div><h1>Brand Comparison</h1><div class="sub">Cross-brand spend and ad distribution across ad accounts.</div></div>
        <div class="filters">
          <input type="date" value="${BC.from}" onchange="MISAn.bcSet('from',this.value)">
          <input type="date" value="${BC.to}" onchange="MISAn.bcSet('to',this.value)">
          ${quickBtns('MISAn.bc')}</div></div>
      <div class="card" style="padding:12px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px">
        ${brands.map(b => `<label style="display:flex;align-items:center;gap:5px;border:1px solid var(--line,#ddd);border-radius:8px;padding:3px 9px;font-size:12.5px;cursor:pointer">
          <input type="checkbox" ${BC.sel[String(b.id)] ? 'checked' : ''} onchange="MISAn.bcBrand('${esc(b.id)}',this.checked)">${esc(b.code)}</label>`).join('')}</div>
      ${stacked.length ? chartCard('Daily Spend by Brand', chart('bar', stacked, 'date', codes.map(c => ({ key: c, label: c })), 300)) : ''}
      ${d.summary && d.summary.length ? `<div class="card" style="padding:14px;margin-bottom:14px"><b style="font-size:12.5px">Brand Totals</b>
        <div class="tablewrap" style="margin-top:8px"><table>
          <tr><th>Brand</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>Ads（全时段）</th></tr>
          ${d.summary.map(r => `<tr><td><b>${esc(r.brand_code || '-')}</b></td><td>${money2(r.spend)}</td><td>${misInt(r.impressions)}</td><td>${misInt(r.clicks)}</td><td>${misInt(r.ads_count)}</td></tr>`).join('')}</table></div></div>` : ''}
      <div class="card" style="padding:14px"><b style="font-size:12.5px">Ad Account × Brand Matrix</b>
        <div class="filters" style="margin:10px 0">
          <select onchange="MISAn.bcSet('adStatus',this.value)"><option value="">Ad Status: All</option>
            ${['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED', 'WITH_ISSUES', 'DISAPPROVED', 'CAMPAIGN_PAUSED'].map(s => `<option value="${s}"${BC.adStatus === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          <select onchange="MISAn.bcSet('accountStatus',this.value)"><option value="">Account Status: All</option>
            ${['ACTIVE', 'DISABLED', 'BANNED'].map(s => `<option value="${s}"${BC.accountStatus === s ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="tablewrap"><table>
          <tr><th>Ad Account</th><th>Status</th>${mx.brands.map(b => `<th>${esc(b.code)}</th>`).join('')}<th>Total</th></tr>
          ${mx.accounts.length ? mx.accounts.map(a => `
            <tr><td><b>${esc(a.name)}</b><div class="sub" style="display:block"><span class="code" style="font-size:10.5px">act_${esc(a.meta_id)}</span></div></td>
              <td>${badge(a.status)}</td>
              ${mx.brands.map(b => { const v = a.cells[b.code] || 0; return `<td${v ? ' style="font-weight:600"' : ''}>${v || '-'}</td>`; }).join('')}
              <td style="font-weight:700">${a.total}</td></tr>`).join('') +
            `<tr style="font-weight:700;background:rgba(0,0,0,.03)"><td>Total</td><td></td>
              ${mx.brands.map(b => `<td>${mx.brandTotals[b.code] || 0}</td>`).join('')}<td>${mx.grandTotal}</td></tr>`
          : `<tr><td colspan="${mx.brands.length + 3}" class="empty">No data.</td></tr>`}</table></div></div>`;
  }

  /* ================= Asset Lifecycle ================= */
  const LC = { tab: 'adAccounts' };
  const LC_TABS = [['adAccounts', 'Ad Accounts'], ['bms', 'Business Managers'], ['pixels', 'Pixels']];
  async function loadLifecycle() {
    const el = document.getElementById('v-an-lifecycle');
    if (!el) return;
    const d = await metaApi('/api/analytics/lifecycle');
    const slice = d[LC.tab] || { items: [], summary: null };
    el.innerHTML = `
      <div class="head"><div><h1>Asset Lifecycle</h1><div class="sub">Ad accounts / BMs / Pixels age, ban count, and lifespan.</div></div>
        <div class="filters"><button class="btn ghost sm" onclick="MISAn.loadLifecycle()">↻ 刷新</button></div></div>
      <div class="tabs">${LC_TABS.map(([k, label]) => `
        <div style="padding:8px 12px;font-size:13px;cursor:pointer;${LC.tab === k ? 'border-bottom:2px solid var(--acc,#4650dd);font-weight:600;color:var(--acc,#4650dd)' : 'color:var(--mut,#777)'}" onclick="MISAn.lcTab('${k}')">${label}</div>`).join('')}</div>
      ${slice.summary ? `<div class="kpis">
        ${kpi(misInt(slice.summary.active), 'Active')}
        ${kpi(misInt(slice.summary.banned), 'Banned (total)')}
        ${kpi(slice.summary.avgLifespan + 'd', 'Avg Lifespan')}
        ${kpi(slice.summary.longest + 'd', 'Longest')}
        ${kpi(slice.summary.shortest + 'd', 'Shortest')}</div>` : ''}
      <div class="tablewrap"><table>
        <tr><th>Name</th><th>ID</th><th>Status</th>
          <th title="ACTIVE: today − created. DISABLED/BANNED: last status-change − created.">Age (days)</th>
          <th title="Times this entity was marked BANNED/DISABLED via rotation. NOT individual ad disapprovals.">Ban Count</th>
          <th>Last Ban</th><th>Created</th></tr>
        ${slice.items.length ? slice.items.map(r => `
          <tr><td>${esc(r.name)}</td><td>${esc(r.id)}</td><td>${badge(r.status)}</td>
            <td>${esc(r.age_days)}</td><td>${esc(r.ban_count)}</td>
            <td>${r.last_ban ? esc(fmtTs(r.last_ban)) : '-'}</td><td>${esc(fmtTs(r.created_at))}</td></tr>`).join('')
        : '<tr><td colspan="7" class="empty">No records.</td></tr>'}</table></div>`;
  }

  /* ================= 注册 ================= */
  window.MISAn = {
    loadAccounts, loadAds, loadBrands, loadLifecycle, adDetail,
    acSet: (k, v) => { AC[k] = v; loadAccounts(); },
    ac: { quick: (a, b) => { AC.from = defDate(a); AC.to = defDate(b); loadAccounts(); } },
    agSet: (k, v) => { AG[k] = v; loadAds(); },
    ag: { quick: (a, b) => { AG.from = defDate(a); AG.to = defDate(b); loadAds(); } },
    bcSet: (k, v) => { BC[k] = v; loadBrands(); },
    bcBrand: (id, on) => { BC.sel[id] = on; loadBrands(); },
    bc: { quick: (a, b) => { BC.from = defDate(a); BC.to = defDate(b); loadBrands(); } },
    lcTab: t => { LC.tab = t; loadLifecycle(); },
  };

  MIS_MODULES.register('an-accounts', loadAccounts);
  MIS_MODULES.register('an-ads', loadAds);
  MIS_MODULES.register('an-brands', loadBrands);
  MIS_MODULES.register('an-lifecycle', loadLifecycle);
})();
