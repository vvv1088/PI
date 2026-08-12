/* ===== 权限 / 登录 / 操作记录 系统 ===== */
const PERM_SECTIONS=[
  {k:'watchlist',g:'CI',n:'Watchlist',acts:['add','edit','delete']},
  {k:'pending',g:'CI',n:'Pending List',acts:['edit','delete']},
  {k:'budget',g:'PI',n:'Budget Allocation',acts:['add','edit','delete']},
  {k:'idea',g:'PI',n:'Idea Pool',acts:['add','edit','delete']},
  {k:'hypo',g:'PI',n:'Hypotheses',acts:['add','edit','delete']},
  {k:'creative',g:'PI',n:'Creatives',acts:['add','edit','delete']},
  {k:'dict',g:'PI',n:'Dictionary',acts:['add','edit']}
];
const READ_ONLY=['Weekly Summary','Ads Library','Operators','Funnels','Results'];
const ACT_LABEL={add:'Add',edit:'Edit',delete:'Delete'};
function allPerms(v){const p={};PERM_SECTIONS.forEach(s=>{p[s.k]={};s.acts.forEach(a=>p[s.k][a]=v);});return p;}
/* ===== v83:四词统一权限模型(V 定)——view/add/edit/delete,两套系统一套标准。
 * 一张权限表按侧栏五大板块分组;kind:'mis'→role_permissions,'meta'→role_meta_permissions;
 * acts 之外的格子显示 —;view 所有行都有(关=整页从侧栏隐藏,UI 级控制,V 认可)。
 * MIS 纯浏览页(reports/gallery/…)首次获得按角色隐藏的能力,存 role_permissions 新 section。 ===== */
const PERM_MODEL=[
 {g:'Competitor Intelligence',rows:[
   {k:'reports',n:'Weekly Summary',kind:'mis',acts:[]},
   {k:'gallery',n:'Ads Library',kind:'mis',acts:[]},
   {k:'operators',n:'Operators',kind:'mis',acts:[]},
   {k:'funnel',n:'Funnels',kind:'mis',acts:[]},
   {k:'pending',n:'Pending List',kind:'mis',acts:['edit','delete']},
   {k:'watchlist',n:'Watchlist',kind:'mis',acts:['add','edit','delete']}]},
 {g:'Planning Intelligence',rows:[
   {k:'budget',n:'Budget Allocation',kind:'mis',acts:['add','edit','delete']},
   {k:'idea',n:'Idea Pool',kind:'mis',acts:['add','edit','delete']},
   {k:'hypo',n:'Hypotheses',kind:'mis',acts:['add','edit','delete']},
   {k:'creative',n:'Creatives',kind:'mis',acts:['add','edit','delete']},
   {k:'mplan',n:'Monthly Overview',kind:'mis',acts:[]},
   {k:'dict',n:'Dictionary',kind:'mis',acts:['add','edit']}]},
 {g:'Meta Assets',rows:[
   {k:'meta-overview',n:'Overview',kind:'mis',acts:[]},
   {k:'health',n:'Health',kind:'meta',acts:[]},
   {k:'rotation',n:'Rotation',kind:'meta',acts:['edit']},
   {k:'sop',n:'SOP Tasks',kind:'meta',acts:['add','edit']},
   {k:'brands',n:'Brands',kind:'meta',acts:['add','edit','delete']},
   {k:'business-managers',n:'Business Managers',kind:'meta',acts:['add','edit','delete']},
   {k:'pixels',n:'Pixels',kind:'meta',acts:['add','edit','delete']},
   {k:'ad-accounts',n:'Ad Accounts',kind:'meta',acts:['add','edit','delete']},
   {k:'developer-apps',n:'Developer Apps',kind:'meta',acts:['add','edit','delete']},
   {k:'tokens',n:'Tokens',kind:'meta',acts:['add','edit','delete']},
   {k:'pixel-shares',n:'Pixel Shares',kind:'meta',acts:['edit']}]},
 {g:'Analytics',rows:[
   {k:'perf-loop',n:'Closed-Loop Report',kind:'mis',acts:[]},
   {k:'analytics-spending',n:'Spending',kind:'meta',acts:['edit']},
   {k:'results',n:'Results',kind:'mis',acts:[]},
   {k:'analytics-accounts',n:'Account Overview',kind:'meta',acts:[]},
   {k:'analytics-ads',n:'Our Ads',kind:'meta',acts:[]},
   {k:'analytics-brands',n:'Brand Comparison',kind:'meta',acts:[]},
   {k:'analytics-lifecycle',n:'Asset Lifecycle',kind:'meta',acts:[]}]},
 {g:'Administration',rows:[
   {k:'users',n:'Users(Meta 账号)',kind:'meta',acts:['add','edit','delete']},
   {k:'action-logs',n:'Activity Log(Meta 侧)',kind:'meta',acts:[]}]},
];
/* 视图 id → 权限行(导航按 view 隐藏用;meta key 的视图映射在 mis-meta-api.js MIS_META_KEYS) */
const VIEW_PERM_MIS={reports:'reports',gallery:'gallery',operators:'operators',funnel:'funnel',
  candidates:'pending',watch:'watchlist',budget:'budget',pool:'idea',hypo:'hypo',creatives:'creative',
  mplan:'mplan',results:'results',dict:'dict','perf-loop':'perf-loop','mm-dash':'meta-overview'};
