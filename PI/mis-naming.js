/* =====================================================================
 * mis-naming.js — v81 广告命名引擎(终版 7 段结构,V 2026-08-12 拍板)
 *
 * 命名契约:<市场>_<品牌>_<设定>_<格式>_<维度>_<内容>_<编号>
 *   例:USC_OK18_SA_VD_HK_WD_001,优化重投 USC_OK18_SA_VD_HK_WD_001V2
 *   市场   USC/MY/SG(留市场段,V 定:INZ9 双市场靠它区分)
 *   设定   Ad Setting 2 字母短码(SA/AW/TF/EN/LD/AP)
 *   格式   MIS Format 字典短码(IM/VD/CR/DC;GIF 不再出现,V 定)
 *   维度   本条假设测的维度 2 字母(FM/HK/VS/OF/GT/PS/AG,兜底 GN,V 定)
 *   内容   该维度词条的字典短码(dict_entries.short_code)
 *   编号   素材流水 3 位,按「品牌×内容」全局递增(防跨假设撞名);
 *          同批建的素材自然连号;优化重投加 V2/V3(越大越新)
 * 唯一性走方案一(登记制):生成即把全名登记进 creatives(ads_code/ref_code),
 * 闭环归因靠登记表;绕过系统手动改名的落品牌层进未归因清单。
 *
 * 解析三代同堂:v2=新 7 段;v1=过渡期 5 段(USC_WIKH_TRSA_IM_KH0201);
 * 历史 6 段(USC_WIKH_TRSA_VD_SLT2_KH03)走宽松解析归品牌。老广告永不改名。
 * ===================================================================== */
