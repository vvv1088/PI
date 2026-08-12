/* ================= Competitor Intelligence — LIVE 数据逻辑(接 Supabase + n8n webhook) ================= */
const SUPABASE_URL="https://bfukphakofrjalsqteda.supabase.co";
const SUPABASE_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdWtwaGFrb2ZyamFsc3F0ZWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDA0OTksImV4cCI6MjA5NjQ3NjQ5OX0.wZpCRkeMm9MGKR7ueUS7UpIV62ZJlZPuMPRMps-kxW8";
const WEBHOOK_URL="https://n8n.ohmediaa.com/webhook/manual-add";
const RESCAN_URL="https://n8n.ohmediaa.com/webhook/rescan-brand";
const DONUT=['#7F77DD','#1D9E75','#D85A30','#D4537E','#378ADD','#639922','#BA7517','#9aa1ab','#c084fc','#2dd4bf','#fb923c','#f472b6','#60a5fa','#a3e635'];
const db=supabase.createClient(SUPABASE_URL,SUPABASE_ANON);
const ADS_URL="https://kkypkudherpaxyoocyfa.supabase.co";
const ADS_ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreXBrdWRoZXJwYXh5b29jeWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDAyMDEsImV4cCI6MjA5NjQ3NjIwMX0.HoNuJsnwV5hz9Zows4X62GpWVaKdMEe6p0X0xG8vqEI";
const adsDb=supabase.createClient(ADS_URL,ADS_ANON);
async function loadBaselines(){
  try{
    const {data:bl,error}=await adsDb.rpc('get_brand_baselines');
    if(error)throw error;
    if(bl&&typeof bl==='object'&&Object.keys(bl).length)data=bl;
  }catch(e){console.error('loadBaselines:',e);}
  // HVR 占位基准:RPC 不产 7-Day High-Value Rate,先放占位让功能跑通(待 cohort 取数 + 高门槛 figure 后替换)
  if(data&&data['OK188KH']&&!data['OK188KH']['7-Day High-Value Rate'])data['OK188KH']['7-Day High-Value Rate']={base:8,cost:null,unit:'%',placeholder:true};
  // v80:基线闭环供数(休眠,MIS_META.useLiveBaselines 开启后逐指标覆盖;设计见 docs/06)
  try{if(window.MISBaselines)data=await MISBaselines.overlay(data);}catch(e){}
}
let ads=[],operators=[],reports=[],candidates=[],brands=[],galRows=[],hookCh=null,styleCh=null;
let reportWeeks=[],reportTabIdx=0;

function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// 双击防连点:包住会写库的按钮动作,进行中忽略再次点击
let _busy=false;
async function guard(fn){if(_busy)return;_busy=true;try{await fn();}finally{_busy=false;}}
// 数据生命周期:按 last_seen 距今天数判活跃/休眠/已停(≤14 / ≤30 / >30);无日期=已停
function lifeStatus(ls){if(!ls)return 'dead';const d=Math.floor((Date.now()-new Date(ls).getTime())/86400000);if(isNaN(d))return 'dead';return d<=14?'active':d<=30?'dormant':'dead';}
function lifeBadge(ls){const st=lifeStatus(ls);const m={active:['Active','la'],dormant:['Dormant','ld'],dead:['Inactive','lx']};const x=m[st];return '<span class="life '+x[1]+'">'+x[0]+'</span>';}
// 筛选:active=仅活跃 / archive=休眠+已停 / all=全部
function lifeMatch(ls,mode){const st=lifeStatus(ls);return mode==='all'?true:mode==='archive'?st!=='active':st==='active';}
function pc(c){c=(c||'').toUpperCase();return '<span class="pl '+(c==='KH'?'kh':(c==='MY'?'my':''))+'">'+esc(c||'?')+'</span>';}
function showErr(m){document.getElementById('errbox').innerHTML='<div class="err">'+esc(m)+'</div>';}
function daysAgo(d){if(!d)return 9999;return (Date.now()-new Date(d).getTime())/86400000;}
function isNew(a){return a.start_date&&daysAgo(a.start_date)<=7;}
function hooksOf(a){return (a.hook_type||'').split(',').map(s=>s.trim()).filter(Boolean);}
// Game Type:与 hook_type 完全同款(逗号分隔、可多值)。英文 key 存库,中文显示。
const GAME_ZH={slots:'老虎机',live_casino:'真人娱乐',sports:'体育',lottery:'彩票 / 4D',fishing:'捕鱼',cockfight:'斗鸡',unknown:'未知'};
function gameTypesOf(a){return (a.game_type||'').split(',').map(s=>s.trim()).filter(Boolean);}
function gameZh(code){const r=(DICT['Game Type']||[]).find(x=>x.c===code);return r?(r.n||r.c):(GAME_ZH[code]||code);}
function langCode(l){const m={chinese:'ZH',english:'EN',malay:'MS',khmer:'KH',mixed:'MX'};return m[(l||'').toLowerCase()]||(l?String(l).toUpperCase().slice(0,2):'');}

