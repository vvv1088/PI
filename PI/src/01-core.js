const ZH={'withdrawal_proof':'提款到账','big_win':'大赢展示','pain_reversal':'痛点反转','edu_compare':'科普对比','cs_convo':'客服对话','testimonial':'玩家见证','celebrity':'名人背书','promo_direct':'优惠直给','trust_safety':'信任安全','fast_payout':'提款速度','service':'服务质量','game_variety':'游戏种类','promo_value':'优惠力度','high_odds':'高赔率','license':'合法执照','real_person':'真人出镜','ugc':'用户自拍感','game_screenshot':'游戏画面截图','winner_showcase':'中奖/赢钱展示','animation':'动画/动效','official_design':'官方平面设计','ai_avatar':'数字人','VIDEO':'单一视频','IMAGE':'单一静态图','CAROUSEL':'多图轮播','DCO':'动态创意优化','tier_bonus':'分层红利','urgency':'限时紧迫','luck':'招财好运','prediction':'必中贴士','rebate':'返水 / 返现'};
let ideas=[];
let hypos=[];
let creatives=[];
let DICT={};
const DICT_NOTES={
 'Game Type':'游戏类型 = 这条素材/广告卖的是哪类产品(老虎机 / 真人 / 体育…)。既是我方素材标签,也是 CI 给竞品广告打的标。按 USC 实际有的玩法在月会增删。',
 'Persona':'⚠️ Persona = 人群原型(打给谁看的心理与动机)。仅月度规划会可新增;定向微调记录在测试层,不新建词条。',
 'Age Range':'年龄段固定几档,相邻档可多选组合(如 25-34 + 35-44 ≈ 25-44)。不允许自由输入区间,防止 20-40 / 21-41 这类碎片化重复。',
 'Capacity':'容量体检在创建测试保存时自动运行,结果(红/黄/绿)存档显示在 Hypotheses 列表。阈值修改权限:月度规划会。',
 'Customer Stage':'顾客阶段 = 这条假设/广告打的是漏斗哪一环(拉新→激活→留存→复购转化→唤回)。选它=声明「这次要解决转化漏斗的哪一步」;假设列表会显示对应徽章,也可按阶段筛选。顺序固定,增删权限:月度规划会。',
 'Watchlist Source':'竞品监测专用 · 描述一个竞品是「怎么进监测的」。注意:这≠「Idea Source」(想法池来源)——一个讲竞品入库,一个讲营销想法来源。',
 'CI Fields':'竞品监测专用 · Ads Library 表格里各列字段的定义,帮助读懂竞品看板。我方规划用不到。',
 'default':'词条只增不删(历史数据引用着它);「停用」后新记录不可选,旧记录不受影响,可随时「启用」恢复。增删与启停权限:月度规划会。'
};
let data={
 'OK188KH':{FDC:{base:10,cost:15,unit:'周均'},REG:{base:97,cost:3.2,unit:'月'},AFDA:{base:6.87,cost:null,unit:'$'},FDAMT:{base:68,cost:null,unit:'$/周'},'7-Day High-Value Rate':{base:8,cost:null,unit:'%',placeholder:true}},
 'INZ9':{FDC:{base:14,cost:11,unit:'周均'},REG:{base:140,cost:2.4,unit:'月'},AFDA:{base:9.2,cost:null,unit:'$'},FDAMT:{base:128,cost:null,unit:'$/周'}},
 '17WINKH':null,'SBKH':null
};
const sibling={'17WINKH':'OK188KH','SBKH':'OK188KH'};
let overdueOnly=false,dictTab='Format';
// Dictionary 里不在标签栏显示的类别(数据保留,只是不给点)——Metrics 表单不再从字典读,隐去以免占行
const HIDDEN_DICT_TABS=['Metrics'];

function go(v,el){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));
  document.getElementById('v-'+v).classList.add('on');
  document.querySelectorAll('.nitem').forEach(t=>t.classList.remove('on'));
  const ni=el||document.querySelector('.nitem[data-v="'+v+'"]');
  if(ni){ni.classList.add('on');const g=ni.closest('.grp');if(g)g.classList.remove('closed');}
  if(currentUser)applyPerms();
  window.scrollTo(0,0);
}
/* v72: 导航默认全收起,启动时只展开初始视图所在组 */
(function(){const ni=document.querySelector('.nitem.on');if(ni){const g=ni.closest('.grp');if(g)g.classList.remove('closed');}})();
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}