window.MISNaming = (function () {
  'use strict';

  /* MIS 的 creatives/hypos 是顶层 let(不在 window 上),用间接 eval 取词法全局 */
  function G(name) { try { const v = (0, eval)(name); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  /* ---------- 对照表(库是权威,常量为离线/mock fallback) ---------- */

  const MARKETS = {
    MY:  { seg: 'MY' },
    SG:  { seg: 'SG' },
    USC: { seg: 'USC' },
    KH:  { seg: 'USC' },   // legacy 别名 → USC(存量数据读侧)
  };
  const LEGACY_MARKET_SEG = { MYR: 'MY', SGD: 'SG' };   // v73–v76 过渡期市场段写法

  /* 品牌缩写(brand_aliases 表 15 行;现役 4 个,retired 只解析不生成) */
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

  /* Ad Setting 2 字母短码(V 定,TR 定位段已砍——历史上只有 TR 一个值,不带信息) */
  const SETTINGS = [
    { code: 'SA', dictCode: 'SALES',      label: 'Sales' },
    { code: 'AW', dictCode: 'AWARENESS',  label: 'Awareness' },
    { code: 'TF', dictCode: 'TRAFFIC',    label: 'Traffic' },
    { code: 'EN', dictCode: 'ENGAGEMENT', label: 'Engagement' },
    { code: 'LD', dictCode: 'LEADS',      label: 'Leads' },
    { code: 'AP', dictCode: 'APP_PROMO',  label: 'App Promotion' },
  ];
  /* 历史/过渡期设定段(TRSA=TR 定位+SA 目标 等)→ 新短码;只用于解析 */
  const LEGACY_SETTING = { TRSA: 'SA', TRAW: 'AW', AWAR: 'AW', TRFC: 'TF', ENGA: 'EN', LEAD: 'LD', APPP: 'AP' };

  /* Format(与 MIS 字典 1:1;历史 GIF 只在宽松解析里认,不参与生成) */
  const FORMATS = { IMAGE: 'IM', VIDEO: 'VD', CAROUSEL: 'CR', DCO: 'DC' };
  const LEGACY_FORMAT_SEG = ['GIF'];

  /* 测试维度 2 字母段(V 定 FM/HK/VS/OF/GT;PS/AG 补齐,GN 兜底)。
   * key 与 MIS 假设的 testDims / 素材字段名一致,tab 对应字典页签。 */
  const DIMS = [
    { key: 'hook',         seg: 'HK', tab: 'Hook' },
    { key: 'offer',        seg: 'OF', tab: 'Offer' },
    { key: 'game_type',    seg: 'GT', tab: 'Game Type' },
    { key: 'visual_style', seg: 'VS', tab: 'Visual Style' },
    { key: 'format',       seg: 'FM', tab: 'Format' },
    { key: 'audience',     seg: 'PS', tab: 'Persona' },
    { key: 'age',          seg: 'AG', tab: 'Age Range' },
  ];
  const DIM_FALLBACK = 'GN';   // 假设不测素材维度(纯预算/结构类)时的兜底段

  /* 词条短码 fallback(与 Supabase dict_entries.short_code 草稿同步;库同步后以库为准)。
   * WD/SLT/LIVE 与历史广告名用码对齐。 */
  const ENTRY_SHORT = {
    'Hook': { withdrawal_proof: 'WD', fast_payout: 'FP', trust_safety: 'TS', license: 'LC', big_win: 'BW', testimonial: 'TM', celebrity: 'CB', promo_direct: 'PD', promo_value: 'PV', game_variety: 'GV', high_odds: 'HO', prediction: 'PR', cs_convo: 'CS', service: 'SV', pain_reversal: 'PN', edu_compare: 'EC', urgency: 'UG', luck: 'LK', sensory_appeal: 'SN' },
    'Visual Style': { real_person: 'RP', ugc: 'UGC', game_screenshot: 'GS', winner_showcase: 'WS', animation: 'AN', official_design: 'OD', ai_avatar: 'AI', Deepfake: 'DF' },
    'Offer': { fd_bonus: 'FB', tier_bonus: 'TB', insurance: 'IN', free_reg: 'FR', redeposit: 'RD', vip: 'VIP', rebate: 'RB' },
    'Game Type': { slots: 'SLT', live_casino: 'LIVE', sports: 'SPT', lottery: 'LTY', fishing: 'FSH', cockfight: 'CKF' },
    'Persona': { P0: 'P0', P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4', P5: 'P5', P6: 'P6', P7: 'P7' },
    'Age Range': { A1824: '1824', A2534: '2534', A3544: '3544', A45P: '45P', ALL: 'ALL' },
    'Format': { IMAGE: 'IM', VIDEO: 'VD', CAROUSEL: 'CR', DCO: 'DC' },
  };

  const CODE_RE = /^(\d{3})(V\d+)?$/;          // 新编号:3 位流水 + 可选 V 后缀
  const REF_RE = /^(KH|MY|SG)(\d{4,5})(V\d+)?$/;  // v1 过渡期 ref(存量素材仍在用)

  const bySh = {}, byCode = {}, fmtBySh = {}, dimBySeg = {}, dimByKey = {};
  let settingCodes = [];
  function rebuild() {
    [bySh, byCode, fmtBySh, dimBySeg, dimByKey].forEach(o => Object.keys(o).forEach(k => delete o[k]));
    BRANDS.forEach(b => { bySh[b.short] = b; byCode[b.code] = b; });
    Object.keys(FORMATS).forEach(k => { fmtBySh[FORMATS[k]] = k; });
    DIMS.forEach(d => { dimBySeg[d.seg] = d; dimByKey[d.key] = d; });
    settingCodes = SETTINGS.map(s => s.code);
  }
  rebuild();

  /* ---------- Supabase 同步(登录后覆盖常量;mock/离线保持 fallback) ---------- */
  const NAMING_TABS = ['Format', 'Ad Setting', 'Hook', 'Visual Style', 'Offer', 'Game Type', 'Persona', 'Age Range'];
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
      const ds = await db.from('dict_entries').select('tab,code,name,short_code,active,sort').in('tab', NAMING_TABS);
      if (ds && Array.isArray(ds.data) && ds.data.length) {
        const fmts = ds.data.filter(r => r.tab === 'Format' && r.active && r.short_code);
        if (fmts.length) { Object.keys(FORMATS).forEach(k => delete FORMATS[k]); fmts.forEach(r => { FORMATS[r.code] = r.short_code; }); }
        const sets = ds.data.filter(r => r.tab === 'Ad Setting' && r.active && r.short_code).sort((a, b) => (a.sort || 0) - (b.sort || 0));
        if (sets.length) { SETTINGS.length = 0; sets.forEach(r => SETTINGS.push({ code: r.short_code, dictCode: r.code, label: r.name })); }
        NAMING_TABS.forEach(tab => {
          const rows = ds.data.filter(r => r.tab === tab && r.short_code);
          if (rows.length) { ENTRY_SHORT[tab] = ENTRY_SHORT[tab] || {}; rows.forEach(r => { ENTRY_SHORT[tab][r.code] = r.short_code; }); }
        });
      }
      rebuild();
      synced = true;
      try { if (typeof refreshMktBrands === 'function') refreshMktBrands(); } catch (e2) {}
    } catch (e) { /* 离线/mock:保持常量 */ }
  }
  setTimeout(syncFromDb, 2500);

  /* ---------- 内容短码(词条 → 段;缺短码时按词条码首字母临时推导并标记) ---------- */
  function contentShort(tab, code) {
    if (!code) return null;
    const map = ENTRY_SHORT[tab] || {};
    if (map[code]) return { seg: map[code], derived: false };
    const seg = String(code).split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3) || null;
    return seg ? { seg, derived: true } : null;
  }

  /* ---------- 生成 ---------- */

  function buildAdName(p) {
    // p: {market, brandCode, setting, format, dimSeg, contentSeg, code}
    const mk = MARKETS[p.market];
    if (!mk) return { error: '未知市场:' + p.market };
    const b = byCode[p.brandCode];
    if (!b) return { error: '未知品牌:' + p.brandCode };
    if (b.status !== 'active') return { error: '品牌已整合(retired),不能发新码:' + p.brandCode };
    if ((b.markets || []).indexOf(p.market === 'KH' ? 'USC' : p.market) < 0) return { error: b.code + ' 不投 ' + p.market + ' 市场' };
    if (settingCodes.indexOf(p.setting) < 0) return { error: '未知 setting:' + p.setting };
    const f = FORMATS[p.format];
    if (!f) return { error: '未知 format:' + p.format };
    if (!p.dimSeg || !p.contentSeg) return { error: '缺维度/内容段' };
    if (!CODE_RE.test(p.code || '')) return { error: '编号格式应为 3 位流水(可带 V 后缀):' + p.code };
    return { name: [mk.seg, b.short, p.setting, f, p.dimSeg, p.contentSeg, p.code].join('_') };
  }

  /* 素材流水:按「品牌×内容」全局递增(扫全部素材的 ads/ref 里新式名),同批连号、跨假设不撞 */
  function nextSerial(brandShort, contentSeg) {
    let max = 0;
    G('creatives').forEach(c => {
      [c.ads, c.ref].forEach(v => {
        if (!v) return;
        const seg = String(v).trim().split('_');
        if (seg.length === 7 && seg[1] === brandShort && seg[5] === contentSeg) {
          const m = seg[6].match(CODE_RE);
          if (m) max = Math.max(max, Number(m[1]));
        }
      });
    });
    return String(max + 1).padStart(3, '0');
  }

  /* ---------- 解析(v2 新式 → v1 过渡期 → 宽松存量) ---------- */

  function parseAdName(name) {
    if (!name) return { ok: false, loose: false };
    const seg = String(name).trim().split('_');
    // v2 严格:7 段逐段可认
    if (seg.length === 7) {
      const mkSeg = LEGACY_MARKET_SEG[seg[0]] || seg[0];
      const mkKey = Object.keys(MARKETS).find(k => MARKETS[k].seg === mkSeg && k !== 'KH');
      const b = bySh[seg[1]];
      const set = settingCodes.indexOf(seg[2]) >= 0 ? seg[2] : (LEGACY_SETTING[seg[2]] || null);
      const fm = fmtBySh[seg[3]];
      const dim = dimBySeg[seg[4]] || (seg[4] === DIM_FALLBACK ? { key: null, seg: DIM_FALLBACK, tab: null } : null);
      const cm = seg[6].match(CODE_RE);
      if (mkKey && b && set && fm && dim && seg[5] && cm) {
        const base = seg.slice(0, 6).concat(cm[1]).join('_');
        return { ok: true, loose: false, style: 'v2', market: mkKey, brand: b.code, brandStatus: b.status,
                 setting: set, format: fm, dim: dim.key, dimSeg: dim.seg, content: seg[5],
                 code: seg[6], serial: cm[1], ver: cm[2] ? Number(cm[2].slice(1)) : 1, base };
      }
    }
    // v1 严格:过渡期 5 段(存量素材已领的 KHxxxx ref)
    if (seg.length === 5) {
      const mkSeg = LEGACY_MARKET_SEG[seg[0]] || seg[0];
      const mkKey = Object.keys(MARKETS).find(k => MARKETS[k].seg === mkSeg && k !== 'KH');
      const b = bySh[seg[1]];
      const set = settingCodes.indexOf(seg[2]) >= 0 ? seg[2] : (LEGACY_SETTING[seg[2]] || null);
      const fm = fmtBySh[seg[3]];
      if (mkKey && b && set && fm && REF_RE.test(seg[4])) {
        return { ok: true, loose: false, style: 'v1', market: mkKey, brand: b.code, brandStatus: b.status,
                 setting: set, format: fm, ref: seg[4] };
      }
    }
    // 宽松:任意段里找品牌缩写(历史 6 段名、脏名都落这里)+ 顺带找市场/设定/格式/ref
    const out = { ok: false, loose: true, style: 'loose', market: null, brand: null, brandStatus: null, setting: null, format: null, ref: null };
    seg.forEach(s => {
      if (!out.brand && bySh[s]) { out.brand = bySh[s].code; out.brandStatus = bySh[s].status; }
      if (!out.market) { const ms = LEGACY_MARKET_SEG[s] || s; const mk = Object.keys(MARKETS).find(k => MARKETS[k].seg === ms && k !== 'KH'); if (mk) out.market = mk; }
      if (!out.setting) { if (settingCodes.indexOf(s) >= 0) out.setting = s; else if (LEGACY_SETTING[s]) out.setting = LEGACY_SETTING[s]; }
      if (!out.format) { if (fmtBySh[s]) out.format = fmtBySh[s]; else if (LEGACY_FORMAT_SEG.indexOf(s) >= 0) out.format = s; }
      if (!out.ref && REF_RE.test(s)) out.ref = s;
    });
    out.ok = !!out.brand;   // 宽松模式"能归到品牌"即算部分成功(三层归因第 3 层)
    return out;
  }

  function stripVer(name) { return String(name || '').trim().replace(/V\d+$/, ''); }

  /* ---------- Creative 表单集成(fv-ads 的「⚙ 生成」按钮) ---------- */

  function genForCreative(i) {
    const c = G('creatives')[i];
    if (!c) return { error: '找不到素材' };
    const h = G('hypos').find(x => (c.hyp || '').startsWith(x.id));
    if (!h) return { error: '素材没挂 hypothesis,先在假设里建素材' };
    const market = h.market || 'USC';
    const format = (c.format || c.fmt || '').toUpperCase();
    if (!FORMATS[format]) return { error: '素材 Format=' + (format || '空') + ' 不在字典(IMAGE/VIDEO/CAROUSEL/DCO)' };
    // 设定:假设上选的 Ad Setting(字典 code → 2 字母短码);拿不到回落 SA
    let setting = 'SA';
    if (h.adSetting) { const hit = SETTINGS.find(s => s.dictCode === h.adSetting || s.code === h.adSetting); if (hit) setting = hit.code; }
    // 维度:优先取假设勾的测试维度里素材已有值的第一个;没有则按 DIMS 顺序找素材已填值;都没有 → GN 兜底
    let dim = null, val = null;
    (h.testDims || []).forEach(k => { if (!dim && dimByKey[k] && c[k]) { dim = dimByKey[k]; val = c[k]; } });
    if (!dim) DIMS.forEach(d => { if (!dim && d.key !== 'format' && c[d.key]) { dim = d; val = c[d.key]; } });
    let dimSeg, contentSeg, derived = false;
    if (dim) {
      const cs = contentShort(dim.tab, val);
      if (!cs) return { error: '维度 ' + dim.tab + ' 的值「' + val + '」推不出短码' };
      dimSeg = dim.seg; contentSeg = cs.seg; derived = cs.derived;
    } else { dimSeg = DIM_FALLBACK; contentSeg = DIM_FALLBACK; }
    const b = byCode[h.brand];
    if (!b) return { error: '未知品牌:' + h.brand };
    // 已登记过(ref_code 存了新式全名)→ 原名照用;否则发下一个流水
    let code;
    const prior = c.ref && String(c.ref).trim().split('_').length === 7 ? parseAdName(c.ref) : null;
    if (prior && prior.ok && prior.brand === h.brand && prior.content === contentSeg && prior.dimSeg === dimSeg) code = prior.serial;
    else code = nextSerial(b.short, contentSeg);
    const r = buildAdName({ market, brandCode: h.brand, setting, format, dimSeg, contentSeg, code });
    if (r.error) return r;
    return { name: r.name, parts: { market, brand: h.brand, setting, format, dimSeg, contentSeg, code, derived } };
  }

  /* v78/v81:三层归因 —— 广告名 → 素材。
   *   第 1 层:严格解析(v2 基名 或 v1 ref)精确匹配素材;
   *   第 2 层:广告名与素材登记的 ads_code 整串精确匹配(旧 ongoing 广告,登记制);
   *   第 3 层:宽松解析只归品牌(进未归因清单);全失败 tier 0。 */
  function resolveCreative(adName) {
    const name = String(adName || '').trim();
    if (!name) return { tier: 0 };
    const p = parseAdName(name);
    const base = p.style === 'v2' ? p.base : null;
    const mockMode = !!(window.MIS_META && MIS_META.mode === 'mock' && window.MIS_MOCK);
    if (mockMode) {
      try {
        const reg = MIS_MOCK.route('/api/mis/creative-registry', {});
        let c = null, tier = 0;
        if (base) { c = reg.creatives.find(x => x.ref && stripVer(x.ref) === base); if (c) tier = 1; }
        if (!c && p.ref) { c = reg.creatives.find(x => x.ref && (x.ref === p.ref || p.ref.indexOf(x.ref) === 0)); if (c) tier = 1; }
        if (!c) { c = reg.creatives.find(x => x.ads && String(x.ads).trim() === name); if (c) tier = 2; }
        if (c) return { tier, gen: c.gen, label: c.label || '', hyp: c.hyp, brand: c.brand };
      } catch (e) {}
    } else {
      const cs = G('creatives'), hs = G('hypos');
      let c = null, tier = 0;
      if (base) { c = cs.find(x => (x.ref && stripVer(x.ref) === base) || (x.ads && stripVer(x.ads) === base)); if (c) tier = 1; }
      if (!c && p.ref) { c = cs.find(x => x.ref && (x.ref === p.ref || p.ref.indexOf(x.ref) === 0)); if (c) tier = 1; }
      if (!c) { c = cs.find(x => x.ads && String(x.ads).trim() === name); if (c) tier = 2; }
      if (c) {
        const h = hs.find(x => (c.hyp || '').startsWith(x.id));
        return { tier, gen: c.gen, label: c.label || '', hyp: h ? h.id : (c.hyp || '').split(' ')[0], brand: h ? h.brand : (p.brand || '') };
      }
    }
    if (p.brand) return { tier: 3, brand: p.brand, brandStatus: p.brandStatus };
    return { tier: 0 };
  }

  /* 优化重投名:基名 + V{版本号}(基名=素材现有 ads code 剥掉旧 V 后缀;没有就现场生成) */
  function versionName(i) {
    const c = G('creatives')[i];
    if (!c) return null;
    const vn = (c.versions || []).length + 1;
    let base = null;
    if (c.ads) { const p = parseAdName(c.ads); if (p.ok && !p.loose) base = stripVer(c.ads); }
    if (!base) { const g = genForCreative(i); if (g.error) return null; base = g.name; }
    return base + 'V' + vn;
  }

  async function fvGen(i) {
    await syncFromDb();
    const r = genForCreative(i);
    const note = document.getElementById('fv-adsnote');
    if (r.error) { if (typeof toast === 'function') toast('生成失败:' + r.error); if (note) note.textContent = '⚠ ' + r.error; return; }
    const inp = document.getElementById('fv-ads');
    if (inp) inp.value = r.name;
    if (note) note.textContent = '已生成:' + r.parts.market + ' · ' + r.parts.brand + ' · ' + r.parts.setting + ' · ' + r.parts.format +
      ' · ' + r.parts.dimSeg + '=' + r.parts.contentSeg + ' · 流水 ' + r.parts.code +
      (r.parts.derived ? '(⚠ 词条缺 short code,临时推导——去字典补上)' : '') + ';保存后自动登记归因';
  }

  return { MARKETS, BRANDS, SETTINGS, FORMATS, DIMS, ENTRY_SHORT, buildAdName, parseAdName, nextSerial, genForCreative, fvGen, versionName, resolveCreative, stripVer, syncFromDb };
})();
