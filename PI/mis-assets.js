/* =====================================================================
 * mis-assets.js — ASSETS 模块（v70 新增，P1 精选三视图，全部只读）
 *   v-as-health    Health 体检：品牌×轮转槽位网格 + 最近检查流水
 *   v-as-rotation  轮转历史：rotation_log 流水
 *   v-as-overview  资产状态总览：四类资产状态汇总 + 广告账户清单
 * P2 阶段的资产 CRUD / 轮转执行等操作视图按映射表另建。
 * ===================================================================== */
(function () {
  'use strict';

  const ST_COLOR = { ACTIVE: '#22a06b', BANNED: '#e5484d', DISABLED: '#8d8d94', VALID: '#22a06b', EXPIRED: '#e5484d' };
  const badge = s => `<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;color:#fff;background:${ST_COLOR[s] || '#8d8d94'}">${esc(s || '—')}</span>`;

  /* ================= 骨架 ================= */
  function mount() {
    const h = document.getElementById('v-as-health');
    if (h) h.innerHTML = `
      <div class="head"><div>
        <h1>Health Monitor</h1>
        <div class="sub">Brand-level Pixel BM / Pixel / CAPI Token health status. Logs updated daily by the n8n Health Check workflow.（时间已转本地 UTC+8）</div>
      </div><div class="filters">
        <select id="ahEntity" onchange="MISAssets.loadHealth()">
          <option value="ALL">All Entity Types</option><option>BM</option><option>PIXEL</option><option>TOKEN</option>
        </select>
        <select id="ahResult" onchange="MISAssets.loadHealth()">
          <option value="ALL">All Results</option><option>OK</option><option>FAILED</option>
        </select>
        <button class="btn ghost sm" onclick="MISAssets.loadHealth()">↻ 刷新</button></div></div>
      <div class="kpis" id="ahKpis"></div>
      <div class="card" style="padding:14px;margin-bottom:14px"><b style="font-size:12.5px">品牌 × 轮转槽位（BM / Pixel / Token）</b>
        <div class="tablewrap" style="margin-top:8px"><table id="ahGrid"></table></div>
        <div class="note">每个品牌应有 MAIN 且为 ACTIVE；空槽 = 该角色缺配置（轮转后未补位）。Token 取该槽位 BM 下 purpose=CAPI 且未 REVOKED 的一条。</div></div>
      <div class="tablewrap"><table id="ahLog"></table></div>`;

    const r = document.getElementById('v-as-rotation');
    if (r) r.innerHTML = `
      <div class="head"><div>
        <h1>Rotation Log</h1>
        <div class="sub">封号 → 递补的完整轨迹（rotation_log 流水，只读）</div>
      </div><div class="filters">
        <select id="arType" onchange="MISAssets.loadRotation()">
          <option value="ALL">All Types</option><option>BM</option><option>PIXEL</option><option>AD_ACCOUNT</option>
        </select>
        <button class="btn ghost sm" onclick="MISAssets.loadRotation()">↻ 刷新</button></div></div>
      <div class="tablewrap"><table id="arTable"></table></div>`;

    const o = document.getElementById('v-as-overview');
    if (o) o.innerHTML = `
      <div class="head"><div>
        <h1>Asset Status</h1>
        <div class="sub">BM / Pixel / 广告账户 / 开发者应用的存量与状态总览（只读；操作在 P2 迁入）</div>
      </div><div class="filters"><button class="btn ghost sm" onclick="MISAssets.loadOverview()">↻ 刷新</button></div></div>
      <div class="kpis" id="aoKpis"></div>
      <div class="card" style="padding:14px;margin-bottom:14px"><b style="font-size:12.5px">Business Managers</b>
        <div class="tablewrap" style="margin-top:8px"><table id="aoBms"></table></div></div>
      <div class="card" style="padding:14px"><b style="font-size:12.5px">广告账户</b>
        <div class="tablewrap" style="margin-top:8px"><table id="aoAccounts"></table></div></div>`;
  }

  /* ================= Health ================= */
  async function loadHealth() {
    const entSel = document.getElementById('ahEntity'), resSel = document.getElementById('ahResult');
    const ent = entSel ? entSel.value : 'ALL', res = resSel ? resSel.value : 'ALL';
    const hq = '/api/health?limit=100' + (ent !== 'ALL' ? '&entity_type=' + ent : '') + (res !== 'ALL' ? '&result=' + res : '');
    const [brands, pixels, tokens, healthAll, health] = await Promise.all([
      metaApi('/api/brands?limit=100'),
      metaApi('/api/pixels?limit=100'),
      metaApi('/api/tokens?limit=100'),
      metaApi('/api/health?limit=100'),
      metaApi(hq),
    ]);

    const ok = healthAll.items.filter(x => x.checkResult === 'OK').length;
    const failed = healthAll.items.filter(x => x.checkResult === 'FAILED').length;
    document.getElementById('ahKpis').innerHTML =
      kpi(String(healthAll.meta ? healthAll.meta.total : healthAll.items.length), 'Total Checks') +
      kpi(`<span style="color:#1a7f4e">${ok}</span>`, 'OK') +
      kpi(`<span style="color:#c62f36">${failed}</span>`, 'FAILED');

    /* 照系统 2 /health 页的 pickRole：槽位 pixel → 其 BM → 该 BM 下 CAPI 且未 REVOKED 的 token */
    const ROLES = ['MAIN', 'BACKUP1', 'BACKUP2'];
    const cellOf = (label, st, name) =>
      `${label} ${badge(st || 'INACTIVE')}${name ? `<div class="sub" style="display:block;font-size:10.5px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(name)}</div>` : ''}`;
    let grid = `<tr><th>Brand</th>${ROLES.map(r => `<th>${r}</th>`).join('')}</tr>`;
    brands.items.forEach(b => {
      grid += `<tr><td><b>${esc(b.code)}</b></td>` + ROLES.map(role => {
        const p = pixels.items.find(x => String(x.brandId) === String(b.id) && x.role === role);
        if (!p) return `<td><span class="sub" style="display:inline">— 空槽</span></td>`;
        const bm = p.businessManager || null;
        const tk = bm ? tokens.items.find(t => String(t.bmId) === String(bm.id) && t.purpose === 'CAPI' && t.status !== 'REVOKED') : null;
        return `<td><div style="display:grid;gap:3px;font-size:11.5px">
          <div>${cellOf('BM', bm && bm.status, bm && bm.name)}</div>
          <div>${cellOf('Pixel', p.status, p.name)}</div>
          <div>Token ${badge(tk ? tk.status : 'INACTIVE')}</div></div></td>`;
      }).join('') + '</tr>';
    });
    document.getElementById('ahGrid').innerHTML = grid;

    let log = `<tr><th>时间 (UTC+8)</th><th>对象</th><th>结果</th><th>错误</th></tr>`;
    if (!health.items.length) log += `<tr><td colspan="4" class="empty">暂无体检记录</td></tr>`;
    health.items.forEach(it => {
      log += `<tr><td>${esc(fmtTs(it.checkedAt))}</td>
        <td>${esc(it.entityType)} #${esc(it.entityId)}</td>
        <td>${badge(it.checkResult === 'OK' ? 'ACTIVE' : 'BANNED').replace('>ACTIVE<', '>OK<').replace('>BANNED<', '>FAILED<')}</td>
        <td class="sub" style="display:table-cell">${esc(it.errorDetail || '')}</td></tr>`;
    });
    document.getElementById('ahLog').innerHTML = log;
  }

  /* ================= Rotation ================= */
  async function loadRotation() {
    const t = document.getElementById('arType').value || 'ALL';
    const d = await metaApi('/api/rotation/logs?limit=100' + (t === 'ALL' ? '' : '&entity_type=' + t));
    let html = `<tr><th>时间 (UTC+8)</th><th>类型</th><th>对象</th><th>Role</th><th>Status</th><th>原因</th><th>操作人</th></tr>`;
    if (!d.items.length) html += `<tr><td colspan="7" class="empty">暂无记录</td></tr>`;
    d.items.forEach(r => {
      const roleChg = (r.oldRole || r.newRole) ? `${esc(r.oldRole || '—')} → ${esc(r.newRole || '—')}` : '—';
      const stChg = (r.oldStatus || r.newStatus) ? `${esc(r.oldStatus || '—')} → ${esc(r.newStatus || '—')}` : '—';
      html += `<tr><td>${esc(fmtTs(r.createdAt))}</td><td>${esc(r.entityType)}</td><td>#${esc(r.entityId)}</td>
        <td>${roleChg}</td><td>${stChg}</td><td>${esc(r.reason || '')}</td><td>${esc(r.operator)}</td></tr>`;
    });
    document.getElementById('arTable').innerHTML = html;
  }

  /* ================= Overview ================= */
  async function loadOverview() {
    const [bms, pixels, accounts, apps] = await Promise.all([
      metaApi('/api/business-managers?limit=100'),
      metaApi('/api/pixels?limit=100'),
      metaApi('/api/ad-accounts?limit=100'),
      metaApi('/api/developer-apps?limit=100'),
    ]);
    const cnt = (items, st) => items.filter(x => x.status === st).length;
    const fmt = items => `${items.filter(x => x.status === 'ACTIVE').length} <span style="font-size:12px;font-weight:400">/ ${items.length}</span>`;
    document.getElementById('aoKpis').innerHTML =
      kpi(fmt(bms.items), 'BM · ACTIVE/总') + kpi(fmt(pixels.items), 'Pixel · ACTIVE/总') +
      kpi(fmt(accounts.items), '广告账户 · ACTIVE/总') + kpi(fmt(apps.items), 'App · ACTIVE/总') +
      kpi(String(cnt(pixels.items, 'BANNED') + cnt(bms.items, 'BANNED') + cnt(accounts.items, 'BANNED')), 'BANNED 合计');

    let bt = `<tr><th>BM</th><th>BM ID</th><th>类型</th><th>Role</th><th>状态</th></tr>`;
    bms.items.forEach(b => {
      bt += `<tr><td>${esc(b.name)}</td><td><span class="code">${esc(b.bmId)}</span></td>
        <td>${esc(b.bmType)}</td><td>${esc(b.role || '—')}</td><td>${badge(b.status)}</td></tr>`;
    });
    document.getElementById('aoBms').innerHTML = bt;

    let at = `<tr><th>账户名</th><th>Account ID</th><th>品牌</th><th>状态</th></tr>`;
    accounts.items.forEach(a => {
      const codes = (a.brandLinks || []).map(l => l.brand && l.brand.code).filter(Boolean);
      at += `<tr><td>${esc(a.name)}</td><td><span class="code">${esc(a.adAccountId)}</span></td>
        <td>${esc(codes.join(', ') || '—')}</td><td>${badge(a.status)}</td></tr>`;
    });
    document.getElementById('aoAccounts').innerHTML = at;
  }

  /* ================= 注册 ================= */
  mount();
  window.MISAssets = { loadHealth, loadRotation, loadOverview };
  MIS_MODULES.register('as-health', loadHealth);
  MIS_MODULES.register('as-rotation', loadRotation);
  MIS_MODULES.register('as-overview', loadOverview);
})();