async function loadAll(){
  document.getElementById('errbox').innerHTML='';document.getElementById('status').textContent='加载中…';
  try{
    const [a,o,r,c,b]=await Promise.all([
      db.from('v_ads_gallery').select('*'),db.from('v_operator_intel').select('*'),
      db.from('weekly_reports').select('*').order('generated_at',{ascending:false}),
      db.from('discovery_candidates').select('*').eq('status','pending').order('discovered_at',{ascending:false}),
      db.from('monitor_brands').select('*')]);
    for(const x of [a,o,r,c,b])if(x.error)throw x.error;
    ads=a.data||[];operators=o.data||[];reports=r.data||[];candidates=c.data||[];brands=b.data||[];
    ads.forEach(x=>{if(x.operator_name)x.operator_name=x.operator_name.toUpperCase();});
    operators.forEach(x=>{if(x.operator_name)x.operator_name=x.operator_name.toUpperCase();});
    brands.forEach(x=>{x._kw=x.keyword;if(x.keyword)x.keyword=x.keyword.toUpperCase();});
    renderKpis();buildFilters();renderGallery();renderOperators();renderFunnel();buildReportWeeks();renderCandidates();renderBrands();
    document.getElementById('status').textContent='更新于 '+new Date().toLocaleString('zh-CN');
  }catch(e){showErr('读取失败：'+(e.message||e));document.getElementById('status').textContent='出错';}
}

function renderKpis(rows){
  const src=rows||ads;
  const filtered=!!rows && rows.length!==ads.length;
  const ops=new Set(src.map(a=>a.operator_name).filter(Boolean));
  const longest=src.reduce((m,a)=>Math.max(m,a.duration_days||0),0);
  document.getElementById('kpis').innerHTML=kpi(src.length,'Total Ads'+(filtered?' (filtered)':''))+kpi(ops.size,'Active Operators')+kpi(src.filter(isNew).length,'New This Week')+kpi(longest+' d','Longest Running');
}
function kpi(v,l){return '<div class="kpi"><div class="v">'+v+'</div><div class="l">'+l+'</div></div>';}

function setOpts(id,label,vals){const el=document.getElementById(id);const cur=el.value;el.innerHTML='<option value="">'+label+'</option>'+vals.map(v=>'<option>'+esc(v)+'</option>').join('');el.value=vals.includes(cur)?cur:'';}
function buildFilters(){
  const m=fMarket.value;
  const base=m?ads.filter(a=>(a.country||'').toUpperCase()===m):ads;
  setOpts('fOperator','All Operators',[...new Set(base.map(x=>x.operator_name).filter(Boolean))].sort());
  setOpts('fHook','All Hooks',[...new Set(base.flatMap(hooksOf))].sort());
  setOpts('fStyle','All Styles',[...new Set(base.map(x=>x.visual_style).filter(Boolean))].sort());
  const gtSel=document.getElementById('fGameType').value;
  // 选项显示英文 code(slots/live_casino/…),与 Hooks/Styles 下拉一致;表格里的 pill 仍显示中文
  const gtOpts=(DICT['Game Type']||[]).filter(g=>g.on!==false).map(g=>g.c);
  if(!gtOpts.includes('unknown'))gtOpts.push('unknown');   // 扫描兜底值,也可筛
  document.getElementById('fGameType').innerHTML='<option value="">All Game Types</option>'+gtOpts.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  document.getElementById('fGameType').value=gtSel;
}
function media(a){
  const img=a.stored_image_url||a.image_url,vid=a.stored_video_url;
  if(vid)return '<video class="th" src="'+esc(vid)+'" muted preload="metadata" onclick="lb('+a._i+')"></video>';
  if(img)return '<img class="th" src="'+esc(img)+'" loading="lazy" onclick="lb('+a._i+')" onerror="this.outerHTML=\'<div class=&quot;thx&quot;>broken</div>\'">';
  return '<div class="thx">no img</div>';
}
function lb(i){const a=galRows[i];const img=a.stored_image_url||a.image_url,vid=a.stored_video_url;document.getElementById('lbInner').innerHTML=vid?'<video src="'+esc(vid)+'" controls autoplay></video>':'<img src="'+esc(img)+'">';document.getElementById('lb').classList.add('show');}
function closeLb(){document.getElementById('lb').classList.remove('show');document.getElementById('lbInner').innerHTML='';}

