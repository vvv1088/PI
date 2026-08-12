/* =====================================================================
 * mis-meta-admin-mock.js — v71 系统 2 全页面搬家的 mock 扩展
 *
 * 覆盖 06-API接口手册里 v70 未用到的全部路由：
 *   资源 CRUD：brands / business-managers / pixels / ad-accounts /
 *              developer-apps / tokens / pixel-shares / users（POST/PUT/DELETE + 详情）
 *   子接口：capi-events、ad-accounts/[id]/brands、business-managers/[id]/fb-accounts
 *   操作：rotation/execute、rotation/execute-pixel（§5 完整语义：封禁清 role、递补、
 *         写 rotation_log、生成 SOP 实例）
 *   SOP：templates / instances（含 6 类模板 seed，文案照 sop-seeds.ts 原文）
 *   审计：action-logs（写操作实时追加，与生产行为一致）
 *   分析：analytics/accounts、ads、ads/[id]/detail、brands、lifecycle
 *
 * 挂接方式：MIS_MOCK.route() 先问本文件的 route()，不认识返回 undefined 再走基础路由。
 * 写操作全部落在内存数组上（与 mis-meta-api.js 共享同一份实体数据），
 * 刷新页面即复位 —— mock 模式仅供演示交互。
 * 响应形状严格照 06 手册；手册没写明的字段标注「待 live 联调核对」。
 * ===================================================================== */
