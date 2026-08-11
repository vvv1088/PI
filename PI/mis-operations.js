/* =====================================================================
 * mis-operations.js — v71 系统 2「Dashboard + Operations + 审计」页面搬家
 *   v-mm-dash        Dashboard：资产统计卡 + Brand Overview + 最近告警/轮转
 *   v-mm-rotation    Rotation：BM 轮转 / Pixel 轮转 两个执行 tab（高危写操作，
 *                    mock 模式在内存演练完整语义：封禁→递补→写日志→生成 SOP）
 *   v-mm-sop         SOP Tasks：分组进度 + 组内步骤详情（Complete / Skip）+ 模板管理
 *   #auditMetaBody   Action Logs：系统 2 审计流水,v72 起并入 Activity Log 的 Meta tab
 * 数据一律经 metaApi()。
 * ===================================================================== */
(function () {
  'use strict';

  const BAD = { ACTIVE: 'g', VALID: 'g', OK: 'g', DONE: 'g', BANNED: 'r', FAILED: 'r', EXPIRED: 'r', REVOKED: 'r',
    DISABLED: 'n', INACTIVE: 'n', SKIPPED: 'n', PENDING: 'y', PAUSED: 'y',
    MAIN: 'b', BACKUP1: 'b', BACKUP2: 'b', CREATE: 'g', UPDATE: 'b', DELETE: 'r', ROTATION: 'y', LOGIN: 'n',
    Add: 'g', Edit: 'b', Delete: 'r' };
  const badge = v => v == null || v === '' ? '<span class="sub" style="display:inline">—</span>'
    : `<span class="mmr-badge mmr-${BAD[v] || 'n'}">${esc(v)}</span>`;

  /* ================= Dashboard ================= */
  async function loadDash() {
    const el = document.getElementById('v-mm-dash');
    if (!el) return;
    /* v72:吸收原 Asset Status 视图 —— 补广告账户 / App 两个统计维度 */
    const [brands, bms, pixels, tokens, accounts, apps, failed, rotations] = await Promise.all([
      metaApi('/api/brands?limit=100'),
      metaApi('/api/business-managers?limit=100'),
      metaApi('/api/pixels?limit=100'),
      metaApi('/api/tokens?limit=100'),
      metaApi('/api/ad-accounts?limit=100'),
      metaApi('/api/developer-apps?limit=100'),
      metaApi('/api/health?result=FAILED&limit=8'),
      metaApi('/api/rotation/logs?limit=8'),
    ]);
    const grp = items => {
      const m = {};
      items.forEach(x => { m[x.status] = (m[x.status] || 0) + 1; });
      const txt = Object.keys(m).length ? Object.keys(m).map(s => `${s}: ${m[s]}`).join(' / ') : 'No records';
      return `<span style="font-size:13px;font-weight:600">${txt}</span>`;
    };
    let bt = `<tr><th>Brand</th><th>Status</th><th>Pixels</th><th>Ad Accounts</th></tr>`;
    brands.items.forEach(b => {
      bt += `<tr><td><span class="mmr-link" onclick="go('mm-brands');MISRes.open('brands').then(()=>MISRes.detail('brands','${esc(b.id)}'))">${esc(b.code)}</span></td>
        <td>${badge(b.status)}</td><td>${b._count.pixels}</td><td>${b._count.adAccountLinks}</td></tr>`;
    });
    el.innerHTML = `
      <div class="head"><div><h1>Meta Overview</h1>
        <div class="sub">系统 2 首页仪表盘：资产健康与最近操作（只读汇总）</div></div>
        <div class="filters"><button class="btn ghost sm" onclick="MISOps.loadDash()">↻ 刷新</button></div></div>
      <div class="kpis">
        ${kpi(String(brands.items.length), 'Brands')}
        ${kpi(grp(bms.items), 'BMs')}
        ${kpi(grp(pixels.items), 'Pixels')}
        ${kpi(grp(tokens.items), 'Tokens')}
        ${kpi(grp(accounts.items), 'Ad Accounts')}
        ${kpi(grp(apps.items), 'Apps')}</div>
      <div class="card" style="padding:14px;margin-bottom:14px"><b style="font-size:12.5px">Brand Overview</b>
        <div class="tablewrap" style="margin-top:8px"><table>${bt}</table></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="mmo-2col">
        <div class="card" style="padding:14px"><b style="font-size:12.5px">Recent Alerts</b>
          ${failed.items.length ? failed.items.map(c => `
            <div class="mmr-rowcard" style="margin-top:8px;display:block">
              <div style="display:flex;justify-content:space-between">${badge(c.checkResult)}<span class="sub" style="display:inline">${esc(fmtTs(c.checkedAt))}</span></div>
              <div style="font-size:13px;margin-top:5px">${esc(c.entityType)} #${esc(c.entityId)}</div>
              <div class="sub" style="display:block">${esc(c.errorDetail || '-')}</div></div>`).join('')
          : '<p class="sub" style="display:block;margin-top:8px">No failed checks.</p>'}</div>
        <div class="card" style="padding:14px"><b style="font-size:12.5px">Recent Rotation</b>
          ${rotations.items.length ? rotations.items.map(r => `
            <div class="mmr-rowcard" style="margin-top:8px;display:block">
              <div style="display:flex;justify-content:space-between"><span style="font-size:13px">${esc(r.entityType)} #${esc(r.entityId)}</span><span class="sub" style="display:inline">${esc(fmtTs(r.createdAt))}</span></div>
              <div class="sub" style="display:block">${esc(r.brand ? r.brand.code : '-')} / ${esc(r.oldRole || '-')} → ${esc(r.newRole || '-')} / ${esc(r.oldStatus || '-')} → ${esc(r.newStatus || '-')}</div></div>`).join('')
          : '<p class="sub" style="display:block;margin-top:8px">No rotation logs.</p>'}</div></div>`;
  }

  /* ================= Rotation（执行页 + v72 并入的 Logs tab） ================= */
  const RT = { tab: 'bm', bmId: '', brandId: '', pixelId: '', sopId: '', logType: 'ALL' };
  async function loadRotation() {
    const el = document.getElementById('v-mm-rotation');
    if (!el) return;
    if (RT.tab === 'logs') {
      const d = await metaApi('/api/rotation/logs?limit=100' + (RT.logType === 'ALL' ? '' : '&entity_type=' + RT.logType));
      let t = `<tr><th>时间 (UTC+8)</th><th>类型</th><th>对象</th><th>Role</th><th>Status</th><th>原因</th><th>操作人</th></tr>`;
      if (!d.items.length) t += `<tr><td colspan="7" class="empty">暂无记录</td></tr>`;
      d.items.forEach(r => {
        const roleChg = (r.oldRole || r.newRole) ? `${esc(r.oldRole || '—')} → ${esc(r.newRole || '—')}` : '—';
        const stChg = (r.oldStatus || r.newStatus) ? `${esc(r.oldStatus || '—')} → ${esc(r.newStatus || '—')}` : '—';
        t += `<tr><td>${esc(fmtTs(r.createdAt))}</td><td>${esc(r.entityType)}</td><td>#${esc(r.entityId)}</td>
          <td>${roleChg}</td><td>${stChg}</td><td>${esc(r.reason || '')}</td><td>${esc(r.operator)}</td></tr>`;
      });
      el.innerHTML = shell(`
        <div class="filters" style="margin-bottom:12px">
          <select onchange="MISOps.logType(this.value)">
            <option value="ALL"${RT.logType === 'ALL' ? ' selected' : ''}>All Types</option>
            ${['BM', 'PIXEL', 'AD_ACCOUNT'].map(x => `<option${RT.logType === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
          <button class="btn ghost sm" onclick="MISOps.loadRotation()">↻ 刷新</button></div>
        <div class="tablewrap"><table>${t}</table></div>`);
      return;
    }
    if (RT.tab === 'bm') {
      const bms = (await metaApi('/api/business-managers?bm_type=PIXEL&limit=100')).items;
      el.innerHTML = shell(`
        <div class="mmo-2col2">
          <div class="card" style="padding:14px"><b style="font-size:12.5px">Execute BM Rotation</b>
            <div class="mmr-field" style="margin-top:10px"><select id="rtBm" onchange="MISOps.rtImpact()">
              <option value="" disabled${RT.bmId ? '' : ' selected'}>Select Pixel BM to mark BANNED</option>
              ${bms.map(b => `<option value="${esc(b.id)}"${RT.bmId === String(b.id) ? ' selected' : ''}>${esc(b.name)} / ${esc(b.role || '-')} / ${esc(b.status)}</option>`).join('')}</select></div>
            <div id="rtImpact"></div>
            <div class="mmr-field"><textarea id="rtReason">BM banned or disabled</textarea></div>
            <button class="btn sm" onclick="MISOps.execBm()">Mark BANNED</button>
            <div class="mmr-status" id="rtStatus"></div>${sopLink()}</div>
          <div class="card" style="padding:14px"><b style="font-size:12.5px">Current Role Distribution</b>
            ${bms.length ? bms.map(b => `
              <div class="mmr-rowcard" style="margin-top:8px"><div>
                <b style="font-size:13px">${esc(b.name)}</b><div class="sub" style="display:block">BM ID ${esc(b.bmId)}</div></div>
                <div>${badge(b.role)} ${badge(b.status)}</div></div>`).join('')
            : '<p class="sub" style="display:block;margin-top:8px">No PIXEL BMs registered.</p>'}</div></div>`);
    } else {
      const brands = (await metaApi('/api/brands?limit=200')).items;
      const pixels = RT.brandId ? (await metaApi(`/api/pixels?brand_id=${RT.brandId}&limit=100`)).items : [];
      el.innerHTML = shell(`
        <div class="mmo-2col2">
          <div class="card" style="padding:14px"><b style="font-size:12.5px">Execute Pixel Rotation</b>
            <div class="mmr-field" style="margin-top:10px"><select id="rtBrand" onchange="MISOps.pickBrand(this.value)">
              <option value="" disabled${RT.brandId ? '' : ' selected'}>Select Brand</option>
              ${brands.map(b => `<option value="${esc(b.id)}"${RT.brandId === String(b.id) ? ' selected' : ''}>${esc(b.code)} - ${esc(b.name)}</option>`).join('')}</select></div>
            <div class="mmr-field"><select id="rtPixel">
              <option value="" disabled${RT.pixelId ? '' : ' selected'}>Select Pixel to mark BANNED</option>
              ${pixels.map(p => `<option value="${esc(p.id)}"${RT.pixelId === String(p.id) ? ' selected' : ''}>${esc(p.name)} / ${esc(p.role || '-')} / ${esc(p.status)}</option>`).join('')}</select></div>
            <div class="mmr-field"><textarea id="rtReason">Pixel banned or disabled</textarea></div>
            <button class="btn sm" onclick="MISOps.execPixel()">Mark Pixel BANNED</button>
            <div class="mmr-status" id="rtStatus"></div>${sopLink()}</div>
          <div class="card" style="padding:14px"><b style="font-size:12.5px">Brand Pixel Distribution</b>
            ${pixels.length ? pixels.map(p => `
              <div class="mmr-rowcard" style="margin-top:8px"><div>
                <b style="font-size:13px">${esc(p.name)}</b><div class="sub" style="display:block">Pixel ID ${esc(p.pixelId)}${p.businessManager ? ' · BM ' + esc(p.businessManager.name) : ''}</div></div>
                <div>${badge(p.role)} ${badge(p.status)}</div></div>`).join('')
            : '<p class="sub" style="display:block;margin-top:8px">Select a brand to see its pixels.</p>'}</div></div>`);
    }
    function shell(inner) {
      return `
      <div class="head"><div><h1>Rotation</h1>
        <div class="sub">BM-level rotation bans an entire Pixel BM (all brands affected). Pixel-level rotation only rotates one brand's pixel, leaving the BM and other brands untouched.<b style="color:#b26a00"> mock 模式：在内存演练完整轮转语义，刷新即复位。</b></div></div></div>
      <div class="tabs">${[['bm', 'BM Rotation'], ['pixel', 'Pixel Rotation'], ['logs', 'Logs']].map(([k, label]) => `
        <div style="padding:8px 12px;font-size:13px;cursor:pointer;${RT.tab === k ? 'border-bottom:2px solid var(--acc,#4650dd);font-weight:600;color:var(--acc,#4650dd)' : 'color:var(--mut,#777)'}" onclick="MISOps.rtTab('${k}')">${label}</div>`).join('')}</div>
      ${inner}`;
    }
    function sopLink() {
      return RT.sopId ? `<div style="margin-top:8px"><span class="mmr-link" onclick="MISOps.gotoSop('${esc(RT.sopId)}')">Open generated SOP task →</span></div>` : '';
    }
  }
  async function execBm() {
    const bmId = document.getElementById('rtBm').value;
    const reason = document.getElementById('rtReason').value;
    if (!bmId) { setRt('Select a Pixel BM first'); return; }
    if (!confirm('Confirm BM rotation? All pixels under this BM will be marked BANNED and backups will be promoted across all brands.')) return;
    try {
      RT.bmId = '';
      const d = await metaApi('/api/rotation/execute', { method: 'POST', body: { bmId, reason } });
      RT.sopId = String(d.rotationLogId || '');
      toast('Rotation executed');
      await loadRotation();
      setRt('Rotation executed');
    } catch (e) { setRt(e.message || 'Rotation failed'); }
  }
  async function execPixel() {
    const pixelId = document.getElementById('rtPixel').value;
    const reason = document.getElementById('rtReason').value;
    if (!RT.brandId || !pixelId) { setRt('Select Brand and Pixel first'); return; }
    if (!confirm('Confirm pixel rotation? This marks the selected pixel as BANNED and promotes backups.')) return;
    try {
      const d = await metaApi('/api/rotation/execute-pixel', { method: 'POST', body: { pixelId, brandId: RT.brandId, reason } });
      RT.sopId = String(d.rotationLogId || '');
      RT.pixelId = '';
      toast('Pixel rotation executed');
      await loadRotation();
      setRt('Pixel rotation executed');
    } catch (e) { setRt(e.message || 'Rotation failed'); }
  }
  const setRt = m => { const el = document.getElementById('rtStatus'); if (el) el.textContent = m; };

  /* v78(L6):封 BM 前显示影响面 —— 受影响品牌 + 这些品牌在 MIS 里进行中的测试数 */
  async function rtImpact() {
    const el = document.getElementById('rtImpact');
    const bmId = (document.getElementById('rtBm') || {}).value;
    if (!el || !bmId) return;
    try {
      const px = await metaApi('/api/pixels?limit=200');
      const bs = await metaApi('/api/brands?limit=200');
      const codes = [...new Set(px.items.filter(p => String(p.bmId) === String(bmId)).map(p => {
        const b = bs.items.find(x => String(x.id) === String(p.brandId)); return b ? b.code : null;
      }).filter(Boolean))];
      let hypos = [];
      try { const v = (0, eval)('hypos'); if (Array.isArray(v)) hypos = v; } catch (e) {}
      const running = hypos.filter(h => codes.includes(h.brand) && !['已判定', '已归档'].includes(h.st)).length;
      el.innerHTML = codes.length
        ? `<div class="mmr-status" style="color:#b26a00">影响面:${codes.map(c => `<b>${esc(c)}</b>`).join('、')} 的 MAIN 追踪将中断${running ? `;这些品牌在 MIS 有 <b>${running}</b> 个进行中的测试会受影响` : ''}。</div>`
        : '<div class="mmr-status">该 BM 下没有挂任何品牌的 pixel。</div>';
    } catch (e) { el.innerHTML = ''; }
  }

  /* ================= SOP ================= */
  const SP = { mode: 'list', groupId: null };
  async function loadSop() {
    const el = document.getElementById('v-mm-sop');
    if (!el) return;
    if (SP.mode === 'detail') return sopDetail(el);
    if (SP.mode === 'templates') return sopTemplates(el);
    const d = await metaApi('/api/sop/instances');
    const groups = new Map();
    d.items.forEach(t => {
      const key = String(t.triggeredBy || t.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
    el.innerHTML = `
      <div class="head"><div><h1>SOP Tasks</h1><div class="sub">Grouped SOP task instances.（点组名进步骤清单）</div></div>
        <div class="filters"><button class="btn ghost sm" onclick="MISOps.sopMode('templates')">模板管理</button>
        <button class="btn ghost sm" onclick="MISOps.loadSop()">↻ 刷新</button></div></div>
      ${groups.size ? [...groups.entries()].map(([key, group]) => {
        const done = group.filter(t => t.status === 'DONE').length;
        return `<div class="card" style="padding:14px;margin-bottom:12px">
          <b class="mmr-link" style="font-size:13.5px" onclick="MISOps.gotoSop('${esc(key)}')">${esc(group[0].brand ? group[0].brand.code : 'All Brands')} / ${esc(group[0].checklist ? group[0].checklist.triggerType : '-')}</b>
          <div style="height:7px;border-radius:4px;background:var(--line,#e8e8ee);overflow:hidden;margin:10px 0 8px">
            <div style="height:100%;width:${Math.round(done / group.length * 100)}%;background:var(--acc,#4650dd)"></div></div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:12.5px">
            <span style="margin-right:4px">${done} / ${group.length} done</span>
            ${group.map(t => badge(t.status)).join('')}</div></div>`;
      }).join('') : '<p class="sub" style="display:block">No SOP tasks.</p>'}`;
  }
  async function sopDetail(el) {
    const d = await metaApi('/api/sop/detail?id=' + SP.groupId);
    el.innerHTML = `
      <div class="head"><div>
        <a class="mmr-back" onclick="MISOps.sopMode('list')">← Back</a>
        <h1 style="margin-top:4px">SOP Detail</h1><div class="sub">Step-by-step execution checklist.</div></div></div>
      ${d.items.length ? d.items.map(t => `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <b style="font-size:13.5px">${t.stepOrder}. ${esc(t.checklist ? t.checklist.title : '-')}</b>
          <pre style="white-space:pre-wrap;font-size:12.5px;color:var(--mut,#777);margin:8px 0;font-family:inherit">${esc(t.description || (t.checklist ? t.checklist.description : ''))}</pre>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:12.5px">
            ${badge(t.status)}
            <span>${t.checklist && !t.checklist.isManual ? 'System' : 'Manual'}</span>
            <span>Completed by ${esc(t.completedBy || '-')}</span>
            <span>Completed at ${t.completedAt ? esc(fmtTs(t.completedAt)) : '-'}</span>
            ${t.checklist && t.checklist.isManual ? `
              <button class="btn ghost sm" ${t.status === 'DONE' ? 'disabled' : ''} onclick="MISOps.sopSet('${esc(t.id)}','DONE')">Complete</button>
              <button class="btn ghost sm" ${t.status === 'SKIPPED' ? 'disabled' : ''} onclick="MISOps.sopSet('${esc(t.id)}','SKIPPED')">Skip</button>` : ''}</div></div>`).join('')
      : '<p class="sub" style="display:block">No SOP steps found.</p>'}`;
  }
  const TRIGGER_TYPES = ['NEW_BRAND', 'BM_ROTATION', 'PIXEL_ROTATION', 'GRAPH_API_BM_ROTATION', 'CA_BM_ROTATION', 'NEW_AD_ACCOUNT'];
  const TF = { id: '', triggerType: 'BM_ROTATION', stepOrder: 1, title: '', description: '', isManual: 'true' };
  async function sopTemplates(el) {
    const d = await metaApi('/api/sop/templates');
    el.innerHTML = `
      <div class="head"><div>
        <a class="mmr-back" onclick="MISOps.sopMode('list')">← Back</a>
        <h1 style="margin-top:4px">SOP Templates</h1><div class="sub">Manage reusable SOP checklist steps.（含全部 6 类 trigger —— 系统 2 原下拉缺 3 类，此处补全）</div></div></div>
      <div class="mmo-2col2">
        <div class="card" style="padding:14px"><b style="font-size:12.5px">Template Step</b>
          <div class="mmr-field" style="margin-top:10px"><select id="tfType">${TRIGGER_TYPES.map(t => `<option${TF.triggerType === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="mmr-field"><input id="tfOrder" type="number" value="${esc(String(TF.stepOrder))}"></div>
          <div class="mmr-field"><input id="tfTitle" placeholder="Title" value="${esc(TF.title)}"></div>
          <div class="mmr-field"><textarea id="tfDesc">${esc(TF.description)}</textarea></div>
          <div class="mmr-field"><select id="tfManual"><option value="true"${TF.isManual === 'true' ? ' selected' : ''}>Manual</option><option value="false"${TF.isManual === 'false' ? ' selected' : ''}>System</option></select></div>
          <input type="hidden" id="tfId" value="${esc(TF.id)}">
          <button class="btn sm" onclick="MISOps.tplSave()">Save</button>
          <button class="btn ghost sm" onclick="MISOps.tplClear()">Clear</button></div>
        <div class="card" style="padding:14px"><b style="font-size:12.5px">Templates</b>
          ${d.items.map(it => `
            <div class="mmr-rowcard" style="margin-top:8px;cursor:pointer" onclick='MISOps.tplEdit(${JSON.stringify(JSON.stringify(it))})'>
              <div><b style="font-size:13px">${it.stepOrder}. ${esc(it.title)}</b>
                <div class="sub" style="display:block;margin-top:3px">${esc(it.description)}</div></div>
              ${badge(it.triggerType)}</div>`).join('')}</div></div>`;
  }
  function tplEdit(json) {
    const it = JSON.parse(json);
    Object.assign(TF, { id: String(it.id), triggerType: it.triggerType, stepOrder: it.stepOrder, title: it.title, description: it.description, isManual: String(it.isManual) });
    loadSop();
  }
  function tplClear() { Object.assign(TF, { id: '', triggerType: 'BM_ROTATION', stepOrder: 1, title: '', description: '', isManual: 'true' }); loadSop(); }
  async function tplSave() {
    const body = {
      id: document.getElementById('tfId').value || undefined,
      triggerType: document.getElementById('tfType').value,
      stepOrder: Number(document.getElementById('tfOrder').value),
      title: document.getElementById('tfTitle').value,
      description: document.getElementById('tfDesc').value,
      isManual: document.getElementById('tfManual').value,
    };
    if (!body.title || !body.description) { toast('Title / description 必填'); return; }
    try {
      await metaApi('/api/sop/templates', { method: body.id ? 'PUT' : 'POST', body });
      toast('Saved'); tplClear();
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }
  async function sopSet(id, status) {
    try {
      await metaApi('/api/sop/instances', { method: 'PUT', body: { id, status } });
      toast('Saved'); loadSop();
    } catch (e) { toast('保存失败：' + (e.message || e)); }
  }

  /* ================= Activity Log(v77:两边审计统一成一张流水,V 定) ================= */
  const AU = { source: '', q: '' };
  const lex = name => { try { const v = (0, eval)(name); return v; } catch (e) { return undefined; } };
  async function renderMergedAudit() {
    const el = document.getElementById('auditBody');
    if (!el) return;
    const db = lex('typeof db!=="undefined"?db:null');
    let misRows = [];
    if (db && typeof db.from === 'function') {
      try {
        const r = await db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
        misRows = (r && r.data) || [];
      } catch (e) {}
    }
    let metaRows = [];
    try { metaRows = (await metaApi('/api/action-logs?limit=100')).items || []; } catch (e) {}
    const secNameFn = lex('typeof secName==="function"?secName:null');
    const ACT = lex('typeof ACT_LABEL!=="undefined"?ACT_LABEL:{}') || {};
    const rows = [];
    misRows.forEach(e => rows.push({
      ts: e.created_at, user: e.name || e.username || '?', src: 'MIS',
      act: ACT[e.action] || e.action,
      obj: (secNameFn ? secNameFn(e.section) : e.section) + (e.target ? ' · ' + e.target : ''), detail: null,
    }));
    metaRows.forEach(l => rows.push({
      ts: l.createdAt, user: l.user ? l.user.displayName : '-', src: 'Meta',
      act: l.actionType, obj: (l.entityType || '-') + (l.entityId ? ' #' + l.entityId : ''), detail: l.details,
    }));
    rows.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    const q = AU.q.toLowerCase();
    const view = rows.filter(r =>
      (!AU.source || r.src === AU.source) &&
      (!q || [r.user, r.act, r.obj].join(' ').toLowerCase().indexOf(q) >= 0));
    let t = `<tr><th>Time</th><th>Source</th><th>User</th><th>Action</th><th>Object</th><th>Details</th></tr>`;
    if (!view.length) t += `<tr><td colspan="6" class="empty">No activity.</td></tr>`;
    view.slice(0, 300).forEach(r => {
      t += `<tr><td style="white-space:nowrap">${esc(fmtTs(r.ts))}</td>
        <td><span class="mmr-badge ${r.src === 'MIS' ? 'mmr-b' : 'mmr-n'}">${r.src}</span></td>
        <td>${esc(r.user)}</td><td>${badge(r.act)}</td><td>${esc(r.obj)}</td>
        <td>${r.detail ? `<details style="max-width:420px"><summary style="cursor:pointer;font-size:12px;color:var(--mut,#888)">View</summary>
          <pre style="white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.04);border-radius:6px;padding:8px;font-size:11px;margin-top:6px">${esc(JSON.stringify(r.detail, null, 2))}</pre></details>` : '-'}</td></tr>`;
    });
    el.innerHTML = `
      <div class="filters" style="margin-bottom:12px">
        <select onchange="MISOps.auF('source',this.value)">
          <option value=""${AU.source === '' ? ' selected' : ''}>全部来源</option>
          <option value="MIS"${AU.source === 'MIS' ? ' selected' : ''}>MIS</option>
          <option value="Meta"${AU.source === 'Meta' ? ' selected' : ''}>Meta（系统 2）</option></select>
        <input type="text" placeholder="搜用户 / 动作 / 对象…" value="${esc(AU.q)}" style="width:200px"
          onkeydown="if(event.key==='Enter')MISOps.auF('q',this.value)">
        <button class="btn ghost sm" onclick="MISOps.renderMergedAudit()">↻ 刷新</button>
        <span class="sub" style="display:inline;align-self:center">共 ${view.length} 条（MIS ${rows.filter(r => r.src === 'MIS').length} + Meta ${rows.filter(r => r.src === 'Meta').length}）</span></div>
      <div class="tablewrap"><table>${t}</table></div>`;
  }

  /* ================= 样式 + 注册 ================= */
  const css = document.createElement('style');
  css.textContent = `
  .mmo-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .mmo-2col2{display:grid;grid-template-columns:420px 1fr;gap:14px}
  @media(max-width:960px){.mmo-2col,.mmo-2col2{grid-template-columns:1fr}}`;
  document.head.appendChild(css);

  window.MISOps = {
    loadDash, loadRotation, loadSop, renderMergedAudit,
    rtTab: t => { RT.tab = t; RT.sopId = ''; loadRotation(); },
    logType: v => { RT.logType = v; loadRotation(); },
    pickBrand: v => { RT.brandId = v; RT.pixelId = ''; loadRotation(); },
    execBm, execPixel, rtImpact,
    gotoSop: id => { SP.mode = 'detail'; SP.groupId = id; go('mm-sop'); MIS_MODULES.reload('mm-sop'); },
    sopMode: m => { SP.mode = m; loadSop(); },
    sopSet, tplSave, tplClear, tplEdit,
    auF: (k, v) => { AU[k] = v; renderMergedAudit(); },
  };

  MIS_MODULES.register('mm-dash', loadDash);
  MIS_MODULES.register('mm-rotation', loadRotation);
  MIS_MODULES.register('mm-sop', loadSop);
  MIS_MODULES.register('audit', renderMergedAudit);   // v77:统一流水(MIS+Meta 合并)
})();
