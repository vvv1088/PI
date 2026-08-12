/* v71 冒烟测试：加载页面 → 绕过登录门 → 逐个打开全部视图（17 旧 + 5 v70 + 16 v71）
 * → 检查渲染 + 收集 console 报错。用法：node smoke-test.js [index.html 路径] [截图目录]
 * 通过标准：每个视图 .on 且有内容、console 零报错（CDN 垫桩报错除外）。 */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const target = process.argv[2] || path.join(__dirname, '..', 'index.html');
  const shotDir = process.argv[3] || '';
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // 沙盒无外网：给三个 CDN 库垫桩（生产环境正常加载，不需要这步）
  await page.route('**/cdn.jsdelivr.net/**', route => {
    const url = route.request().url();
    let body = '';
    if (url.includes('supabase')) body = `window.supabase={createClient:()=>({
      auth:{getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
        signInWithPassword:async()=>({error:{message:'stub'}}),signOut:async()=>({})},
      from:()=>new Proxy({},{get:(t,k)=>k==='then'?undefined:(...a)=>new Proxy(async()=>({data:[],error:null}),{get:(t2,k2)=>k2==='then'?(r)=>r({data:[],error:null}):()=>t2})}),
      rpc:async()=>({data:[],error:null}),
      storage:{from:()=>({upload:async()=>({error:null}),getPublicUrl:()=>({data:{publicUrl:''}})})}
    })};`;
    else if (url.includes('marked')) body = 'window.marked={parse:s=>s,setOptions(){}};';
    else if (url.includes('chart.js')) body = 'window.Chart=class{constructor(){}update(){}destroy(){}};';
    route.fulfill({ contentType: 'application/javascript', body });
  });

  await page.goto('file://' + path.resolve(target), { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  // 绕过登录门（仅测试；不触发 Supabase）
  await page.evaluate(() => {
    const g = document.getElementById('loginGate'); if (g) g.style.display = 'none';
    document.querySelectorAll('.page,.app,main,aside').forEach(x => x.style.visibility = 'visible');
  });

  const views = [
    // MIS 原生视图（tagmatrix 是从 Hypothesis 带上下文打开的子视图，直开必空，不在此列）
    'pool', 'hypo', 'form', 'creatives', 'mplan', 'budget', 'bgassign',
    'results', 'dict', 'reports', 'gallery', 'operators', 'funnel', 'candidates', 'watch',
    'roles', 'users', 'audit',
    // v70(v72 收编:as-rotation→mm-rotation Logs tab、as-overview→mm-dash)
    'perf-loop', 'perf-spending', 'as-health',
    // v71 系统 2 搬家(v72 收编:mm-actionlogs→audit Meta tab)
    'mm-brands', 'mm-bms', 'mm-pixels', 'mm-accounts', 'mm-apps', 'mm-tokens', 'mm-shares',
    'mm-dash', 'mm-rotation', 'mm-sop',
    'an-accounts', 'an-ads', 'an-brands', 'an-lifecycle',
  ];
  const results = {};
  let fails = 0;
  // v72:导航默认收起 —— 必须在遍历视图之前检查(go() 会逐组展开)
  results['nav@initial'] = await page.evaluate(() => {
    const grps = [...document.querySelectorAll('.grp')];
    return { on: true, htmlLen: 99, total: grps.length, open: grps.filter(g => !g.classList.contains('closed')).length };
  });
  if (results['nav@initial'].open > 1) fails++;
  for (const v of views) {
    await page.evaluate(vv => { window.go(vv); }, v);
    await page.waitForTimeout(650);
    const r = await page.evaluate(vv => {
      const sec = document.getElementById('v-' + vv);
      return { on: !!(sec && sec.classList.contains('on')), htmlLen: sec ? sec.innerHTML.length : 0 };
    }, v);
    results[v] = r;
    if (!r.on || r.htmlLen < 40) fails++;
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `shot-${v}.png`) });
  }
  // v72 交互抽查：Rotation Logs tab / Activity Log Meta tab / 导航默认收起
  await page.evaluate(() => { window.go('mm-rotation'); MISOps.rtTab('logs'); });
  await page.waitForTimeout(500);
  results['mm-rotation@logs'] = await page.evaluate(() => {
    const sec = document.getElementById('v-mm-rotation');
    return { on: true, htmlLen: sec.innerHTML.length, hasTable: !!sec.querySelector('table tr') };
  });
  await page.evaluate(() => { window.go('audit'); });
  await page.waitForTimeout(600);
  results['audit@merged'] = await page.evaluate(() => {
    const b = document.getElementById('auditBody');
    return { on: true, htmlLen: b ? b.innerHTML.length : 0, hasTable: !!(b && b.querySelector('table tr')), hasSource: !!(b && b.textContent.includes('Meta')) };
  });
  await page.evaluate(() => { window.go('users'); });
  await page.waitForTimeout(600);
  results['users@unified'] = await page.evaluate(() => {
    const b = document.getElementById('usersMetaBody');
    return { on: true, htmlLen: b ? b.innerHTML.length : 0, hasTable: !!(b && b.querySelector('table tr')) };
  });
  // 交互抽查：Brands 详情页 + 分析页图表 SVG
  await page.evaluate(() => { window.go('mm-brands'); });
  await page.waitForTimeout(400);
  await page.evaluate(() => MISRes.detail('brands', '1'));
  await page.waitForTimeout(500);
  results['mm-brands@detail'] = await page.evaluate(() => {
    const sec = document.getElementById('v-mm-brands');
    return { on: true, htmlLen: sec.innerHTML.length, hasTabs: !!sec.querySelector('.mmr-tabs') };
  });
  await page.evaluate(() => { window.go('an-accounts'); MISAn.acSet('accId', '1'); });
  await page.waitForTimeout(700);
  results['an-accounts@chart'] = await page.evaluate(() => {
    const sec = document.getElementById('v-an-accounts');
    return { on: true, htmlLen: sec.innerHTML.length, hasSvg: !!sec.querySelector('svg polyline') };
  });
  if (shotDir) await page.screenshot({ path: path.join(shotDir, 'shot-an-accounts-chart.png') });

  // v81:命名引擎回归检查(终版 7 段结构;纯函数 + mock 注册表,不依赖登录)
  results['engine@checks'] = await page.evaluate(() => {
    const N = window.MISNaming;
    const ok = [];
    // 生成:7 段拼装 / retired 禁发 / 市场不符
    ok.push(N.buildAdName({ market: 'USC', brandCode: 'OK188KH', setting: 'SA', format: 'VIDEO', dimSeg: 'HK', contentSeg: 'WD', code: '001' }).name === 'USC_OK18_SA_VD_HK_WD_001');
    ok.push(!!N.buildAdName({ market: 'USC', brandCode: 'SBKH99', setting: 'SA', format: 'IMAGE', dimSeg: 'HK', contentSeg: 'WD', code: '001' }).error);
    ok.push(!!N.buildAdName({ market: 'SG', brandCode: '17WINKH', setting: 'SA', format: 'IMAGE', dimSeg: 'HK', contentSeg: 'WD', code: '001' }).error);
    // 解析:v2 严格(V 后缀基名) / v1 过渡期 / 历史 6 段宽松归品牌 / 脏名不认
    const p2 = N.parseAdName('USC_OK18_SA_VD_HK_WD_001V2');
    ok.push(p2.ok === true && p2.style === 'v2' && p2.base === 'USC_OK18_SA_VD_HK_WD_001' && p2.ver === 2);
    ok.push(N.parseAdName('USC_WIKH_TRSA_IM_KH0201V2').ok === true && N.parseAdName('USC_WIKH_TRSA_IM_KH0201V2').style === 'v1');
    ok.push(N.parseAdName('USC_OK18_TRSA_VD_WD1_KH06').loose === true && N.parseAdName('USC_OK18_TRSA_VD_WD1_KH06').brand === 'OK188KH');
    ok.push(N.parseAdName('TRSA_IM_AMB1_CN07').ok === false);
    // 归因三层:v2 基名(含 V2 重投) / 登记全名 / 只归品牌
    ok.push(N.resolveCreative('USC_WIKH_SA_IM_HK_WD_001V2').tier === 1);
    ok.push(N.resolveCreative('MY_INZ9_SA_IM_OF_FB_001').tier === 1);
    ok.push(N.resolveCreative('USC_WIKH_TRSA_VD_2473_KH02').tier === 2);
    ok.push(N.resolveCreative('USC_SB99_TRSA_VD_KH9901').tier === 3);
    return { on: true, htmlLen: 99, pass: ok.filter(Boolean).length, total: ok.length };
  });
  if (results['engine@checks'].pass !== results['engine@checks'].total) fails++;

  console.log(JSON.stringify(results, null, 1));
  console.log('VIEWS:', views.length, 'FAILED:', fails);
  console.log('ERRORS(前10):', errors.slice(0, 10));
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