window.MIS_MOCK_ADMIN = (function () {
  'use strict';

  const D = () => MIS_MOCK._data;      // 基础实体（BRANDS/PIXELS/BMS/AD_ACCOUNTS/APPS/HEALTH/ROTATION）
  const L = () => MIS_MOCK._link;      // 装配器
  const nowIso = () => new Date().toISOString();
  let SEQ = 500;
  const nid = () => String(++SEQ);

  /* ================= 新增实体存量 ================= */

  const TOKENS = [
    { id: '1', bmId: '1', appId: '1', token: 'EAAB1xVZAkQz8BO7mockMAINgraphZBapiZAtokenZC001', purpose: 'GRAPH_API', status: 'VALID',   expiresAt: null, lastVerifiedAt: '2026-08-10T00:03:00.000Z', lastHealthResult: 'OK' },
    { id: '2', bmId: '1', appId: '1', token: 'EAAB2yWZBlRa9CP8mockMAINcapiZBtokenZD002',      purpose: 'CAPI',      status: 'VALID',   expiresAt: null, lastVerifiedAt: '2026-08-10T00:03:00.000Z', lastHealthResult: 'OK' },
    { id: '3', bmId: '3', appId: '2', token: 'EAAB3zXZCmSbACQ9mockBK2capiZCtokenZE003',       purpose: 'CAPI',      status: 'REVOKED', expiresAt: null, lastVerifiedAt: '2026-08-02T00:03:00.000Z', lastHealthResult: 'FAILED' },
    { id: '4', bmId: '4', appId: '1', token: 'EAAB4aYZDnTcBDRAmockGRAPHZDtokenZF004',         purpose: 'GRAPH_API', status: 'VALID',   expiresAt: '2026-12-31T00:00:00.000Z', lastVerifiedAt: '2026-08-10T00:03:00.000Z', lastHealthResult: 'OK' },
    { id: '5', bmId: '5', appId: '2', token: 'EAAB5bZZEoUdCESBmockAUDIENCEtokenZG005',        purpose: 'AUDIENCE',  status: 'VALID',   expiresAt: null, lastVerifiedAt: '2026-08-10T00:03:00.000Z', lastHealthResult: 'FAILED' },
    { id: '6', bmId: '2', appId: '1', token: 'EAAB6cAZFpVeDFTCmockBK1capiZEtokenZH006',       purpose: 'CAPI',      status: 'VALID',   expiresAt: null, lastVerifiedAt: '2026-08-10T00:03:00.000Z', lastHealthResult: 'OK' },
  ];

  /* pixel_ad_account_shares：只登记 MAIN pixel（SOP 规矩：BACKUP 不共享） */
  const SHARES = [
    { id: '1', pixelId: '1', adAccountId: '1', shareStatus: 'ACTIVE' },
    { id: '2', pixelId: '1', adAccountId: '5', shareStatus: 'REVOKED' },
    { id: '3', pixelId: '4', adAccountId: '2', shareStatus: 'ACTIVE' },
    { id: '4', pixelId: '6', adAccountId: '3', shareStatus: 'ACTIVE' },
    { id: '5', pixelId: '9', adAccountId: '4', shareStatus: 'ACTIVE' },
  ];

  /* bm_fb_accounts：1+2 机制 */
  const FB_ACCOUNTS = [
    { id: '1', bmId: '1', fbAccountName: 'Sokha Vann',     role: 'MAIN',    status: 'ACTIVE' },
    { id: '2', bmId: '1', fbAccountName: 'Dara Chen',      role: 'BACKUP1', status: 'ACTIVE' },
    { id: '3', bmId: '1', fbAccountName: 'Mealea Sok',     role: 'BACKUP2', status: 'ACTIVE' },
    { id: '4', bmId: '2', fbAccountName: 'Piseth Lim',     role: 'MAIN',    status: 'ACTIVE' },
    { id: '5', bmId: '2', fbAccountName: 'Chanthy Heng',   role: 'BACKUP1', status: 'DISABLED' },
    { id: '6', bmId: '3', fbAccountName: 'Visal Kong',     role: 'MAIN',    status: 'BANNED' },
  ];

  /* brand_capi_events：6 类事件 ×
   * 手册 §4.1：库里没有的行 GET 时补虚拟记录（id null / enabled true） */
  const CAPI_TYPES = ['REGISTER', 'FIRST_DEPOSIT', 'DEPOSIT', 'INACTIVE_3D', 'INACTIVE_7D', 'INACTIVE_15D'];
  const CAPI_EVENTS = [];
  D().BRANDS.forEach(b => {
    CAPI_TYPES.forEach((t, i) => {
      // 与生产一致：只有 INZ9 开 INACTIVE_*，其他品牌关
      const enabled = t.indexOf('INACTIVE') === 0 ? b.code === 'INZ9' : true;
      CAPI_EVENTS.push({ id: String(100 + CAPI_EVENTS.length), brandId: b.id, eventType: t, enabled, createdAt: b.createdAt, updatedAt: b.updatedAt });
    });
  });

  /* users：镜像生产的账号结构（9 账号中的代表样本；permissions=null 即超管） */
  const PERM_KEYS = ['brands', 'business-managers', 'pixels', 'ad-accounts', 'developer-apps', 'tokens', 'pixel-shares',
    'rotation', 'health', 'sop', 'users', 'action-logs',
    'analytics-accounts', 'analytics-ads', 'analytics-brands', 'analytics-spending', 'analytics-lifecycle'];
  function perms(edit, none) {
    const p = {};
    PERM_KEYS.forEach(k => { p[k] = (edit || []).includes(k) ? 'edit' : (none || []).includes(k) ? 'none' : 'view'; });
    return p;
  }
  const USERS = [
    { id: '1', username: 'admin',    displayName: 'Administrator', permissions: null, status: 'ACTIVE',   createdAt: '2026-05-20T03:00:00.000Z', updatedAt: '2026-05-20T03:00:00.000Z' },
    { id: '2', username: 'jayden',   displayName: 'Jayden',        permissions: null, status: 'ACTIVE',   createdAt: '2026-05-20T03:05:00.000Z', updatedAt: '2026-05-20T03:05:00.000Z' },
    { id: '3', username: 'ops01',    displayName: '运营-Ratha',    permissions: perms(['rotation', 'sop', 'pixel-shares'], ['users', 'action-logs', 'tokens', 'developer-apps']), status: 'ACTIVE', createdAt: '2026-06-01T02:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
    { id: '4', username: 'ops02',    displayName: '运营-Srey',     permissions: perms(['pixel-shares'], ['users', 'action-logs', 'tokens', 'developer-apps', 'rotation']), status: 'ACTIVE', createdAt: '2026-06-01T02:10:00.000Z', updatedAt: '2026-06-01T02:10:00.000Z' },
    { id: '5', username: 'viewer01', displayName: '只读-Finance',  permissions: perms([], ['users', 'action-logs', 'tokens', 'developer-apps', 'rotation', 'sop']), status: 'ACTIVE', createdAt: '2026-06-20T04:00:00.000Z', updatedAt: '2026-06-20T04:00:00.000Z' },
    { id: '6', username: 'ex-staff', displayName: '离职账号',      permissions: perms([], []), status: 'INACTIVE', createdAt: '2026-05-25T01:00:00.000Z', updatedAt: '2026-07-01T09:00:00.000Z' },
  ];

  /* action_logs：预置存量 + 写操作实时追加（entity_type 风格照生产：资源=驼峰 key、轮转=BM/PIXEL、登录=USER） */
  const ACTION_LOGS = [];
  function writeLog(actionType, entityType, entityId, details, userId) {
    ACTION_LOGS.unshift({
      id: nid(), userId: userId || '1', actionType, entityType,
      entityId: entityId == null ? null : String(entityId),
      details: details || null, createdAt: nowIso(),
      user: L().pub(USERS.find(u => u.id === (userId || '1'))),
    });
  }
  (function seedLogs() {
    const days = MIS_MOCK._days;
    const mk = (daysAgoIdx, userId, actionType, entityType, entityId, details, hh) => {
      const u = USERS.find(x => x.id === userId);
      ACTION_LOGS.push({ id: nid(), userId, actionType, entityType, entityId, details, createdAt: days[daysAgoIdx] + 'T' + hh + ':00.000Z', user: L().pub(u) });
    };
    mk(13, '2', 'LOGIN',  'USER', '2', null, '01:02');
    mk(12, '1', 'CREATE', 'brands', '4', { after: { code: 'SBKH', name: 'SBKH', status: 'ACTIVE' } }, '02:11');
    mk(11, '1', 'CREATE', 'pixels', '9', { after: { pixelId: '978513741233618', name: 'SBKH MAIN' } }, '02:20');
    mk(10, '2', 'ROTATION', 'BM', '3', { rotationLogId: '41', reason: 'BM 被 Meta 封禁，触发轮转' }, '03:13');
    mk(8,  '3', 'UPDATE', 'pixelShares', '2', { before: { shareStatus: 'ACTIVE' }, after: { shareStatus: 'REVOKED' } }, '06:40');
    mk(6,  '1', 'UPDATE', 'adAccounts', '6', { before: { status: 'ACTIVE' }, after: { status: 'DISABLED' } }, '07:22');
    mk(5,  '2', 'LOGIN',  'USER', '2', null, '00:55');
    mk(3,  '1', 'DELETE', 'adAccounts', '7', { before: { status: 'ACTIVE' }, after: { status: 'DISABLED' } }, '02:22');
    mk(1,  '3', 'LOGIN',  'USER', '3', null, '01:15');
    ACTION_LOGS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  })();

  /* ================= SOP ================= */

  /* 模板文案照系统 2 sop-seeds.ts 原文（6 类；NEW_PIXEL 为空数组不 seed） */
  const SOP_SEED = {
    NEW_BRAND: [
      ['Create 1 new pixel in each Pixel BM (MAIN / BACKUP1 / BACKUP2)', true],
      ['Enter the 3 new pixels into admin panel and link brand + BM', true],
      ['Share only MAIN pixel to ad account BMs (BACKUP pixels are not shared)', true],
      ['Enter pixel-ad_account share relationships', true],
      ['Share ad accounts to the Graph API BM', true],
      ['Enter ad account info', true],
      ['Assign ad accounts in CA BM and accept Custom Audience TOS', true],
      ['Create audience records and link to ad accounts', false],
      ['Configure brand_capi_events (toggle the event types needed)', false],
    ],
    BM_ROTATION: [
      ['Share newly promoted MAIN pixel to all ad account BMs', true],
      ['Revoke old MAIN pixel share from ad accounts', true],
      ['Update pixel_ad_account_shares in admin panel', true],
      ['Create new BM', true],
      ['Add FB personal accounts to new BM (1+2 mechanism)', true],
      ['Create new app in Meta Developer (or install published app)', true],
      ['Create system user in new BM', true],
      ['Assign app to system user', true],
      ['Create new pixel for each brand', true],
      ['Assign all new pixels to system user', true],
      ['Generate system user access token', true],
      ['Enter new BM, all new pixels, token into admin panel', true],
      ['Update configurations in admin panel', true],
    ],
    PIXEL_ROTATION: [
      ['Share newly promoted MAIN pixel to ad account BMs', true],
      ['Revoke old MAIN pixel share from ad accounts', true],
      ['Update pixel_ad_account_shares in admin panel', true],
      ['Create new BM + FB accounts + app + system user', true],
      ['Create new pixel for all brands in new BM', true],
      ['Assign all new pixels to system user + generate token', true],
      ['Enter new BM, all new pixels, token into admin panel', true],
      ['Update configurations in admin panel', true],
    ],
    GRAPH_API_BM_ROTATION: [
      ['Create new BM', true],
      ['Re-share all ad accounts to the new BM', true],
      ['Create app + system user + generate token', true],
      ['Enter new BM + token into admin panel, replacing the old record', true],
    ],
    CA_BM_ROTATION: [
      ['Create new BM', true],
      ['Reassign all ad accounts to the new BM', true],
      ['Accept Custom Audience TOS in the new BM', true],
      ['Create app + system user + generate token', true],
      ['Enter new BM + token into admin panel, replacing the old record', true],
    ],
    NEW_AD_ACCOUNT: [
      ["Create or receive ad account at the operator's BM", true],
      ['Enter ad account info in admin panel', true],
      ['Link ad account to the corresponding brand(s) via brand_ad_accounts', true],
      ['Share ad account to the Graph API BM', true],
      ["Share each brand's pixels to the new ad account's BM", true],
      ['Enter pixel-ad_account share relationships', true],
      ['Assign new ad account in CA BM and accept Custom Audience TOS', true],
      ['Create audience record linking the new ad account', false],
    ],
  };
  const SOP_TEMPLATES = [];
  Object.keys(SOP_SEED).forEach(tt => {
    SOP_SEED[tt].forEach((s, i) => {
      SOP_TEMPLATES.push({ id: String(200 + SOP_TEMPLATES.length), triggerType: tt, stepOrder: i + 1, title: s[0], description: s[0], isManual: s[1] });
    });
  });
  const tplOf = (tt) => SOP_TEMPLATES.filter(t => t.triggerType === tt).sort((a, b) => a.stepOrder - b.stepOrder);

  /* 存量实例：对应 mock rotation_log id=41 的那次 BM 轮转（13 步，前 3 步已完成） */
  const SOP_INSTANCES = [];
  (function seedSop() {
    const days = MIS_MOCK._days;
    tplOf('BM_ROTATION').forEach((t, i) => {
      const done = i < 3;
      SOP_INSTANCES.push({
        id: String(300 + i), checklistId: t.id, brandId: null, triggeredBy: '41',
        stepOrder: t.stepOrder,
        description: t.stepOrder === 1
          ? "Share the newly promoted MAIN pixel to ad account BMs (most urgent — restores ad tracking):\n  - Brand INZ9: pixel 'INZ9 BK1' (ID: 2098178417422643) ↔ INZ9-ACC-01 (act_1998765220809792)\n  - Brand 17WINKH: pixel '17WINKH BK1' (ID: 1541072834181233) ↔ WIKH-ACC-02 (act_1381086713963776)"
          : t.stepOrder === 2
            ? "Revoke share of the OLD MAIN pixel from ad accounts:\n  - Brand INZ9: pixel 'INZ9 MAIN' (ID: 3967571086707308) ↔ INZ9-ACC-01 (act_1998765220809792)"
            : null,
        status: done ? 'DONE' : 'PENDING',
        completedBy: done ? 'jayden' : null,
        completedAt: done ? days[9] + 'T06:0' + i + ':00.000Z' : null,
        createdAt: days[10] + 'T03:13:05.000Z',
      });
    });
  })();
  function sopWithRel(t) {
    const cl = SOP_TEMPLATES.find(c => c.id === t.checklistId);
    return Object.assign({}, t, {
      checklist: cl || null,
      brand: t.brandId ? L().pub(L().byId(D().BRANDS, t.brandId) || {}) : null,
    });
  }

  /* ================= 分析层数据（近 30 天） ================= */
  const AN_DAYS = [];
  (function () {
    const today = new Date();
    for (let i = 29; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); AN_DAYS.push(misDateISO(d)); }
  })();
  /* ads：数据层主表（id=数据层主键；fb_ad_accounts_id 概念上是 legacy.id，
   * mock 直接对齐配置库账户 id —— 三跳 ID 在 mock 里折叠成一跳） */
  const AN_ADS = [];
  (function () {
    const mk = (name, acc, status, base, img) => AN_ADS.push({
      id: String(40000 + AN_ADS.length), ad_id: '1202' + String(10000000 + AN_ADS.length * 7),
      name, status, fb_ad_accounts_id: acc, brand_id: null,
      landing_url: 'https://example.com/lp', image_url: img || null,
      created_time: AN_DAYS[Math.min(29, 3 + AN_ADS.length * 2)] + ' 10:23:45', _base: base,
    });
    const svg = c => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="' + c + '"/><text x="160" y="95" font-size="20" fill="#fff" text-anchor="middle" font-family="sans-serif">AD CREATIVE</text></svg>');
    mk('MYR_INZ9_TRSA_IM_MY1101', '1', 'ACTIVE', 42, svg('#2563eb'));
    mk('MYR_INZ9_TRSA_IM_MY1102', '1', 'ACTIVE', 35, svg('#9333ea'));
    mk('MYR_INZ9_TRSA_IM_MY1201', '1', 'PAUSED', 18, svg('#0891b2'));
    mk('MYR_INZ9_TRSA_VD_OLD01',  '5', 'ARCHIVED', 6, null);
    mk('USC_WIKH_TRSA_IM_KH0201', '2', 'ACTIVE', 39, svg('#dc2626'));
    mk('USC_WIKH_TRSA_IM_KH0202', '2', 'ACTIVE', 22, svg('#d97706'));
    mk('USC_WIKH_TRSA_VD_KH0105', '2', 'DELETED', 3, null);
    mk('USC_OK18_TRSA_IM_KH0310', '3', 'ACTIVE', 31, svg('#16a34a'));
    mk('USC_OK18_TRSA_IM_KH0311', '3', 'PAUSED', 12, null);
    mk('USC_SBKH_TRSA_IM_KH0401', '4', 'ACTIVE', 27, svg('#db2777'));
    mk('USC_SBKH_TRSA_VD_KH0402', '4', 'ACTIVE', 15, null);
    /* v85:命名契约 v2 的新式广告(与 demo 素材登记码一致)——演示素材状态自动映射:
     * 上线中/被拒(含同账户批量翻拒=疑似账户事件)/审核中/系列暂停 各一 */
    mk('USC_OK18_SA_VD_HK_WD_001',  '3', 'ACTIVE', 33, svg('#16a34a'));
    mk('USC_OK18_SA_VD_HK_FP_001',  '3', 'DISAPPROVED', 21, svg('#dc2626'));
    mk('USC_OK18_TRSA_VD_WD9_KH02', '3', 'DISAPPROVED', 8, null);   // 同账户陪拒 ×2 → 触发爆量启发式
    mk('USC_OK18_TRSA_IM_BW2_KH01', '3', 'DISAPPROVED', 5, null);
    mk('USC_WIKH_SA_VD_FM_VD_001',  '2', 'PENDING_REVIEW', 9, svg('#d97706'));
    mk('USC_SBKH_SA_VD_VS_GS_001',  '4', 'CAMPAIGN_PAUSED', 11, svg('#7c3aed'));
  })();
  const BRAND_OF_AD = name =>
    name.indexOf('_INZ9_') >= 0 ? 'INZ9' : name.indexOf('_WIKH_') >= 0 ? '17WINKH'
      : name.indexOf('_OK18_') >= 0 ? 'OK188KH' : name.indexOf('_SBKH_') >= 0 ? 'SBKH' : null;
  /* 日指标：ad × day */
  function adDaily(ad) {
    const rows = [];
    AN_DAYS.forEach((date, di) => {
      if (date < ad.created_time.slice(0, 10)) return;
      if (ad.status === 'DELETED' && di > 20) return;
      const idx = Number(ad.id) % 7;
      const wave = 1 + 0.4 * Math.sin((di + idx * 2) / 3.1);
      const spend = Math.round(ad._base * wave * 100) / 100;
      rows.push({
        date, spend,
        impressions: Math.round(spend * (310 + idx * 40)),
        clicks: Math.round(spend * (3.1 + idx * 0.4)),
        conversions: Math.max(0, Math.round(spend / (11 + idx * 2) + ((di + idx) % 3) - 1)),
      });
    });
    return rows;
  }
  const CUSTOM_CONVS = [
    { id: '7', conversion_id: '723001', name: 'INZ9 Register', acc: '1' },
    { id: '8', conversion_id: '723002', name: 'INZ9 First Deposit', acc: '1' },
    { id: '9', conversion_id: '723003', name: 'INZ9 Deposit', acc: '1' },
    { id: '10', conversion_id: '724001', name: '17WINKH Register', acc: '2' },
    { id: '11', conversion_id: '724002', name: '17WINKH First Deposit', acc: '2' },
  ];

  /* ================= CRUD 通用工具 ================= */

  function detailPath(base, prefix) {
    // '/api/brands/3' → '3'；'/api/brands/3/capi-events' 之类不在此匹配
    if (base.indexOf(prefix + '/') !== 0) return null;
    const rest = base.slice(prefix.length + 1);
    return rest.indexOf('/') < 0 ? rest : null;
  }
  const subPath = (base, prefix, sub) => {
    // '/api/brands/3/capi-events' → '3'
    const m = base.match(new RegExp('^' + prefix.replace(/\//g, '\\/') + '\\/([^/]+)\\/' + sub + '$'));
    return m ? m[1] : null;
  };
  function softDelete(arr, id, data, logKey) {
    const row = L().byId(arr, id);
    if (!row) throw new Error('Record not found');
    const before = Object.assign({}, row);
    Object.assign(row, data, { updatedAt: nowIso() });
    writeLog('DELETE', logKey, id, { before: L().pub(before), after: L().pub(row) });
    return row;
  }
  function rotationLogIfChanged(entityType, row, before, reason) {
    if (before.role !== row.role || before.status !== row.status) {
      D().ROTATION.unshift({
        id: nid(), entityType, entityId: String(row.id), brandId: row.brandId || null,
        oldRole: before.role || null, newRole: row.role || null,
        oldStatus: before.status || null, newStatus: row.status || null,
        reason: reason || 'Manual update', operator: 'admin', createdAt: nowIso(),
      });
    }
  }

  /* ================= 轮转执行（§5 语义） ================= */

  function execBmRotation(body) {
    const bm = L().byId(D().BMS, body.bmId);
    if (!bm || bm.bmType !== 'PIXEL') throw new Error('Pixel BM not found');
    const reason = body.reason || 'BM rotation';
    const prevRole = bm.role, prevStatus = bm.status;
    // ② 封 BM ③ 封其下全部 pixel（跨品牌）
    Object.assign(bm, { status: 'BANNED', role: null });
    D().PIXELS.filter(p => String(p.bmId) === String(bm.id)).forEach(p => Object.assign(p, { status: 'BANNED', role: null }));
    // ④ 被封记录的 rotation_log —— id 即返回值与 SOP 分组键
    const rlId = nid();
    D().ROTATION.unshift({ id: rlId, entityType: 'BM', entityId: String(bm.id), brandId: body.brandId || null, oldRole: prevRole, newRole: null, oldStatus: prevStatus, newStatus: 'BANNED', reason, operator: 'jayden', createdAt: nowIso() });
    // ⑤⑥ 递补（照生产：不过滤 status —— 坑 R1 原样保留）
    const promotion = { BACKUP1: 'MAIN', BACKUP2: 'BACKUP1' };
    D().BMS.filter(m => m.bmType === 'PIXEL' && (m.role === 'BACKUP1' || m.role === 'BACKUP2')).forEach(m => {
      const newRole = promotion[m.role];
      const oldRole = m.role;
      m.role = newRole;
      D().PIXELS.filter(p => String(p.bmId) === String(m.id)).forEach(p => { p.role = newRole; });
      D().ROTATION.unshift({ id: nid(), entityType: 'BM', entityId: String(m.id), brandId: null, oldRole, newRole, oldStatus: m.status, newStatus: m.status, reason, operator: 'jayden', createdAt: nowIso() });
    });
    // ⑦ 动态描述（此刻查 MAIN 已是新 MAIN）
    const desc = buildBmDescriptions(bm.id);
    // ⑧ 13 条 SOP 实例
    tplOf('BM_ROTATION').forEach(t => {
      SOP_INSTANCES.push({
        id: nid(), checklistId: t.id, brandId: body.brandId || null, triggeredBy: rlId,
        stepOrder: t.stepOrder, description: desc[t.stepOrder] || null,
        status: t.isManual ? 'PENDING' : 'DONE',
        completedBy: t.isManual ? null : 'system',
        completedAt: t.isManual ? null : nowIso(), createdAt: nowIso(),
      });
    });
    writeLog('ROTATION', 'BM', bm.id, { rotationLogId: rlId, reason });
    return { rotationLogId: rlId };
  }
  function buildBmDescriptions(bannedBmId) {
    const brandIds = [...new Set(D().PIXELS.filter(p => String(p.bmId) === String(bannedBmId)).map(p => String(p.brandId)))];
    const lines1 = [], lines2 = [];
    brandIds.forEach(bid => {
      const brand = L().byId(D().BRANDS, bid);
      if (!brand) return;
      const newMain = D().PIXELS.find(p => String(p.brandId) === bid && p.role === 'MAIN' && p.status !== 'BANNED');
      const oldMain = D().PIXELS.find(p => String(p.brandId) === bid && String(p.bmId) === String(bannedBmId));
      const accs = D().AD_ACCOUNTS.filter(a => (a._brandIds || []).includes(bid) && a.status === 'ACTIVE')
        .map(a => a.name + ' (act_' + a.adAccountId + ')').join(', ') || '—';
      if (newMain) lines1.push("  - Brand " + brand.code + ": pixel '" + newMain.name + "' (ID: " + newMain.pixelId + ") ↔ " + accs);
      if (oldMain) lines2.push("  - Brand " + brand.code + ": pixel '" + oldMain.name + "' (ID: " + oldMain.pixelId + ") ↔ " + accs);
    });
    return {
      1: 'Share the newly promoted MAIN pixel to ad account BMs (most urgent — restores ad tracking):\n' + lines1.join('\n'),
      2: 'Revoke share of the OLD MAIN pixel from ad accounts:\n' + lines2.join('\n'),
    };
  }

  function execPixelRotation(body) {
    const px = D().PIXELS.find(p => String(p.id) === String(body.pixelId) && String(p.brandId) === String(body.brandId));
    if (!px) throw new Error('Pixel not found for selected brand');
    const reason = body.reason || 'Pixel rotation';
    const prevRole = px.role, prevStatus = px.status;
    Object.assign(px, { status: 'BANNED', role: null });
    const rlId = nid();
    D().ROTATION.unshift({ id: rlId, entityType: 'PIXEL', entityId: String(px.id), brandId: String(body.brandId), oldRole: prevRole, newRole: null, oldStatus: prevStatus, newStatus: 'BANNED', reason, operator: 'jayden', createdAt: nowIso() });
    // ④⑤ 只在本品牌内递补，排除 BANNED（照生产语义）
    const b1 = D().PIXELS.find(p => String(p.brandId) === String(body.brandId) && p.role === 'BACKUP1' && p.status !== 'BANNED');
    if (b1) { b1.role = 'MAIN'; D().ROTATION.unshift({ id: nid(), entityType: 'PIXEL', entityId: String(b1.id), brandId: String(body.brandId), oldRole: 'BACKUP1', newRole: 'MAIN', oldStatus: b1.status, newStatus: b1.status, reason, operator: 'jayden', createdAt: nowIso() }); }
    const b2 = D().PIXELS.find(p => String(p.brandId) === String(body.brandId) && p.role === 'BACKUP2' && p.status !== 'BANNED');
    if (b2) { b2.role = 'BACKUP1'; D().ROTATION.unshift({ id: nid(), entityType: 'PIXEL', entityId: String(b2.id), brandId: String(body.brandId), oldRole: 'BACKUP2', newRole: 'BACKUP1', oldStatus: b2.status, newStatus: b2.status, reason, operator: 'jayden', createdAt: nowIso() }); }
    const brand = L().byId(D().BRANDS, body.brandId) || { code: '?' };
    const accs = D().AD_ACCOUNTS.filter(a => (a._brandIds || []).includes(String(body.brandId)) && a.status === 'ACTIVE')
      .map(a => a.name + ' (act_' + a.adAccountId + ')').join(', ') || '—';
    const newMain = D().PIXELS.find(p => String(p.brandId) === String(body.brandId) && p.role === 'MAIN' && p.status !== 'BANNED');
    const desc = {
      1: newMain ? "Share pixel '" + newMain.name + "' (ID: " + newMain.pixelId + ") (brand " + brand.code + ") to ad accounts: " + accs : null,
      2: "Revoke pixel '" + px.name + "' (ID: " + px.pixelId + ") (brand " + brand.code + ") share from ad accounts: " + accs,
    };
    tplOf('PIXEL_ROTATION').forEach(t => {
      SOP_INSTANCES.push({
        id: nid(), checklistId: t.id, brandId: String(body.brandId), triggeredBy: rlId,
        stepOrder: t.stepOrder, description: desc[t.stepOrder] || null,
        status: 'PENDING', completedBy: null, completedAt: null, createdAt: nowIso(),
      });
    });
    writeLog('ROTATION', 'PIXEL', px.id, { rotationLogId: rlId, brandId: String(body.brandId), reason });
    return { rotationLogId: rlId };
  }

  /* ================= 分析接口 ================= */

  function anAccounts(q) {
    const accId = q.get('ad_account_id');
    if (!accId) return { summary: null, spendTrend: [], conversionTrend: [], customConversions: [] };
    const from = q.get('from') || AN_DAYS[23], to = q.get('to') || AN_DAYS[29];
    const ads = AN_ADS.filter(a => String(a.fb_ad_accounts_id) === String(accId));
    const byDate = {};
    ads.forEach(ad => adDaily(ad).forEach(r => {
      if (r.date < from || r.date > to) return;
      const t = byDate[r.date] || (byDate[r.date] = { date: r.date, spend: 0, impressions: 0, clicks: 0 });
      t.spend += r.spend; t.impressions += r.impressions; t.clicks += r.clicks;
    }));
    const spendTrend = Object.keys(byDate).sort().map(d => ({ date: d, spend: Math.round(byDate[d].spend * 100) / 100, impressions: byDate[d].impressions, clicks: byDate[d].clicks }));
    const convs = CUSTOM_CONVS.filter(c => String(c.acc) === String(accId));
    const conversionTrend = [];
    spendTrend.forEach((r, di) => {
      convs.forEach((c, ci) => {
        conversionTrend.push({ date: r.date, action_type: 'offsite_conversion.custom.' + c.conversion_id, action_name: c.name, count: Math.max(0, Math.round(r.spend / (25 + ci * 18) + ((di + ci) % 3) - 1)) });
      });
    });
    const sum = (arr, k) => arr.reduce((s, r) => s + Number(r[k] || 0), 0);
    return {
      summary: {
        spend: Math.round(sum(spendTrend, 'spend') * 100) / 100,
        impressions: sum(spendTrend, 'impressions'), clicks: sum(spendTrend, 'clicks'),
        conversions: sum(conversionTrend, 'count'),
        adsCount: ads.length,   // 照生产：不受日期区间影响
      },
      spendTrend, conversionTrend,
      customConversions: convs.map((c, i) => ({ id: c.id, conversion_id: c.conversion_id, name: c.name, total_count: 120 + i * 63, total_value: 0 })),
    };
  }

  function anAds(q) {
    const from = q.get('from') || AN_DAYS[0], to = q.get('to') || AN_DAYS[29];
    const accId = q.get('ad_account_id'), brandId = q.get('brand_id'), status = q.get('status');
    const sort = q.get('sort') || 'spend';
    let items = AN_ADS.slice();
    if (accId) items = items.filter(a => String(a.fb_ad_accounts_id) === String(accId));
    if (brandId) {
      const b = L().byId(D().BRANDS, brandId);
      items = b ? items.filter(a => BRAND_OF_AD(a.name) === b.code) : [];
    }
    if (status) items = items.filter(a => a.status === status);
    const rows = items.map(a => {
      const daily = adDaily(a).filter(r => r.date >= from && r.date <= to);
      const sum = k => daily.reduce((s, r) => s + Number(r[k] || 0), 0);
      return Object.assign(L().pub(a), {
        derived_brand_code: BRAND_OF_AD(a.name),
        spend: Math.round(sum('spend') * 100) / 100, clicks: sum('clicks'), conversions: sum('conversions'),
      });
    });
    rows.sort(sort === 'created' ? (a, b) => b.created_time.localeCompare(a.created_time) : (a, b) => b.spend - a.spend);
    return { items: rows.slice(0, 200) };
  }

  function anAdDetail(id) {
    const ad = AN_ADS.find(a => String(a.id) === String(id)) || null;
    if (!ad) return { ad: null, dailySpend: [], statusHistory: [] };
    const dailySpend = adDaily(ad).map(r => ({ date: r.date, spend: r.spend, clicks: r.clicks }));   // 全时段，照生产
    const statusHistory = ad.status === 'ACTIVE' ? [] : [
      { id: nid(), old_status: 'ACTIVE', new_status: ad.status, change_type: 'STATUS_CHANGE', changed_at: AN_DAYS[22] + ' 03:11:02' },
    ];
    return { ad: L().pub(ad), dailySpend, statusHistory };
  }

  function anBrands(q) {
    const from = q.get('from') || AN_DAYS[0], to = q.get('to') || AN_DAYS[29];
    const ids = (q.get('brand_ids') || '').split(',').filter(Boolean);
    const adStatus = q.get('ad_status'), accountStatus = q.get('account_status');
    const brands = D().BRANDS.filter(b => !ids.length || ids.includes(String(b.id)));
    const summary = [], dailySpend = [];
    brands.forEach(b => {
      const ads = AN_ADS.filter(a => BRAND_OF_AD(a.name) === b.code);
      const byDate = {};
      let spend = 0, impressions = 0, clicks = 0;
      ads.forEach(ad => adDaily(ad).forEach(r => {
        if (r.date < from || r.date > to) return;
        spend += r.spend; impressions += r.impressions; clicks += r.clicks;
        byDate[r.date] = (byDate[r.date] || 0) + r.spend;
      }));
      summary.push({ brand_id: b.id, brand_code: b.code, brand_name: b.name, ads_count: ads.length, spend: Math.round(spend * 100) / 100, impressions, clicks });
      Object.keys(byDate).sort().forEach(d => dailySpend.push({ date: d, brand_id: b.id, brand_code: b.code, spend: Math.round(byDate[d] * 100) / 100 }));
    });
    /* matrix：驱动集 = 配置表 ad_accounts（无广告的账户也以全 0 行出现，照生产） */
    let accs = D().AD_ACCOUNTS.slice();
    if (accountStatus) accs = accs.filter(a => a.status === accountStatus);
    const accounts = accs.map(a => {
      const cells = {}; let total = 0;
      let ads = AN_ADS.filter(x => String(x.fb_ad_accounts_id) === String(a.id));
      if (adStatus) ads = ads.filter(x => x.status === adStatus);
      ads.forEach(x => {
        const code = BRAND_OF_AD(x.name);
        if (!code || !brands.some(b => b.code === code)) return;
        cells[code] = (cells[code] || 0) + 1; total += 1;
      });
      return { config_id: a.id, meta_id: a.adAccountId, name: a.name, status: a.status, cells, total };
    });
    const brandTotals = {}; let grandTotal = 0;
    accounts.forEach(a => { Object.keys(a.cells).forEach(c => { brandTotals[c] = (brandTotals[c] || 0) + a.cells[c]; }); grandTotal += a.total; });
    return { summary, dailySpend, matrix: { brands: brands.map(b => ({ id: b.id, code: b.code, name: b.name })), accounts, brandTotals, grandTotal } };
  }

  function anLifecycle() {
    /* age_days / ban_count 照生产是字符串（BigInt 序列化） */
    const banInfo = (entityType, id) => {
      const rows = D().ROTATION.filter(r => r.entityType === entityType && String(r.entityId) === String(id) && (r.newStatus === 'BANNED' || r.newStatus === 'DISABLED'));
      return { count: rows.length, last: rows.length ? rows[0].createdAt : null };
    };
    const build = (items, entityType, nameKey, createdBase) => {
      const out = items.map((x, i) => {
        const bi = banInfo(entityType, x.id);
        const age = x.status === 'ACTIVE' ? 40 + i * 17 : 12 + i * 9;
        return { id: x.id, name: x[nameKey], status: x.status, created_at: createdBase + ' 08:00:00', age_days: String(age), ban_count: String(bi.count), last_ban: bi.last };
      });
      const ages = out.map(r => Number(r.age_days));
      return {
        items: out,
        summary: {
          active: items.filter(x => x.status === 'ACTIVE').length,
          banned: out.reduce((s, r) => s + Number(r.ban_count), 0),
          avgLifespan: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
          longest: ages.length ? Math.max.apply(null, ages) : 0,
          shortest: ages.length ? Math.min.apply(null, ages) : 0,
        },
      };
    };
    return {
      bms: build(D().BMS, 'BM', 'name', '2026-05-25'),
      pixels: build(D().PIXELS, 'PIXEL', 'name', '2026-06-01'),
      adAccounts: build(D().AD_ACCOUNTS, 'AD_ACCOUNT', 'name', '2026-06-05'),
    };
  }

  /* ================= 路由 ================= */

  function tokenWithRel(t) {
    return Object.assign(L().pub(t), {
      businessManager: L().pub(L().byId(D().BMS, t.bmId) || {}),
      developerApp: L().pub(L().byId(D().APPS, t.appId) || {}),
    });
  }
  function shareWithRel(s) {
    const px = L().byId(D().PIXELS, s.pixelId);
    return Object.assign(L().pub(s), {
      pixel: px ? Object.assign(L().pub(px), { brand: L().pub(L().byId(D().BRANDS, px.brandId) || {}) }) : null,
      adAccount: L().pub(L().byId(D().AD_ACCOUNTS, s.adAccountId) || {}),
    });
  }
  const lr = items => L().listResp(items);

  function route(base, q, opts) {
    const method = opts.method || 'GET';
    const body = opts.body || {};
    let id;

    /* ---- 健康日志（v71 起带 entity_type / result 筛选，覆盖基础路由） ---- */
    if (base === '/api/health') {
      let items = D().HEALTH.slice().sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
      const et = q.get('entity_type'), rs = q.get('result');
      if (et && et !== 'ALL') items = items.filter(x => x.entityType === et);
      if (rs && rs !== 'ALL') items = items.filter(x => x.checkResult === rs);
      return { items: items.slice(0, Number(q.get('limit') || 100)), meta: { page: 1, limit: 100, total: items.length } };
    }

    /* ---- brands ---- */
    if (base === '/api/brands' && method === 'POST') {
      const row = { id: nid(), code: body.code, name: body.name, status: body.status || 'ACTIVE', createdAt: nowIso(), updatedAt: nowIso() };
      D().BRANDS.push(row);
      CAPI_TYPES.forEach(t => CAPI_EVENTS.push({ id: nid(), brandId: row.id, eventType: t, enabled: true, createdAt: nowIso(), updatedAt: nowIso() }));
      writeLog('CREATE', 'brands', row.id, { after: L().pub(row) });
      return L().pub(row);
    }
    if ((id = subPath(base, '/api/brands', 'capi-events'))) {
      if (method === 'PUT') {
        if (CAPI_TYPES.indexOf(body.eventType) < 0) throw new Error('Invalid eventType');
        let row = CAPI_EVENTS.find(e => String(e.brandId) === String(id) && e.eventType === body.eventType);
        if (!row) { row = { id: nid(), brandId: String(id), eventType: body.eventType, enabled: !!body.enabled, createdAt: nowIso(), updatedAt: nowIso() }; CAPI_EVENTS.push(row); }
        else { row.enabled = !!body.enabled; row.updatedAt = nowIso(); }
        return Object.assign({}, row);
      }
      return { items: CAPI_TYPES.map(t => CAPI_EVENTS.find(e => String(e.brandId) === String(id) && e.eventType === t) || { id: null, brandId: String(id), eventType: t, enabled: true, createdAt: null, updatedAt: null }) };
    }
    if ((id = detailPath(base, '/api/brands'))) {
      const row = L().byId(D().BRANDS, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        if (body.name !== undefined) row.name = body.name;
        if (body.status !== undefined) row.status = body.status;
        row.updatedAt = nowIso();
        writeLog('UPDATE', 'brands', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') return L().pub(softDelete(D().BRANDS, id, { status: 'INACTIVE' }, 'brands'));
      return Object.assign(L().brand(row), {
        businessManagers: D().BMS.filter(m => String(m.brandId) === String(id)).map(L().bm),
        pixels: D().PIXELS.filter(p => String(p.brandId) === String(id)).map(L().pixel),
        adAccountLinks: D().AD_ACCOUNTS.filter(a => (a._brandIds || []).includes(String(id)))
          .map(a => ({ id: a.id + '0', brandId: String(id), adAccountId: a.id, adAccount: L().account(a) })),
        capiEvents: CAPI_EVENTS.filter(e => String(e.brandId) === String(id)),
      });
    }

    /* ---- business-managers ---- */
    if (base === '/api/business-managers' && method === 'POST') {
      const row = { id: nid(), bmId: String(body.bmId), name: body.name, bmType: body.bmType, brandId: body.brandId || null, role: body.role || null, status: body.status || 'ACTIVE', healthCheckedAt: null, lastHealthResult: null, createdAt: nowIso(), updatedAt: nowIso() };
      D().BMS.push(row);
      writeLog('CREATE', 'businessManagers', row.id, { after: L().pub(row) });
      return L().pub(row);
    }
    if ((id = subPath(base, '/api/business-managers', 'fb-accounts'))) {
      if (method === 'POST') {
        const row = { id: nid(), bmId: String(id), fbAccountName: body.fbAccountName, role: body.role, status: body.status || 'ACTIVE' };
        FB_ACCOUNTS.push(row);
        return Object.assign({}, row);
      }
      if (method === 'PUT') {
        const row = L().byId(FB_ACCOUNTS, body.id);
        if (!row) throw new Error('Record not found');
        Object.assign(row, { fbAccountName: body.fbAccountName, role: body.role, status: body.status });
        return Object.assign({}, row);
      }
      if (method === 'DELETE') {
        const row = L().byId(FB_ACCOUNTS, body.id);
        if (row) row.status = 'DISABLED';
        return { updated: true };
      }
      return { items: FB_ACCOUNTS.filter(f => String(f.bmId) === String(id)) };
    }
    if ((id = detailPath(base, '/api/business-managers'))) {
      const row = L().byId(D().BMS, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        // 照手册 §3.3：PUT 省略 brandId / role 会清空
        Object.assign(row, {
          bmId: body.bmId !== undefined ? String(body.bmId) : row.bmId,
          name: body.name !== undefined ? body.name : row.name,
          bmType: body.bmType !== undefined ? body.bmType : row.bmType,
          brandId: body.brandId || null, role: body.role || null,
          status: body.status !== undefined ? body.status : row.status, updatedAt: nowIso(),
        });
        rotationLogIfChanged('BM', row, before);
        writeLog('UPDATE', 'businessManagers', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') {
        const before = Object.assign({}, row);
        softDelete(D().BMS, id, { status: 'BANNED' }, 'businessManagers');   // 照 B1：不清 role
        rotationLogIfChanged('BM', row, before, 'Manual status change');
        return L().pub(row);
      }
      return Object.assign(L().bm(row), {
        bmFbAccounts: FB_ACCOUNTS.filter(f => String(f.bmId) === String(id)),
        systemUserTokens: TOKENS.filter(t => String(t.bmId) === String(id)).map(tokenWithRel),
        pixels: D().PIXELS.filter(p => String(p.bmId) === String(id)).map(L().pixel),
      });
    }

    /* ---- pixels ---- */
    if (base === '/api/pixels' && method === 'POST') {
      const row = { id: nid(), pixelId: String(body.pixelId), name: body.name, brandId: String(body.brandId), bmId: String(body.bmId), role: body.role || null, status: body.status || 'ACTIVE', lastHealthResult: null, createdAt: nowIso(), updatedAt: nowIso() };
      D().PIXELS.push(row);
      writeLog('CREATE', 'pixels', row.id, { after: L().pub(row) });
      return L().pub(row);
    }
    if ((id = detailPath(base, '/api/pixels'))) {
      const row = L().byId(D().PIXELS, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        ['pixelId', 'name', 'brandId', 'bmId', 'status'].forEach(k => { if (body[k] !== undefined) row[k] = String(body[k]); });
        if (body.role !== undefined) row.role = body.role || null;   // 照手册：pixel 的 role 省略保留原值
        row.updatedAt = nowIso();
        rotationLogIfChanged('PIXEL', row, before);
        writeLog('UPDATE', 'pixels', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') {
        const before = Object.assign({}, row);
        softDelete(D().PIXELS, id, { status: 'DISABLED' }, 'pixels');
        rotationLogIfChanged('PIXEL', row, before, 'Manual status change');
        return L().pub(row);
      }
      return Object.assign(L().pixel(row), {
        pixelShares: SHARES.filter(s => String(s.pixelId) === String(id)).map(shareWithRel),
      });
    }

    /* ---- ad-accounts ---- */
    if (base === '/api/ad-accounts' && method === 'POST') {
      const row = { id: nid(), adAccountId: String(body.adAccountId), name: body.name, sourceBmId: body.sourceBmId || null, status: body.status || 'ACTIVE', _brandIds: [], createdAt: nowIso(), updatedAt: nowIso() };
      D().AD_ACCOUNTS.push(row);
      writeLog('CREATE', 'adAccounts', row.id, { after: L().pub(row) });
      return L().pub(row);
    }
    if ((id = subPath(base, '/api/ad-accounts', 'brands'))) {
      const acc = L().byId(D().AD_ACCOUNTS, id);
      if (!acc) throw new Error('Record not found');
      if (method === 'POST') {
        if ((acc._brandIds || []).includes(String(body.brandId))) throw new Error('Unique constraint failed on brand_ad_accounts');
        acc._brandIds.push(String(body.brandId));
        return { linked: true };
      }
      if (method === 'DELETE') {   // 照手册 §4.2：全应用唯一硬删除，不写 action log
        acc._brandIds = (acc._brandIds || []).filter(b => b !== String(body.brandId));
        return { deleted: true };
      }
      return { items: (acc._brandIds || []).map((bid, i) => ({ id: acc.id + '0' + i, brandId: bid, adAccountId: acc.id, brand: L().pub(L().byId(D().BRANDS, bid) || {}) })) };
    }
    if ((id = detailPath(base, '/api/ad-accounts'))) {
      const row = L().byId(D().AD_ACCOUNTS, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        if (body.adAccountId !== undefined) row.adAccountId = String(body.adAccountId);
        if (body.name !== undefined) row.name = body.name;
        row.sourceBmId = body.sourceBmId || null;   // 照手册：省略清空
        if (body.status !== undefined) row.status = body.status;
        row.updatedAt = nowIso();
        rotationLogIfChanged('AD_ACCOUNT', row, before);
        writeLog('UPDATE', 'adAccounts', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') {
        const before = Object.assign({}, row);
        softDelete(D().AD_ACCOUNTS, id, { status: 'DISABLED' }, 'adAccounts');
        rotationLogIfChanged('AD_ACCOUNT', row, before, 'Manual status change');
        return L().pub(row);
      }
      return Object.assign(L().account(row), {
        pixelShares: SHARES.filter(s => String(s.adAccountId) === String(id)).map(shareWithRel),
      });
    }

    /* ---- developer-apps ---- */
    if (base === '/api/developer-apps' && method === 'POST') {
      const row = { id: nid(), appId: String(body.appId), appName: body.appName, appSecret: body.appSecret, mode: body.mode || 'DEVELOPMENT', status: body.status || 'ACTIVE', createdAt: nowIso(), updatedAt: nowIso() };
      D().APPS.push(row);
      writeLog('CREATE', 'developerApps', row.id, { after: L().pub(row) });
      return L().pub(row);
    }
    if ((id = detailPath(base, '/api/developer-apps'))) {
      const row = L().byId(D().APPS, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        ['appId', 'appName', 'appSecret', 'mode', 'status'].forEach(k => { if (body[k] !== undefined) row[k] = String(body[k]); });
        row.updatedAt = nowIso();
        writeLog('UPDATE', 'developerApps', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') return L().pub(softDelete(D().APPS, id, { status: 'DISABLED' }, 'developerApps'));
      return Object.assign(L().app(row), { systemUserTokens: TOKENS.filter(t => String(t.appId) === String(id)).map(tokenWithRel) });
    }

    /* ---- tokens ---- */
    if (base === '/api/tokens') {
      if (method === 'POST') {
        const row = { id: nid(), bmId: String(body.bmId), appId: String(body.appId), token: body.token, purpose: body.purpose, status: body.status || 'VALID', expiresAt: body.expiresAt || null, lastVerifiedAt: null, lastHealthResult: null, createdAt: nowIso(), updatedAt: nowIso() };
        TOKENS.push(row);
        writeLog('CREATE', 'tokens', row.id, { after: L().pub(row) });
        return L().pub(row);
      }
      let items = TOKENS.slice();
      const p = q.get('purpose'), s = q.get('status'), bm = q.get('bm_id');
      if (p && p !== 'ALL') items = items.filter(t => t.purpose === p);
      if (s && s !== 'ALL') items = items.filter(t => t.status === s);
      if (bm && bm !== 'ALL') items = items.filter(t => String(t.bmId) === String(bm));
      return lr(items.map(tokenWithRel));
    }
    if ((id = detailPath(base, '/api/tokens'))) {
      const row = L().byId(TOKENS, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        ['bmId', 'appId', 'token', 'purpose', 'status'].forEach(k => { if (body[k] !== undefined) row[k] = String(body[k]); });
        row.expiresAt = body.expiresAt || null;   // 照 B5：UI 编辑会丢 expiresAt
        row.updatedAt = nowIso();
        writeLog('UPDATE', 'tokens', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') return L().pub(softDelete(TOKENS, id, { status: 'REVOKED' }, 'tokens'));
      return tokenWithRel(row);
    }

    /* ---- pixel-shares ---- */
    if (base === '/api/pixel-shares') {
      if (method === 'POST') {
        if (SHARES.some(s => String(s.pixelId) === String(body.pixelId) && String(s.adAccountId) === String(body.adAccountId))) throw new Error('Unique constraint failed on pixel_ad_account_shares');
        const row = { id: nid(), pixelId: String(body.pixelId), adAccountId: String(body.adAccountId), shareStatus: body.shareStatus || 'ACTIVE' };
        SHARES.push(row);
        writeLog('CREATE', 'pixelShares', row.id, { after: L().pub(row) });
        return L().pub(row);
      }
      let items = SHARES.slice();
      const bid = q.get('brand_id');
      if (bid && bid !== 'ALL') items = items.filter(s => { const p = L().byId(D().PIXELS, s.pixelId); return p && String(p.brandId) === String(bid); });
      return lr(items.map(shareWithRel));
    }
    if ((id = detailPath(base, '/api/pixel-shares'))) {
      const row = L().byId(SHARES, id);
      if (!row) throw new Error('Record not found');
      if (method === 'PUT') {
        const before = Object.assign({}, row);
        row.shareStatus = body.shareStatus;
        writeLog('UPDATE', 'pixelShares', id, { before: L().pub(before), after: L().pub(row) });
        return L().pub(row);
      }
      if (method === 'DELETE') return L().pub(softDelete(SHARES, id, { shareStatus: 'REVOKED' }, 'pixelShares'));
      return shareWithRel(row);
    }

    /* ---- users（手册 §8.1：字段白名单，永不返回密码） ---- */
    if (base === '/api/users') {
      if (method === 'POST') {
        if (!body.username || !String(body.username).trim()) throw new Error('username is required');
        if (!body.displayName) throw new Error('displayName is required');
        if (!body.password || String(body.password).length < 6) throw new Error('password must be at least 6 characters');
        const row = { id: nid(), username: String(body.username).trim(), displayName: body.displayName, permissions: body.permissions === undefined ? null : body.permissions, status: body.status || 'ACTIVE', createdAt: nowIso(), updatedAt: nowIso() };
        USERS.push(row);
        writeLog('CREATE', 'users', row.id, { after: L().pub(row) });
        return L().pub(row);
      }
      return lr(statusUsers(q).map(u => L().pub(u)));
    }
    if ((id = detailPath(base, '/api/users'))) {
      const row = L().byId(USERS, id);
      if (!row) throw new Error('User not found');
      if (method === 'PUT') {   // 真正的部分更新（照手册 §8.1）
        const before = Object.assign({}, row);
        if (typeof body.displayName === 'string') row.displayName = body.displayName.trim();
        if (typeof body.status === 'string') row.status = body.status;
        if (body.password && String(body.password).length < 6) throw new Error('password must be at least 6 characters');
        if ('permissions' in body) row.permissions = body.permissions == null ? null : body.permissions;
        row.updatedAt = nowIso();
        writeLog('UPDATE', 'users', id, { before: L().pub(before), after: L().pub(row), passwordChanged: !!body.password });
        return L().pub(row);
      }
      if (method === 'DELETE') return L().pub(softDelete(USERS, id, { status: 'INACTIVE' }, 'users'));
      return L().pub(row);
    }

    /* ---- action-logs ---- */
    if (base === '/api/action-logs') {
      let items = ACTION_LOGS.slice();
      const uid = q.get('user_id'), at = q.get('action_type'), et = q.get('entity_type'), from = q.get('from'), to = q.get('to');
      if (uid) items = items.filter(x => String(x.userId) === String(uid));
      if (at) items = items.filter(x => x.actionType === at);
      if (et) items = items.filter(x => x.entityType === et);
      if (from) items = items.filter(x => x.createdAt.slice(0, 10) >= from);
      if (to) items = items.filter(x => x.createdAt.slice(0, 10) <= to);
      return { items: items.slice(0, Number(q.get('limit') || 100)), meta: { page: 1, limit: 100, total: items.length } };
    }

    /* ---- rotation ---- */
    if (base === '/api/rotation/execute' && method === 'POST') return execBmRotation(body);
    if (base === '/api/rotation/execute-pixel' && method === 'POST') return execPixelRotation(body);

    /* ---- SOP ---- */
    if (base === '/api/sop/templates') {
      if (method === 'POST') {
        const row = { id: nid(), triggerType: body.triggerType, stepOrder: Number(body.stepOrder), title: body.title, description: body.description, isManual: String(body.isManual) !== 'false' };
        SOP_TEMPLATES.push(row);
        return Object.assign({}, row);
      }
      if (method === 'PUT') {
        const row = L().byId(SOP_TEMPLATES, body.id);
        if (!row) throw new Error('Record not found');
        Object.assign(row, { triggerType: body.triggerType, stepOrder: Number(body.stepOrder), title: body.title, description: body.description, isManual: String(body.isManual) !== 'false' });
        return Object.assign({}, row);
      }
      const tt = q.get('trigger_type');
      let items = SOP_TEMPLATES.slice().sort((a, b) => a.triggerType.localeCompare(b.triggerType) || a.stepOrder - b.stepOrder);
      if (tt && tt !== 'ALL') items = items.filter(t => t.triggerType === tt);
      return { items };   // 照手册：无分页无 meta
    }
    if (base === '/api/sop/instances') {
      if (method === 'PUT') {
        const row = L().byId(SOP_INSTANCES, body.id);
        if (!row) throw new Error('Record not found');
        const status = body.status || 'DONE';
        row.status = status;
        row.completedBy = status === 'DONE' ? 'you' : null;
        row.completedAt = status === 'DONE' ? nowIso() : null;
        return Object.assign({}, row);
      }
      const st = q.get('status'), tt = q.get('trigger_type');
      let items = SOP_INSTANCES.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.stepOrder - b.stepOrder);
      if (st && st !== 'ALL') items = items.filter(x => x.status === st);
      if (tt && tt !== 'ALL') items = items.filter(x => { const c = SOP_TEMPLATES.find(t => t.id === x.checklistId); return c && c.triggerType === tt; });
      return { items: items.slice(0, 200).map(sopWithRel) };
    }
    if (base === '/api/sop/detail') {   // MIS 便捷路由：一组实例（= /sop/[instanceId] 页的取数）
      const gid = q.get('id');
      return { items: SOP_INSTANCES.filter(x => String(x.triggeredBy) === String(gid) || String(x.id) === String(gid)).sort((a, b) => a.stepOrder - b.stepOrder).map(sopWithRel) };
    }

    /* ---- analytics ---- */
    if (base === '/api/analytics/accounts') return anAccounts(q);
    if (base === '/api/analytics/ads') return anAds(q);
    if (base.indexOf('/api/analytics/ads/') === 0 && base.slice(-7) === '/detail') {
      return anAdDetail(base.slice('/api/analytics/ads/'.length, -'/detail'.length));
    }
    if (base === '/api/analytics/brands') return anBrands(q);
    if (base === '/api/analytics/lifecycle') return anLifecycle();

    return undefined;   // 不认识 → 回落到 mis-meta-api.js 的基础路由
  }
  function statusUsers(q) {
    const s = q.get('status');
    return (s && s !== 'ALL') ? USERS.filter(u => u.status === s) : USERS;
  }

  return {
    route,
    sharesOfPixel: pid => SHARES.filter(s => String(s.pixelId) === String(pid)),
    tokensOfApp: aid => TOKENS.filter(t => String(t.appId) === String(aid)),
    _capiTypes: CAPI_TYPES, _permKeys: PERM_KEYS,
  };
})();
