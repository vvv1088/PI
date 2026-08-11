/* =====================================================================
 * mis-assets.js — ASSETS 模块（v70 新增）
 *   v-as-health    Health Monitor：KPI + 品牌×槽位(BM/Pixel/Token)网格 + 体检流水
 * v72 收编：原 v-as-rotation(轮转流水)并入 mis-operations.js 的 Rotation 页
 * Logs tab;原 v-as-overview(资产状态总览)并入 Meta Overview(mm-dash)。
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
      grid += `<tr><td><b class="mmr-link" onclick="goBrand('${esc(b.code)}')">${esc(b.code)}</b></td>` + ROLES.map(role => {
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

  /* ================= 注册 ================= */
  mount();
  window.MISAssets = { loadHealth };
  MIS_MODULES.register('as-health', loadHealth);
})();