let roles=[];            /* hydrated from Supabase on login */
let users=[];            /* hydrated from Supabase on login */
let currentUser=null, auditLog=[];
const AUTH_DOMAIN='@nexmax.local';
async function loadAuthData(){
  const [rs,rps,ps,au,rmp]=await Promise.all([
    db.from('roles').select('*'),
    db.from('role_permissions').select('*'),
    db.from('profiles').select('*'),
    db.auth.getUser(),
    db.from('role_meta_permissions').select('*')   // v81:docs/05 Meta 维度权限
  ]);
  const rpRows=rps.data||[],rmpRows=(rmp&&rmp.data)||[];
  roles=(rs.data||[]).map(r=>{
    const perms={};
    // v83:view 缺列/缺行时默认 true(存量行为不变);add/edit/delete 缺省 false
    rpRows.filter(x=>x.role_id===r.id).forEach(x=>{perms[x.section]={view:x.can_view!==false,add:!!x.can_add,edit:!!x.can_edit,delete:!!x.can_delete};});
    PERM_SECTIONS.forEach(s=>{perms[s.k]=perms[s.k]||{};});
    const metaPerms={};
    rmpRows.filter(x=>x.role_id===r.id).forEach(x=>{metaPerms[x.meta_key]={view:x.can_view!==false,add:!!x.can_add,edit:!!x.can_edit,delete:!!x.can_delete};});
    return {id:r.id,key:r.key,name:r.name,admin:!!r.is_admin,perms:perms,metaPerms:metaPerms};
  });
  users=(ps.data||[]).map(p=>({id:p.id,username:p.username,name:p.name,roleId:p.role_id}));
  const uid=(au&&au.data&&au.data.user)?au.data.user.id:null;
  currentUser=uid?(users.find(x=>x.id===uid)||null):null;
  try{if(typeof misApplyMetaNav==='function')misApplyMetaNav();}catch(e){}
}
function renderResults(){
  const el=document.getElementById('resultsBody');if(!el)return;
  const judged=(hypos||[]).filter(h=>h&&h.verdict&&h.verdict.conf!=='勉强');
  if(!judged.length){
    el.innerHTML='<div class="card"><div class="empty" style="padding:26px 18px;line-height:1.9">还没有已判定的假设。<br>Results 会从 <b>Hypotheses</b> 的判定结果自动汇总 —— 按来源 / Hook / Visual Style / 主指标统计胜率(同类案例 ≥5 条才显示百分比)。<br><span style="color:var(--ink3)">现在 hypotheses = 0,所以这里是空的。</span></div></div>';
    return;
  }
  // 判定对象 {res,conf}: res 精确等于「成立」才算赢(避免「不成立」被子串误判); conf=勉强 不计入
  const won=v=>{const r=(v&&(v.res||v.result||v.outcome))||'';return (''+r).trim()==='成立'||/^(win|pass)$/i.test((''+r).trim());};
  function bucket(keyFn,title){
    const m={};judged.forEach(h=>{const k=keyFn(h);if(!k)return;(m[k]=m[k]||{n:0,w:0});m[k].n++;if(won(h.verdict))m[k].w++;});
    const ks=Object.keys(m);
    let rows=ks.map(k=>{const b=m[k];const enough=b.n>=5;const w=enough?Math.round(b.w/b.n*100):0;const right=enough?(b.w+' / '+b.n+' · '+w+'%'):'<span class="locked">'+b.n+' 条 · 攒满 5 条后显示</span>';return '<div class="barrow"><span class="tag">'+esc(k)+'</span><div class="track"><div class="fillb" style="width:'+w+'%"></div></div><span>'+right+'</span></div>';}).join('');
    return '<div class="card"><h3>'+title+'</h3>'+(rows||'<div class="empty">暂无</div>')+'</div>';
  }
  el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+
    bucket(h=>{const p=(''+(h.idea||'')).split('·');return p[1]?p[1].trim():null;},'来源胜率 Source Win Rate')+
    bucket(h=>h.hook,'Hook 战绩')+
    bucket(h=>h.vs,'Visual Style 战绩')+
    bucket(h=>h.metric,'主指标胜率')+
    '</div>';
}
function openIdeaEditor(id){
  const isNew=!id;
  if(!can('idea',isNew?'add':'edit')){toast('当前岗位没有「'+(isNew?'新增':'编辑')+'想法」权限');return;}
  const it=isNew?null:ideas.find(x=>x.id===id);
  if(!isNew&&!it){toast('找不到该想法');return;}
  if(!isNew&&it&&it.by!==((currentUser&&currentUser.name)||'')){toast('只能编辑自己提出的想法');return;}
  window._editIdea=it?{id:it.id}:null;
  const srcList=(DICT['Idea Source']||[]).filter(x=>x.on);
  let srcOpts=srcList.map(x=>'<option value="'+esc(x.n)+'"'+(it&&it.src===x.n?' selected':'')+'>'+esc(x.c)+' '+esc(x.n)+'</option>').join('');
  if(!srcOpts)srcOpts='<option value="原创直觉">ORIGINAL 原创直觉</option>';
  if(it&&it.src&&!srcList.some(x=>x.n===it.src))srcOpts='<option value="'+esc(it.src)+'" selected>'+esc(it.src)+'</option>'+srcOpts;
  const sel=(it&&it.tags)||[];
  const hooks=(DICT['Hook']||[]).filter(x=>x.on);
  const tagOpts=hooks.length?hooks.map(o=>'<label class="tagopt"><input type="checkbox" value="'+esc(o.c)+'"'+(sel.indexOf(o.c)>=0?' checked':'')+'><span class="tc">'+esc(o.c)+'</span>'+esc(o.n)+'</label>').join(''):'<span class="sm" style="color:var(--ink3)">Hook 词表为空 — 先去 Dictionary 添加</span>';
  let h='<h2>'+(isNew?'新增想法':'编辑想法 · '+esc(it.id))+'</h2>';
  h+='<div class="fld" style="margin-bottom:12px"><label>想法(一句话)</label><textarea id="ni-txt" placeholder="例:真人出镜「秒提款」角度">'+(it?esc(it.txt):'')+'</textarea></div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>来源 Source</label><select id="ni-src">'+srcOpts+'</select></div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>优先级 Priority</label><select id="ni-pri">'+['高','中','低'].map(p=>'<option'+(((it&&it.pri)||'中')===p?' selected':'')+'>'+p+'</option>').join('')+'</select></div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>Tag(必填 · 多选,来自 Hook 词表)</label><div id="ni-tags" class="tagpick">'+tagOpts+'</div><small style="color:var(--ink3);margin-top:5px">手动想法需自己选 Tag(必填);只有 AI 从 CI 拉的想法才自动打 Tag。</small></div>';
  h+='<div style="display:flex;gap:8px;margin-top:8px"><button class="btn ghost" onclick="guard(()=>saveIdea())">保存</button><button class="btn ghost" onclick="closeDrawer()">取消</button></div>';
  document.getElementById('d-title').textContent=isNew?'新增想法':'编辑想法';
  document.getElementById('d-body').innerHTML=h;
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
async function saveIdea(){
  const ed=window._editIdea;
  const txt=(document.getElementById('ni-txt').value||'').trim();
  if(!txt){alert('请填写想法内容');return;}
  const src=document.getElementById('ni-src').value||'原创直觉';
  const pri=document.getElementById('ni-pri').value||'中';
  const tags=[...document.querySelectorAll('#ni-tags input:checked')].map(x=>x.value);
  if(!tags.length){alert('请至少选一个 Tag（手动想法 Tag 必填）');return;}
  try{
    if(ed&&ed.id){
      const {error}=await db.from('ideas').update({txt:txt,src:src,pri:pri,tags:tags,updated_at:new Date().toISOString()}).eq('code',ed.id);
      if(error)throw error;
      logAction('idea','edit',ed.id);window._editIdea=null;
      await loadIdeas();closeDrawer();if(typeof refreshOverdue==='function')refreshOverdue();renderPool();applyPerms();toast('已更新 '+ed.id);
    }else{
      const {data,error}=await db.from('ideas').insert({txt:txt,src:src,tags:tags,pri:pri,status:'待评估',created_by:(currentUser&&currentUser.name)||''}).select('code').single();
      if(error)throw error;
      logAction('idea','add',data.code);
      await loadIdeas();closeDrawer();if(typeof refreshOverdue==='function')refreshOverdue();renderPool();applyPerms();toast('已加入 Idea Pool '+data.code+' · '+src);
    }
  }catch(e){alert((ed?'Update':'Add')+' failed: '+rpcErr(e));}
}
function rpcErr(e){const m=(e&&e.message)||String(e);const map={NOT_ASSIGNED:'这格没有分工给你',NOT_DECIDER:'只有决策人可操作',REASON_REQUIRED:'必须填写理由',LOCKED:'已定并锁定,需决策人重开',BAD_AMOUNT:'金额无效',NOT_AUTHORIZED:'You are not an admin',USERNAME_REQUIRED:'Username required',PASSWORD_TOO_SHORT:'Password too short (min 4)',ROLE_NOT_FOUND:'Role not found',USERNAME_EXISTS:'Username already exists',CANNOT_DELETE_SELF:'Cannot delete yourself',USER_NOT_FOUND:'User not found'};for(const k in map){if(m.indexOf(k)>=0)return map[k];}return m;}
function showLogin(){document.getElementById('loginGate').style.display='block';}
async function loadPIData(){await Promise.all([loadDict(),loadIdeas(),loadHypos(),loadCreatives(),loadBudgets(),loadMonthlyPlans()]);}

