/* =====================================================================
 * mis-meta-api.js — Meta Ads 系统（系统 2）数据层封装 + mock
 * v70 新增。所有 PERFORMANCE / ASSETS 页面只经 metaApi() 取数。
 *
 * 切换真实接口（接入改造部署后）只改下面 MIS_META 三行：
 *   mode  : 'mock' → 'live'
 *   token : 填 Jayden 发的 service token
 *   （baseUrl 一般不用动）
 * ===================================================================== */

window.MIS_META = {
  mode: 'mock',                                // 'mock' | 'live'
  baseUrl: 'https://meta-ads.ohmediaa.com',    // 系统 2 生产域名
  token: '',                                   // MIS service token（Bearer）
  allowRemarkEdit: false,                      // 与后端 MIS_ALLOW_REMARK_PUT 同步
  allowMetaWrite: false,                       // v79:live 写总开关(P1 token 只读;P2 开写时置 true)
};

/* v79:Meta 侧写操作统一闸门 —— mock 随便玩;live 必须 allowMetaWrite */
function misMetaWritable() {
  if (window.MIS_META.mode === 'mock') return true;
  if (!window.MIS_META.allowMetaWrite) {
    if (typeof toast === 'function') toast('live 接入初期 token 只读(P1),写操作待 P2 开放');
    return false;
  }
  return true;
}