function filterOverdue(){overdueOnly=!overdueOnly;renderPool();}
async function archiveIdea(id){
  if(!confirm(id+' 确认归档?\n归档 = 存档不删除,但不会再做。区别于「搁置」(以后可能做)。'))return;
  try{const {error}=await db.from('ideas').update({status:'已归档',updated_at:new Date().toISOString()}).eq('code',id);if(error)throw error;}
  catch(e){alert('Archive failed: '+rpcErr(e));return;}
  logAction('idea','delete',id);await loadIdeas();toast(id+' 已归档');refreshOverdue();renderPool();
}
async function delIdea(id){
  const it=ideas.find(x=>x.id===id);if(!it)return;
  if(!can('idea','delete')){toast('当前岗位没有「删除想法」权限');return;}
  if(it.by!==((currentUser&&currentUser.name)||'')){toast('只能删除自己提出的想法');return;}
  if(hypos.some(h=>(h.idea||'').split(' ')[0]===id)){alert('该想法已衍生假设,不能删除');return;}
  if(!confirm('删除想法 '+id+'?不可恢复。'))return;
  try{const {error}=await db.from('ideas').delete().eq('code',id);if(error)throw error;}
  catch(e){alert('删除失败: '+rpcErr(e));return;}
  logAction('idea','delete',id);await loadIdeas();if(typeof refreshOverdue==='function')refreshOverdue();renderPool();toast(id+' 已删除');
}
function refreshOverdue(){
  const n=ideas.filter(i=>i.age>60&&i.st!=='已归档').length;
  document.getElementById('overdueStat').textContent=n;
  document.getElementById('overdueN').textContent=n+' 个想法躺池超过 60 天';
  document.getElementById('overdueBar').style.display=n?'flex':'none';
}
function renderPool(){
  const fs=document.getElementById('f-src').value,showArch=document.getElementById('f-arch').checked;
  const rows=ideas.filter(i=>(!fs||i.src===fs)&&(!overdueOnly||(i.age>60&&i.st!=='已归档'))&&(showArch||i.st!=='已归档')).map(i=>{
   const over=i.age>60&&i.st!=='已归档';
   const hc=hypos.filter(h=>(h.idea||'').split(' ')[0]===i.id).length;
   const spawned=hc>0||i.st==='已立假设'||i.st==='已转正';
   const stCls=i.st==='搁置'?'搁置':i.st==='已归档'?'已归档':spawned?'已沉淀':'草稿';
   const stTxt=i.st==='搁置'?'搁置':i.st==='已归档'?'已归档':spawned?('已立假设'+(hc>0?' ×'+hc:'')):'待评估';
   const canSpawn=i.st!=='搁置'&&i.st!=='已归档';
   return `
   <tr class="${over?'overdue':''} ${i.st==='已归档'?'archived':''}">
    <td><span class="code">${i.id}</span> &nbsp;${esc(i.txt)}</td>
    <td><span class="src src-${i.src}">${esc(i.src)}</span></td>
    <td>${i.tags.length?i.tags.map(t=>`<span class="tag" title="${esc(ZH[t]||t)}">${esc(t)}</span>`).join(''):'<span class="code" style="color:var(--ink3)">—</span>'}</td>
    <td><span class="pill pri-${i.pri}">${i.pri}</span></td>
    <td>${i.by==='AI'?'<span class="byai">AI</span>':esc(i.by)}</td>
    <td class="code">2026/${i.date}</td>
    <td>${over?`<span class="overdue-badge">${i.age}d 超期</span>`:`<span class="code">${i.age}d</span>`}</td>
    <td><span class="st st-${stCls}"><i></i>${stTxt}</span></td>
    <td style="white-space:nowrap">
      ${canSpawn?`<button class="btn ghost sm" data-perm="hypo:add" onclick="promote('${i.id}')">立假设</button>`:''}
      ${(i.st!=='已归档'&&i.by===((currentUser&&currentUser.name)||''))?`<button class="btn ghost sm" style="margin-left:4px" data-perm="idea:edit" onclick="openIdeaEditor('${i.id}')">编辑</button>`:''}
      ${(i.by===((currentUser&&currentUser.name)||'')&&hc===0&&i.st!=='已归档')?`<button class="btn danger sm" style="margin-left:4px" data-perm="idea:delete" onclick="delIdea('${i.id}')">删除</button>`:''}
      ${over?`<button class="btn danger sm" style="margin-left:4px" data-perm="idea:delete" onclick="archiveIdea('${i.id}')">归档</button>`:''}
    </td>
   </tr>`}).join('');
  document.getElementById('poolBody').innerHTML=rows||'<tr><td colspan="9" style="text-align:center;color:var(--ink3);padding:28px">没有符合条件的想法</td></tr>';
  // 统计卡:一个 idea 可对应多个假设 → 立假设率 = 有≥1个假设的 idea / 在池 idea
  const spawnedN=ideas.filter(i=>{const c=hypos.filter(h=>(h.idea||'').split(' ')[0]===i.id).length;return c>0||i.st==='已立假设'||i.st==='已转正';}).length;
  const live=ideas.filter(i=>i.st!=='已归档').length;
  const setT=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setT('stat-pool-total',ideas.filter(i=>i.st!=='已归档').length);
  setT('stat-promoted',spawnedN);
  setT('stat-rate',live?Math.round(spawnedN/live*100)+'%':'0%');
  setT('stat-fromci',ideas.filter(i=>i.src==='竞品情报').length);
}
/* New Hypothesis 重构(P1):测试维度白名单 = Dictionary 词表类别(单一事实源)。
   key 必须与 creatives 标签列名一致(format/hook/visual_style/offer/audience/age/game_type),裁判 P2 据此比对。 */