function filteredAds(){
  const m=fMarket.value,o=fOperator.value,h=fHook.value,s=fStyle.value,fmt=fFormat.value,gt=fGameType.value,st=(document.getElementById('fStatus')||{value:'all'}).value,q=(fSearch.value||'').toLowerCase();
  let r=ads.filter(a=>(!m||(a.country||'').toUpperCase()===m)&&(!o||a.operator_name===o)&&(!h||hooksOf(a).includes(h))&&(!s||a.visual_style===s)&&(!fmt||(a.media_type||'').toUpperCase()===fmt)&&(!gt||gameTypesOf(a).includes(gt))&&lifeMatch(a.last_seen,st));
  if(q)r=r.filter(a=>((a.ad_text||'')+(a.selling_point||'')+(a.creative_theme||'')+(a.page_name||'')).toLowerCase().includes(q));
  const so=fSort.value;
  if(so==='dur')r.sort((a,b)=>(b.duration_days||0)-(a.duration_days||0));
  else if(so==='new')r.sort((a,b)=>(''+(b.start_date||'')).localeCompare(''+(a.start_date||'')));
  else if(so==='recent')r.sort((a,b)=>(''+(b.last_seen||'')).localeCompare(''+(a.last_seen||'')));
  else r.sort((a,b)=>(''+(a.operator_name||'')).localeCompare(''+(b.operator_name||'')));
  return r;
}
function renderGallery(){
  {const bn=document.getElementById('opBanner');if(bn&&bn.innerHTML&&bn.dataset.op!==fOperator.value)bn.innerHTML='';}
  galRows=filteredAds();galRows.forEach((a,i)=>a._i=i);
  document.getElementById('galCount').textContent=galRows.length+' ads';
  renderKpis(galRows);
  let h='';
  if(!galRows.length)h='<tr><td colspan="14" class="empty">No ads match.</td></tr>';
  const CAP=window._galCap||300;
  const rowsToDraw=galRows.slice(0,CAP);
  rowsToDraw.forEach(a=>{
    const dur=a.duration_days==null?'':'<span class="pl '+(a.duration_days>=180?'win':'dur')+'">'+(a.duration_days>=180?'🏆 ':'')+a.duration_days+'</span>';
    const newb=isNew(a)?'<span class="pl new">NEW</span> ':'';
    const fn=[];if(a.extracted_telegram)fn.push('TG '+esc(a.extracted_telegram));if(a.extracted_domain)fn.push(esc(a.extracted_domain));if(a.extracted_ref_code)fn.push('ref '+esc(a.extracted_ref_code));
    h+='<tr><td><div class="op" onclick="drill(\''+esc(a.operator_name)+'\')">'+esc(a.operator_name||'?')+'</div>'+media(a)+(a.media_type?'<div style="margin-top:4px"><span class="pl cta">'+esc((a.media_type||'').toUpperCase())+'</span></div>':'')+'</td>'+
      '<td><div class="hooks">'+hooksOf(a).map(x=>'<span class="pl hook">'+esc(x)+'</span>').join('')+'</div></td>'+
      '<td class="cn">'+esc(a.selling_point||'')+'</td>'+
      '<td class="cn">'+esc(a.creative_theme||'')+'</td>'+
      '<td>'+(a.visual_style?'<span class="pl style">'+esc(a.visual_style)+'</span>':'-')+'</td>'+
      '<td>'+(gameTypesOf(a).length?'<div class="hooks">'+gameTypesOf(a).map(x=>'<span class="pl style">'+esc(gameZh(x))+'</span>').join('')+'</div>':'-')+'</td>'+
      '<td>'+newb+dur+'</td>'+
      '<td>'+(a.cta_type?'<span class="pl cta">'+esc(a.cta_type)+'</span>':'')+'</td>'+
      '<td class="sm">'+fn.join('<br>')+'</td>'+
      '<td class="sm">'+esc(langCode(a.language))+'</td>'+
      '<td class="sm">'+esc((a.start_date||'')+(a.end_date?' → '+a.end_date:''))+'</td>'+
      '<td class="sm">'+esc(a.page_name||'')+'</td>'+
      '<td class="sm">'+esc((a.last_seen||'').slice(5,10))+((document.getElementById('fStatus')||{}).value==='all'?'<br>'+lifeBadge(a.last_seen):'')+'</td>'+
      '<td>'+(a.snapshot_url?'<a class="fb" href="'+esc(a.snapshot_url)+'" target="_blank">↗</a>':'')+'</td></tr>';
  });
  if(galRows.length)h+='<tr><td colspan="14" style="text-align:center;color:var(--ink3);padding:14px;font-size:12px">— 共 '+galRows.length+' 条，已全部显示 —</td></tr>';
  if(galRows.length>(window._galCap||300))h+='<tr><td colspan="14" style="text-align:center;padding:14px"><button class="btn ghost" onclick="window._galCap=(window._galCap||300)+300;renderGallery()">加载更多(已显示 '+(window._galCap||300)+' / '+galRows.length+')</button></td></tr>';
  document.getElementById('galBody').innerHTML=h;
}
function drill(op){fMarket.value='';buildFilters();fOperator.value=op;fHook.value='';fStyle.value='';fFormat.value='';fGameType.value='';fSearch.value='';const st=document.getElementById('fStatus');if(st)st.value='all';go('gallery',document.querySelector('[data-v="gallery"]'));const bn=document.getElementById('opBanner');bn.dataset.op=op;bn.innerHTML='<div class="opbanner"><span><b>'+esc(op)+'</b> · all ads</span><span class="link" onclick="clearDrill()">✕ clear</span></div>';renderGallery();window.scrollTo(0,0);}
function clearDrill(){fOperator.value='';document.getElementById('opBanner').innerHTML='';renderGallery();}

