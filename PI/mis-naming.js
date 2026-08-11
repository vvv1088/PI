/* =====================================================================
 * mis-naming.js — v73 广告命名引擎(素材实体连接·第 1 期)
 *
 * 命名契约(V 定):<market>_<brand>_<setting>_<format>_<ref>
 *   例:USC_WIKH_TRSA_IM_KH0201,衍生版 USC_WIKH_TRSA_IM_KH0201V2
 * 编号规则(V 定):ref = <市场2字母><假设批次2位><素材流水2位>;
 *   同一假设的素材共享前 4 位;同素材迭代 = 基码 + V 后缀。
 *
 * 第 1 期边界:对照表先以常量落在本文件(第 2 期迁入 Supabase:
 * brand_aliases 表 / dict_entries.short_code 列);生成结果写入 creatives
 * 现有的 ads_code 字段(fv-ads 输入框),不新增列;发号是"预览发号",
 * 正式发号(ref_batch 落库)在第 2 期。
 * ===================================================================== */
window.MISNaming = (function () {
  'use strict';

  /* MIS 的 creatives/hypos 是顶层 let(不在 window 上),用间接 eval 取词法全局 */
  function G(name) { try { const v = (0, eval)(name); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  /* ---------- 对照表(第 2 期迁 Supabase;修改需 V 确认) ---------- */

  /* 市场:MIS market 取值 → 广告名段 / ref 编号前缀。
   * 'KH' 是 MIS 存量数据里 USC 市场的旧写法(第 2 期做 KH→USC 迁移) */
  const MARKETS = {
    MY:  { seg: 'MYR', refPrefix: 'MY' },
    SG:  { seg: 'SGD', refPrefix: 'SG' },
    USC: { seg: 'USC', refPrefix: 'KH' },
    KH:  { seg: 'USC', refPrefix: 'KH' },   // legacy 别名 → USC
  };

  /* 品牌缩写(照系统 2 归因 CASE 表 15 行;V 已确认现役 4 个,其余 retired:
   * 只用于解析历史数据,永不参与生成) */
  const BRANDS = [
    { code: 'INZ9',       short: 'INZ9', status: 'active',  markets: ['MY', 'SG'] },
    { code: '17WINKH',    short: 'WIKH', status: 'active',  markets: ['USC'] },
    { code: 'OK188KH',    short: 'OK18', status: 'active',  markets: ['USC'] },
    { code: 'SBKH',       short: 'SBKH', status: 'active',  markets: ['USC'] },
    { code: '17WIN168',   short: 'W168', status: 'retired' },
    { code: 'OK888KH',    short: 'OK88', status: 'retired' },
    { code: 'SBKH99',     short: 'SB99', status: 'retired' },
    { code: 'LOY66',      short: 'LOY6', status: 'retired' },
    { code: 'KH778',      short: 'KH77', status: 'retired' },
    { code: 'KH888',      short: 'KH88', status: 'retired' },
    { code: 'HENG68KH',   short: 'HG68', status: 'retired' },
    { code: 'Diamond887', short: 'DM88', status: 'retired' },
    { code: 'CAM68',      short: 'CAM6', status: 'retired' },
    { code: 'CAM78',      short: 'CAM7', status: 'retired' },
    { code: 'UWKH',       short: 'UWKH', status: 'retired' },
  ];

  /* Ad Setting(V 定;TRSA 为现行默认,其余为 Meta 六大 objective 补齐) */
  const SETTINGS = [
    { code: 'TRSA', dictCode: 'SALES',      label: 'Sales' },
    { code: 'AWAR', dictCode: 'AWARENESS',  label: 'Awareness' },
    { code: 'TRFC', dictCode: 'TRAFFIC',    label: 'Traffic' },
    { code: 'ENGA', dictCode: 'ENGAGEMENT', label: 'Engagement' },
    { code: 'LEAD', dictCode: 'LEADS',      label: 'Leads' },
    { code: 'APPP', dictCode: 'APP_PROMO',  label: 'App Promotion' },
  ];

  /* Format(与 MIS 字典 1:1;IM/VD 为生产已用,CR/DC 为 V 确认新定) */
  const FORMATS = { IMAGE: 'IM', VIDEO: 'VD', CAROUSEL: 'CR', DCO: 'DC' };

  const bySh = {}, byCode = {}, fmtBySh = {};
  let settingCodes = [];
  function rebuild() {
    Object.keys(bySh).forEach(k => delete bySh[k]);
    Object.keys(byCode).forEach(k => delete byCode[k]);
    Object.keys(fmtBySh).forEach(k => delete fmtBySh[k]);
    BRANDS.forEach(b => { bySh[b.short] = b; byCode[b.code] = b; });
    Object.keys(FORMATS).forEach(k => { fmtBySh[FORMATS[k]] = k; });
    settingCodes = SETTINGS.map(s => s.code);
  }
  rebuild();

  /* ---------- 第 2 期起:库是权威,本文件常量是离线/mock fallback ----------
   * brand_aliases 表 + dict_entries(Format/Ad Setting 的 short_code)已建好,
   * 登录后从 Supabase 同步覆盖;拉不到(mock/离线/未登录)保持常量。 */
  let synced = false;
  async function syncFromDb() {
    if (synced) return;
    const db = (function () { try { return (0, eval)('typeof db!=="undefined"?db:null'); } catch (e) { return null; } })();
    if (!db || typeof db.from !== 'function') return;
    try {
      const ba = await db.from('brand_aliases').select('*');
      if (ba && Array.isArray(ba.data) && ba.data.length) {
        BRANDS.length = 0;
        ba.data.forEach(r => BRANDS.push({ code: r.code, short: r.short_code, status: r.status, markets: r.markets || [] }));
      }
      const ds = await db.from('dict_entries').select('tab,code,name,short_code,active,sort').in('tab', ['Format', 'Ad Setting']);
      if (ds && Array.isArray(ds.data) && ds.data.length) {
        const fmts = ds.data.filter(r => r.tab === 'Format' && r.active && r.short_code);
        if (fmts.length) { Object.keys(FORMATS).forEach(k => delete FORMATS[k]); fmts.forEach(r => { FORMATS[r.code] = r.short_code; }); }
        const sets = ds.data.filter(r => r.tab === 'Ad Setting' && r.active && r.short_code).sort((a, b) => (a.sort || 0) - (b.sort || 0));
        if (sets.length) { SETTINGS.length = 0; sets.forEach(r => SETTINGS.push({ code: r.short_code, dictCode: r.code, label: r.name })); }
      }
      rebuild();
      synced = true;
      try { if (typeof refreshMktBrands === 'function') refreshMktBrands(); } catch (e2) {}
    } catch (e) { /* 离线/mock:保持常量 */ }
  }
  setTimeout(syncFromDb, 2500);   // 登录后自动同步;fvGen 前也会再试一次

  /* ---------- 生成 ---------- */

  function buildAdName(p) {
    // p: {market, brandCode, setting, format, ref}
    const mk = MARKETS[p.market];
    if (!mk) return { error: '未知市场:' + p.market };
    const b = byCode[p.brandCode];
    if (!b) return { error: '未知品牌:' + p.brandCode };
    if (b.status !== 'active') return { error: '品牌已整合(retired),不能发新码:' + p.brandCode };
    if ((b.markets || []).indexOf(p.market === 'KH' ? 'USC' : p.market) < 0) return { error: b.code + ' 不投 ' + p.market + ' 市场' };
    if (settingCodes.indexOf(p.setting) < 0) return { error: '未知 setting:' + p.setting };
    const f = FORMATS[p.format];
    if (!f) return { error: '未知 format:' + p.format };
    if (!p.ref) return { error: '缺 ref code' };
    return { name: [mk.seg, b.short, p.setting, f, p.ref].join('_') };
  }

  /* ---------- 解析(严格新式 → 宽松存量) ---------- */

  const REF_RE = /^(KH|MY|SG)(\d{4,5})(V\d+)?$/;

  function parseAdName(name) {
    if (!name) return { ok: false, loose: false };
    const seg = String(name).trim().split('_');
    // 严格:5 段且逐段可认
    if (seg.length === 5) {
      const mkKey = Object.keys(MARKETS).find(k => MARKETS[k].seg === seg[0] && k !== 'KH');
      const b = bySh[seg[1]];
      const fm = fmtBySh[seg[3]];
      if (mkKey && b && settingCodes.indexOf(seg[2]) >= 0 && fm && REF_RE.test(seg[4])) {
        return { ok: true, loose: false, market: mkKey, brand: b.code, brandStatus: b.status, setting: seg[2], format: fm, ref: seg[4] };
      }
    }
    // 宽松:任意段里找品牌缩写(_XXXX_ 语义,同系统 2 CASE 表)+ 顺带找 format / ref
    const out = { ok: false, loose: true, market: null, brand: null, brandStatus: null, setting: null, format: null, ref: null };
    seg.forEach(s => {
      if (!out.brand && bySh[s]) { out.brand = bySh[s].code; out.brandStatus = bySh[s].status; }
      if (!out.market) { const mk = Object.keys(MARKETS).find(k => MARKETS[k].seg === s && k !== 'KH'); if (mk) out.market = mk; }
      if (!out.setting && settingCodes.indexOf(s) >= 0) out.setting = s;
      if (!out.format && fmtBySh[s]) out.format = fmtBySh[s];
      if (!out.ref && REF_RE.test(s)) out.ref = s;
    });
    out.ok = !!out.brand;   // 宽松模式下"能归到品牌"即算部分成功;ref 缺失仍会在素材归因里报未归因
    return out;
  }

  /* ---------- 发号(第 1 期为预览发号;正式 ref_batch 落库在第 2 期) ---------- */

  function refsInUse() {
    // 扫全部素材现有 ads code / ref 痕迹
    const used = [];
    G('creatives').forEach(c => {
      [c.ads, c.ref].forEach(v => {
        if (!v) return;
        String(v).split('_').forEach(s => { if (REF_RE.test(s)) used.push(s); });
        if (REF_RE.test(String(v))) used.push(String(v));
      });
    });
    return [...new Set(used)];
  }

  function provisionalRef(market, hypId) {
    const mk = MARKETS[market];
    if (!mk) return null;
    const pre = mk.refPrefix;
    const used = refsInUse().filter(r => r.indexOf(pre) === 0);
    // 同假设兄弟素材已有 ref → 复用其批次,流水 +1
    const sib = [];
    G('creatives').forEach(c => {
      if (!hypId || !(c.hyp || '').startsWith(hypId)) return;
      [c.ads, c.ref].forEach(v => {
        String(v || '').split('_').forEach(s => { const m = s.match(REF_RE); if (m && m[1] === pre) sib.push(s); });
      });
    });
    if (sib.length) {
      const batch = sib[0].slice(2, 4);
      const serials = used.filter(r => r.slice(2, 4) === batch).map(r => Number(r.slice(4, 6)) || 0);
      const next = (serials.length ? Math.max.apply(null, serials) : 0) + 1;
      return pre + batch + String(next).padStart(2, '0');
    }
    // 新假设 → 该市场下一个未用批次号
    const batches = used.map(r => Number(r.slice(2, 4)) || 0);
    const nb = (batches.length ? Math.max.apply(null, batches) : 0) + 1;
    return pre + String(nb).padStart(2, '0') + '01';
  }

  /* v76:正式发号 —— 建素材时调用,批次优先用 hyp.refBatch(已落库的),
   * 没有则在该市场内分配下一个批次(同时看已用 ref 和其他假设已领的 ref_batch)。
   * 返回 {batch, refs:[...count 个连续 ref]};唯一性由 creatives.ref_code 唯一索引兜底。 */
  function officialRefs(hyp, count) {
    const mk = MARKETS[hyp.market || 'USC'];
    if (!mk || !count || count < 1) return null;
    const pre = mk.refPrefix;
    const used = refsInUse().filter(r => r.indexOf(pre) === 0);
    let batch = hyp.refBatch || null;
    if (!batch) {
      const taken = used.map(r => Number(r.slice(2, 4)) || 0);
      G('hypos').forEach(h => {
        const hm = MARKETS[h.market || 'USC'];
        if (hm && hm.refPrefix === pre && h.refBatch) taken.push(Number(h.refBatch) || 0);
      });
      batch = String((taken.length ? Math.max.apply(null, taken) : 0) + 1).padStart(2, '0');
    }
    const serials = used.filter(r => r.slice(2, 4) === batch).map(r => Number(r.slice(4, 6)) || 0);
    let next = (serials.length ? Math.max.apply(null, serials) : 0);
    const refs = [];
    for (let i = 0; i < count; i++) { next++; refs.push(pre + batch + String(next).padStart(2, '0')); }
    return { batch, refs };
  }

  /* ---------- Creative 表单集成(fv-ads 的「生成」按钮) ---------- */

  function genForCreative(i) {
    const c = G('creatives')[i];
    if (!c) return { error: '找不到素材' };
    const h = G('hypos').find(x => (c.hyp || '').startsWith(x.id));
    if (!h) return { error: '素材没挂 hypothesis,先在假设里建素材' };
    const market = h.market || 'USC';
    const format = (c.format || c.fmt || '').toUpperCase();
    if (!FORMATS[format]) return { error: '素材 Format=' + (format || '空') + ' 不在字典(IMAGE/VIDEO/CAROUSEL/DCO)' };
    // v76:优先用素材已正式领取的 ref_code;没有(存量素材)才临时发号
    const ref = c.ref || provisionalRef(market, h.id);
    if (!ref) return { error: '市场 ' + market + ' 无法发号' };
    // setting:假设上选的 Ad Setting(字典 code → 短码);拿不到回落 TRSA
    let setting = 'TRSA';
    if (h.adSetting) { const hit = SETTINGS.find(s => s.dictCode === h.adSetting || s.code === h.adSetting); if (hit) setting = hit.code; }
    const r = buildAdName({ market, brandCode: h.brand, setting, format, ref });
    if (r.error) return r;
    return { name: r.name, parts: { market, brand: h.brand, setting, format, ref, official: !!c.ref } };
  }

  /* v78:三层归因 —— 广告名 → 素材(过渡期方案的正式落地)。
   *   第 1 层:严格解析出 ref code,按 ref 精确匹配素材(新广告);
   *   第 2 层:广告名与素材登记的 ads_code 整串精确匹配(旧 ongoing 广告,登记制);
   *   第 3 层:宽松解析只归到品牌(到不了素材,进未归因清单);
   *   全失败:tier 0。
   * 数据源:live/demo 用 MIS 的 creatives/hypos 数组;mock 用 MIS_MOCK 的素材注册表。 */
  function resolveCreative(adName) {
    const name = String(adName || '').trim();
    if (!name) return { tier: 0 };
    const p = parseAdName(name);
    /* mock 模式(含 demo)必须配 mock 花费数据用 mock 注册表,否则两边对不上;
     * live 模式用 MIS 真素材表(ref_code 已正式发号) */
    const mockMode = !!(window.MIS_META && MIS_META.mode === 'mock' && window.MIS_MOCK);
    if (mockMode) {
      try {
        const reg = MIS_MOCK.route('/api/mis/creative-registry', {});
        let c = null, tier = 0;
        if (p.ref) { c = reg.creatives.find(x => x.ref && (x.ref === p.ref || p.ref.indexOf(x.ref) === 0)); if (c) tier = 1; }
        if (!c) { c = reg.creatives.find(x => x.ads && String(x.ads).trim() === name); if (c) tier = 2; }
        if (c) return { tier, gen: c.gen, label: c.label || '', hyp: c.hyp, brand: c.brand };
      } catch (e) {}
    } else {
      const cs = G('creatives'), hs = G('hypos');
      let c = null, tier = 0;
      if (p.ref) { c = cs.find(x => x.ref && (x.ref === p.ref || p.ref.indexOf(x.ref) === 0)); if (c) tier = 1; }
      if (!c) { c = cs.find(x => x.ads && String(x.ads).trim() === name); if (c) tier = 2; }
      if (c) {
        const h = hs.find(x => (c.hyp || '').startsWith(x.id));
        return { tier, gen: c.gen, label: c.label || '', hyp: h ? h.id : (c.hyp || '').split(' ')[0], brand: h ? h.brand : (p.brand || '') };
      }
    }
    if (p.brand) return { tier: 3, brand: p.brand, brandStatus: p.brandStatus };
    return { tier: 0 };
  }

  /* v77:换版(衍生版)投放名 —— 基码 + V{版本号}。基码优先用素材现有 ads code
   * (严格新式才可续),否则现场生成;旧 V 后缀先剥掉再加新号。 */
  function versionName(i) {
    const c = G('creatives')[i];
    if (!c) return null;
    const vn = (c.versions || []).length + 1;
    let base = null;
    if (c.ads) { const p = parseAdName(c.ads); if (p.ok && !p.loose) base = String(c.ads).trim(); }
    if (!base) { const g = genForCreative(i); if (g.error) return null; base = g.name; }
    return base.replace(/V\d+$/, '') + 'V' + vn;
  }

  async function fvGen(i) {
    await syncFromDb();
    const r = genForCreative(i);
    const note = document.getElementById('fv-adsnote');
    if (r.error) { if (typeof toast === 'function') toast('生成失败:' + r.error); if (note) note.textContent = '⚠ ' + r.error; return; }
    const inp = document.getElementById('fv-ads');
    if (inp) inp.value = r.name;
    if (note) note.textContent = '已生成(预览发号,正式发号第 2 期):市场 ' + r.parts.market + ' · ' + r.parts.brand + ' · ' + r.parts.setting + ' · ' + r.parts.format + ' · ref ' + r.parts.ref;
  }

  return { MARKETS, BRANDS, SETTINGS, FORMATS, buildAdName, parseAdName, provisionalRef, officialRefs, genForCreative, fvGen, versionName, resolveCreative, syncFromDb };
})();
