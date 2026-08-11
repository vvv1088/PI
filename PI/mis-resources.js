/* =====================================================================
 * mis-resources.js — v71 系统 2「Configuration + System」页面搬家
 *
 * 通用资源引擎（照系统 2 resource-manager / resource-configs / detail-view
 * 的配置驱动结构，vanilla JS 重写）承载 7 组资源 CRUD：
 *   v-mm-brands / v-mm-bms / v-mm-pixels / v-mm-accounts /
 *   v-mm-apps / v-mm-tokens
 * 特殊页面：
 *   v-mm-shares  Pixel Shares 矩阵（品牌 MAIN pixel × 广告账户三态）
 *   #usersMetaBody 统一 Users:MIS 用户 ↔ 系统 2 账号映射 + Meta 权限编辑(v77)
 * 详情页 = 列表内切换的子视图（Basic Info + 关联 tabs + 特殊面板：
 * CAPI 事件开关 / BM FB 个人号 / 广告账户品牌关联）。
 * 数据一律经 metaApi()；写操作在 mock 模式落内存（刷新复位）。
 * ===================================================================== */
(function () {
  'use strict';

  /* ================= 样式（只作用于本模块的 mmr- 前缀类） ================= */
  const css = document.createElement('style');
  css.textContent = `
  /* v74:v70/v71 新页面的表格没包 thead,表头落回浏览器默认(居中无边距)导致与内容错位。
     此规则给所有新视图的 th 补上与 MIS 原生 thead th 一致的样式(左对齐;数字列的行内 right 不受影响)。 */
  #v-perf-loop th,#v-perf-spending th,#v-as-health th,[id^="v-mm-"] th,[id^="v-an-"] th,#auditBody th,#usersMetaBody th{
    font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:var(--ink3,#8a8a94);font-weight:600;
    text-align:left;padding:8px 12px;background:var(--bg2,#f6f7f9);border-bottom:1px solid var(--line,#e3e3e8);white-space:nowrap}
  #v-perf-loop td,#v-perf-spending td,#v-as-health td,[id^="v-mm-"] td,[id^="v-an-"] td,#auditBody td,#usersMetaBody td{
    padding:9px 12px;border-bottom:1px solid var(--line,#e3e3e8);vertical-align:middle}
  .mmr-badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .mmr-g{background:#e6f6ee;color:#1a7f4e;border:1px solid #b6e5cd}
  .mmr-r{background:#fdebec;color:#c62f36;border:1px solid #f6c6c9}
  .mmr-y{background:#fff3e0;color:#b26a00;border:1px solid #ffd9a0}
  .mmr-b{background:#e8f0fe;color:#2456c4;border:1px solid #c4d6fb}
  .mmr-n{background:#f0f0f2;color:#5c5c66;border:1px solid #dcdce0}
  .mmr-modal-ov{position:fixed;inset:0;background:rgba(20,20,28,.45);z-index:220;display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:40px 16px}
  .mmr-modal-ov.show{display:flex}
  .mmr-modal{background:var(--card,#fff);border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.25);padding:20px;width:100%;max-width:560px}
  .mmr-modal.wide{max-width:820px}
  .mmr-modal h2{font-size:16px;margin:0 0 14px}
  .mmr-field{margin-bottom:12px}
  .mmr-field label{display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--mut,#666)}
  .mmr-field input,.mmr-field select,.mmr-field textarea{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--line,#ddd);border-radius:8px;font-size:13px;background:var(--card,#fff);color:inherit}
  .mmr-field textarea{min-height:64px;resize:vertical}
  .mmr-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
  .mmr-dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
  .mmr-dl .it{border:1px solid var(--line,#e3e3e8);border-radius:8px;padding:9px 11px;background:rgba(0,0,0,.015)}
  .mmr-dl .it dt{font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--mut,#888);margin:0 0 4px}
  .mmr-dl .it dd{margin:0;font-size:13px}
  .mmr-tabs{display:flex;gap:2px;border-bottom:1px solid var(--line,#ddd);margin:16px 0 12px;flex-wrap:wrap}
  .mmr-tabs button{border:none;background:none;padding:8px 12px;font-size:13px;cursor:pointer;color:var(--mut,#777);border-bottom:2px solid transparent}
  .mmr-tabs button.on{color:var(--acc,#4650dd);border-bottom-color:var(--acc,#4650dd);font-weight:600}
  .mmr-sw{position:relative;width:36px;height:20px;border-radius:10px;background:#cfcfd6;border:none;cursor:pointer;transition:background .15s;flex:none}
  .mmr-sw::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  .mmr-sw.on{background:#22a06b}.mmr-sw.on::after{left:18px}
  .mmr-sw:disabled{opacity:.5;cursor:default}
  .mmr-rowcard{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--line,#e3e3e8);border-radius:8px;padding:10px 12px;margin-bottom:8px}
  .mmr-back{font-size:12.5px;color:var(--acc,#4650dd);cursor:pointer;text-decoration:none}
  .mmr-back:hover{text-decoration:underline}
  .mmr-link{color:var(--acc,#4650dd);font-weight:600;cursor:pointer}
  .mmr-link:hover{text-decoration:underline}
  .mmr-status{font-size:12.5px;color:var(--mut,#888);margin:6px 0}
  .mmr-2col{display:grid;grid-template-columns:360px 1fr;gap:14px}
  @media(max-width:900px){.mmr-2col{grid-template-columns:1fr}}
  .mmr-pgr{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--mut,#888);margin-top:10px}`;
  document.head.appendChild(css);

  /* ================= 通用渲染小件 ================= */
  const BAD = { ACTIVE: 'g', VALID: 'g', OK: 'g', DONE: 'g', PUBLISHED: 'g',
    BANNED: 'r', EXPIRED: 'r', REVOKED: 'r', FAILED: 'r',
    DISABLED: 'n', INACTIVE: 'n', SKIPPED: 'n', 'NOT_SHARED': 'n',
    PENDING: 'y', DEVELOPMENT: 'y', PAUSED: 'y',
    MAIN: 'b', BACKUP1: 'b', BACKUP2: 'b', GRAPH_API: 'b', PIXEL: 'b', CUSTOM_AUDIENCE: 'b',
    CAPI: 'b', AUDIENCE: 'b', Superadmin: 'b' };
  const badge = v => v == null || v === '' ? '<span class="sub" style="display:inline">—</span>'
    : `<span class="mmr-badge mmr-${BAD[v] || 'n'}">${esc(v)}</span>`;
  const nested = (row, key) => key.split('.').reduce((a, k) => (a && typeof a === 'object') ? a[k] : undefined, row);
  const disp = v => (v == null || v === '') ? '-' : String(v);
  const tokenPrev = t => t ? esc(String(t).slice(0, 8)) + '…' : '-';

  function cell(row, c) {
    const v = nested(row, c.key);
    if (c.type === 'badge') return badge(disp(v) === '-' ? null : v);
    if (c.type === 'badges') {
      if (!Array.isArray(v) || !v.length) return '-';
      return v.map(it => badge(disp(c.badgeKey ? nested(it, c.badgeKey) : it))).join(' ');
    }
    if (c.type === 'date') {
      if (c.key === 'expiresAt' && !v) return '<span class="sub" style="display:inline">Never</span>';
      return v ? esc(fmtTs(v)) : '-';
    }
    if (c.type === 'count') return esc(String(v == null ? 0 : v));
    if (c.type === 'token') return `<span class="code" style="font-size:11px">${tokenPrev(v)}</span>`;
    if (c.type === 'link') return `<span class="mmr-link" data-id="${esc(String(row.id))}">${esc(disp(v))}</span>`;
    return esc(disp(v));
  }

  /* ================= 资源配置（照系统 2 resource-configs.ts） ================= */
  const assetSt = ['ACTIVE', 'DISABLED', 'BANNED'];
  const roles = ['MAIN', 'BACKUP1', 'BACKUP2'];
  const brandLookup = { api: '/api/brands', labelKeys: ['code', 'name'] };
  const bmLookup = { api: '/api/business-managers', labelKeys: ['name', 'bmId'] };

  const R = {
    brands: {
      view: 'mm-brands', title: 'Brands', desc: 'Brand code, name, and status management.',
      api: '/api/brands',
      columns: [
        { key: 'code', label: 'Code', type: 'link' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: '_count.businessManagers', label: 'BMs', type: 'count' },
        { key: '_count.pixels', label: 'Pixels', type: 'count' },
        { key: '_count.adAccountLinks', label: 'Ad Accounts', type: 'count' },
      ],
      fields: [
        { name: 'code', label: 'Code', type: 'text', required: true, createOnly: true },
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'], required: true },
      ],
      filters: [{ name: 'status', label: 'Status', options: ['ACTIVE', 'INACTIVE'] }],
      detail: {
        title: 'Brand Detail',
        sections: [
          { title: 'Business Managers', key: 'businessManagers', cfg: 'bms' },
          { title: 'Pixels', key: 'pixels', cfg: 'pixels' },
          { title: 'Ad Accounts', key: 'adAccountLinks', columns: [
            { key: 'adAccount.adAccountId', label: 'Ad Account ID' },
            { key: 'adAccount.name', label: 'Name' },
            { key: 'adAccount.sourceBm.name', label: 'Source BM' },
            { key: 'adAccount.status', label: 'Status', type: 'badge' } ] },
        ],
        panels: [{ title: 'CAPI Events', render: capiPanel }],
      },
    },
    bms: {
      view: 'mm-bms', title: 'Business Managers', desc: 'BM inventory with type, brand, role, account health, and 1+2 accounts.',
      api: '/api/business-managers',
      columns: [
        { key: 'bmId', label: 'BM ID', type: 'link' },
        { key: 'name', label: 'Name' },
        { key: 'bmType', label: 'Type', type: 'badge' },
        { key: 'role', label: 'Role', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'healthCheckedAt', label: 'Health Checked', type: 'date' },
        { key: 'lastHealthResult', label: 'Last Result', type: 'badge' },
      ],
      fields: [
        { name: 'bmId', label: 'BM ID', type: 'number', required: true },
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'bmType', label: 'Type', type: 'select', options: ['GRAPH_API', 'PIXEL', 'CUSTOM_AUDIENCE'], required: true },
        { name: 'role', label: 'Role', type: 'select', options: roles, required: true, visibleWhen: { field: 'bmType', in: ['PIXEL'] } },
        { name: 'brandId', label: 'Brand', type: 'select', lookup: brandLookup, nullable: true },
        { name: 'status', label: 'Status', type: 'select', options: assetSt, required: true },
      ],
      filters: [
        { name: 'bm_type', label: 'Type', options: ['GRAPH_API', 'PIXEL', 'CUSTOM_AUDIENCE'] },
        { name: 'status', label: 'Status', options: assetSt },
      ],
      detail: {
        title: 'Business Manager Detail',
        panelsFirst: true,
        panels: [{ title: 'FB Accounts', render: fbPanel }],
        sections: [
          { title: 'Tokens', key: 'systemUserTokens', cfg: 'tokens' },
          { title: 'Pixels', key: 'pixels', cfg: 'pixels' },
        ],
      },
    },
    pixels: {
      view: 'mm-pixels', title: 'Pixels', desc: 'Pixel inventory, BM ownership, brand mapping, and role status.',
      api: '/api/pixels',
      columns: [
        { key: 'pixelId', label: 'Pixel ID', type: 'link' },
        { key: 'name', label: 'Name' },
        { key: 'brand.code', label: 'Brand' },
        { key: 'businessManager.name', label: 'BM' },
        { key: 'role', label: 'Role', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'lastHealthResult', label: 'Last Result', type: 'badge' },
        { key: '_count.pixelShares', label: 'Shares', type: 'count' },
      ],
      fields: [
        { name: 'pixelId', label: 'Pixel ID', type: 'number', required: true },
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'brandId', label: 'Brand', type: 'select', lookup: brandLookup, required: true },
        { name: 'bmId', label: 'Business Manager', type: 'select', lookup: bmLookup, required: true },
        { name: 'role', label: 'Role', type: 'select', options: roles, required: true },
        { name: 'status', label: 'Status', type: 'select', options: assetSt, required: true },
      ],
      filters: [
        { name: 'brand_id', label: 'Brand', lookup: brandLookup },
        { name: 'role', label: 'Role', options: roles },
        { name: 'status', label: 'Status', options: assetSt },
      ],
      detail: {
        title: 'Pixel Detail',
        sections: [{ title: 'Shares', key: 'pixelShares', cfg: 'shares' }],
      },
    },
    accounts: {
      view: 'mm-accounts', title: 'Ad Accounts', desc: 'Ad account linked to one or more brands via brand_ad_accounts.',
      api: '/api/ad-accounts',
      columns: [
        { key: 'adAccountId', label: 'Ad Account ID', type: 'link' },
        { key: 'name', label: 'Name' },
        { key: 'brandLinks', label: 'Brands', type: 'badges', badgeKey: 'brand.code' },
        { key: 'sourceBm.name', label: 'Source BM' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
      fields: [
        { name: 'adAccountId', label: 'Ad Account ID', type: 'number', required: true },
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'sourceBmId', label: 'Source BM', type: 'select', lookup: bmLookup, nullable: true },
        { name: 'status', label: 'Status', type: 'select', options: assetSt, required: true },
      ],
      filters: [
        { name: 'brand_id', label: 'Brand', lookup: brandLookup },
        { name: 'status', label: 'Status', options: assetSt },
      ],
      detail: {
        title: 'Ad Account Detail',
        panelsFirst: true,
        panels: [{ title: 'Brands', render: accBrandsPanel }],
        sections: [{ title: 'Shares', key: 'pixelShares', cfg: 'shares' }],
      },
    },
    apps: {
      view: 'mm-apps', title: 'Developer Apps', desc: 'Meta developer apps used for system user tokens.',
      api: '/api/developer-apps',
      columns: [
        { key: 'appId', label: 'App ID', type: 'link' },
        { key: 'appName', label: 'App Name' },
        { key: 'mode', label: 'Mode', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: '_count.systemUserTokens', label: 'Tokens', type: 'count' },
      ],
      fields: [
        { name: 'appId', label: 'App ID', type: 'number', required: true },
        { name: 'appName', label: 'App Name', type: 'text', required: true },
        { name: 'appSecret', label: 'App Secret', type: 'text', required: true },
        { name: 'mode', label: 'Mode', type: 'select', options: ['DEVELOPMENT', 'PUBLISHED'], required: true },
        { name: 'status', label: 'Status', type: 'select', options: assetSt, required: true },
      ],
      detail: {
        title: 'Developer App Detail',
        sections: [{ title: 'Tokens', key: 'systemUserTokens', cfg: 'tokens' }],
      },
    },
    tokens: {
      view: 'mm-tokens', title: 'Tokens', desc: 'System user token inventory by BM, app, purpose, and status.（列表只显示前 8 位预览）',
      api: '/api/tokens',
      columns: [
        { key: 'businessManager.name', label: 'BM', type: 'link' },
        { key: 'developerApp.appName', label: 'App' },
        { key: 'purpose', label: 'Purpose', type: 'badge' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'lastVerifiedAt', label: 'Last Verified', type: 'date' },
        { key: 'lastHealthResult', label: 'Last Result', type: 'badge' },
        { key: 'expiresAt', label: 'Expires', type: 'date' },
        { key: 'token', label: 'Token Preview', type: 'token' },
      ],
      fields: [
        { name: 'bmId', label: 'Business Manager', type: 'select', lookup: bmLookup, required: true },
        { name: 'appId', label: 'Developer App', type: 'select', lookup: { api: '/api/developer-apps', labelKeys: ['appName', 'appId'] }, required: true },
        { name: 'token', label: 'Token', type: 'textarea', required: true },
        { name: 'purpose', label: 'Purpose', type: 'select', options: ['GRAPH_API', 'CAPI', 'AUDIENCE'], required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['VALID', 'EXPIRED', 'REVOKED'], required: true },
        { name: 'expiresAt', label: 'Expires At', type: 'datetime', nullable: true },
      ],
      filters: [
        { name: 'purpose', label: 'Purpose', options: ['GRAPH_API', 'CAPI', 'AUDIENCE'] },
        { name: 'status', label: 'Status', options: ['VALID', 'EXPIRED', 'REVOKED'] },
        { name: 'bm_id', label: 'BM', lookup: bmLookup },
      ],
      detail: { title: 'Token Detail' },
    },
    shares: {   // 仅作 detail 表格列配置引用（列表页是矩阵视图）
      columns: [
        { key: 'pixel.name', label: 'Pixel' },
        { key: 'pixel.brand.code', label: 'Brand' },
        { key: 'adAccount.name', label: 'Ad Account' },
        { key: 'shareStatus', label: 'Share Status', type: 'badge' },
      ],
    },
  };

  /* ================= 引擎状态 ================= */
  const S = {};   // key → { rows, page, filters:{}, lookups:{}, editing, detailId }
  const st8 = k => S[k] || (S[k] = { rows: [], page: 1, filters: {}, lookups: {}, editing: null, detailId: null });
  const PAGE = 20;
  const host = k => document.getElementById('v-' + R[k].view);

  async function loadLookups(k) {
    const cfg = R[k], s = st8(k);
    const wants = [];
    (cfg.fields || []).forEach(f => { if (f.lookup) wants.push([f.name, f.lookup]); });
    (cfg.filters || []).forEach(f => { if (f.lookup) wants.push([f.name, f.lookup]); });
    await Promise.all(wants.map(async ([name, lk]) => {
      if (s.lookups[name]) return;
      try {
        const d = await metaApi(lk.api + '?limit=200');
        s.lookups[name] = (d.items || []).map(row => ({ value: String(row.id), label: lk.labelKeys.map(x => disp(row[x])).join(' — ') }));
      } catch (e) { s.lookups[name] = []; }
    }));
  }

  async function loadList(k) {
    const cfg = R[k], s = st8(k);
    const sp = new URLSearchParams({ limit: '100' });
    Object.keys(s.filters).forEach(f => { if (s.filters[f]) sp.set(f, s.filters[f]); });
    const d = await metaApi(cfg.api + '?' + sp.toString());
    s.rows = d.items || [];
    renderList(k);
  }

  function renderList(k) {
    const cfg = R[k], s = st8(k), el = host(k);
    if (!el) return;
    const start = (s.page - 1) * PAGE;
    const pageRows = s.rows.slice(start, start + PAGE);
    const filterHtml = (cfg.filters || []).map(f => {
      const opts = f.options ? f.options.map(o => `<option${s.filters[f.name] === o ? ' selected' : ''}>${o}</option>`).join('')
        : (s.lookups[f.name] || []).map(o => `<option value="${esc(o.value)}"${s.filters[f.name] === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
      return `<select onchange="MISRes.filter('${k}','${f.name}',this.value)"><option value="">All ${esc(f.label)}</option>${opts}</select>`;
    }).join('');
    let t = `<tr>${cfg.columns.map(c => `<th>${esc(c.label)}</th>`).join('')}<th style="width:130px">Actions</th></tr>`;
    if (!pageRows.length) t += `<tr><td colspan="${cfg.columns.length + 1}" class="empty">No records found.</td></tr>`;
    pageRows.forEach((row, i) => {
      t += `<tr>${cfg.columns.map(c => `<td${c.type === 'link' ? ` onclick="MISRes.detail('${k}','${esc(String(row.id))}')"` : ''}>${cell(row, c)}</td>`).join('')}
        <td><button class="btn ghost sm" onclick="MISRes.edit('${k}',${start + i})">Edit</button>
            <button class="btn ghost sm" style="color:#c62f36" onclick="MISRes.del('${k}','${esc(String(row.id))}')">Disable</button></td></tr>`;
    });
    const pages = Math.max(1, Math.ceil(s.rows.length / PAGE));
    el.innerHTML = `
      <div class="head"><div><h1>${esc(cfg.title)}</h1><div class="sub">${esc(cfg.desc)}</div></div>
        <div class="filters">${filterHtml}
          <button class="btn ghost sm" onclick="MISRes.reload('${k}')">↻ 刷新</button>
          <button class="btn sm" onclick="MISRes.openNew('${k}')">＋ New</button></div></div>
      <div class="mmr-status" id="mmrSt-${k}"></div>
      <div class="tablewrap"><table>${t}</table></div>
      <div class="mmr-pgr"><span>Total ${s.rows.length}</span><span>
        <button class="btn ghost sm" ${s.page <= 1 ? 'disabled' : ''} onclick="MISRes.page('${k}',-1)">Prev</button>
        Page ${s.page} / ${pages}
        <button class="btn ghost sm" ${s.page >= pages ? 'disabled' : ''} onclick="MISRes.page('${k}',1)">Next</button></span></div>`;
  }

  /* ================= 详情子视图 ================= */
  async function detail(k, id) {
    const cfg = R[k], s = st8(k), el = host(k);
    if (!cfg.detail || !el) return;
    s.detailId = id;
    let data;
    try { data = await metaApi(cfg.api + '/' + id); }
    catch (e) {
      el.innerHTML = `<div class="head"><div><h1>${esc(cfg.detail.title)}</h1></div></div>
        <p style="color:#c62f36;font-size:13px">${esc(e.message || 'Record not found')}</p>
        <a class="mmr-back" onclick="MISRes.back('${k}')">← Back</a>`;
      return;
    }
    const dl = cfg.columns.map(c => `<div class="it"><dt>${esc(c.label)}</dt><dd>${cell(data, Object.assign({}, c, { type: c.type === 'link' ? 'text' : c.type }))}</dd></div>`).join('');
    const sections = (cfg.detail.sections || []).map(sec => ({ kind: 'sec', title: sec.title, sec }));
    const panels = (cfg.detail.panels || []).map(p => ({ kind: 'panel', title: p.title, panel: p }));
    const tabs = cfg.detail.panelsFirst ? panels.concat(sections) : sections.concat(panels);
    el.innerHTML = `
      <div class="head"><div>
        <a class="mmr-back" onclick="MISRes.back('${k}')">← Back</a>
        <h1 style="margin-top:4px">${esc(cfg.detail.title)}</h1></div></div>
      <div class="card" style="padding:14px;margin-bottom:4px"><b style="font-size:12.5px">Basic Info</b>
        <div class="mmr-dl" style="margin-top:10px">${dl}</div></div>
      ${tabs.length ? `<div class="mmr-tabs" id="mmrTabs-${k}">${tabs.map((tb, i) => `<button class="${i === 0 ? 'on' : ''}" onclick="MISRes.tab('${k}',${i})">${esc(tb.title)}</button>`).join('')}</div><div id="mmrTabBody-${k}"></div>` : ''}`;
    s._detailData = data; s._detailTabs = tabs;
    if (tabs.length) showTab(k, 0);
  }
  function showTab(k, i) {
    const s = st8(k), tabs = s._detailTabs, data = s._detailData;
    const bar = document.getElementById('mmrTabs-' + k);
    if (bar) [...bar.children].forEach((b, j) => b.classList.toggle('on', j === i));
    const body = document.getElementById('mmrTabBody-' + k);
    if (!body) return;
    const tb = tabs[i];
    if (tb.kind === 'sec') {
      const cols = tb.sec.columns || R[tb.sec.cfg].columns.map(c => Object.assign({}, c, { type: c.type === 'link' ? 'text' : c.type }));
      const rows = Array.isArray(data[tb.sec.key]) ? data[tb.sec.key] : [];
      let t = `<tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr>`;
      if (!rows.length) t += `<tr><td colspan="${cols.length}" class="empty">No records.</td></tr>`;
      rows.forEach(row => { t += `<tr>${cols.map(c => `<td>${cell(row, c)}</td>`).join('')}</tr>`; });
      body.innerHTML = `<div class="tablewrap"><table>${t}</table></div>`;
    } else {
      tb.panel.render(body, s.detailId, k);
    }
  }

  /* ================= 表单（新建 / 编辑） ================= */
  function ensureModal() {
    let ov = document.getElementById('mmrModalOv');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'mmrModalOv'; ov.className = 'mmr-modal-ov';
      ov.onclick = e => { if (e.target === ov) closeModal(); };
      ov.innerHTML = '<div class="mmr-modal" id="mmrModal"></div>';
      document.body.appendChild(ov);
    }
    return ov;
  }
  const closeModal = () => { const ov = document.getElementById('mmrModalOv'); if (ov) ov.classList.remove('show'); };

  function fieldVisible(f, vals) { return !f.visibleWhen || f.visibleWhen.in.includes(vals[f.visibleWhen.field] || ''); }

  function openForm(k, row) {
    const cfg = R[k], s = st8(k);
    s.editing = row || null;
    const vals = {};
    (cfg.fields || []).forEach(f => { vals[f.name] = row ? disp(nested(row, f.name)) === '-' ? '' : String(nested(row, f.name)) : ''; });
    s._formVals = vals;
    renderForm(k);
    ensureModal().classList.add('show');
  }
  function renderForm(k) {
    const cfg = R[k], s = st8(k), vals = s._formVals;
    const m = document.getElementById('mmrModal');
    m.className = 'mmr-modal';
    m.innerHTML = `<h2>${s.editing ? 'Edit Record' : 'New Record'} · ${esc(cfg.title)}</h2>` +
      (cfg.fields || []).map(f => {
        if (!fieldVisible(f, vals)) return '';
        const locked = s.editing && f.createOnly;
        if (f.type === 'select') {
          const opts = f.options ? f.options.map(o => `<option${vals[f.name] === o ? ' selected' : ''}>${o}</option>`).join('')
            : (s.lookups[f.name] || []).map(o => `<option value="${esc(o.value)}"${vals[f.name] === o.value ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
          return `<div class="mmr-field"><label>${esc(f.label)}</label>
            <select data-f="${f.name}" ${locked ? 'disabled' : ''} onchange="MISRes.formSet('${k}',this)">
              ${f.nullable ? '<option value="">-</option>' : `<option value="" disabled${vals[f.name] ? '' : ' selected'}>Select ${esc(f.label)}</option>`}${opts}</select></div>`;
        }
        if (f.type === 'textarea') return `<div class="mmr-field"><label>${esc(f.label)}</label>
          <textarea data-f="${f.name}" ${locked ? 'disabled' : ''} oninput="MISRes.formSet('${k}',this)">${esc(vals[f.name])}</textarea></div>`;
        return `<div class="mmr-field"><label>${esc(f.label)}</label>
          <input data-f="${f.name}" type="${f.type === 'datetime' ? 'datetime-local' : f.type}" value="${esc(vals[f.name])}" ${locked ? 'disabled' : ''} oninput="MISRes.formSet('${k}',this)"></div>`;
      }).join('') +
      `<div class="mmr-actions">
        <button class="btn ghost sm" onclick="MISRes.cancel()">Cancel</button>
        <button class="btn sm" onclick="MISRes.save('${k}')">Save</button></div>`;
  }
  function formSet(k, input) {
    const s = st8(k), cfg = R[k];
    s._formVals[input.getAttribute('data-f')] = input.value;
    // visibleWhen 联动（如 BM 的 role 只在 bmType=PIXEL 时出现）
    (cfg.fields || []).forEach(f => { if (f.visibleWhen && !fieldVisible(f, s._formVals)) s._formVals[f.name] = ''; });
    if (input.tagName === 'SELECT') renderForm(k);
  }
  async function save(k) {
    const cfg = R[k], s = st8(k), vals = s._formVals;
    const miss = (cfg.fields || []).find(f => f.required && fieldVisible(f, vals) && !vals[f.name]);
    if (miss) { toast(miss.label + ' is required'); return; }
    const body = {};
    (cfg.fields || []).forEach(f => { if (fieldVisible(f, vals)) body[f.name] = vals[f.name] === '' ? null : vals[f.name]; });
    try {
      await metaApi(cfg.api + (s.editing ? '/' + s.editing.id : ''), { method: s.editing ? 'PUT' : 'POST', body });
      closeModal(); toast('Saved');
      await loadList(k);
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }
  async function del(k, id) {
    if (!confirm('Confirm this status change?')) return;
    try { await metaApi(R[k].api + '/' + id, { method: 'DELETE' }); toast('Updated'); await loadList(k); }
    catch (e) { toast('操作失败：' + (e.message || e)); }
  }

  /* ================= 特殊面板 ================= */

  /* CAPI 事件开关（brand 详情） */
  async function capiPanel(body, brandId) {
    const d = await metaApi(`/api/brands/${brandId}/capi-events`);
    body.innerHTML = d.items.map(row => `
      <div class="mmr-rowcard"><div>
        <b style="font-size:13px">${esc(row.eventType)}</b> ${badge(row.enabled ? 'ACTIVE' : 'INACTIVE')}
        <div class="sub" style="display:block;margin-top:3px">Updated ${row.updatedAt ? esc(fmtTs(row.updatedAt)) : '-'}</div></div>
        <button class="mmr-sw ${row.enabled ? 'on' : ''}" onclick="MISRes.capiToggle('${brandId}','${esc(row.eventType)}',${row.enabled ? 'false' : 'true'},this)"></button></div>`).join('');
  }
  async function capiToggle(brandId, eventType, enabled, btn) {
    try {
      await metaApi(`/api/brands/${brandId}/capi-events`, { method: 'PUT', body: { eventType, enabled: enabled === 'true' || enabled === true } });
      const bodyEl = btn.closest('#mmrTabBody-brands') || btn.parentElement.parentElement;
      capiPanel(document.getElementById('mmrTabBody-brands') || bodyEl, brandId);
      toast('Saved');
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }

  /* BM 下的 FB 个人号（1+2 机制） */
  async function fbPanel(body, bmId) {
    const d = await metaApi(`/api/business-managers/${bmId}/fb-accounts`);
    body.innerHTML = `<div class="mmr-2col">
      <div class="card" style="padding:14px">
        <b style="font-size:12.5px">FB account</b>
        <div class="mmr-field" style="margin-top:10px"><input id="fbName" placeholder="FB account name"></div>
        <div class="mmr-field"><select id="fbRole">${roles.map(r => `<option>${r}</option>`).join('')}</select></div>
        <div class="mmr-field"><select id="fbStatus">${assetSt.map(x => `<option>${x}</option>`).join('')}</select></div>
        <input type="hidden" id="fbId" value="">
        <button class="btn sm" onclick="MISRes.fbSave('${bmId}')">Save</button>
        <button class="btn ghost sm" onclick="MISRes.fbClear()">Clear</button>
      </div>
      <div>${d.items.length ? d.items.map(it => `
        <div class="mmr-rowcard">
          <div style="cursor:pointer" onclick="MISRes.fbEdit('${esc(it.id)}','${esc(it.fbAccountName)}','${esc(it.role)}','${esc(it.status)}')">
            <b style="font-size:13px">${esc(it.fbAccountName)}</b>
            <div style="margin-top:4px">${badge(it.role)} ${badge(it.status)}</div></div>
          <button class="btn ghost sm" style="color:#c62f36" onclick="MISRes.fbDisable('${bmId}','${esc(it.id)}')">Disable</button></div>`).join('')
        : '<p class="sub" style="display:block">No FB accounts.</p>'}</div></div>`;
  }
  function fbEdit(id, name, role, status) {
    document.getElementById('fbId').value = id;
    document.getElementById('fbName').value = name;
    document.getElementById('fbRole').value = role;
    document.getElementById('fbStatus').value = status;
  }
  function fbClear() { fbEdit('', '', 'MAIN', 'ACTIVE'); }
  async function fbSave(bmId) {
    const id = document.getElementById('fbId').value;
    const bodyData = { id: id || undefined, fbAccountName: document.getElementById('fbName').value, role: document.getElementById('fbRole').value, status: document.getElementById('fbStatus').value };
    if (!bodyData.fbAccountName) { toast('FB account name is required'); return; }
    try {
      await metaApi(`/api/business-managers/${bmId}/fb-accounts`, { method: id ? 'PUT' : 'POST', body: bodyData });
      toast('Saved'); fbPanel(document.getElementById('mmrTabBody-bms'), bmId);
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }
  async function fbDisable(bmId, id) {
    try {
      await metaApi(`/api/business-managers/${bmId}/fb-accounts`, { method: 'DELETE', body: { id } });
      toast('Updated'); fbPanel(document.getElementById('mmrTabBody-bms'), bmId);
    } catch (e) { toast('操作失败：' + (e.message || e)); }
  }

  /* 广告账户 ↔ 品牌关联 */
  async function accBrandsPanel(body, accId) {
    const [links, brands] = await Promise.all([
      metaApi(`/api/ad-accounts/${accId}/brands`),
      metaApi('/api/brands?limit=200'),
    ]);
    const linked = new Set(links.items.map(l => String(l.brandId)));
    const avail = brands.items.filter(b => !linked.has(String(b.id)));
    body.innerHTML = `<div class="mmr-2col">
      <div class="card" style="padding:14px">
        <b style="font-size:12.5px">Link another brand</b>
        <div class="mmr-field" style="margin-top:10px"><select id="accBrandSel">
          <option value="" disabled selected>Select Brand</option>
          ${avail.map(b => `<option value="${esc(b.id)}">${esc(b.code)} - ${esc(b.name)}</option>`).join('')}</select></div>
        <button class="btn sm" onclick="MISRes.accLink('${accId}')">Link</button></div>
      <div>${links.items.length ? links.items.map(l => `
        <div class="mmr-rowcard"><div>${badge(l.brand.code)} <span class="sub" style="display:inline">${esc(l.brand.name)}</span></div>
          <button class="btn ghost sm" style="color:#c62f36" onclick="MISRes.accUnlink('${accId}','${esc(String(l.brandId))}')">Unlink</button></div>`).join('')
        : '<p class="sub" style="display:block">No brands linked.</p>'}</div></div>`;
  }
  async function accLink(accId) {
    const v = document.getElementById('accBrandSel').value;
    if (!v) { toast('Select a brand'); return; }
    try {
      await metaApi(`/api/ad-accounts/${accId}/brands`, { method: 'POST', body: { brandId: v } });
      toast('Linked'); accBrandsPanel(document.getElementById('mmrTabBody-accounts'), accId);
    } catch (e) { toast('操作失败：' + (e.message || e)); }
  }
  async function accUnlink(accId, brandId) {
    if (!confirm('Unlink 是硬删除（无法撤销、不进审计日志），确认？')) return;
    try {
      await metaApi(`/api/ad-accounts/${accId}/brands`, { method: 'DELETE', body: { brandId } });
      toast('Unlinked'); accBrandsPanel(document.getElementById('mmrTabBody-accounts'), accId);
    } catch (e) { toast('操作失败：' + (e.message || e)); }
  }

  /* ================= Pixel Shares 矩阵 ================= */
  const SH = { brandId: '' };
  async function loadShares() {
    const el = document.getElementById('v-mm-shares');
    if (!el) return;
    const brands = (await metaApi('/api/brands?limit=200')).items;
    if (!SH.brandId && brands.length) SH.brandId = String(brands[0].id);
    const [pixels, accounts, shares] = await Promise.all([
      metaApi(`/api/pixels?brand_id=${SH.brandId}&role=MAIN&limit=200`),
      metaApi(`/api/ad-accounts?brand_id=${SH.brandId}&limit=200`),
      metaApi(`/api/pixel-shares?brand_id=${SH.brandId}&limit=200`),
    ]);
    const main = pixels.items.find(p => p.status === 'ACTIVE') || pixels.items[0] || null;
    const cur = brands.find(b => String(b.id) === SH.brandId);
    let t = `<tr><th>Ad Account</th><th>Meta ID</th><th>Acc Status</th><th>Current MAIN Pixel</th><th>Share Status</th><th>Action</th></tr>`;
    if (!accounts.items.length) t += `<tr><td colspan="6" class="empty">No ad accounts linked to this brand.</td></tr>`;
    accounts.items.forEach(a => {
      const link = main ? shares.items.find(s => String(s.pixelId) === String(main.id) && String(s.adAccountId) === String(a.id)) : null;
      const stt = link ? link.shareStatus : 'NOT_SHARED';
      const act = stt === 'ACTIVE' ? ['Revoke', '#c62f36'] : stt === 'REVOKED' ? ['Re-share', ''] : ['Share', ''];
      t += `<tr><td><b>${esc(a.name)}</b></td><td><span class="code" style="font-size:11px">act_${esc(a.adAccountId)}</span></td>
        <td>${badge(a.status)}</td>
        <td><span class="code" style="font-size:11px">${main ? esc(main.name + ' (' + main.pixelId + ')') : '—'}</span></td>
        <td>${stt === 'NOT_SHARED' ? badge('NOT_SHARED').replace('NOT_SHARED', 'Not shared') : badge(stt)}</td>
        <td><button class="btn ghost sm" ${main ? '' : 'disabled'} style="${act[1] ? 'color:' + act[1] : ''}"
          onclick="MISRes.shareAct('${esc(a.id)}')">${act[0]}</button></td></tr>`;
    });
    el.innerHTML = `
      <div class="head"><div><h1>Pixel Shares</h1>
        <div class="sub">Each brand's MAIN pixel must be shared to every ad account it serves. BACKUP pixels are not shared (CAPI still pushes events to them).</div></div>
        <div class="filters"><select onchange="MISRes.shareBrand(this.value)">
          ${brands.map(b => `<option value="${esc(b.id)}"${String(b.id) === SH.brandId ? ' selected' : ''}>${esc(b.code)} — ${esc(b.name)}</option>`).join('')}</select>
          <button class="btn ghost sm" onclick="MISRes.loadShares()">↻ 刷新</button></div></div>
      <div class="card" style="padding:14px;margin-bottom:14px">
        <b style="font-size:12.5px">Ad Accounts linked to <span class="code">${cur ? esc(cur.code) : '—'}</span></b>
        <div class="sub" style="display:block;margin-top:4px">${main
          ? 'Current MAIN pixel: <span class="code">' + esc(main.name + ' (' + main.pixelId + ')') + '</span>'
          : '<span style="color:#c62f36">No MAIN pixel found for this brand.</span>'}</div></div>
      <div class="tablewrap"><table>${t}</table></div>`;
    SH._main = main; SH._shares = shares.items;
  }
  async function shareAct(accId) {
    const main = SH._main;
    if (!main) return;
    const existing = SH._shares.find(s => String(s.pixelId) === String(main.id) && String(s.adAccountId) === String(accId));
    const next = existing && existing.shareStatus === 'ACTIVE' ? 'REVOKED' : 'ACTIVE';
    try {
      if (existing) await metaApi('/api/pixel-shares/' + existing.id, { method: 'PUT', body: { shareStatus: next } });
      else await metaApi('/api/pixel-shares', { method: 'POST', body: { pixelId: main.id, adAccountId: accId, shareStatus: 'ACTIVE' } });
      toast('Saved'); loadShares();
    } catch (e) { toast('操作失败：' + (e.message || e)); }
  }

  /* ================= Users（系统 2 的 9 账号；与 MIS 自己的用户体系无关） ================= */
  const PERM_GROUPS = [
    { title: 'Configuration', keys: ['brands', 'business-managers', 'pixels', 'ad-accounts', 'developer-apps', 'tokens', 'pixel-shares'] },
    { title: 'Operations', keys: ['rotation', 'health', 'sop'] },
    { title: 'System', keys: ['users', 'action-logs'] },
    { title: 'Analytics', keys: ['analytics-accounts', 'analytics-ads', 'analytics-brands', 'analytics-spending', 'analytics-lifecycle'] },
  ];
  const MU = { form: null, rows: [] };
  const lexUsers = () => { try { const v = (0, eval)('users'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const lexRoles = () => { try { const v = (0, eval)('roles'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const lexDb = () => { try { return (0, eval)('typeof db!=="undefined"?db:null'); } catch (e) { return null; } };

  /* v77(V 定:两套 user 统一)—— 渲染进 v-users 的 #usersMetaBody:
   * 每个 MIS 用户一行,可映射一个系统 2 账号(存 Supabase meta_user_map),
   * 行内直接看/编辑该账号的 Meta 权限;未映射的系统 2 账号列在下方。 */
  async function loadUnifiedUsers() {
    const el = document.getElementById('usersMetaBody');
    if (!el) return;
    let metaUsers = [];
    try { metaUsers = (await metaApi('/api/users?limit=200')).items || []; } catch (e) {}
    MU.rows = metaUsers;
    const misUsers = lexUsers(), roles = lexRoles();
    const db = lexDb();
    let map = [];
    if (db && typeof db.from === 'function') {
      try { const r = await db.from('meta_user_map').select('*'); map = (r && r.data) || []; } catch (e) {}
    }
    const mapOf = uid => { const m = map.find(x => String(x.mis_user_id) === String(uid)); return m ? m.meta_username : ''; };
    const mappedSet = new Set(map.map(m => m.meta_username));
    const roleName = rid => { const r = roles.find(x => String(x.id) === String(rid)); return r ? r.name : '—'; };
    const metaCell = un => {
      const mu = metaUsers.find(x => x.username === un);
      if (!mu) return '<span class="sub" style="display:inline">—</span>';
      const idx = metaUsers.indexOf(mu);
      return `${mu.permissions === null ? badge('Superadmin') : 'Custom'} ${badge(mu.status)}
        <button class="btn ghost sm" onclick="MISRes.userEdit(${idx})">权限</button>`;
    };
    let t = `<tr><th>MIS 用户</th><th>MIS 角色</th><th>系统 2 账号</th><th>Meta 权限</th></tr>`;
    if (!misUsers.length) t += `<tr><td colspan="4" class="empty">MIS 用户未加载（需登录）。</td></tr>`;
    misUsers.forEach(u => {
      const cur = mapOf(u.id);
      t += `<tr><td><b>${esc(u.name)}</b> <span class="sub" style="display:inline">${esc(u.username)}</span></td>
        <td>${esc(roleName(u.roleId))}</td>
        <td><select onchange="MISRes.mapMeta('${esc(String(u.id))}',this.value)">
          <option value="">— 未映射 —</option>
          ${metaUsers.map(m => `<option value="${esc(m.username)}"${cur === m.username ? ' selected' : ''}${(mappedSet.has(m.username) && cur !== m.username) ? ' disabled' : ''}>${esc(m.displayName)} (${esc(m.username)})</option>`).join('')}</select></td>
        <td>${cur ? metaCell(cur) : '<span class="sub" style="display:inline">—</span>'}</td></tr>`;
    });
    const orphans = metaUsers.filter(m => !mappedSet.has(m.username));
    el.innerHTML = `
      <div class="card" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <b style="font-size:12.5px">系统 2(Meta)账号映射 — 一人一个身份</b>
          <span><button class="btn ghost sm" onclick="MISRes.loadUnifiedUsers()">↻ 刷新</button>
          <button class="btn ghost sm" onclick="MISRes.userNew()">＋ 新建 Meta 账号</button></span></div>
        <div class="sub" style="display:block;margin:4px 0 10px">把系统 2 的账号挂到对应的 MIS 用户上;映射后此人在两边就是同一个身份,审计可对人。Meta 权限点行内「权限」编辑(live 后经系统 2 接口写回)。</div>
        <div class="tablewrap"><table>${t}</table></div>
        ${orphans.length ? `<div class="sub" style="display:block;margin-top:10px">未映射的系统 2 账号:${orphans.map(m => `${esc(m.displayName)} (${esc(m.username)})${m.status === 'INACTIVE' ? ' · 已停用' : ''}`).join('、')}</div>` : ''}
      </div>`;
  }
  async function mapMeta(misUserId, metaUsername) {
    const db = lexDb();
    if (!db) { toast('未登录,无法保存映射'); return; }
    try {
      if (metaUsername) await db.from('meta_user_map').upsert({ mis_user_id: misUserId, meta_username: metaUsername, updated_at: new Date().toISOString() });
      else await db.from('meta_user_map').delete().eq('mis_user_id', misUserId);
      toast('映射已保存');
    } catch (e) { toast('保存失败:' + (e.message || e)); }
    loadUnifiedUsers();
  }
  function userForm() {
    const f = MU.form;
    const m = document.getElementById('mmrModal');
    m.className = 'mmr-modal wide';
    m.innerHTML = `<h2>${f.id ? 'Edit User' : 'New User'}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px">
        <div class="mmr-field"><label>Username</label><input id="muUsername" value="${esc(f.username)}" ${f.id ? 'disabled' : ''}></div>
        <div class="mmr-field"><label>Display Name</label><input id="muDisplay" value="${esc(f.displayName)}"></div>
        <div class="mmr-field"><label>${f.id ? 'New Password (leave blank to keep)' : 'Password'}</label><input id="muPassword" type="password"></div>
        <div class="mmr-field"><label>Status</label><select id="muStatus">
          <option${f.status === 'ACTIVE' ? ' selected' : ''}>ACTIVE</option><option${f.status === 'INACTIVE' ? ' selected' : ''}>INACTIVE</option></select></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:6px 0 10px">
        <input type="checkbox" id="muSuper" ${f.superadmin ? 'checked' : ''} onchange="MISRes.userSuper(this.checked)">
        Superadmin (bypass all permission checks)</label>
      <div id="muPerms" style="${f.superadmin ? 'display:none' : ''}">${PERM_GROUPS.map(g => `
        <div class="card" style="padding:12px;margin-bottom:10px"><b style="font-size:12px">${g.title}</b>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:8px">${g.keys.map(key => `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-size:12.5px">${key}</span>
              <select data-perm="${key}" style="width:110px;padding:4px 6px;border:1px solid var(--line,#ddd);border-radius:6px;font-size:12px">
                ${['edit', 'view', 'none'].map(l => `<option${(f.permissions[key] || 'view') === l ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}
          </div></div>`).join('')}</div>
      <div class="mmr-actions">
        <button class="btn ghost sm" onclick="MISRes.cancel()">Cancel</button>
        <button class="btn sm" onclick="MISRes.userSave()">Save</button></div>`;
    ensureModal().classList.add('show');
  }
  const emptyPerms = () => { const p = {}; PERM_GROUPS.forEach(g => g.keys.forEach(k => { p[k] = 'view'; })); return p; };
  function userNew() {
    // 照系统 2 原行为：新建默认勾选 Superadmin（06 手册已把这标为坑，live 前可议）
    MU.form = { id: null, username: '', displayName: '', status: 'ACTIVE', superadmin: true, permissions: emptyPerms() };
    userForm();
  }
  function userEdit(i) {
    const u = MU.rows[i];
    MU.form = {
      id: String(u.id), username: u.username, displayName: u.displayName, status: u.status,
      superadmin: u.permissions === null,
      permissions: u.permissions === null ? emptyPerms() : Object.assign(emptyPerms(), u.permissions),
    };
    userForm();
  }
  function userSuper(on) {
    MU.form.superadmin = on;
    const el = document.getElementById('muPerms');
    if (el) el.style.display = on ? 'none' : '';
  }
  async function userSave() {
    const f = MU.form;
    const perms = {};
    document.querySelectorAll('#muPerms [data-perm]').forEach(s => { perms[s.getAttribute('data-perm')] = s.value; });
    const body = {
      username: document.getElementById('muUsername').value,
      displayName: document.getElementById('muDisplay').value,
      status: document.getElementById('muStatus').value,
      permissions: f.superadmin ? null : perms,
    };
    const pw = document.getElementById('muPassword').value;
    if (pw) body.password = pw;
    if (!f.id) body.password = pw;   // 新建必填
    try {
      await metaApi('/api/users' + (f.id ? '/' + f.id : ''), { method: f.id ? 'PUT' : 'POST', body });
      closeModal(); toast('Saved'); loadUnifiedUsers();
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }
  async function userDisable(id) {
    if (!confirm('Disable this user?')) return;
    try { await metaApi('/api/users/' + id, { method: 'DELETE' }); toast('Disabled'); loadUnifiedUsers(); }
    catch (e) { toast('操作失败：' + (e.message || e)); }
  }

  /* ================= 对外 + 注册 ================= */
  async function open(k) { await loadLookups(k); st8(k).detailId = null; await loadList(k); }

  window.MISRes = {
    open, reload: k => open(k),
    filter: (k, f, v) => { st8(k).filters[f] = v; st8(k).page = 1; loadList(k); },
    page: (k, d) => { st8(k).page += d; renderList(k); },
    detail, back: k => { st8(k).detailId = null; renderList(k); },
    tab: showTab,
    openNew: k => openForm(k, null),
    edit: (k, idx) => openForm(k, st8(k).rows[idx]),
    del, save, formSet, cancel: closeModal,
    capiToggle, fbSave, fbClear, fbEdit, fbDisable, accLink, accUnlink,
    loadShares, shareBrand: v => { SH.brandId = v; loadShares(); }, shareAct,
    loadUnifiedUsers, mapMeta, userNew, userEdit, userSave, userSuper, userDisable,
  };

  MIS_MODULES.register('mm-brands', () => open('brands'));
  MIS_MODULES.register('mm-bms', () => open('bms'));
  MIS_MODULES.register('mm-pixels', () => open('pixels'));
  MIS_MODULES.register('mm-accounts', () => open('accounts'));
  MIS_MODULES.register('mm-apps', () => open('apps'));
  MIS_MODULES.register('mm-tokens', () => open('tokens'));
  MIS_MODULES.register('mm-shares', loadShares);
  MIS_MODULES.register('users', loadUnifiedUsers);   // v77:统一 Users(渲染进 v-users 的映射区)
})();
