/* ===== Monthly Plan:当月总览 + 确认 ===== */
let monthlyPlans=[],mpMonth='';
async function loadMonthlyPlans(){try{const {data,error}=await db.from('monthly_plans').select('*');if(error)throw error;monthlyPlans=data||[];}catch(e){monthlyPlans=[];}}
function mpMonthOfLaunch(h){const d=parseMD(h.planLaunch||'');return d?d.toLocaleString('en-US',{month:'short'})+' '+d.getFullYear():(h.month||'');}
function renderMonthlyPlan(){
  const sel=document.getElementById('mp-month');if(!sel)return;
  const set={};set[bgCurMonth()]=1;budgets.forEach(b=>{if(b.month)set[b.month]=1;});hypos.forEach(h=>{const m=mpMonthOfLaunch(h);if(m)set[m]=1;});
  const arr=Object.keys(set).sort((a,b)=>new Date('1 '+b)-new Date('1 '+a));
  if(!mpMonth||arr.indexOf(mpMonth)<0)mpMonth=bgCurMonth();   // 默认永远=当前月(此前取 arr[0] 会跳到排期最远的月份,v65 修)
  sel.innerHTML=arr.map(m=>`<option${m===mpMonth?' selected':''}>${m}</option>`).join('');
  const fb=(document.getElementById('mp-brand')||{value:''}).value;
  const allBrands=allMktBrands().filter(x=>!fb||x===fb);
  document.getElementById('mpBanner').innerHTML='';
  let okBudget=0,nHypo=0,nReady=0,issues=[];window._mpBrandIssues={};
  document.getElementById('mpBody').innerHTML=allBrands.map(br=>{
    const e=bgEntry(mpMonth,br)||{},a=bgAssign(br);
    const stt=bgStatus(e),st=BG_ST[stt],fin=bgFinalAmt(e);
    const bIssues=[];
    if(fin!=null)okBudget++;else bIssues.push('预算未定('+st[0]+')');
    const hs=hypos.filter(h=>h.brand===br&&mpMonthOfLaunch(h)===mpMonth);
    nHypo+=hs.length;
    const rows=hs.map(h=>{
      const cr=creatives.filter(c=>(c.hyp||'').startsWith(h.id));
      const ready=(h.lockedTags&&h.lockedTags._locked)||['已锁定','测试中','已沉淀'].includes(h.st);
      if(ready)nReady++;else bIssues.push(h.id+' 未锁定('+h.st+')');
      return `<tr class="click" onclick="gotoHypo('${h.id}')">
        <td><span class="code">${h.id}</span> ${esc(h.x)}</td>
        <td>${h.stage?`<span class="pill" style="background:${stageColor(h.stage)[0]};color:${stageColor(h.stage)[1]};font-size:11px">◑ ${esc(stageZh(h.stage))}</span>`:'—'}</td>
        <td class="bgro">${h.planLaunch?fmtMD(parseMD(h.planLaunch)):'—'}${h.planDays?' · '+h.planDays+'天':''}</td>
        <td>${cr.length} 条素材</td><td>${esc(h.owner||'—')}</td>
        <td><span class="st st-${h.st}"><i></i>${h.st}</span></td></tr>`;
    }).join('');
    issues.push.apply(issues,bIssues.map(x=>br+' '+x));window._mpBrandIssues[br]=bIssues;
    const conf=monthlyPlans.find(x=>x.month===mpMonth&&x.brand===br);
    const canSend=bgIsAdmin()||a.mkt===bgMe();
    return `<div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h3 style="margin:0"><span class="link" onclick="goBrand('${br}')" title="品牌全景(资产/花费/CAPI)">${br}</span></h3>
        <div style="display:flex;gap:10px;align-items:center;font-size:12.5px">
          <span class="bgro">${fin!=null?'预算 <b>'+bgMoney(fin)+'</b>':'预算 —'}</span>
          <span class="bgst" style="background:${st[1]};color:${st[2]}">${st[0]}</span>
          ${conf?`<span class="bgst" style="background:var(--green-bg);color:var(--green)" title="${new Date(conf.confirmed_at).toLocaleString('zh-CN')}">✔ 已确认 · ${esc(bgUserName(conf.confirmed_by))}</span>`:''}
          ${canSend?`<button class="btn ghost sm" onclick="guard(()=>confirmMonthlyPlan('${br}'))">${conf?'重发':'✔ 确认发送'}</button>`:''}
        </div>
      </div>
      ${hs.length?`<table style="margin-top:10px"><thead><tr><th>Hypothesis</th><th style="width:96px">Stage</th><th style="width:120px">Schedule</th><th style="width:90px">Creatives</th><th style="width:80px">Owner</th><th style="width:90px">Status</th></tr></thead><tbody>${rows}</tbody></table>`
        :'<div style="color:var(--ink3);padding:10px 0 2px">该月暂无排期假设</div>'}
    </div>`;
  }).join('');
  const stat=(v,l)=>`<div class="stat"><b>${v}</b><label>${l}</label></div>`;
  document.getElementById('mpStrip').innerHTML=
    stat(okBudget+'/'+allBrands.length,'预算已定 Budgets Final')+stat(nHypo,'排期假设 Planned Tests')+
    stat(nReady+'/'+nHypo,'已锁定 Locked')+stat(issues.length,'待处理 Issues');
  window._mpIssues=issues;
}
async function confirmMonthlyPlan(br){
  const a=bgAssign(br);
  if(!(bgIsAdmin()||a.mkt===bgMe())){toast('只有 '+bgUserName(a.mkt)+'(该品牌 Marketing 负责人)或 Admin 可确认发送');return;}
  const issues=(window._mpBrandIssues||{})[br]||[];
  if(issues.length&&!confirm(br+' 还有 '+issues.length+' 项未就绪:\n· '+issues.join('\n· ')+'\n\n仍要确认发送?'))return;
  if(monthlyPlans.find(x=>x.month===mpMonth&&x.brand===br)&&!confirm(br+' 本月已确认过,再次确认会重发通知。继续?'))return;
  const e=bgEntry(mpMonth,br)||{};
  const summary={month:mpMonth,brand:br,final:bgFinalAmt(e),owners:a,tests:hypos.filter(h=>h.brand===br&&mpMonthOfLaunch(h)===mpMonth).map(h=>({code:h.id,x:h.x,stage:h.stage,launch:h.planLaunch,days:h.planDays,owner:h.owner,st:h.st}))};
  try{const {error}=await db.from('monthly_plans').upsert({month:mpMonth,brand:br,confirmed_by:bgMe(),confirmed_at:new Date().toISOString(),summary:summary},{onConflict:'month,brand'});if(error)throw error;}
  catch(e2){toast('确认失败: '+rpcErr(e2));return;}
  const idx=monthlyPlans.findIndex(x=>x.month===mpMonth&&x.brand===br);
  const rec={month:mpMonth,brand:br,confirmed_by:bgMe(),confirmed_at:new Date().toISOString(),summary:summary};
  if(idx>=0)monthlyPlans[idx]=rec;else monthlyPlans.push(rec);
  logAction('budget','确认计划',br+' '+mpMonth);
  misNotify({kind:'plan_confirmed',by:bgMe(),summary:summary});
  if(window.__DEMO__)toast('📨(演示)'+br+' 已确认 — Slack 接入后自动通知');else toast('✔ '+br+' '+mpMonth+' 计划已确认(Slack 通知待接入)');
  renderMonthlyPlan();
}
/* ===== Budget:分工到人 + 申请/核批/决策 + 自动投放 + 留痕 ===== */
let budgets=[],bgMonth='',budgetAssign={};
// 分工兜底默认(生产从 budget_assignments 表读;读不到用这套)。决策人全为 zq。
const BG_DEFAULT_ASSIGN={
  'OK188KH':{mkt:'joey',usc:'anna',decider:'zq'},
  '17WINKH':{mkt:'bryan',usc:'jk',decider:'zq'},
  'SBKH':{mkt:'bryan',usc:'wj',decider:'zq'},
  'INZ9':{mkt:'joey',usc:'',decider:'zq'}
};
function bgCurMonth(){const n=new Date();return n.toLocaleString('en-US',{month:'short'})+' '+n.getFullYear();}
async function loadBudgets(){
  try{const {data,error}=await db.from('budgets').select('*');if(error)throw error;budgets=data||[];}catch(e){budgets=[];showErr('budgets 加载失败: '+(e.message||e));}
  try{const {data,error}=await db.from('budget_assignments').select('*');if(error)throw error;
    budgetAssign={};(data||[]).forEach(r=>{budgetAssign[r.brand]={mkt:r.mkt_user||'',usc:r.usc_user||'',decider:r.decider_user||''};});
    if(!Object.keys(budgetAssign).length)budgetAssign=JSON.parse(JSON.stringify(BG_DEFAULT_ASSIGN));
  }catch(e){budgetAssign=JSON.parse(JSON.stringify(BG_DEFAULT_ASSIGN));}
}
function bgAssign(br){return budgetAssign[br]||BG_DEFAULT_ASSIGN[br]||{mkt:'',usc:'',decider:''};}
function bgUserName(un){if(!un)return '—';const u=users.find(x=>x.username===un);return u?u.name:un;}
function bgMe(){return currentUser?currentUser.username:'';}
function bgIsAdmin(){const r=curRole();return !!(r&&r.admin);}
function bgCanEdit(br,side){if(bgIsAdmin())return true;if(!can('budget','edit'))return false;const a=bgAssign(br);return !!a[side]&&a[side]===bgMe();}
function bgNum(v){return (v==null||v==='')?null:+v;}
function bgMoney(n){return (n==null)?'—':'$'+Number(n).toLocaleString('en-US');}
function bgEntry(mo,br){return budgets.find(b=>b.month===mo&&b.brand===br)||null;}
// 已投放自动汇总:该品牌当月所有素材 run 的 spend 之和(ISO 周归到月)
function isoWeekMonthLabel(w){const m=(''+w).match(/^(\d{4})-W(\d{1,2})$/);if(!m)return '';const y=+m[1],wk=+m[2];
  const simple=new Date(y,0,1+(wk-1)*7),dow=simple.getDay(),monday=new Date(simple);
  if(dow<=4)monday.setDate(simple.getDate()-dow+1);else monday.setDate(simple.getDate()+8-dow);
  return monday.toLocaleString('en-US',{month:'short'})+' '+monday.getFullYear();}