function renderOperators(){
  const cf=opCountry.value;const sf=(document.getElementById('opStatus')||{value:'all'}).value;const allMode=sf==='all';
  let rows=operators.filter(o=>(!cf||(o.country||'').toUpperCase()===cf)&&lifeMatch(o.last_seen,sf)).sort((a,b)=>(b.total_ads||0)-(a.total_ads||0));
  let h='<thead><tr><th>Operator</th><th>Market</th>'+(allMode?'<th>Ad Status</th>':'')+'<th>Total Ads</th><th>Active</th><th>Pages</th><th>Domains</th><th>TG</th><th>Msgr</th><th>Avg Days</th><th>Last Seen</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="'+(allMode?11:10)+'" class="empty">No data</td></tr>';
  rows.forEach(o=>{h+='<tr><td><span class="link" onclick="drill(\''+esc(o.operator_name)+'\')">'+esc(o.operator_name)+'</span></td><td>'+pc(o.country)+'</td>'+(allMode?'<td>'+lifeBadge(o.last_seen)+'</td>':'')+'<td>'+(o.total_ads||0)+'</td><td>'+(o.active_ads||0)+'</td><td>'+(o.pages||0)+'</td><td>'+(o.domains||0)+'</td><td>'+(o.telegram_ads||0)+'</td><td>'+(o.messenger_ads||0)+'</td><td>'+(o.avg_duration_days==null?'-':o.avg_duration_days)+'</td><td>'+esc(o.last_seen||'-')+'</td></tr>';});
  document.getElementById('opTable').innerHTML=h+'</tbody>';
}
function renderFunnel(){
  const cf=document.getElementById('fFunnelCountry').value;const sf=(document.getElementById('fFunnelStatus')||{value:'all'}).value;const allMode=sf==='all';const fmap={};
  ads.filter(a=>!cf||(a.country||'').toUpperCase()===cf).forEach(a=>{const o=a.operator_name;if(!o)return;const F=fmap[o]=fmap[o]||{tg:{},dom:{},ref:new Set(),c:a.country,ls:''};const ls=a.last_seen||'';const upd=(obj,key)=>{if(!key)return;if(!obj[key]||ls>obj[key])obj[key]=ls;};upd(F.tg,a.extracted_telegram);upd(F.dom,a.extracted_domain);if(a.extracted_ref_code)F.ref.add(a.extracted_ref_code);if(ls>F.ls)F.ls=ls;});
  let h='<thead><tr><th>Operator</th><th>Market</th>'+(allMode?'<th>Ad Status</th>':'')+'<th>Telegram</th><th>Domains</th></tr></thead><tbody>';
  const fe=Object.entries(fmap).filter(e=>(Object.keys(e[1].tg).length||Object.keys(e[1].dom).length||e[1].ref.size)&&lifeMatch(e[1].ls,sf)).sort((a,b)=>(Object.keys(b[1].tg).length+Object.keys(b[1].dom).length)-(Object.keys(a[1].tg).length+Object.keys(a[1].dom).length));
  const tgLink=(t,ls)=>{const v=String(t).trim();const url=/^https?:\/\//i.test(v)?v:('https://'+v.replace(/^@/,'t.me/'));return '<a class="fb" href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(v)+'</a>'+(allMode?' '+lifeBadge(ls):'');};
  const domLink=(d,ls)=>{const v=String(d).trim();const url=/^https?:\/\//i.test(v)?v:('https://'+v);return '<a class="fb" href="'+esc(url)+'" target="_blank" rel="noopener">'+esc(v)+'</a>'+(allMode?' '+lifeBadge(ls):'');};
  if(!fe.length)h+='<tr><td colspan="'+(allMode?5:4)+'" class="empty">No funnel signals yet</td></tr>';
  fe.forEach(e=>{const v=e[1];h+='<tr><td>'+esc(e[0])+'</td><td>'+pc(v.c)+'</td>'+(allMode?'<td>'+lifeBadge(v.ls)+'</td>':'')+'<td class="sm">'+Object.entries(v.tg).map(x=>tgLink(x[0],x[1])).join('<br>')+'</td><td class="sm">'+Object.entries(v.dom).map(x=>domLink(x[0],x[1])).join('<br>')+'</td></tr>';});
  document.getElementById('funnelTable').innerHTML=h+'</tbody>';
}

function buildReportWeeks(){
  const seen={},rows=[];
  for(const r of reports){
    const key=(r.period||(r.generated_at||'').slice(0,10))+'||'+(r.market||'');
    if(seen[key])continue;seen[key]=1;rows.push(r);
  }
  const byWeek={};
  rows.forEach(r=>{const wk=r.period||(r.generated_at||'').slice(0,10)||'未知';(byWeek[wk]=byWeek[wk]||[]).push(r);});
  reportWeeks=Object.entries(byWeek).sort((a,b)=>b[0].localeCompare(a[0])).map(e=>({week:e[0],items:e[1].sort((a,b)=>(''+(a.market||'')).localeCompare(''+(b.market||'')))}));
  const sel=document.getElementById('reportWeek');
  const keep=sel.selectedOptions&&sel.selectedOptions[0]?sel.selectedOptions[0].textContent:null;
  sel.innerHTML=reportWeeks.map((w,i)=>'<option value="'+i+'">'+esc(w.week)+'</option>').join('');
  if(keep){const idx=reportWeeks.findIndex(w=>w.week===keep);if(idx>=0)sel.value=String(idx);}
  renderReportTabs();
}
function renderReportTabs(){
  const tabsEl=document.getElementById('reportTabs'),body=document.getElementById('reportBody');
  if(!reportWeeks.length){tabsEl.innerHTML='';body.innerHTML='<div class="empty">暂无周报。跑完抓取后，在 n8n 手动执行一次「Weekly Report」即可生成。</div>';return;}
  const wi=+document.getElementById('reportWeek').value||0;
  reportTabIdx=0;
  tabsEl.innerHTML=reportWeeks[wi].items.map((r,i)=>'<button class="mtab'+(i===0?' active':'')+'" onclick="pickReportTab('+i+')">'+esc(r.market||'未标记')+'</button>').join('');
  renderReport();
}
function pickReportTab(i){reportTabIdx=i;document.querySelectorAll('#reportTabs .mtab').forEach((b,j)=>b.classList.toggle('active',j===i));renderReport();}
function renderReport(){
  const body=document.getElementById('reportBody');
  if(!reportWeeks.length){body.innerHTML='<div class="empty">暂无周报。</div>';return;}
  const wi=+document.getElementById('reportWeek').value||0;
  const item=reportWeeks[wi].items[reportTabIdx]||reportWeeks[wi].items[0];
  body.innerHTML=marked.parse(((item&&item.report_md)||'(空)').replace(/</g,'&lt;'));
}

function renderCandidates(){
  document.getElementById('candCount').textContent=candidates.length+' to review';
  let h='<thead><tr><th>Action</th><th>Page</th><th>Market</th><th>Domain</th><th>Telegram</th><th>Sample · Note</th><th>Source</th><th>Found</th></tr></thead><tbody>';
  if(!candidates.length)h+='<tr><td colspan="8" class="empty">No candidates</td></tr>';
  candidates.forEach(c=>{h+='<tr><td><button class="cbtn ok" data-perm="pending:edit" onclick="confirmCand(\''+c.id+'\',\''+esc(c.country||'')+'\',\''+esc((c.suggested_keyword||c.page_name||'').replace(/\x27/g,""))+'\')">✓</button><button class="cbtn no" data-perm="pending:delete" onclick="rejectCand(\''+c.id+'\')">✗</button></td><td class="sm">'+esc(c.page_name||'-')+'</td><td>'+pc(c.country)+'</td><td class="sm">'+esc(c.extracted_domain||'-')+'</td><td class="sm">'+esc(c.extracted_telegram||'-')+'</td><td class="sm">'+esc((c.sample_ad_text||c.triage_note||'').slice(0,140))+'</td><td class="sm">'+esc(c.source||'-')+'</td><td class="sm">'+esc((c.discovered_at||'').slice(0,10))+'</td></tr>';});
  document.getElementById('candTable').innerHTML=h+'</tbody>';
}
function renderBrands(){
  const mf=(document.getElementById('fWatchMarket')||{}).value||'';
  const opLs={};(operators||[]).forEach(o=>{if(o.operator_name)opLs[o.operator_name.toUpperCase()]=o.last_seen||'';});
  const rows=[...brands].filter(b=>!mf||(b.country||'').toUpperCase()===mf).sort((a,b)=>(''+(a.country||'')).localeCompare(''+(b.country||''))||(''+(a.keyword||'')).localeCompare(''+(b.keyword||'')));
  let h='<thead><tr><th>Keyword</th><th>Market</th><th>Ad Status</th><th>Monitoring (click to toggle)</th><th>Source</th><th>Rescan</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="6" class="empty">No data</td></tr>';
  rows.forEach(b=>{const on=b.is_active!==false;const kw=(b.keyword||'').toUpperCase();
    let ls=opLs[kw];
    if(ls==null&&kw){const hit=Object.keys(opLs).find(n=>n.includes(kw)||kw.includes(n));if(hit)ls=opLs[hit];}const act=ls?lifeBadge(ls):'<span class="sm">No ads</span>';h+='<tr><td>'+esc(b.keyword)+'</td><td>'+pc(b.country)+'</td><td>'+act+'</td><td><span class="pill2 '+(on?'son':'soff')+'" data-perm="watchlist:edit" onclick="toggleBrand('+b.id+','+(!on)+')">'+(on?'Activated':'Inactivated')+'</span></td><td>'+esc(b.source||'-')+'</td><td>'+(on?'<button class="cbtn rescan" data-perm="watchlist:edit" onclick="rescanBrand(\''+esc(b._kw||'')+'\',this)">↻ rescan</button>':'<span class="sm">-</span>')+'</td></tr>';});
  document.getElementById('brandTable').innerHTML=h+'</tbody>';
}
async function rescanBrand(kw,btn){
  const msg=document.getElementById('rescanMsg');
  if(!kw)return;
  if(!confirm('立刻单独重抓「'+kw+'」？大约需要 3–10 分钟。'))return;
  btn.disabled=true;btn.textContent='⏳ 提交中…';msg.className='msg';msg.textContent='';
  try{
    const res=await fetch(RESCAN_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand:kw})});
    if(!res.ok)throw new Error('HTTP '+res.status);
    btn.textContent='✓ 已提交';msg.className='msg ok';
    msg.textContent='✓ 「'+kw+'」重抓已提交。抓取 + AI 解析约 3–10 分钟，完成后点左下角「刷新」查看（看 Ads Library 里该品牌的 Last Seen 是否更新到今天）。';
    setTimeout(()=>{btn.disabled=false;btn.textContent='↻ rescan';},60000);
  }catch(e){
    btn.disabled=false;btn.textContent='↻ rescan';
    msg.className='msg err';msg.textContent='提交失败：'+(e.message||e)+'（如果刚部署，可能 rescan webhook 还没上线）';
  }
}
async function confirmCand(id,country,suggested){const kw=prompt('给这个竞品一个监测关键词（下次抓取用）：',suggested||'');if(!kw)return;try{await hook({action:'confirm_candidate',id:id,keyword:kw,country:country||'KH',market:null});await loadAll();}catch(e){alert('确认失败：'+(e.message||e));}}
async function rejectCand(id){if(!confirm('拒绝这个候选？'))return;try{await hook({action:'reject_candidate',id:id});await loadAll();}catch(e){alert('拒绝失败：'+(e.message||e));}}
async function toggleBrand(id,val){try{await hook({action:'toggle_brand',id:id,is_active:val});logAction('watchlist','edit','brand#'+id+' → '+(val?'active':'off'));await loadAll();}catch(e){alert('切换失败：'+(e.message||e));}}
async function addCompetitor(){const kw=c_keyword.value.trim();const msg=document.getElementById('c_msg');if(!kw){msg.className='msg err';msg.textContent='请填 keyword';return;}c_btn.disabled=true;msg.className='msg';msg.textContent='提交中…';try{await hook({action:'add_competitor',keyword:kw,page_url:c_pageurl.value.trim()||null,country:c_country.value,market:c_market.value.trim()||null});msg.className='msg ok';msg.textContent='✓ 已加进监测列表';c_keyword.value='';c_pageurl.value='';c_market.value='';await loadAll();}catch(e){msg.className='msg err';msg.textContent='失败：'+(e.message||e);}c_btn.disabled=false;}
async function addCandidate(){const msg=document.getElementById('d_msg');d_btn.disabled=true;msg.className='msg';msg.textContent='提交中…';try{await hook({action:'add_candidate',page_name:d_page.value.trim()||null,page_url:d_pageurl.value.trim()||null,extracted_domain:d_domain.value.trim()||null,extracted_telegram:d_tg.value.trim()||null,country:d_country.value,note:d_note.value.trim()||null});msg.className='msg ok';msg.textContent='✓ 已加进候选池';d_page.value='';d_pageurl.value='';d_domain.value='';d_tg.value='';d_note.value='';await loadAll();}catch(e){msg.className='msg err';msg.textContent='失败：'+(e.message||e);}d_btn.disabled=false;}
function openAddCompetitor(){
  document.getElementById('d-title').textContent='添加竞品页面';
  document.getElementById('d-body').innerHTML=`
    <div class="acform"><h2>添加竞品页面 · 加入 Watchlist</h2>
    <div class="row2">
      <div class="fld"><label>Market <span style="color:var(--red)">*</span></label><select id="ac-market" onchange="acMarketFilter()"><option value="KH">KH (USC)</option><option value="MY">MY (INZ9)</option></select></div>
      <div class="fld"><label>归属竞品 <span style="color:var(--red)">*</span></label><select id="ac-comp" onchange="acCompToggle()"></select></div>
    </div>
    <div class="row" id="ac-newrow" style="display:none"><div class="fld"><label>新竞品名 <span style="color:var(--red)">*</span></label><input id="ac-newcomp" type="text" placeholder="例:BK8"></div></div>
    <div class="row"><div class="fld"><label>Page name <span style="color:var(--red)">*</span></label><input id="ac-name" type="text" placeholder="竞品页面名称"></div></div>
    <div class="row"><div class="fld"><label>Page URL <span style="color:var(--red)">*</span></label><input id="ac-url" type="text" placeholder="https://www.facebook.com/..."></div></div>
    <div class="row2">
      <div class="fld"><label>Keyword</label><input id="ac-kw" type="text" placeholder="例:win777"></div>
      <div class="fld"><label>Note</label><input id="ac-note" type="text"></div>
    </div>
    <div class="msg" id="ac-msg"></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn" id="ac-submit" onclick="submitAddCompetitor()">加入 Watchlist →</button>
      <button class="btn ghost" onclick="closeDrawer()">取消</button>
    </div></div>`;
  acMarketFilter();
  acAddWire();
  document.getElementById('drawer').classList.add('open');
  document.getElementById('ov').classList.add('show');
}
function acMarketFilter(){
  const mk=(document.getElementById('ac-market')||{}).value||'KH';
  const sel=document.getElementById('ac-comp');if(!sel)return;const cur=sel.value;
  const ops=[...new Set((operators||[]).filter(o=>(o.country||'').toUpperCase()===mk).map(o=>o.operator_name).filter(Boolean))].sort();
  sel.innerHTML='<option value="">— 选择已有竞品 —</option><option value="__new__">＋ 新竞品(新建)</option>'+ops.map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('');
  sel.value=[...sel.options].some(o=>o.value===cur)?cur:'';
  acCompToggle();
}
function acCompToggle(){
  const v=document.getElementById('ac-comp').value;
  document.getElementById('ac-newrow').style.display=(v==='__new__')?'flex':'none';
  acCheck();
}
function acCheck(){
  const comp=document.getElementById('ac-comp').value;
  const newc=document.getElementById('ac-newcomp');
  const compOk=comp&&(comp!=='__new__'||(newc&&newc.value.trim()));
  const name=document.getElementById('ac-name').value.trim();
  const url=document.getElementById('ac-url').value.trim();
  const ok=compOk&&name&&url;
  const btn=document.getElementById('ac-submit');
  btn.disabled=!ok;btn.style.opacity=ok?'1':'0.45';btn.style.cursor=ok?'pointer':'not-allowed';
}
function acAddWire(){
  ['ac-comp','ac-newcomp','ac-name','ac-url'].forEach(id=>{const el=document.getElementById(id);if(el){el.addEventListener('input',acCheck);el.addEventListener('change',acCheck);}});
  acCheck();
}
async function submitAddCompetitor(){
  const compSel=document.getElementById('ac-comp').value;
  const isNew=compSel==='__new__';
  const comp=isNew?document.getElementById('ac-newcomp').value.trim():compSel;
  const name=document.getElementById('ac-name').value.trim();
  const url=document.getElementById('ac-url').value.trim();
  const market=document.getElementById('ac-market').value;
  const kw=document.getElementById('ac-kw').value.trim();
  const note=document.getElementById('ac-note').value.trim();
  const msg=document.getElementById('ac-msg'),btn=document.getElementById('ac-submit');
  if(!comp||!name||!url){msg.className='msg err';msg.textContent='归属竞品、Page name、Page URL 必填';return;}
  btn.disabled=true;msg.className='msg';msg.textContent='提交中…';
  try{
    await hook({action:'add_competitor',operator_name:comp,is_new_competitor:isNew,page_name:name,page_url:url,country:market,keyword:kw||null,note:note||null,source:'manual'});
    msg.className='msg ok';msg.textContent='✓ 已加入 Watchlist'+(isNew?'(新竞品 '+comp+')':'(归到 '+comp+')');
    logAction('watchlist','add',name+(isNew?' ('+comp+')':''));
    await loadAll();
    setTimeout(closeDrawer,800);
  }catch(e){btn.disabled=false;msg.className='msg err';msg.textContent='失败：'+(e.message||e);}
}
async function hook(payload){if(WEBHOOK_URL.indexOf('PASTE_')===0)throw new Error('webhook 未配置');const res=await fetch(WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw new Error('HTTP '+res.status);return true;}

