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
        <h1>Health</h1>
        <div class="sub">品牌 × 轮转槽位一眼看全 + 每日体检流水（系统 2 Health Check 同源数据；时间已转本地 UTC+8）</div>
      </div><div class="filters"><button class="btn ghost sm" onclick="MISAssets.loadHealth()">↻ 刷新</button></div></div>
      <div class="card" style="padding:14px;margin-bottom:14px"><b style="font-size:12.5px">品牌 × Pixel 槽位</b>
        <div class="tablewrap" style="margin-top:8px"><table id="ahGrid"></table></div>
        <div class="note">每个品牌应有 MAIN 且为 ACTIVE；空槽 = 该角色缺配置（轮转后未补位）。</div></div>
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
    const [brands, pixels, health] = await Promise.all([
      metaApi('/api/brands?limit=100'),
      metaApi('/api/pixels?limit=100'),
      metaApi('/api/health?limit=40'),
    ]);
    const bMap = {}; brands.items.forEach(b => { bMap[b.id] = b.code; });

    const ROLES = ['MAIN', 'BACKUP1', 'BACKUP2'];
    let grid = `<tr><th>Brand</th>${ROLES.map(r => `<th>${r}</th>`).join('')}</tr>`;
    brands.items.forEach(b => {
      grid += `<tr><td><b>${esc(b.code)}</b></td>` + ROLES.map(role => {
        const p = pixels.items.find(x => String(x.brandId) === String(b.id) && x.role === role);
        if (!p) return `<td><span class="sub" style="display:inline">— 空槽</span></td>`;
        return `<td>${badge(p.status)} <span class="code" style="font-size:11px">${esc(p.pixelId)}</span></td>`;
      }).join('') + '</tr>';
    });
    document.getElementById('ahGrid').innerHTML = grid;

    let log = `<tr><th>时间 (UTC+8)</th><th>对象</th><th>结果</th><th>错误</th></tr>`;
    if (!health.items.length) log += `<tr><td colspan="4" class="empty">暂无体检记录</td></tr>`;
    health.items.forEach(it => {
      log += `<tr><td>${esc(fmtTs(it.checkedAt))}</td>
        <td>${esc(it.entityType)} #${esc(it.entityId)}</td>
        <td>${badge(it.checkResult === 'PASSED' ? 'ACTIVE' : 'BANNED').replace('ACTIVE', 'PASSED').replace('BANNED', 'FAILED')}</td>
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
      at += `<tr><td>${esc(a.name)}</td><td><span class="code">${esc(a.adAccountId)}</span></td>
        <td>${esc((a.brands || []).join(', ') || '—')}</td><td>${badge(a.status)}</td></tr>`;
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