function bgSpent(br,mo){let s=0;(creatives||[]).forEach(c=>{const h=hypos.find(x=>(c.hyp||'').startsWith(x.id));if(!h||h.brand!==br)return;(c.runs||[]).forEach(r=>{if(isoWeekMonthLabel(r.week)===mo)s+=(+r.spend||0);});});return s;}
// 状态 + 最终金额
function bgStatus(e){e=e||{};const req=bgNum(e.requested),all=bgNum(e.allocated),fin=bgNum(e.final_amount);
  if(fin!=null)return 'settled';
  if(req==null&&all==null)return 'empty';
  if(req!=null&&all==null)return 'await_usc';
  if(req==null&&all!=null)return 'await_mkt';   // USC 先填:等 Marketing 申请,不能直接算已定
  if(all<req)return 'decide';
  return 'settled';}
function bgFinalAmt(e){e=e||{};const fin=bgNum(e.final_amount);if(fin!=null)return fin;const all=bgNum(e.allocated),req=bgNum(e.requested);if(all!=null&&req!=null&&all>=req)return all;return null;}
const BG_ST={empty:['待填','var(--bg2)','var(--ink3)'],await_usc:['待核批','var(--accent-soft)','var(--accent)'],await_mkt:['待申请','var(--accent-soft)','var(--accent)'],decide:['待决策','var(--amber-bg)','var(--amber)'],settled:['已定','var(--green-bg)','var(--green)']};
function bgLocked(e){return bgNum(e&&e.final_amount)!=null;} // 决策拍板后锁
function bgNextMonth(){const n=new Date();const d=new Date(n.getFullYear(),n.getMonth()+1,1);return d.toLocaleString('en-US',{month:'short'})+' '+d.getFullYear();}
function bgFillMonths(){
  const sel=document.getElementById('bg-month');if(!sel)return;
  const set={};set[bgCurMonth()]=1;budgets.forEach(b=>{if(b.month)set[b.month]=1;});
  /* v72(V 定):每月 15 号起出现下月并默认选中,预算链(申请→核批→决策)可提前走完,与瓶颈催办节奏衔接 */
  const preOpen=new Date().getDate()>=15;
  if(preOpen)set[bgNextMonth()]=1;
  const arr=Object.keys(set).sort((a,b)=>new Date('1 '+b)-new Date('1 '+a));
  if(!bgMonth||arr.indexOf(bgMonth)<0)bgMonth=preOpen?bgNextMonth():(arr.indexOf(bgCurMonth())>=0?bgCurMonth():arr[0]);
  sel.innerHTML=arr.map(m=>`<option${m===bgMonth?' selected':''}>${m}</option>`).join('');
}
// 金额格(申请/核批):显示金额 + 谁·理由;分工到的人(且未锁)点 ✏️ 开表单填「金额+理由」
function bgAmtCell(e,mo,br,side){
  const field=side==='mkt'?'requested':'allocated';
  const val=bgNum(e[field]),by=e[field+'_by'],reason=e[field+'_reason'];
  const canEdit=bgCanEdit(br,side)&&!bgLocked(e);
  let top;
  if(val!=null)top=`<span class="bgro"><b>${bgMoney(val)}</b></span>`+(canEdit?` <a class="bglink" onclick="bgEditCell('${mo}','${br}','${side}')" title="编辑金额/理由">✏️</a>`:'');
  else top=canEdit?`<button class="btn ghost sm" onclick="bgEditCell('${mo}','${br}','${side}')">✏️ 填写</button>`:'<span class="bgro" style="color:var(--ink3)">—</span>';
  let sub='';
  if(val!=null)sub=`<div class="bgsub">${esc(bgUserName(by))}${reason?` · <span title="${esc(reason)}">${esc(reason.length>14?reason.slice(0,14)+'…':reason)}</span>`:''}</div>`;
  else sub=`<div class="bgsub" style="color:var(--ink3)">${canEdit?'待你填':'待 '+esc(bgUserName(bgAssign(br)[side]))}</div>`;
  return top+sub;
}
// 填写入口:一个抽屉,金额 + 理由一起填
function bgEditCell(mo,br,side){
  if(!bgCanEdit(br,side)){toast('你没有被分工到这个格子');return;}
  const e=bgEntry(mo,br)||{};
  if(bgLocked(e)){toast('已定并锁定,需决策人「重开」后再改');return;}
  const field=side==='mkt'?'requested':'allocated';
  const label=side==='mkt'?'Marketing 申请':'USC 核批';
  const cur=bgNum(e[field]),reason=e[field+'_reason']||'',req=bgNum(e.requested);
  let h='<h2 style="margin:0 0 4px">'+esc(br)+' · '+esc(mo)+'</h2><div style="color:var(--ink3);font-size:13px;margin-bottom:16px">'+label+'</div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>金额 <span style="color:var(--red)">(必填)</span></label><input id="bg-amt" type="number" min="0" step="100" value="'+(cur==null?'':cur)+'" placeholder="如 20000"></div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>理由 <span style="color:var(--red)">(必填)</span></label><textarea id="bg-reason" style="width:100%;min-height:70px" placeholder="为什么是这个数">'+esc(reason)+'</textarea></div>';
  if(side==='usc'&&req!=null)h+='<div style="color:var(--ink3);font-size:12px;margin-bottom:12px">参考:Marketing 申请 '+bgMoney(req)+'</div>';
  h+='<div style="display:flex;gap:8px"><button class="btn ghost" onclick="guard(()=>bgSaveCell(\''+mo+'\',\''+br+'\',\''+side+'\'))">保存</button><button class="btn ghost" onclick="closeDrawer()">取消</button></div>';
  document.getElementById('d-title').textContent='填写预算';
  document.getElementById('d-body').innerHTML=h;
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
// 并发保护:保存前比对 DB 的 updated_at,别人刚改过就拦下并刷新
async function bgStale(mo,br,cached){
  try{const {data}=await db.from('budgets').select('updated_at').eq('month',mo).eq('brand',br);
    const dbAt=data&&data[0]&&data[0].updated_at;
    if(dbAt&&cached&&cached.updated_at&&dbAt!==cached.updated_at){await loadBudgets();renderBudget();toast('这格刚被别人更新过,已刷新为最新值,请基于新值再改');return true;}
  }catch(e){}
  return false;
}
async function bgSaveCell(mo,br,side){
  const field=side==='mkt'?'requested':'allocated';
  if(!bgCanEdit(br,side)){toast('你没有被分工到这个格子');return;}
  const raw=document.getElementById('bg-amt').value;
  const v=bgNum(raw);
  if(raw===''||v==null||isNaN(v)||v<0){toast('金额必填(非负数字)');return;}
  const reason=(document.getElementById('bg-reason').value||'').trim();
  if(!reason){toast('理由必填');return;}
  let e=bgEntry(mo,br)||{};
  if(bgEntry(mo,br)&&await bgStale(mo,br,bgEntry(mo,br))){closeDrawer();return;}
  const patch={month:mo,brand:br};patch[field]=v;patch[field+'_by']=bgMe();patch[field+'_reason']=reason;patch[field+'_at']=new Date().toISOString();patch.updated_at=new Date().toISOString();
  const prev=bgStatus(e),after=bgStatus(Object.assign({},e,patch));
  try{const {error}=await db.rpc('budget_save_cell',{p_month:mo,p_brand:br,p_side:side,p_amount:v,p_reason:reason});if(error)throw error;
    if(bgEntry(mo,br))Object.assign(e,patch);else budgets.push(patch);
  }catch(err){toast('保存失败: '+rpcErr(err));return;}
  logAction('budget',field==='requested'?'申请':'核批',br+' '+mo+' '+bgMoney(v));
  closeDrawer();
  if(after==='decide'&&prev!=='decide')bgSlack('decide',bgEntry(mo,br),br,mo);
  else if(after==='settled'&&prev!=='settled')bgSlack('settled',bgEntry(mo,br),br,mo);
  renderBudget();
}
async function bgReopen(mo,br){
  const a=bgAssign(br);if(!(bgIsAdmin()||a.decider===bgMe())){toast('只有决策人('+bgUserName(a.decider)+')或 Admin 可重开');return;}
  if(!confirm('重开会清除最终决定,回到可编辑状态。确认?'))return;
  const patch={final_amount:null,final_by:null,final_reason:null,decided_at:null};
  try{const {error}=await db.rpc('budget_reopen',{p_month:mo,p_brand:br});if(error)throw error;const e=bgEntry(mo,br);if(e)Object.assign(e,patch);}
  catch(err){toast('保存失败: '+rpcErr(err));return;}
  logAction('budget','重开',br+' '+mo);toast('已重开,可重新编辑');renderBudget();
}
function renderBudget(){
  bgFillMonths();bgRenderDemoBar();
  const allBrands=allMktBrands();
  let tReq=0,tAll=0,tFin=0,tSp=0;
  document.getElementById('budgetBody').innerHTML=allBrands.map(br=>{
    const e=bgEntry(bgMonth,br)||{},a=bgAssign(br);
    const req=bgNum(e.requested),all=bgNum(e.allocated),fin=bgFinalAmt(e),sp=bgSpent(br,bgMonth);
    tReq+=req||0;tAll+=all||0;tFin+=fin||0;if(fin!=null)tSp+=sp;   // 使用率口径:只计已定品牌
    const stt=bgStatus(e),st=BG_ST[stt];
    const usePct=(fin)?Math.round(sp/fin*100):null;
    let finCell;
    if(stt==='decide'){
      finCell=(bgIsAdmin()||a.decider===bgMe())
        ?`<button class="btn sm" style="background:var(--red);color:#fff;border-color:var(--red)" onclick="bgDecide('${bgMonth}','${br}')">决策</button>`
        :`<span class="bgro" style="color:var(--amber)">待 ${esc(bgUserName(a.decider))} 决策</span>`;
    }else if(fin!=null){
      const decided=bgNum(e.final_amount)!=null,canReopen=decided&&(bgIsAdmin()||a.decider===bgMe());
      finCell=`<span class="bgro"><b>${bgMoney(fin)}</b></span>`+(canReopen?` <a class="bglink" onclick="bgReopen('${bgMonth}','${br}')" title="清除决定,回到可编辑">重开</a>`:'')+(decided?`<div class="bgsub">${esc(bgUserName(e.final_by))}${e.final_reason?` · <span title="${esc(e.final_reason)}">${esc(e.final_reason.length>14?e.final_reason.slice(0,14)+'…':e.final_reason)}</span>`:''}</div>`:'');
    }else finCell='<span class="bgro" style="color:var(--ink3)">—</span>';
    return `<tr>
      <td><b class="link" onclick="goBrand('${br}')" title="品牌全景(资产/花费/CAPI)">${br}</b></td>
      <td>${bgAmtCell(e,bgMonth,br,'mkt')}</td>
      <td>${bgAmtCell(e,bgMonth,br,'usc')}</td>
      <td><span class="bgst" style="background:${st[1]};color:${st[2]}">${st[0]}</span></td>
      <td>${finCell}</td>
      <td><span class="bgro">${sp?bgMoney(sp):'—'}</span></td>
      <td>${usePct==null?'<span class="bgro" style="color:var(--ink3)">—</span>':`<span class="bgro" style="color:${usePct>100?'var(--red)':usePct>85?'var(--amber)':'var(--green)'}">${usePct}%</span>`}</td>
      <td><button class="btn ghost sm" title="看时间线" onclick="bgHistory('${bgMonth}','${br}')">历史</button></td>
    </tr>`;
  }).join('');
  const stat=(v,l)=>`<div class="stat"><b>${v}</b><label>${l}</label></div>`;
  document.getElementById('bgStrip').innerHTML=
    stat('$'+tReq.toLocaleString('en-US'),'总申请 Requested')+stat('$'+tAll.toLocaleString('en-US'),'总核批 Approved')+
    stat('$'+tFin.toLocaleString('en-US'),'最终合计 Final')+stat('$'+tSp.toLocaleString('en-US'),'已投放 Spent')+
    stat(tFin?Math.round(tSp/tFin*100)+'%':'—','使用率 Utilization');
}
// 最终决策:抽屉表单(与填写格同风格),原因必填
function bgDecide(mo,br){
  const a=bgAssign(br);
  if(!(bgIsAdmin()||a.decider===bgMe())){toast('只有决策人('+bgUserName(a.decider)+')或 Admin 可拍板');return;}
  const e=bgEntry(mo,br)||{},req=bgNum(e.requested),all=bgNum(e.allocated);
  let h='<h2 style="margin:0 0 4px">'+esc(br)+' · '+esc(mo)+'</h2><div style="color:var(--ink3);font-size:13px;margin-bottom:16px">最终决策(申请与核批不一致)</div>';
  h+='<div style="display:flex;gap:24px;margin-bottom:16px;font-size:13px">'
    +'<div><div style="color:var(--ink3)">Marketing 申请</div><div style="font-family:var(--mono);font-weight:700">'+bgMoney(req)+'</div>'+(e.requested_reason?'<div class="bgsub">'+esc(e.requested_reason)+'</div>':'')+'</div>'
    +'<div><div style="color:var(--ink3)">USC 核批</div><div style="font-family:var(--mono);font-weight:700">'+bgMoney(all)+'</div>'+(e.allocated_reason?'<div class="bgsub">'+esc(e.allocated_reason)+'</div>':'')+'</div></div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>最终预算</label><input id="bg-fin" type="number" min="0" step="100" value="'+((all!=null?all:req)||'')+'" placeholder="如 16000"></div>';
  h+='<div class="fld" style="margin-bottom:12px"><label>决定原因 <span style="color:var(--red)">(必填)</span></label><textarea id="bg-finreason" style="width:100%;min-height:70px" placeholder="为什么定这个数 —— 会通知双方并留痕">'+esc(e.final_reason||'')+'</textarea></div>';
  h+='<div style="display:flex;gap:8px"><button class="btn" style="background:var(--red);border-color:var(--red);color:#fff" onclick="guard(()=>bgSaveDecision(\''+mo+'\',\''+br+'\'))">确认决策</button><button class="btn ghost" onclick="closeDrawer()">取消</button></div>';
  document.getElementById('d-title').textContent='最终决策';
  document.getElementById('d-body').innerHTML=h;
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
async function bgSaveDecision(mo,br){
  const a=bgAssign(br);
  if(!(bgIsAdmin()||a.decider===bgMe())){toast('无权决策');return;}
  const v=bgNum(document.getElementById('bg-fin').value);
  if(v==null||isNaN(v)||v<0){toast('请输入非负数字');return;}
  const rr=(document.getElementById('bg-finreason').value||'').trim();
  if(!rr){toast('决策必须写原因');return;}
  const e=bgEntry(mo,br)||{};
  if(bgEntry(mo,br)&&await bgStale(mo,br,bgEntry(mo,br))){closeDrawer();return;}
  const patch={final_amount:v,final_by:bgMe(),final_reason:rr,decided_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  try{const {error}=await db.rpc('budget_decide',{p_month:mo,p_brand:br,p_amount:v,p_reason:rr});if(error)throw error;Object.assign(e,patch);}
  catch(err){toast('保存失败: '+rpcErr(err));return;}
  logAction('budget','决策',br+' '+mo+' → '+bgMoney(v));
  closeDrawer();bgSlack('settled',e,br,mo);toast('已定 '+bgMoney(v));renderBudget();
}
function bgHistory(mo,br){
  const e=bgEntry(mo,br)||{},rows=[];
  if(e.requested!=null)rows.push(['申请',e.requested,e.requested_by,e.requested_reason,e.requested_at]);
  if(e.allocated!=null)rows.push(['核批',e.allocated,e.allocated_by,e.allocated_reason,e.allocated_at]);
  if(bgStatus(e)==='decide')rows.push(['升级待决策','','','申请与核批不一致,已通知决策人 '+bgUserName(bgAssign(br).decider),'']);
  if(e.final_amount!=null)rows.push(['决策',e.final_amount,e.final_by,e.final_reason,e.decided_at]);
  let h='<h2 style="margin:0 0 4px">'+esc(br)+' · '+esc(mo)+'</h2><div style="color:var(--ink3);font-size:13px;margin-bottom:14px">预算时间线(留痕)</div>';
  h+= rows.length?('<div class="bgtl">'+rows.map(r=>`<div class="bgtli"><div class="bgtlk">${r[0]}</div><div>${r[1]!==''?`<b>${bgMoney(bgNum(r[1]))}</b> · `:''}${r[2]?esc(bgUserName(r[2])):''}${r[4]?` · <span style="color:var(--ink3)">${new Date(r[4]).toLocaleString('zh-CN')}</span>`:''}${r[3]?`<div class="bgsub" style="color:var(--ink2)">${esc(r[3])}</div>`:''}</div></div>`).join('')+'</div>'):'<p style="color:var(--ink3)">还没有任何记录。</p>';
  document.getElementById('d-title').textContent='Budget 历史';
  document.getElementById('d-body').innerHTML=h;
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
// 通知链路:POST 到 adam mkt n8n 的 mis-notify webhook(格式化+@人+发 Slack feed-ci)
const MIS_NOTIFY_URL='https://adammkt.app.n8n.cloud/webhook/mis-notify';
function misNotify(payload){if(window.__DEMO__)return;try{fetch(MIS_NOTIFY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}catch(e){}}
// Slack 触发点
function bgSlack(kind,e,br,mo){
  const a=bgAssign(br);let msg;
  if(kind==='decide')msg='预算待决 · '+br+' · '+mo+' — 申请 '+bgMoney(bgNum(e.requested))+' / 核批 '+bgMoney(bgNum(e.allocated))+'。请 @'+bgUserName(a.decider)+' 定夺。';
  else msg='预算已定 · '+br+' · '+mo+' — 最终 '+bgMoney(bgFinalAmt(e))+(e.final_reason?'(原因:'+e.final_reason+')':'')+' cc @'+bgUserName(a.mkt)+(a.usc?' @'+bgUserName(a.usc):'');
  logAction('budget','slack',br+' '+mo+' '+kind);
  if(window.__DEMO__){toast('📨(演示)会发 Slack:'+msg);return;}
  if(kind==='decide')misNotify({kind:'budget_decide',month:mo,brand:br,requested:bgNum(e.requested),allocated:bgNum(e.allocated),decider:a.decider});
  else misNotify({kind:'budget_settled',month:mo,brand:br,final:bgFinalAmt(e),reason:e.final_reason||'',mkt:a.mkt,usc:a.usc||''});
}
// 演示版身份切换条(仅 demo,方便看不同人能编辑哪些格子)
function bgRenderDemoBar(){
  const el=document.getElementById('bgDemoBar');if(!el)return;
  if(!window.__DEMO__){el.innerHTML='';return;}
  const list=['eling','joey','bryan','anna','jk','wj','zq'];
  el.innerHTML='<div class="bgdemo">🎭 演示 · 以此身份查看:<select onchange="bgSwitchUser(this.value)">'+list.map(u=>{const usr=users.find(x=>x.username===u);return `<option value="${u}"${bgMe()===u?' selected':''}>${usr?esc(usr.name):u} (${u})</option>`;}).join('')+'</select> <span style="color:var(--ink3)">← 切人看谁能改哪格(仅演示版)</span></div>';
}
function bgSwitchUser(un){const u=users.find(x=>x.username===un);if(!u)return;currentUser=u;try{applyChrome();}catch(e){}renderBudget();}
// Budget 分工编辑(Administration → Budget 分工,仅 Admin)
function renderBgAssign(){
  const el=document.getElementById('bgAssignBody');if(!el)return;
  const allBrands=allMktBrands();
  const opt=(sel)=>'<option value="">— 空 —</option>'+users.map(u=>`<option value="${u.username}"${u.username===sel?' selected':''}>${esc(u.name)}</option>`).join('');
  const dis=bgIsAdmin()?'':' disabled';
  el.innerHTML=allBrands.map(br=>{const a=bgAssign(br);return `<tr>
    <td><b>${br}</b></td>
    <td><select${dis} onchange="saveBgAssign('${br}','mkt_user',this.value)">${opt(a.mkt)}</select></td>
    <td><select${dis} onchange="saveBgAssign('${br}','usc_user',this.value)">${opt(a.usc)}</select></td>
    <td><select${dis} onchange="saveBgAssign('${br}','decider_user',this.value)">${opt(a.decider)}</select></td>
  </tr>`;}).join('');
}
async function saveBgAssign(br,field,val){
  if(!bgIsAdmin()){toast('仅 Admin 可改分工');renderBgAssign();return;}
  const v=val||null;let exists=false;
  try{const {data}=await db.from('budget_assignments').select('brand').eq('brand',br);exists=!!(data&&data.length);}catch(e){}
  const patch={brand:br};patch[field]=v;
  try{
    if(exists){const {error}=await db.from('budget_assignments').update(patch).eq('brand',br);if(error)throw error;}
    else{const {error}=await db.from('budget_assignments').insert(patch);if(error)throw error;}
  }catch(err){toast('保存失败: '+rpcErr(err));return;}
  const key=field==='mkt_user'?'mkt':field==='usc_user'?'usc':'decider';
  budgetAssign[br]=budgetAssign[br]||{mkt:'',usc:'',decider:''};budgetAssign[br][key]=v||'';
  logAction('budget','分工',br+' '+key+'→'+(v||'空'));
  toast('已更新分工');renderBudget();
}
async function loadDict(){const {data,error}=await db.from('dict_entries').select('*').order('sort',{ascending:true});if(error){showErr('loadDict 加载失败: '+error.message);}const d={};(data||[]).forEach(r=>{(d[r.tab]=d[r.tab]||[]).push({c:r.code,n:r.name,d:r.descr,u:r.usage||'—',on:r.active,sc:r.short_code||null});});DICT=d;}
async function loadIdeas(){const {data,error}=await db.from('ideas').select('*').order('created_at',{ascending:false});if(error){showErr('loadIdeas 加载失败: '+error.message);}ideas=(data||[]).map(r=>({id:r.code,txt:r.txt,src:r.src,tags:r.tags||[],pri:r.pri,by:r.created_by,date:fmtMMDD(r.created_at),age:daysSince(r.created_at),st:r.status}));}
async function loadHypos(){const {data,error}=await db.from('hypotheses').select('*').order('created_at',{ascending:false});if(error){showErr('loadHypos 加载失败: '+error.message);}hypos=(data||[]).map(r=>({id:r.code,x:r.statement,metric:r.metric,from:r.val_from,to:r.val_to,mode:r.mode,market:(r.market==='KH'?'USC':r.market),adSetting:r.ad_setting||'SALES',refBatch:r.ref_batch||null,month:r.month,brand:r.brand,type:r.test_type,owner:r.owner,cap:r.capacity,st:r.status,stage:r.customer_stage||'',planLaunch:r.plan_launch||'',planDays:(r.plan_test_days==null?null:r.plan_test_days),idea:r.idea_label||r.idea_code||'',evi:r.evidence,persona:r.persona,guard:r.guard,format:r.format,trigger:r.trigger_type,age:r.age_range,game:r.game_type,vs:r.visual_style,hook:r.hook,offer:r.offer,matrix:r.matrix||null,testDims:(r.test_dim||'').split(',').map(s=>s.trim()).filter(Boolean),lockedTags:r.locked_tags||{},tests:r.tests||[],verdict:r.verdict||null,created:r.created_at}));}
async function loadCreatives(){const {data,error}=await db.from('creatives').select('*').order('created_at',{ascending:false});if(error){showErr('loadCreatives 加载失败: '+error.message);}creatives=(data||[]).map(r=>({th:r.thumb,label:r.label,code:r.gen_code||r.ads_code||'',ads:r.ads_code||'',ref:r.ref_code||'',gen:r.gen_code||'',hyp:r.hyp_label||r.hyp_code||'',fmt:r.format,vs:r.visual_style,spend:r.spend,fdc:r.fdc,cpa:r.cpa,stc:r.stc,st:r.status,versions:r.versions||[],runs:r.runs||[],format:r.format,hook:r.hook,visual_style:r.visual_style,offer:r.offer,audience:r.audience,age:r.age,game_type:r.game_type,variants:r.variants||{},planLaunch:r.plan_launch||'',planDays:(r.plan_test_days==null?null:r.plan_test_days)}));}
function daysSince(ts){try{return Math.max(0,Math.floor((Date.now()-new Date(ts).getTime())/86400000));}catch(e){return 0;}}
function fmtMMDD(ts){try{const d=new Date(ts);return String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');}catch(e){return '';}}
async function doLogin(){
  const u=(document.getElementById('username').value||'').trim().toLowerCase();
  const p=document.getElementById('password').value||'';
  const fb=document.getElementById('feedback'),btn=document.getElementById('signin');
  const say=(t,ok)=>{fb.textContent=t;fb.style.color=ok?'#80eed6':'#ffbd9d';fb.classList.add('on');};
  if(!u||!p){say('Enter username and password.');return;}
  btn.disabled=true;btn.textContent='Signing in…';
  try{
    const {error}=await db.auth.signInWithPassword({email:u+AUTH_DOMAIN,password:p});
    if(error){say('Incorrect username or password');return;}
    await loadAuthData();
    if(!currentUser){say('This account has no profile — contact admin');await db.auth.signOut();return;}
    document.getElementById('loginGate').style.display='none';
    try{logAction('auth','login','');}catch(e){}
    initApp();
  }catch(e){say('Sign-in failed: '+((e&&e.message)||e));}
  finally{btn.disabled=false;btn.textContent='Sign In';}
}
async function logout(){try{if(currentUser)await db.from('audit_log').insert({user_id:currentUser.id,username:currentUser.username,name:currentUser.name,section:'auth',action:'logout',target:''});}catch(e){}try{await db.auth.signOut();}catch(e){}currentUser=null;location.reload();}
// 安全:闲置 10 分钟(无鼠标 / 键盘 / 点击 / 滚动)自动登出
let _idleTimer=null;
function resetIdleTimer(){if(_idleTimer)clearTimeout(_idleTimer);_idleTimer=setTimeout(function(){if(currentUser){try{toast('闲置 10 分钟,已自动登出');}catch(e){}logout();}},600000);}
['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(function(ev){document.addEventListener(ev,resetIdleTimer,{passive:true});});
try{db.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_OUT'&&currentUser){currentUser=null;location.reload();}});}catch(e){}
function curRole(){return currentUser?roles.find(r=>r.id===currentUser.roleId):null;}
/* v83 四词模型:act='view' 缺省为 true(没显式关掉就可见);admin 全通;其余 act 缺省 false */
function can(sec,act){const r=curRole();if(!r)return false;if(r.admin)return true;
  const p=r.perms[sec];if(act==='view')return !p||p.view!==false;return !!(p&&p[act]);}
function applyPerms(){document.querySelectorAll('[data-perm]').forEach(el=>{const p=el.getAttribute('data-perm').split(':');el.style.display=can(p[0],p[1])?'':'none';});}
function logAction(sec,act,target){auditLog.unshift({ts:new Date().toISOString(),user:currentUser?currentUser.name:'?',sec:sec,act:act,target:target||''});{const av=document.getElementById('v-audit');if(av&&av.classList.contains('on'))renderAudit();}if(currentUser){try{db.from('audit_log').insert({user_id:currentUser.id,username:currentUser.username,name:currentUser.name,section:sec,action:act,target:target||''}).then(function(){},function(){});}catch(e){}}}
function applyChrome(){if(!currentUser){showLogin();return;}const r=curRole();const av=document.getElementById('uc-avatar');if(av)av.textContent=(currentUser.name||'?').slice(0,1).toUpperCase();const nm=document.getElementById('uc-name');if(nm)nm.textContent=currentUser.name;const ro=document.getElementById('uc-role');if(ro)ro.textContent=r?r.name:'—';const ag=document.getElementById('adminGrp');if(ag)ag.style.display=(r&&r.admin)?'':'none';renderRoles();renderUsers();renderAudit();renderBgAssign();applyPerms();}
async function initApp(){try{await loadPIData();}catch(e){console.error('loadPIData error:',e);}renderPool();renderHypo();renderCreatives();renderBudget();renderBgAssign();renderMonthlyPlan();renderResults();renderDict();refreshOverdue();updateAll();applyChrome();loadBaselines();loadAll();resetIdleTimer();}
/* 岗位管理 */
/* v83 四词统一权限模型:一张表(PERM_MODEL 五大板块) × view/add/edit/delete;
 * mis 行存 role_permissions,meta 行存 role_meta_permissions;admin 全通不看表 */
function permBag(r,row){if(row.kind==='mis'){r.perms=r.perms||{};return r.perms[row.k]=r.perms[row.k]||{};}r.metaPerms=r.metaPerms||{};return r.metaPerms[row.k]=r.metaPerms[row.k]||{};}
function permOn(bag,a){return a==='view'?bag.view!==false:!!bag[a];}
function renderRoles(){const el=document.getElementById('rolesBody');if(!el)return;let h='<div class="tablebar"><button class="btn" onclick="openRoleEditor(null)">＋ New Role</button></div>';h+='<table class="dt"><thead><tr><th>Role</th><th>Admin Access</th><th>Permissions</th><th></th></tr></thead><tbody>';let tot=0;PERM_MODEL.forEach(g=>g.rows.forEach(row=>{tot+=1+row.acts.length;}));roles.forEach(r=>{let cnt=0;PERM_MODEL.forEach(g=>g.rows.forEach(row=>{const bag=permBag(r,row);if(permOn(bag,'view'))cnt++;row.acts.forEach(a=>{if(permOn(bag,a))cnt++;});}));h+='<tr><td><b>'+esc(r.name)+'</b></td><td>'+(r.admin?'<span class="life la">Yes</span>':'<span class="life lx">No</span>')+'</td><td class="sm">'+(r.admin?'全部(Admin)':cnt+' / '+tot)+'</td><td style="text-align:right;white-space:nowrap"><button class="cbtn" onclick="openRoleEditor(\''+r.id+'\')">Edit</button> <button class="cbtn" onclick="dupRole(\''+r.id+'\')">Duplicate</button> <button class="cbtn danger" onclick="delRole(\''+r.id+'\')">Delete</button></td></tr>';});el.innerHTML=h+'</tbody></table>';}
function openRoleEditor(id){const r=id?roles.find(x=>x.id===id):{id:'role_'+Date.now(),name:'',admin:false,perms:{},metaPerms:{},_new:true};window._editRole=JSON.parse(JSON.stringify(r));document.getElementById('d-title').textContent='岗位权限';renderRoleEditor();document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');}
function renderRoleEditor(){const r=window._editRole;let h='<h2>'+(r._new?'New Role':'Edit Role')+'</h2>';h+='<div class="fld" style="margin-bottom:14px"><label>Role Name</label><input id="re-name" type="text" value="'+esc(r.name)+'" oninput="window._editRole.name=this.value" placeholder="e.g. Project Owner"></div>';h+='<label class="re-admin"><input type="checkbox" '+(r.admin?'checked':'')+' onchange="window._editRole.admin=this.checked"><span>Admin 全通(可进 Administration,以下矩阵对其不生效)</span></label>';h+='<table class="permtable"><thead><tr><th>板块 / 页面</th><th>View</th><th>Add</th><th>Edit</th><th>Delete</th></tr></thead><tbody>';PERM_MODEL.forEach(g=>{h+='<tr class="grouprow"><td colspan="5">'+esc(g.g)+'</td></tr>';g.rows.forEach(row=>{const bag=permBag(r,row);h+='<tr><td>'+esc(row.n)+'</td>';['view','add','edit','delete'].forEach(a=>{if(a!=='view'&&row.acts.indexOf(a)<0){h+='<td class="permna">—</td>';return;}const on=permOn(bag,a);h+='<td><span class="permcell '+(on?'pyes':'pno')+'" onclick="togglePerm(\''+row.kind+'\',\''+row.k+'\',\''+a+'\')">'+(on?'✓':'✗')+'</span></td>';});h+='</tr>';});});h+='</tbody></table>';h+='<div class="remark" style="margin-top:8px">View=✗ 时整个页面从该岗位的侧栏消失(UI 级控制);Meta 行的写权限 live 后叠加系统级只读闸门。</div>';h+='<div style="display:flex;gap:8px;margin-top:14px"><button class="btn ghost" onclick="saveRole()">Save Role</button><button class="btn ghost" onclick="closeDrawer()">Cancel</button></div>';document.getElementById('d-body').innerHTML=h;}
function togglePerm(kind,k,a){const r=window._editRole;const row={kind:kind,k:k};const bag=permBag(r,row);if(a==='view')bag.view=!(bag.view!==false);else bag[a]=!bag[a];renderRoleEditor();}
function permRowsFor(roleId,r){const mis=[],meta=[];PERM_MODEL.forEach(g=>g.rows.forEach(row=>{const bag=permBag(r,row);const rec={can_view:permOn(bag,'view'),can_add:permOn(bag,'add'),can_edit:permOn(bag,'edit'),can_delete:permOn(bag,'delete')};if(row.kind==='mis')mis.push(Object.assign({role_id:roleId,section:row.k},rec));else meta.push(Object.assign({role_id:roleId,meta_key:row.k},rec));}));return {mis:mis,meta:meta};}
async function saveRole(){const r=window._editRole;if(!(r.name||'').trim()){alert('Please enter a role name');return;}try{let roleId=r.id;if(r._new){const key=(r.key||('role_'+Date.now())).toString();const {data,error}=await db.from('roles').insert({key:key,name:r.name.trim(),is_admin:!!r.admin}).select('id').single();if(error)throw error;roleId=data.id;}else{const {error}=await db.from('roles').update({name:r.name.trim(),is_admin:!!r.admin}).eq('id',roleId);if(error)throw error;}const rows=permRowsFor(roleId,r);const {error:e2}=await db.from('role_permissions').upsert(rows.mis,{onConflict:'role_id,section'});if(e2)throw e2;const {error:e3}=await db.from('role_meta_permissions').upsert(rows.meta,{onConflict:'role_id,meta_key'});if(e3)throw e3;await loadAuthData();closeDrawer();applyChrome();applyPerms();toast('Role saved');}catch(e){alert('Save failed: '+rpcErr(e));}}
async function dupRole(id){const r=roles.find(x=>x.id===id);if(!r)return;try{const key='role_'+Date.now();const {data,error}=await db.from('roles').insert({key:key,name:r.name+' (副本)',is_admin:!!r.admin}).select('id').single();if(error)throw error;const src=JSON.parse(JSON.stringify(r));const rows=permRowsFor(data.id,src);const {error:e2}=await db.from('role_permissions').upsert(rows.mis,{onConflict:'role_id,section'});if(e2)throw e2;const {error:e3}=await db.from('role_meta_permissions').upsert(rows.meta,{onConflict:'role_id,meta_key'});if(e3)throw e3;await loadAuthData();renderRoles();toast('Role duplicated — adjust as needed');}catch(e){alert('Duplicate failed: '+rpcErr(e));}}
async function delRole(id){if(users.some(u=>u.roleId===id)){alert('Users are still assigned to this role — reassign them first');return;}if(!confirm('Delete this role?'))return;try{const {error}=await db.from('roles').delete().eq('id',id);if(error)throw error;await loadAuthData();renderRoles();}catch(e){alert('Delete failed: '+rpcErr(e));}}
/* 用户管理 */
/* v83:Users 一人一行 —— Meta 账号是这个人的一列(数据由 MISRes.loadUnifiedUsers 喂进 window._metaUnified) */
function renderUsers(){const el=document.getElementById('usersBody');if(!el)return;const mu=window._metaUnified||null;const metaUsers=(mu&&mu.metaUsers)||[];const map=(mu&&mu.map)||[];const mapOf=uid=>{const m=map.find(x=>String(x.mis_user_id)===String(uid));return m?m.meta_username:'';};const mappedSet=new Set(map.map(m=>m.meta_username));let h='<div class="tablebar"><button class="btn" onclick="openUserEditor(null)">＋ New User</button><span class="sub" style="display:inline;margin-left:10px">一人一行:MIS 登录身份 + 映射的系统 2 账号 = 同一个人(审计对人)</span></div>';h+='<table class="dt"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Meta 账号</th><th>Meta 状态</th><th></th></tr></thead><tbody>';users.forEach(u=>{const r=roles.find(x=>x.id===u.roleId);const self=currentUser&&currentUser.id===u.id;const cur=mapOf(u.id);let metaSel;if(mu){metaSel='<select onchange="MISRes.mapMeta(\''+esc(String(u.id))+'\',this.value)"><option value="">— 未映射 —</option>'+metaUsers.map(m=>'<option value="'+esc(m.username)+'"'+(cur===m.username?' selected':'')+((mappedSet.has(m.username)&&cur!==m.username)?' disabled':'')+'>'+esc(m.displayName)+' ('+esc(m.username)+')</option>').join('')+'</select>';}else{metaSel='<span class="sub" style="display:inline">加载中…</span>';}let metaSt='<span class="sub" style="display:inline">—</span>';if(cur){const m2=metaUsers.find(x=>x.username===cur);if(m2){metaSt=(m2.permissions===null?'<span class="mmr-badge mmr-b">Superadmin</span>':'Custom')+' <span class="mmr-badge mmr-'+(m2.status==='ACTIVE'?'g':'n')+'">'+esc(m2.status)+'</span> <button class="btn ghost sm" onclick="MISRes.userEdit('+metaUsers.indexOf(m2)+')">权限</button>';}}h+='<tr><td>'+esc(u.name)+'</td><td class="code">'+esc(u.username)+(self?' <span class="sm" style="opacity:.6">(you)</span>':'')+'</td><td>'+(r?esc(r.name):'—')+'</td><td>'+metaSel+'</td><td>'+metaSt+'</td><td style="text-align:right;white-space:nowrap"><button class="cbtn" onclick="openUserEditor(\''+u.id+'\')">Edit</button> <button class="cbtn" onclick="resetUserPw(\''+u.id+'\')">Reset PW</button> <button class="cbtn danger" onclick="delUser(\''+u.id+'\')">Delete</button></td></tr>';});el.innerHTML=h+'</tbody></table>';}
function openUserEditor(id){const isNew=!id;const u=id?users.find(x=>x.id===id):{id:null,username:'',name:'',roleId:(roles[0]||{}).id};window._editUser=Object.assign({_new:isNew},u);const r=window._editUser;let h='<h2>'+(isNew?'New User':'Edit User')+'</h2>';if(isNew){h+='<div class="fld" style="margin-bottom:12px"><label>Username</label><input id="ue-un" type="text" value="" placeholder="e.g. joey"><div class="remark" style="margin-top:4px">Login name. Cannot be changed later.</div></div>';}else{h+='<div class="fld" style="margin-bottom:12px"><label>Username</label><input id="ue-un" type="text" value="'+esc(r.username)+'"><div class="remark" style="margin-top:4px">登录名。改后用新 username 登录(旧的失效)。</div></div>';}h+='<div class="fld" style="margin-bottom:12px"><label>Name</label><input id="ue-nm" type="text" value="'+esc(r.name)+'"></div>';if(isNew){h+='<div class="fld" style="margin-bottom:12px"><label>Password</label><input id="ue-pw" type="text" value="123123"></div>';}h+='<div class="fld" style="margin-bottom:12px"><label>Role</label><select id="ue-role">'+roles.map(x=>'<option value="'+x.id+'" '+(x.id===r.roleId?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></div>';h+='<div style="display:flex;gap:8px;margin-top:8px"><button class="btn ghost" onclick="saveUser()">Save User</button><button class="btn ghost" onclick="closeDrawer()">Cancel</button></div>';document.getElementById('d-title').textContent='User';document.getElementById('d-body').innerHTML=h;document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');}
async function saveUser(){const r=window._editUser;const name=(document.getElementById('ue-nm').value||'').trim();const roleId=document.getElementById('ue-role').value;try{if(r._new){const un=(document.getElementById('ue-un').value||'').trim().toLowerCase();const pw=document.getElementById('ue-pw').value||'';if(!un||!name){alert('Username and Name are required');return;}const role=roles.find(x=>x.id===roleId);const {error}=await db.rpc('admin_create_user',{p_username:un,p_name:name,p_password:pw,p_role_key:role?role.key:null});if(error)throw error;logAction('user','add',un);}else{if(!name){alert('Name is required');return;}const un=(document.getElementById('ue-un').value||'').trim().toLowerCase();if(!un){alert('Username is required');return;}if(un!==r.username){const {error:ue}=await db.rpc('admin_set_username',{p_user_id:r.id,p_username:un});if(ue)throw ue;}const {error}=await db.from('profiles').update({name:name,role_id:roleId}).eq('id',r.id);if(error)throw error;logAction('user','edit',un!==r.username?(r.username+' → '+un):r.username);}await loadAuthData();closeDrawer();renderUsers();applyChrome();toast('User saved');}catch(e){alert('Save failed: '+rpcErr(e));}}
async function delUser(id){if(currentUser&&currentUser.id===id){alert('Cannot delete the user you are logged in as');return;}const u=users.find(x=>x.id===id);if(!confirm('Delete this user? This removes their login permanently.'))return;try{const {error}=await db.rpc('admin_delete_user',{p_user_id:id});if(error)throw error;logAction('user','delete',u?u.username:id);await loadAuthData();renderUsers();}catch(e){alert('Delete failed: '+rpcErr(e));}}
async function resetUserPw(id){const u=users.find(x=>x.id===id);const pw=prompt('Set a NEW password for '+(u?u.username:'')+' (min 4 chars):','');if(pw===null)return;const np=(pw||'').trim();if(np.length<4){alert('密码至少 4 位 —— 未修改。');return;}try{const {error}=await db.rpc('admin_set_password',{p_user_id:id,p_password:np});if(error)throw error;logAction('user','edit',(u?u.username:'')+' (password)');toast('Password updated · 新密码已生效');}catch(e){alert('Reset failed: '+rpcErr(e));}}
/* 操作记录 */
function fmtTs(ts){try{return new Date(ts).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return ts;}}
function secName(k){const s=PERM_SECTIONS.find(x=>x.k===k);return s?s.n:k;}
async function renderAudit(){if(window.MISOps&&MISOps.renderMergedAudit)return MISOps.renderMergedAudit();/* v77:合并视图接管;以下为兜底 */const el=document.getElementById('auditBody');if(!el)return;let rows=[];try{const {data}=await db.from('audit_log').select('*').order('created_at',{ascending:false}).limit(200);rows=data||[];}catch(e){}let h='<table class="dt"><thead><tr><th>Time</th><th>User</th><th>Section</th><th>Action</th><th>Target</th></tr></thead><tbody>';if(!rows.length)h+='<tr><td colspan="5" class="empty">No activity yet — every add / edit / delete is logged here automatically</td></tr>';rows.forEach(e=>{h+='<tr><td class="sm">'+esc(fmtTs(e.created_at))+'</td><td>'+esc(e.name||e.username||'?')+'</td><td>'+esc(secName(e.section))+'</td><td>'+esc(ACT_LABEL[e.action]||e.action)+'</td><td class="sm">'+esc(e.target||'')+'</td></tr>';});el.innerHTML=h+'</tbody></table>';}
/* 新增想法:提出人 = 当前账号 */

try{renderPool();renderHypo();renderCreatives();renderDict();refreshOverdue();updateAll();}catch(e){console.error('startup render error:',e);}
(async()=>{
  try{
    const {data}=await db.auth.getUser();
    if(data&&data.user){
      await loadAuthData();
      if(currentUser){document.getElementById('loginGate').style.display='none';await initApp();return;}
    }
  }catch(e){console.error('session restore error:',e);}
  showLogin();
})();

/* ===== 登录页动效(v69):吉祥物跟随鼠标+高光点;门隐藏时不渲染 ===== */
(function(){
  const gate=document.getElementById('loginGate');if(!gate)return;
  const nodes=Array.from(gate.querySelectorAll('.track-node'));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let mx=innerWidth/2,my=innerHeight*.45,raf=0;
  function render(){raf=0;if(gate.style.display==='none'||!nodes.length)return;
    const gx=clamp((mx/innerWidth-.5)*2,-1,1),gy=clamp((my/innerHeight-.46)*2,-1,1);
    nodes.forEach((node,i)=>{const r=node.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,
      dx=mx-cx,dy=my-cy,dist=Math.max(170,Math.hypot(dx,dy)),
      lx=clamp(dx/dist,-1,1),ly=clamp(dy/dist,-1,1),
      nx=clamp(gx*.86+lx*.14,-1,1),ny=clamp(gy*.84+ly*.16,-1,1),
      s=[.9,1,.96,1,1,1.03][i]||1;
      node.style.setProperty('--ry',(nx*13*s).toFixed(2)+'deg');
      node.style.setProperty('--rx',(-ny*6*s).toFixed(2)+'deg');
      node.style.setProperty('--rz',(nx*2.8*s).toFixed(2)+'deg');
      node.style.setProperty('--tx',(nx*.8*s).toFixed(2)+'px');
      node.style.setProperty('--ty',(ny*.6*s).toFixed(2)+'px');
      const ul=Math.hypot(nx,ny)||1;
      node.style.setProperty('--ux',(nx/ul).toFixed(3));
      node.style.setProperty('--uy',(ny/ul).toFixed(3));});}
  function schedule(x,y){mx=x;my=y;if(!raf)raf=requestAnimationFrame(render);}
  addEventListener('pointermove',e=>{if(gate.style.display!=='none')schedule(e.clientX,e.clientY);},{passive:true});
  const sp=document.getElementById('showPass');
  if(sp)sp.onclick=()=>{const p=document.getElementById('password');p.type=(p.type==='password'?'text':'password');};
  const lf=document.getElementById('loginForm');
  if(lf)lf.onsubmit=(e)=>{e.preventDefault();doLogin();};
  requestAnimationFrame(()=>schedule(innerWidth*.5,innerHeight*.45));
})();