/* ---------- 统一取数入口 ---------- */
async function metaApi(path, opts) {
  opts = opts || {};
  if (window.MIS_META.mode === 'mock') {
    await new Promise(r => setTimeout(r, 120));         // 模拟网络延迟
    return MIS_MOCK.route(path, opts);
  }
  const res = await fetch(window.MIS_META.baseUrl + path, {
    method: opts.method || 'GET',
    headers: Object.assign(
      { Authorization: 'Bearer ' + window.MIS_META.token },
      opts.body ? { 'Content-Type': 'application/json' } : {}
    ),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({ success: false, error: 'HTTP ' + res.status }));
  if (!json.success) throw new Error(json.error || ('HTTP ' + res.status));
  return json.data;
}

/* ---------- 视图懒加载调度：包一层 go()，首次进入视图才拉数 ---------- */
window.MIS_MODULES = {
  _loaders: {}, _loaded: {},
  register(viewId, loader) { this._loaders[viewId] = loader; },
  onView(v) {
    const fn = this._loaders[v];
    if (!fn || this._loaded[v]) return;
    this._loaded[v] = true;
    Promise.resolve(fn()).catch(e => {
      this._loaded[v] = false;
      console.error('[MIS_MODULES]', v, e);
      if (typeof toast === 'function') toast('数据加载失败：' + (e.message || e));
    });
  },
  reload(v) { this._loaded[v] = false; this.onView(v); },
};
(function wrapGo() {
  const orig = window.go;
  if (typeof orig !== 'function') return;
  window.go = function (v, el) { orig(v, el); try { MIS_MODULES.onView(v); } catch (e) { console.error(e); } };
})();

/* ---------- 小工具 ---------- */
function misMoney(n) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function misInt(n) { return (Number(n) || 0).toLocaleString('en-US'); }
function misDateISO(d) { return d.toISOString().slice(0, 10); }

/* =====================================================================
 * MOCK 数据 —— 响应结构严格对齐 06-API接口手册：
 *   资源列表：{ items:[...], meta:{page,limit,total} }
 *   spending：{ rows, lines, page, pageSize, total, totalPages,
 *               totalsByDate, totalsByLine, grandTotal }
 *   health / rotation logs：{ items, meta }
 *   序列化规则同生产：bigint→字符串、时间→ISO UTC 字符串
 * BO 侧（FD/D7）走占位路径 /api/mis/bo-daily —— 真通道等 D 节拍板。
 * ===================================================================== */
window.MIS_MOCK = (function () {
  /* 基础实体（v71 起补齐 06 手册的完整响应形状：createdAt/updatedAt、关联对象、
   * _count、健康虚拟字段 lastHealthResult / lastHealthCheckedAt）。
   * 关联对象（brand / businessManager / sourceBm / brandLinks）由文件末尾的
   * link() 统一装配，保证同一份数据改一处全联动。 */
  const BRANDS = [
    { id: '1', code: 'INZ9',    name: 'INZ9',    status: 'ACTIVE', createdAt: '2026-05-20T03:11:02.000Z', updatedAt: '2026-08-01T09:22:41.000Z' },
    { id: '2', code: '17WINKH', name: '17WINKH', status: 'ACTIVE', createdAt: '2026-05-22T06:40:11.000Z', updatedAt: '2026-07-28T02:15:09.000Z' },
    { id: '3', code: 'OK188KH', name: 'OK188KH', status: 'ACTIVE', createdAt: '2026-06-02T08:02:55.000Z', updatedAt: '2026-08-05T04:41:30.000Z' },
    { id: '4', code: 'SBKH',    name: 'SBKH',    status: 'ACTIVE', createdAt: '2026-06-15T09:12:00.000Z', updatedAt: '2026-08-03T07:03:12.000Z' },
  ];

  // pixels：品牌 × 轮转槽位（含缺口与 BANNED，用于 Health 网格演示）
  const PIXELS = [
    { id: '1', pixelId: '3967571086707308', name: 'INZ9 MAIN',    brandId: '1', bmId: '1', role: 'MAIN',    status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '2', pixelId: '2098178417422643', name: 'INZ9 BK1',     brandId: '1', bmId: '2', role: 'BACKUP1', status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '3', pixelId: '2089143635365842', name: 'INZ9 BK2',     brandId: '1', bmId: '3', role: 'BACKUP2', status: 'BANNED',   lastHealthResult: 'FAILED' },
    { id: '4', pixelId: '1894682871205960', name: '17WINKH MAIN', brandId: '2', bmId: '1', role: 'MAIN',    status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '5', pixelId: '1541072834181233', name: '17WINKH BK1',  brandId: '2', bmId: '2', role: 'BACKUP1', status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '6', pixelId: '1522481359629782', name: 'OK188KH MAIN', brandId: '3', bmId: '1', role: 'MAIN',    status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '7', pixelId: '1453765586510715', name: 'OK188KH BK1',  brandId: '3', bmId: '2', role: 'BACKUP1', status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '8', pixelId: '1398447364748544', name: 'OK188KH BK2',  brandId: '3', bmId: '3', role: 'BACKUP2', status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '9', pixelId: '978513741233618',  name: 'SBKH MAIN',    brandId: '4', bmId: '1', role: 'MAIN',    status: 'ACTIVE',   lastHealthResult: 'OK' },
    { id: '10', pixelId: '787560624437384', name: 'SBKH BK2',     brandId: '4', bmId: '3', role: 'BACKUP2', status: 'DISABLED', lastHealthResult: null },
  ];

  const BMS = [
    { id: '1', bmId: '279332367',        name: 'Modiva (Pixel MAIN)',      bmType: 'PIXEL',           brandId: null, role: 'MAIN',    status: 'ACTIVE', healthCheckedAt: null, lastHealthResult: 'OK' },
    { id: '2', bmId: '27737120635942298', name: 'JAGI BIJOUX (Pixel BK1)', bmType: 'PIXEL',           brandId: null, role: 'BACKUP1', status: 'ACTIVE', healthCheckedAt: null, lastHealthResult: 'OK' },
    { id: '3', bmId: '27935644296025182', name: 'Jennifer.estudio (BK2)',  bmType: 'PIXEL',           brandId: null, role: 'BACKUP2', status: 'BANNED', healthCheckedAt: null, lastHealthResult: 'FAILED' },
    { id: '4', bmId: '2385330728609220',  name: 'Adstify Graph API',       bmType: 'GRAPH_API',       brandId: null, role: null,      status: 'ACTIVE', healthCheckedAt: null, lastHealthResult: 'OK' },
    { id: '5', bmId: '992331220507779',   name: 'Adstify Custom Audience', bmType: 'CUSTOM_AUDIENCE', brandId: null, role: null,      status: 'ACTIVE', healthCheckedAt: null, lastHealthResult: 'FAILED' },
  ];

  /* 06 手册 §3.5：广告账户经 brandLinks（brand_ad_accounts 多对多）挂品牌，
   * v70 曾用简化的 brands 数组 —— v71 改为手册原形状。sourceBmId 指配置库 BM 主键。 */
  const AD_ACCOUNTS = [
    { id: '1', adAccountId: '1998765220809792', name: 'INZ9-ACC-01',  sourceBmId: '4', status: 'ACTIVE',   _brandIds: ['1'] },
    { id: '2', adAccountId: '1381086713963776', name: 'WIKH-ACC-02',  sourceBmId: '4', status: 'ACTIVE',   _brandIds: ['2'] },
    { id: '3', adAccountId: '980775378318327',  name: 'OK188-ACC-01', sourceBmId: '4', status: 'ACTIVE',   _brandIds: ['3'] },
    { id: '4', adAccountId: '992331220507779',  name: 'SBKH-ACC-03',  sourceBmId: '4', status: 'ACTIVE',   _brandIds: ['4'] },
    { id: '5', adAccountId: '884213600771125',  name: 'INZ9-ACC-00',  sourceBmId: '4', status: 'BANNED',   _brandIds: ['1'] },
    { id: '6', adAccountId: '771025448896031',  name: 'WIKH-ACC-01',  sourceBmId: null, status: 'DISABLED', _brandIds: ['2'] },
    { id: '7', adAccountId: '663311708852219',  name: 'USC-MIX-01',   sourceBmId: null, status: 'DISABLED', _brandIds: ['3', '4'] },
  ];

  const APPS = [
    { id: '1', appId: '77103312269', appName: 'Adstify Events',  appSecret: 'a1f83d0c9e2b447d8f5a6c1b0d9e8f7a', mode: 'PUBLISHED',   status: 'ACTIVE' },
    { id: '2', appId: '77103391410', appName: 'Adstify Backup',  appSecret: 'b2e94e1daf3c558e906b7d2c1eaf908b', mode: 'DEVELOPMENT', status: 'ACTIVE' },
  ];

  /* --- 闭环演示：素材注册表（真实版来自 Supabase creatives，ref code 即 join 键） --- */
  const CREATIVES = [
    /* 登记制示例:旧 ongoing 广告不改名,把现名登记进 ads 字段 → 三层归因第 2 层整串匹配 */
    { ref: null, ads: 'USC_WIKH_TRSA_VD_2473_KH02', gen: 'AD-WIKH-012', hyp: 'H-2608-03', label: '旧广告 · 登记名归因', brand: '17WINKH' },
    { ref: 'KH0201', gen: 'AD-WIKH-041', hyp: 'H-2608-03', label: '真人证言 · 提现快', brand: '17WINKH' },
    { ref: 'KH0202', gen: 'AD-WIKH-042', hyp: 'H-2608-03', label: '真人证言 · 大奖',   brand: '17WINKH' },
    { ref: 'KH0310', gen: 'AD-OK-055',   hyp: 'H-2608-05', label: '游戏实录 · 捕鱼',   brand: 'OK188KH' },
    { ref: 'MY1101', gen: 'AD-INZ9-101', hyp: 'H-2608-01', label: 'UGC · 首充翻倍',    brand: 'INZ9' },
    { ref: 'MY1102', gen: 'AD-INZ9-102', hyp: 'H-2608-01', label: 'UGC · 免费旋转',    brand: 'INZ9' },
    { ref: 'MY1201', gen: 'AD-INZ9-110', hyp: 'H-2608-02', label: '官方设计 · VIP 返水', brand: 'INZ9' },
  ];
  const HYPS = {
    'H-2608-01': { brand: 'INZ9',    statement: 'UGC 素材对新客 FD 成本优于官方设计' },
    'H-2608-02': { brand: 'INZ9',    statement: 'VIP 返水主张能拉高 D7 留存价值' },
    'H-2608-03': { brand: '17WINKH', statement: '真人证言在 KH 市场降低首充门槛' },
    'H-2608-05': { brand: 'OK188KH', statement: '捕鱼实录素材吸引高价值玩家' },
  };

  /* --- spending：近 14 天，广告名尾段带 ref code（与实际命名契约一致） --- */
  const LINES = ['LINE-A', 'LINE-B', 'LINE-C'];
  const BRAND_SHORT = { INZ9: 'INZ9', '17WINKH': 'WIKH', OK188KH: 'OK18', SBKH: 'SBKH' };
  /* 只有带 ref 的素材才生成自己的花费行;登记名素材(ref=null)的花费走脏名演示行 */
  const ADS = CREATIVES.filter(c => c.ref).map((c, i) => ({
    ad_name: (c.brand === 'INZ9' ? 'MYR_' : 'USC_') + (BRAND_SHORT[c.brand] || c.brand.slice(0, 4)) + '_TRSA_IM_' + c.ref,
    ref: c.ref, brand: c.brand, line: LINES[i % LINES.length], base: 18 + (i * 7) % 30,
  }));
  const days = [];
  (function () {
    const today = new Date(); // 仅用于 mock 生成近 14 天日期
    for (let i = 13; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); days.push(misDateISO(d)); }
  })();
  const SPEND_ROWS = [];
  days.forEach((date, di) => {
    ADS.forEach((ad, ai) => {
      const wave = 1 + 0.35 * Math.sin((di + ai * 2) / 2.6);
      const spending = Math.round(ad.base * wave * 100) / 100;
      SPEND_ROWS.push({
        date, ad_name: ad.ad_name, line: ad.line, spending,
        remark: (di === 5 && ai === 1) ? '与 PBI 差 0.4，账户时区问题' : null,
        remark_by: (di === 5 && ai === 1) ? 'finance' : null,
        _brand: ad.brand, _ref: ad.ref,   // mock 内部用（live 模式由命名解析）
      });
    });
    /* v73:混入 2 条命名不规范的行(形态照生产实测的脏名),
     * 供闭环/Spending 页演示「未归因广告」告警 —— 生产 27.7% 广告因此隐形 */
    if (di % 5 === 2) {
      SPEND_ROWS.push({ date, ad_name: 'TRSA_IM_AMB1_CN07', line: 'null', spending: 6.4, remark: null, remark_by: null, _brand: null, _ref: null });
      SPEND_ROWS.push({ date, ad_name: 'USC_WIKH_TRSA_VD_2473_KH02', line: 'LINE-B', spending: 9.1, remark: null, remark_by: null, _brand: '17WINKH', _ref: null });
      /* 整合前品牌(SB99=SBKH99, retired)的历史行 —— 演示「已整合」标记(方案 A) */
      SPEND_ROWS.push({ date, ad_name: 'USC_SB99_TRSA_VD_KH9901', line: 'LINE-C', spending: 4.2, remark: null, remark_by: null, _brand: null, _ref: null });
    }
  });

  /* --- BO（FD/D7）：按 日期×ref 生成，与花费走势弱相关 --- */
  const BO_ROWS = [];
  days.forEach((date, di) => {
    ADS.forEach((ad, ai) => {
      const spend = SPEND_ROWS.find(r => r.date === date && r._ref === ad.ref).spending;
      const fd = Math.max(0, Math.round(spend / (9 + (ai % 4) * 3) + ((di + ai) % 3) - 1));
      BO_ROWS.push({
        date, brand: ad.brand, ref_code: ad.ref,
        fd_count: fd,
        fd_amount: Math.round(fd * (14 + (ai % 5) * 6) * 100) / 100,
        d7_amount: Math.round(fd * (22 + ((ai + di) % 4) * 9) * 100) / 100,
      });
    });
  });

  /* --- health / rotation ---
   * checkResult 枚举照 schema：OK / FAILED（v70 mock 曾误写 PASSED，v71 修正） */
  const HEALTH = [];
  days.slice(-7).forEach((date, i) => {
    HEALTH.push({ id: String(9000 + i * 3), entityType: 'TOKEN', entityId: '3', checkResult: 'OK', errorDetail: null, checkedAt: date + 'T00:03:02.000Z' });
    HEALTH.push({ id: String(9001 + i * 3), entityType: 'PIXEL', entityId: '3', checkResult: i >= 5 ? 'FAILED' : 'OK', errorDetail: i >= 5 ? 'Pixel is unavailable (code 100)' : null, checkedAt: date + 'T00:03:10.000Z' });
    HEALTH.push({ id: String(9002 + i * 3), entityType: 'BM', entityId: '3', checkResult: 'FAILED', errorDetail: 'Request failed with status code 403', checkedAt: date + 'T00:03:18.000Z' });
  });
  const ROTATION = [
    { id: '41', entityType: 'BM',    entityId: '3', brandId: null, oldRole: 'MAIN',    newRole: null,      oldStatus: 'ACTIVE', newStatus: 'BANNED', reason: 'BM 被 Meta 封禁，触发轮转', operator: 'admin', createdAt: days[10] + 'T03:13:00.000Z' },
    { id: '42', entityType: 'BM',    entityId: '2', brandId: null, oldRole: 'BACKUP1', newRole: 'MAIN',    oldStatus: 'ACTIVE', newStatus: 'ACTIVE', reason: '递补 MAIN', operator: 'admin', createdAt: days[10] + 'T03:13:01.000Z' },
    { id: '43', entityType: 'PIXEL', entityId: '3', brandId: '1',  oldRole: 'BACKUP2', newRole: null,      oldStatus: 'ACTIVE', newStatus: 'BANNED', reason: 'INZ9 BK2 pixel 被封', operator: 'admin', createdAt: days[6] + 'T08:41:00.000Z' },
    { id: '44', entityType: 'AD_ACCOUNT', entityId: '5', brandId: '1', oldRole: null, newRole: null, oldStatus: 'ACTIVE', newStatus: 'BANNED', reason: '广告账户封禁', operator: 'admin', createdAt: days[3] + 'T02:22:00.000Z' },
  ];

  /* ---------- 关联装配（列表/详情共用，手册的 listInclude 语义） ---------- */
  const byId = (arr, id) => arr.find(x => String(x.id) === String(id)) || null;
  function pub(o) {           // 去掉 mock 内部字段（_ 前缀）
    const r = {};
    Object.keys(o).forEach(k => { if (k[0] !== '_') r[k] = o[k]; });
    return r;
  }
  function linkBrand(b) {
    return Object.assign(pub(b), {
      _count: {
        businessManagers: BMS.filter(m => String(m.brandId) === String(b.id)).length,
        pixels: PIXELS.filter(p => String(p.brandId) === String(b.id)).length,
        adAccountLinks: AD_ACCOUNTS.filter(a => (a._brandIds || []).includes(String(b.id))).length,
      },
    });
  }
  function linkBm(m) {
    return Object.assign(pub(m), { brand: m.brandId ? pub(byId(BRANDS, m.brandId) || {}) : null });
  }
  function linkPixel(p) {
    const shares = (window.MIS_MOCK_ADMIN ? MIS_MOCK_ADMIN.sharesOfPixel(p.id) : []);
    return Object.assign(pub(p), {
      brand: p.brandId ? pub(byId(BRANDS, p.brandId) || {}) : null,
      businessManager: p.bmId ? pub(byId(BMS, p.bmId) || {}) : null,
      _count: { pixelShares: shares.length },
    });
  }
  function linkAccount(a) {
    return Object.assign(pub(a), {
      brandLinks: (a._brandIds || []).map((bid, i) => ({
        id: a.id + '0' + i, brandId: bid, adAccountId: a.id,
        createdAt: a.createdAt || '2026-06-01T00:00:00.000Z', updatedAt: a.updatedAt || '2026-06-01T00:00:00.000Z',
        brand: pub(byId(BRANDS, bid) || {}),
      })),
      sourceBm: a.sourceBmId ? pub(byId(BMS, a.sourceBmId) || {}) : null,
    });
  }
  function linkApp(ap) {
    const tokens = (window.MIS_MOCK_ADMIN ? MIS_MOCK_ADMIN.tokensOfApp(ap.id) : []);
    return Object.assign(pub(ap), { _count: { systemUserTokens: tokens.length } });
  }

  /* ---------- 路由 ---------- */
  function listResp(items) { return { items, meta: { page: 1, limit: 100, total: items.length } }; }
  function parseQ(path) {
    const i = path.indexOf('?');
    return { base: i < 0 ? path : path.slice(0, i), q: new URLSearchParams(i < 0 ? '' : path.slice(i + 1)) };
  }
  function statusFilter(items, q, field) {
    const v = q.get(field || 'status');
    return (v && v !== 'ALL') ? items.filter(x => x[field || 'status'] === v) : items;
  }

  /* v71：管理页 mock 扩展挂在 mis-meta-admin-mock.js（MIS_MOCK_ADMIN.route），
   * 这里先问扩展，扩展不认识的路径再走本文件的基础路由。 */
  function route(path, opts) {
    const { base, q } = parseQ(path);

    if (window.MIS_MOCK_ADMIN) {
      const r = MIS_MOCK_ADMIN.route(base, q, opts || {});
      if (r !== undefined) return r;
    }

    if (base === '/api/brands') return listResp(statusFilter(BRANDS, q).map(linkBrand));
    if (base === '/api/pixels') {
      let items = statusFilter(PIXELS, q);
      const bid = q.get('brand_id'), role = q.get('role');
      if (bid && bid !== 'ALL') items = items.filter(p => String(p.brandId) === String(bid));
      if (role && role !== 'ALL') items = items.filter(p => p.role === role);
      return listResp(items.map(linkPixel));
    }
    if (base === '/api/business-managers') {
      let items = statusFilter(BMS, q);
      const t = q.get('bm_type'), bid = q.get('brand_id');
      if (t && t !== 'ALL') items = items.filter(m => m.bmType === t);
      if (bid && bid !== 'ALL') items = items.filter(m => String(m.brandId) === String(bid));
      return listResp(items.map(linkBm));
    }
    if (base === '/api/ad-accounts') {
      let items = statusFilter(AD_ACCOUNTS, q);
      const bid = q.get('brand_id');
      if (bid && bid !== 'ALL') items = items.filter(a => (a._brandIds || []).includes(String(bid)));
      return listResp(items.map(linkAccount));
    }
    if (base === '/api/developer-apps') return listResp(statusFilter(APPS, q).map(linkApp));

    if (base === '/api/health') {
      const items = HEALTH.slice().sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
      return { items: items.slice(0, Number(q.get('limit') || 50)), meta: { page: 1, limit: 50, total: items.length } };
    }
    if (base === '/api/rotation/logs') {
      const et = q.get('entity_type');
      let items = ROTATION.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (et && et !== 'ALL') items = items.filter(r => r.entityType === et);
      return { items, meta: { page: 1, limit: 50, total: items.length } };
    }

    if (base === '/api/analytics/spending') {
      const from = q.get('from') || days[0], to = q.get('to') || days[days.length - 1];
      const line = q.get('line'), search = (q.get('search') || '').toLowerCase();
      let rows = SPEND_ROWS.filter(r => r.date >= from && r.date <= to);
      if (line && line !== 'ALL') rows = rows.filter(r => r.line === line);
      if (search) rows = rows.filter(r => r.ad_name.toLowerCase().includes(search));
      const grandTotal = rows.reduce((s, r) => s + r.spending, 0);
      const byDate = {}, byLine = {};
      rows.forEach(r => { byDate[r.date] = (byDate[r.date] || 0) + r.spending; byLine[r.line || '-'] = (byLine[r.line || '-'] || 0) + r.spending; });
      const psRaw = q.get('pageSize') || '50';
      const pageSize = psRaw === 'all' ? rows.length : Number(psRaw);
      const page = Number(q.get('page') || 1);
      const sorted = rows.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.line || '').localeCompare(b.line || '') || a.ad_name.localeCompare(b.ad_name));
      return {
        rows: sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
          .map(r => ({ date: r.date, ad_name: r.ad_name, line: r.line, spending: r.spending, remark: r.remark, remark_by: r.remark_by })),
        lines: LINES.slice(), page, pageSize: psRaw === 'all' ? 'all' : pageSize,
        total: rows.length, totalPages: psRaw === 'all' ? 1 : Math.max(1, Math.ceil(rows.length / pageSize)),
        totalsByDate: Object.keys(byDate).sort().map(d => ({ date: d, total: Math.round(byDate[d] * 100) / 100 })),
        totalsByLine: Object.keys(byLine).sort().map(l => ({ line: l, total: Math.round(byLine[l] * 100) / 100 })),
        grandTotal: Math.round(grandTotal * 100) / 100,
      };
    }

    if (base === '/api/analytics/spending/remark' && (opts.method === 'PUT')) {
      const b = opts.body || {};
      const row = SPEND_ROWS.find(r => r.date === b.date && r.ad_name === b.ad_name);
      if (row) { row.remark = b.remark || null; row.remark_by = b.remark ? 'you' : null; }
      return { updated: true };
    }

    /* BO 占位通道 —— 真实实现等对接清单 D 节拍板（新接口或 n8n webhook） */
    if (base === '/api/mis/bo-daily') {
      const from = q.get('from') || days[0], to = q.get('to') || days[days.length - 1];
      const brand = q.get('brand');
      let rows = BO_ROWS.filter(r => r.date >= from && r.date <= to);
      if (brand && brand !== 'ALL') rows = rows.filter(r => r.brand === brand);
      return { rows };
    }

    /* 素材注册表（真实版来自 Supabase creatives 表，此处 mock 便于闭环页独立开发） */
    if (base === '/api/mis/creative-registry') return { creatives: CREATIVES, hypotheses: HYPS };

    throw new Error('mock 未实现该路径: ' + base);
  }

  /* 暴露内部数据给管理页 mock 扩展（同一份数据，写操作全联动） */
  return {
    route, _days: days,
    _data: { BRANDS, PIXELS, BMS, AD_ACCOUNTS, APPS, HEALTH, ROTATION, SPEND_ROWS },
    _link: { brand: linkBrand, bm: linkBm, pixel: linkPixel, account: linkAccount, app: linkApp, pub, byId, listResp },
  };
})();