const TEST_DIMS=[
  {k:'format',label:'Format 形式'},
  {k:'hook',label:'Hook 钩子'},
  {k:'visual_style',label:'视觉风格'},
  {k:'offer',label:'Offer 优惠'},
  {k:'audience',label:'人群'},
  {k:'age',label:'年龄段'},
  {k:'game_type',label:'游戏类型'},
];
function dimLabel(k){const d=TEST_DIMS.find(x=>x.k===k);return d?d.label:(k||'');}
/* 指标按品牌方向锁定(只改「指标」区:主指标名单 + 防守底线 + 算法标注)。
   figure(目标值 / 护栏阈值 / 门槛)本期一律 TBD,不假填。 */
const HVR='7-Day High-Value Rate';      // OK188 高价值主指标
const DQF='Day-1 Quality Floor';        // OK188/17WIN 通用防守底线
const METRIC_FULL=[['FDC','FDC 首存人数'],['REG','REG 注册数'],['AFDA','AFDA 平均首存金额'],['FDAMT','FDAMT 首存总金额(合成)']];
const GUARD_FULL=['AFDA','FDC','CPA','D7CR'];
const BRAND_METRIC={
  'OK188KH':{metrics:[[HVR,HVR+'(7 天大脚率)']],lockMetric:true,guardLock:true},
  '17WINKH':{metrics:[['FDC','FDC 首存人数'],['CPA','CPA 单首存成本']],lockMetric:false,guardLock:true},
  'SBKH':{tbd:true},
};
function optsHtml(pairs,withUnsel){return (withUnsel?'<option value="">— unselected —</option>':'')+pairs.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('');}
function syncMetricByBrand(){
  const brand=(document.getElementById('hf-brand')||{}).value||'';
  const mSel=document.getElementById('hf-metric'),gSel=document.getElementById('hf-guard-m'),gOp=document.getElementById('hf-guard-op');
  if(!mSel||!gSel)return;
  const prevM=mSel.value,prevG=gSel.value,cfg=BRAND_METRIC[brand];
  // ---- 主指标 ----
  if(!brand){mSel.disabled=false;mSel.innerHTML=optsHtml([],true);}
  else if(cfg&&cfg.tbd){mSel.disabled=true;mSel.innerHTML='<option value="">待定(方向未定)</option>';mSel.value='';}
  else if(cfg){mSel.disabled=!!cfg.lockMetric;mSel.innerHTML=optsHtml(cfg.metrics,!cfg.lockMetric);if(cfg.lockMetric)mSel.value=cfg.metrics[0][0];}
  else{mSel.disabled=false;mSel.innerHTML=optsHtml(METRIC_FULL,true);}            // INZ9 / 其他:原样
  if(!mSel.disabled&&prevM&&[...mSel.options].some(o=>o.value===prevM))mSel.value=prevM;
  // ---- 防守底线 ----
  if(!brand){gSel.disabled=false;gSel.innerHTML=optsHtml([],true);if(gOp)gOp.disabled=false;}
  else if(cfg&&cfg.tbd){gSel.disabled=true;gSel.innerHTML='<option value="">待定</option>';gSel.value='';if(gOp)gOp.disabled=true;}
  else if(cfg&&cfg.guardLock){gSel.disabled=true;gSel.innerHTML=`<option value="${DQF}">${DQF}</option>`;gSel.value=DQF;if(gOp){gOp.value='>';gOp.disabled=true;}} // 指标名 + op『>』锁死;figure 仍可填
  else{gSel.disabled=false;gSel.innerHTML=optsHtml(GUARD_FULL.map(x=>[x,x]),true);if(gOp)gOp.disabled=false;if(prevG&&[...gSel.options].some(o=>o.value===prevG))gSel.value=prevG;}
}
function onBrandChange(){
  const brand=document.getElementById('hf-brand').value,cfg=BRAND_METRIC[brand];
  fillHfMarket(brand);   // v76:市场下拉 = 该品牌可投市场(INZ9 出 MY/SG,其余锁 USC)
  syncMetricByBrand();
  // 指标被替换的品牌(OK188/17WIN/SBKH):清空旧数值,不平移到新指标
  if(cfg){['hf-target','hf-pct','hf-guard-v'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});}
  updateAll();
}

