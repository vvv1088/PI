/* v70 冒烟测试：加载页面 → 绕过登录门 → 逐个打开 5 个新视图 → 截图 + 收集报错 */
const { chromium } = require('playwright');
(async () => {
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

  await page.goto('file:///home/claude/mis/index.html', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  // 绕过登录门（仅测试；不触发 Supabase）
  await page.evaluate(() => {
    const g = document.getElementById('loginGate'); if (g) g.style.display = 'none';
    document.querySelectorAll('.page,.app,main,aside').forEach(x => x.style.visibility = 'visible');
  });

  const views = ['perf-loop', 'perf-spending', 'as-health', 'as-rotation', 'as-overview'];
  const results = {};
  for (const v of views) {
    await page.evaluate(vv => { window.go(vv); }, v);
    await page.waitForTimeout(700);
    results[v] = await page.evaluate(vv => {
      const sec = document.getElementById('v-' + vv);
      return { visible: sec && sec.classList.contains('on'), htmlLen: sec ? sec.innerHTML.length : 0, hasTable: !!(sec && sec.querySelector('table tr')) };
    }, v);
    await page.screenshot({ path: `/home/claude/mis/shot-${v}.png` });
  }
  console.log(JSON.stringify(results, null, 1));
  console.log('ERRORS(前8):', errors.slice(0, 8));
  await browser.close();
})();
