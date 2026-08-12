/* ===== P1b 素材标签(7 维,词表动态读 DICT)===== */
// 维度 key(= creatives 列名 = TEST_DIMS key)→ Dictionary tab 名。⚠️ tab 名须与 dict_entries.tab 一致;空下拉=映射错,见 Dictionary 改这里。
// 维度 key → Dictionary tab。audience/age 仍用于 New Hypothesis 的人群/年龄下拉。
const DIM_DICT_TAB={format:'Format',hook:'Hook',visual_style:'Visual Style',offer:'Offer',audience:'Persona',age:'Age Range',game_type:'Game Type'};
function dimTabOpts(dimKey,cur){
  const tab=DIM_DICT_TAB[dimKey],rows=(DICT[tab]||[]).filter(r=>r.on!==false);
  const sel=(v)=>v===cur?' selected':'';
  return `<option value="">— unselected —</option>`+rows.map(r=>`<option value="${r.c}"${sel(r.c)}>${esc(r.n||r.c)}</option>`).join('')
    +(rows.length?'':`<option value="" disabled>(Dictionary「${tab}」无词条)</option>`);
}
// 顾客阶段(漏斗环节)下拉:从 Dictionary「Customer Stage」读,与 dimTabOpts 平行但不属素材维度
function stageOpts(cur){
  const rows=(DICT['Customer Stage']||[]).filter(r=>r.on!==false);
  return `<option value="">— 未指定 —</option>`+rows.map(r=>`<option value="${r.c}"${r.c===cur?' selected':''}>${esc(r.n?r.n+' · '+r.c:r.c)}</option>`).join('')
    +(rows.length?'':`<option value="" disabled>(Dictionary「Customer Stage」无词条)</option>`);
}
// 顾客阶段中文名(列表 pill 用)
function stageZh(code){if(!code)return '';const r=(DICT['Customer Stage']||[]).find(x=>x.c===code);return r?(r.n||r.c):code;}
// 顾客阶段配色(每个漏斗环节一个色,沿用系统色板)→ [背景, 文字]
function stageColor(code){return ({
  'Acquisition':['var(--accent-soft)','var(--accent)'],
  'Activation':['var(--violet-bg)','var(--violet)'],
  'Retention':['var(--green-bg)','var(--green)'],
  'Repeat Conversion':['var(--amber-bg)','var(--amber)'],
  'Reactivation':['var(--red-bg)','var(--red)']
})[code]||['var(--bg2)','var(--ink2)'];}
// 对比页 / 裁判用的 5 维(人群、年龄已上移到 New Hypothesis 假设级);[key,label,required]
const MATRIX_DIMS=[['format','Format',1],['hook','Hook',1],['visual_style','Visual Style'],['offer','Offer'],['game_type','Game Type']];
const MATRIX_DIM_KEYS=MATRIX_DIMS.map(d=>d[0]);

/* ===== P2 裁判:一致性检查(只警告不阻断)===== */
function checkHypoConsistency(hyp,overrideCr){
  const dims=(hyp&&hyp.testDims)||[];
  if(!dims.length)return {state:'undeclared'};
  const cr=overrideCr||creatives.filter(c=>(c.hyp||'').startsWith(hyp.id));
  if(cr.length<2)return {state:'insufficient',n:cr.length,dims};
  // Variant(v65):在测维度每条素材必填;有效值 = 取值+变体 —— 取值相同靠变体区分,取值不同时是内容备注
  const vnt=(c,d)=>(dims.includes(d)&&c.variants&&c.variants[d])?String(c.variants[d]).trim():'';
  const eff=(c,d)=>{const v=c[d];return v?(v+(vnt(c,d)?'‖'+vnt(c,d):'')):'';};
  const baseDistinct=(d)=>{const s=new Set();cr.forEach(c=>{const v=c[d];if(v)s.add(v);});return s;};
  const distinct=(d)=>{const s=new Set();cr.forEach(c=>{const v=eff(c,d);if(v)s.add(v);});return s;};
  const tested=dims.map(d=>({dim:d,vary:distinct(d).size>=2}));   // 勾的维度应当变(取值或变体)
  const untagged=dims.filter(d=>cr.some(c=>!c[d]));   // 勾了的维度有素材没打标
  const varMissing=dims.filter(d=>cr.some(c=>!vnt(c,d)));   // Variant 必填(写清这条素材具体是什么)
  const noDiff=tested.filter(t=>!t.vary||untagged.includes(t.dim)||varMissing.includes(t.dim));
  const conflicts=MATRIX_DIM_KEYS.filter(d=>!dims.includes(d)).map(d=>{const vals=[...baseDistinct(d)];const partial=vals.length===1&&cr.some(c=>!c[d]);return {dim:d,vals:partial?vals.concat('(未设)'):vals};}).filter(x=>x.vals.length>1);  // 没勾的应当一致(全组锁定)
  if(noDiff.length)return {state:'nodiff',tested,noDiff,conflicts,dims,n:cr.length,varMissing,untagged};
  // 2 维 = 交叉测:必须凑成干净的 2×2(每维恰 2 个有效值、4 种组合各出现一次、无空格);同一取值的 Variant 必须一致,否则有效值>2 在这里被拦
  if(dims.length===2){
    const [A,B]=dims,va=distinct(A),vb=distinct(B);
    const over=(va.size>2?[A]:[]).concat(vb.size>2?[B]:[]);   // 有效值超过 2 个的维度
    const combos=new Set(cr.map(c=>(eff(c,A)||'∅')+'∥'+(eff(c,B)||'∅')));
    const cleanGrid=va.size===2&&vb.size===2&&combos.size===4&&cr.length===4&&![...combos].some(k=>k.includes('∅'));
    if(!cleanGrid)return {state:'crossbad',over,combos:combos.size,dims,tested,conflicts,n:cr.length};
  }
  const state=conflicts.length?'polluted':'clean';
  return {state,tested,noDiff,conflicts,dims,n:cr.length};
}
function judgeMeta(jc){
  return ({clean:{dot:'var(--green)',tag:'✅ 干净可比'},polluted:{dot:'var(--red)',tag:'🔴 被污染'},nodiff:{dot:'var(--amber)',tag:'⚠️ 勾了没差异'},crossbad:{dot:'var(--red)',tag:'🔴 2×2 不齐'},insufficient:{dot:'var(--ink3)',tag:'素材不足'},undeclared:{dot:'var(--ink3)',tag:'未勾维度'}})[jc.state]||{dot:'var(--ink3)',tag:'—'};
}
/* ===== 假设级「素材管理 & 标签」全宽页 ===== */
function openTagMatrix(hypId){const hyp=hypos.find(h=>h.id===hypId);if(!hyp)return;closeDrawer();window._tmHyp=hypId;renderTagMatrix();go('tagmatrix');window.scrollTo(0,0);}
// 锁定组下拉:没显式设过锁定值时,回退到「全部素材都相同」的那个值,免得明明一致却显示 unselected
function tmCommonVal(dimKey,cr){const vals=[...new Set((cr||[]).map(c=>c[dimKey]).filter(Boolean))];return vals.length===1?vals[0]:'';}
function renderTagMatrix(){
  const el=document.getElementById('tagmatrixBody');if(!el)return;
  const hyp=hypos.find(h=>h.id===window._tmHyp);
  if(!hyp){el.innerHTML='<div class="empty">假设不存在</div>';return;}
  const tested=hyp.testDims||[],locked=hyp.lockedTags||{};
  const isTested=k=>tested.includes(k);
  const cr=creatives.filter(c=>(c.hyp||'').startsWith(hyp.id));
  const lockedDims=MATRIX_DIMS.filter(d=>!isTested(d[0]));
  const jc=checkHypoConsistency(hyp);
  const setupLocked=!!locked._locked;
  const isAdmin=!!(typeof curRole==='function'&&curRole()&&curRole().admin);
  const editable=!setupLocked||isAdmin;
  const dis=editable?'':'disabled';
  // 表头
  const head=`<tr><th style="min-width:130px">Asset</th>${MATRIX_DIMS.map(d=>{const t=isTested(d[0]);return `<th style="min-width:120px;${t?'background:rgba(127,119,221,.12)':''}">${t?'':'🔒 '}${d[1]}${d[2]?' <span style="color:var(--red)">*</span>':''}${t?' <span style="color:var(--violet);font-weight:400;font-size:11px">▲在测</span>':''}</th>`;}).join('')}</tr>`;
  // 表体:在测维度=可选(草稿)/ 文本(已锁);锁定维度=全组值文本
  const body=cr.length?cr.map(c=>`<tr>
      <td><span class="code">${c.code}</span><br><small style="color:var(--ink3)">${c.st}</small></td>
      ${MATRIX_DIMS.map(d=>{const k=d[0];
        if(isTested(k)){
          const vv=(c.variants&&c.variants[k])||'';
          if(editable){
            const empty=d[2]&&!(c[k]||'');
            // Variant(v65):在测维度恒显示、必填 —— 取值相同=区分器(互不相同);取值不同=内容备注;交叉测同取值填一样
            const base=c[k]||'';
            const need=!vv;
            const opts=[...new Set(creatives.filter(x=>x.variants&&x.variants[k]&&(x[k]||'')===base).map(x=>x.variants[k]))];
            const vpart=`<div style="border:1px dashed ${need?'var(--red)':'var(--violet)'};border-radius:8px;padding:6px 8px 8px;margin-top:7px;background:rgba(127,119,221,.08)">
              <span style="display:block;font-size:10.5px;color:${need?'var(--red)':'var(--violet)'};font-weight:700;margin:0 0 4px">Variant <span style="color:var(--red)">*</span></span>
              <input type="text" list="dlv-${esc(c.gen)}-${k}" data-gen="${esc(c.gen)}" data-dim="${k}" value="${esc(vv)}" placeholder="${need?'e.g. Boxing King (JILI) / 甄子丹':''}" onchange="tmVariantChange(this)" style="width:100%;font-size:12.5px;padding:5px 9px;border:1px solid ${need?'var(--red)':'var(--violet)'};border-radius:6px;background:var(--bg,#fff);color:var(--ink,#161b22)">
              <datalist id="dlv-${esc(c.gen)}-${k}">${opts.map(o=>`<option value="${esc(o)}">`).join('')}</datalist>
            </div>`;
            return `<td style="background:rgba(127,119,221,.05)"><select data-gen="${esc(c.gen)}" data-dim="${k}" onchange="tmCellChange(this)" style="width:100%${empty?';border-color:var(--red)':''}">${dimTabOpts(k,c[k]||'')}</select>${vpart}</td>`;
          }
          const tv=c[k]?dictName(k,c[k]):'<span style="color:var(--red)">未设</span>';return `<td style="background:rgba(127,119,221,.05)">${tv}${vv?` <span style="color:var(--violet);font-size:12px;white-space:nowrap">· ${esc(vv)}</span>`:''}</td>`;
        }
        const lv=locked[k]||c[k]||'';const lbl=lv?(dictName(k,lv)):'<span style="color:var(--red)">未设</span>';
        return `<td style="background:var(--bg2)">${lbl}</td>`;
      }).join('')}
    </tr>`).join(''):`<tr><td colspan="${MATRIX_DIMS.length+1}" class="empty" style="padding:24px">还没有素材 — 点「＋ 加素材」。</td></tr>`;
  // 一致性提醒(只在未锁定 + 有问题时)
  let banner='';
  if(!setupLocked&&jc.state!=='clean'&&jc.state!=='undeclared'){
    const crossMsg=(jc.over&&jc.over.length)?`交叉测要凑成干净的 2×2:测试维度「${jc.over.map(dimLabel).join('、')}」的有效值(取值+Variant)超过 2 个 —— 每维只能 2 个;注意<b>同一取值的素材 Variant 必须填一样</b>,不然会被当成第 3 个值。`:`4 条素材没凑成完整的 2×2(有重复、缺格或留空)—— 让「${(jc.dims||[]).map(dimLabel).join(' × ')}」的 4 种组合各出现一次。`;
    const vm=(jc.varMissing||[]);
    const realNoDiff=(jc.noDiff||[]).filter(t=>!t.vary||(jc.untagged||[]).includes(t.dim));
    let nodiffMsg='';
    if(realNoDiff.length)nodiffMsg+=`测试维度「${realNoDiff.map(t=>dimLabel(t.dim)).join('、')}」在素材间还没差异 —— 取值不同,或取值相同时用互不相同的「Variant」区分(如同风格不同游戏/人物)。`;
    if(vm.length)nodiffMsg+=`${nodiffMsg?' 另外,':''}「${vm.map(dimLabel).join('、')}」列每条素材的 <b>Variant 必填</b> —— 写清这条素材具体是什么(游戏/人物/细节),列表一眼可读。`;
    const msgs={insufficient:`只有 ${jc.n||cr.length} 条素材,凑够 2 条才成立一个对比。`,nodiff:nodiffMsg,crossbad:crossMsg,polluted:`没在测的维度混了:${(jc.conflicts||[]).map(c=>dimLabel(c.dim)).join('、')} —— 到「全组锁定」设成统一值。`};
    banner=`<div style="background:rgba(216,90,48,.08);border:1px solid var(--red);border-radius:8px;padding:10px 12px;color:var(--red);font-size:13px;margin-top:12px;margin-bottom:18px">⚠️ <b>内容不一致,还不能锁定</b> · ${msgs[jc.state]||''}</div>`;
  }
  el.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div><h2 style="margin:0 0 4px">${hyp.id} · 素材管理 & 标签 ${setupLocked?'<span style="font-size:13px;color:var(--green);font-weight:600">🔒 Locked</span>':'<span style="font-size:13px;color:var(--amber);font-weight:600">✏️ Draft</span>'}</h2>
        <div style="color:var(--ink3);font-size:13px">${esc(hyp.x)} · 本次测:<b style="color:var(--violet)">${tested.length?tested.map(dimLabel).join(' × '):'未勾'}</b> · ${cr.length} 条素材 · <span style="font-size:12px">Draft 可随意改;Save 锁定后仅 Admin 可改</span></div></div>
      <div style="display:flex;gap:8px;flex:none">
        <button class="btn ghost" onclick="tmUnlock()" ${(setupLocked&&isAdmin)?'':'disabled'} title="解锁回草稿(仅 Admin)">Draft</button>
        <button class="btn" onclick="tmSaveLock()" ${setupLocked?'disabled':''}>Save</button>
        <button class="btn ghost" onclick="go('hypo')">← Hypotheses</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px"><h3>本次测试维度<span style="font-weight:400;color:var(--amber);font-size:12px"> ← 可多选(最多 2 个),所以能测交叉</span></h3>
      <div style="color:var(--ink3);font-size:12px;margin-bottom:8px">勾 1 个 = 单变量(自动生成 1 条);勾 2 个 = 交叉测(自动生成 4 条)。勾上的各条素材可不同;没勾的全组锁定。</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${MATRIX_DIMS.map(d=>`<label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;cursor:${editable?'pointer':'not-allowed'};${isTested(d[0])?'background:rgba(127,119,221,.12);border-color:var(--violet)':''}"><input type="checkbox" ${isTested(d[0])?'checked':''} ${dis} onchange="tmToggleDim('${d[0]}')"> ${d[1]}</label>`).join('')}</div>
    </div>
    <div class="card" style="margin-top:12px"><h3>🔒 全组锁定 · 一次设定</h3>
      <div style="color:var(--ink3);font-size:12px;margin-bottom:8px">没在测的维度,在这里一次设好;表格里它们全组统一、不可改。</div>
      ${lockedDims.length?`<div style="display:flex;flex-wrap:wrap;gap:12px">${lockedDims.map(d=>`<div class="fld" style="max-width:180px"><label>🔒 ${d[1]}</label><select ${dis} onchange="tmSetLock('${d[0]}',this.value)">${dimTabOpts(d[0],locked[d[0]]||tmCommonVal(d[0],cr)||'')}</select></div>`).join('')}</div>`:'<div style="color:var(--ink3)">所有维度都在测,无锁定项。</div>'}
    </div>
    <div class="card" style="margin-top:12px">
      ${editable?`<div class="tablebar"><button class="btn" data-perm="creative:add" onclick="tmAddCreative()">＋ 加素材</button></div>`:''}
      ${banner}
      <div style="overflow-x:auto"><table class="dt" style="min-width:100%"><thead>${head}</thead><tbody>${body}</tbody></table></div>
      ${setupLocked&&!isAdmin?'<div style="margin-top:12px;color:var(--green);font-weight:600">🔒 已锁定 — 仅 Admin 可改</div>':''}
    </div>`;
  applyPerms();
}
function dictName(dimKey,code){const tab=DIM_DICT_TAB[dimKey],r=(DICT[tab]||[]).find(x=>x.c===code);return r?esc(r.n||r.c):esc(code);}
function tmEditable(){const hyp=hypos.find(h=>h.id===window._tmHyp);const lk=hyp&&hyp.lockedTags&&hyp.lockedTags._locked;const admin=typeof curRole==='function'&&curRole()&&curRole().admin;if(!admin&&!can('hypo','edit')&&!can('creative','edit'))return false;return !lk||admin;}
async function tmSaveHyp(hyp,patch){try{const {error}=await db.from('hypotheses').update(Object.assign({updated_at:new Date().toISOString()},patch)).eq('code',hyp.id);if(error)throw error;}catch(e){toast('保存失败: '+rpcErr(e));}}
async function tmEnsureRows(hyp,target){
  const existing=creatives.filter(c=>(c.hyp||'').startsWith(hyp.id));
  if(existing.length>=target)return false;
  const used=existing.map(c=>{const mm=(c.gen||'').match(/-V(\d+)$/);return mm?+mm[1]:0;});
  let n=used.length?Math.max(...used):0;const locked=hyp.lockedTags||{};const rows=[];
  // v81:发号改到「⚙ 生成/保存」时(编号=品牌×内容全局流水,建行时维度值还没定,发不了);ref_batch 机制随 7 段结构退役
  for(let i=existing.length;i<target;i++){n++;const row={gen_code:hyp.id+'-V'+n,ads_code:null,ref_code:null,hyp_code:hyp.id,hyp_label:hyp.id+' · '+hyp.x,label:'素材 '+n,status:'待上线',created_by:(currentUser&&currentUser.name)||''};MATRIX_DIM_KEYS.forEach(k=>{if(!(hyp.testDims||[]).includes(k))row[k]=locked[k]||null;});rows.push(row);}
  try{const {error}=await db.from('creatives').insert(rows);if(error)throw error;}catch(e){toast('自动加素材失败: '+rpcErr(e));return false;}
  return true;
}
async function tmTrimRows(hyp,target){
  // 维度减少时,把多出来的「空」素材行删掉(无 versions/无 runs 的才删,已填内容/已上线的保留)
  const existing=creatives.filter(c=>(c.hyp||'').startsWith(hyp.id))
    .sort((a,b)=>{const ma=(a.gen||'').match(/-V(\d+)$/),mb=(b.gen||'').match(/-V(\d+)$/);return (mb?+mb[1]:0)-(ma?+ma[1]:0);}); // 按 V 序号倒序,优先删最新加的
  if(existing.length<=target)return false;
  const hasTags=(c)=>MATRIX_DIM_KEYS.some(k=>c[k]);
  const removable=existing.filter(c=>(!c.versions||c.versions.length===0)&&(!c.runs||c.runs.length===0));
  const toRemove=removable.slice(0,existing.length-target);
  if(!toRemove.length)return false;
  if(toRemove.some(hasTags)&&!confirm('要删的 '+toRemove.length+' 条素材里有已打标签的,确认删除?(取消则保留)'))return false;
  try{const {error}=await db.from('creatives').delete().in('gen_code',toRemove.map(c=>c.gen));if(error)throw error;}catch(e){toast('自动减素材失败: '+rpcErr(e));return false;}
  return true;
}
async function tmToggleDim(dimKey){
  if(!tmEditable()){toast('已锁定,仅 Admin 可改');return;}
  const hyp=hypos.find(h=>h.id===window._tmHyp);if(!hyp)return;
  const s=new Set(hyp.testDims||[]);
  if(!s.has(dimKey)&&s.size>=2){toast('本次测试维度最多选 2 个(单变量或交叉测)');renderTagMatrix();return;}
  s.has(dimKey)?s.delete(dimKey):s.add(dimKey);
  hyp.testDims=MATRIX_DIM_KEYS.filter(k=>s.has(k));   // 保持顺序
  await tmSaveHyp(hyp,{test_dim:hyp.testDims.join(',')});
  // 变体只允许挂在「在测」的维度上:维度取消勾选时,清掉不再合法的变体(v65:交叉测两个维度都合法)
  const legal=hyp.testDims;
  for(const c of creatives.filter(x=>(x.hyp||'').startsWith(hyp.id))){
    if(c.variants&&Object.keys(c.variants).some(k=>!legal.includes(k))){
      const nv={};legal.forEach(k=>{if(c.variants[k])nv[k]=c.variants[k];});
      c.variants=nv;
      try{await db.from('creatives').update({variants:nv,updated_at:new Date().toISOString()}).eq('gen_code',c.gen);}catch(e){}
    }
  }
  // 自动生成行:1 维 → 1 条,2 维 → 4 条;维度减少时把多余的空行删掉(2→1 回到 1 条)
  if(can('creative','add')){const target=hyp.testDims.length===2?4:(hyp.testDims.length===1?1:0);if(target){const added=await tmEnsureRows(hyp,target);const trimmed=await tmTrimRows(hyp,target);if(added||trimmed){try{await loadCreatives();}catch(e){}renderCreatives();}}}
  renderTagMatrix();renderHypo();
}
async function tmSetLock(dimKey,val){
  if(!tmEditable()){toast('已锁定,仅 Admin 可改');return;}
  const hyp=hypos.find(h=>h.id===window._tmHyp);if(!hyp)return;
  val=(val||'').trim()||null;
  hyp.lockedTags=Object.assign({},hyp.lockedTags||{});hyp.lockedTags[dimKey]=val;
  await tmSaveHyp(hyp,{locked_tags:hyp.lockedTags});
  creatives.filter(c=>(c.hyp||'').startsWith(hyp.id)).forEach(c=>{c[dimKey]=val;});   // 全组套用
  try{const upd={updated_at:new Date().toISOString()};upd[dimKey]=val;const {error}=await db.from('creatives').update(upd).eq('hyp_code',hyp.id);if(error)throw error;}
  catch(e){toast('套用失败: '+rpcErr(e));}
  renderTagMatrix();
}
async function tmCellChange(sel){
  if(!tmEditable()){toast('已锁定,仅 Admin 可改');renderTagMatrix();return;}
  const gen=sel.getAttribute('data-gen'),dim=sel.getAttribute('data-dim'),val=(sel.value||'').trim()||null;
  const c=creatives.find(x=>x.gen===gen);if(!c)return;
  c[dim]=val;
  const dimDef=MATRIX_DIMS.find(d=>d[0]===dim);sel.style.borderColor=(dimDef&&dimDef[2]&&!val)?'var(--red)':'';
  try{const upd={updated_at:new Date().toISOString()};upd[dim]=val;const {error}=await db.from('creatives').update(upd).eq('gen_code',gen);if(error)throw error;}
  catch(e){toast('保存失败: '+rpcErr(e));}
  // 取值变了 → 这条素材的旧 Variant 描述的是旧内容,清掉让用户重填(v65:只清本行本维度)
  if(c.variants&&c.variants[dim]){c.variants=Object.assign({},c.variants);delete c.variants[dim];
    try{await db.from('creatives').update({variants:c.variants,updated_at:new Date().toISOString()}).eq('gen_code',gen);}catch(e){}
  }
  renderTagMatrix();   // 改完素材值重算一致性红条(否则停在改之前的旧状态)
}
/* 变体名规范化(v62):① 去首尾/多余空格 ② 忽略大小写与已有变体相同 → 采用已有写法 ③ 否则每个词首字母大写(其余不动,JILI 保持 JILI) */
function tmTitleCase(s){return s.replace(/(^|[^\p{L}\p{N}])(\p{Ll})/gu,(m,a,b)=>a+b.toUpperCase());}
function tmNormVariant(dim,base,raw){
  const v=(raw||'').trim().replace(/\s+/g,' ');
  if(!v)return '';
  const pool=new Set();creatives.forEach(x=>{if(x.variants&&x.variants[dim]&&(x[dim]||'')===base)pool.add(x.variants[dim]);});
  for(const p of pool){if(String(p).toLowerCase()===v.toLowerCase())return p;}
  return tmTitleCase(v);
}
async function tmVariantChange(inp){
  if(!tmEditable()){toast('已锁定,仅 Admin 可改');renderTagMatrix();return;}
  const gen=inp.getAttribute('data-gen'),dim=inp.getAttribute('data-dim');
  const c=creatives.find(x=>x.gen===gen);if(!c)return;
  const raw=inp.value,v=tmNormVariant(dim,c[dim]||'',raw);
  if(v&&raw.trim().replace(/\s+/g,' ')!==v)toast('变体名已统一为「'+v+'」');
  c.variants=Object.assign({},c.variants||{});
  if(v)c.variants[dim]=v;else delete c.variants[dim];
  try{const {error}=await db.from('creatives').update({variants:c.variants,updated_at:new Date().toISOString()}).eq('gen_code',gen);if(error)throw error;}
  catch(e){toast('保存失败: '+rpcErr(e));}
  renderTagMatrix();   // 重算一致性红条
}
async function tmAddCreative(){
  if(!tmEditable()){toast('已锁定,仅 Admin 可改');return;}
  if(!can('creative','add')){toast('当前岗位没有「新增素材」权限');return;}
  const hyp=hypos.find(h=>h.id===window._tmHyp);if(!hyp)return;
  await tmEnsureRows(hyp,creatives.filter(c=>(c.hyp||'').startsWith(hyp.id)).length+1);
  try{await loadCreatives();}catch(e){}
  renderCreatives();renderTagMatrix();
}
async function tmSaveLock(){
  const hyp=hypos.find(h=>h.id===window._tmHyp);if(!hyp)return;
  if(!(hyp.testDims&&hyp.testDims.length)){toast('先勾「本次测试维度」');return;}
  const cr=creatives.filter(c=>(c.hyp||'').startsWith(hyp.id));
  if(cr.length<2){toast('至少 2 条素材才能锁定');return;}
  if(cr.some(c=>!c.format||!c.hook)){toast('每条素材的 Format 和 Hook 必填后才能锁定');return;}
  if(checkHypoConsistency(hyp).state!=='clean'){toast('内容不一致,不能锁定 —— 见上方红色提醒');return;}
  hyp.lockedTags=Object.assign({},hyp.lockedTags||{},{_locked:true});
  await tmSaveHyp(hyp,{locked_tags:hyp.lockedTags,status:'已锁定'});hyp.st='已锁定';
  logAction('hypo','edit',hyp.id+' 锁定素材标签');
  toast('已锁定 — 后续只有 Admin 可改');renderTagMatrix();renderHypo();
}
async function tmUnlock(){
  if(!(typeof curRole==='function'&&curRole()&&curRole().admin)){toast('仅 Admin 可解锁');return;}
  const hyp=hypos.find(h=>h.id===window._tmHyp);if(!hyp)return;
  hyp.lockedTags=Object.assign({},hyp.lockedTags||{});delete hyp.lockedTags._locked;
  await tmSaveHyp(hyp,{locked_tags:hyp.lockedTags,status:'待锁定'});hyp.st='待锁定';
  logAction('hypo','edit',hyp.id+' 解锁素材标签');
  toast('已解锁(Admin)');renderTagMatrix();renderHypo();
}
function promote(id){
  const it=ideas.find(x=>x.id===id);
  window._promoteIdea=it?{code:it.id,src:it.src,txt:it.txt}:null;window._editHypoCode=null;
  resetHypoForm();
  const ctx=document.getElementById('formCtx');
  if(ctx)ctx.innerHTML=it?('来自想法池:<b>#'+esc(it.id)+' 「'+esc(it.txt)+'」</b> · '+esc(it.src)):'手动新建假设';
  const xEl=document.getElementById('hf-x');if(xEl)xEl.value='';
  const whyEl=document.getElementById('hf-why');if(whyEl){whyEl.value=it?it.txt:'';whyEl.readOnly=!!it;whyEl.style.background=it?'var(--bg2)':'';whyEl.title=it?'理由来自 Idea,锁定不可改;要改请去 Idea Pool 改想法':'';}
  logAction('hypo','add',id);go('form');updateAll();
}
function prepHypoSelects(){
  document.querySelectorAll('#v-form select').forEach(sel=>{
    if(sel.id==='hf-guard-op'||sel.id==='hf-metric'||sel.id==='hf-guard-m'||sel.id==='hf-persona'||sel.id==='hf-age'||sel.id==='hf-market'||sel.id==='hf-setting')return;
    if(![...sel.options].some(o=>o.value===''&&/unselected/i.test(o.textContent))){
      const o=document.createElement('option');o.value='';o.textContent='— unselected —';sel.insertBefore(o,sel.firstChild);
    }
  });
}
function resetHypoForm(){
  prepHypoSelects();
  // 人群 / 年龄段:词表动态读 DICT
  const pe=document.getElementById('hf-persona');if(pe)pe.innerHTML=dimTabOpts('audience','');
  const ae=document.getElementById('hf-age');if(ae)ae.innerHTML=dimTabOpts('age','');
  // v76:市场跟品牌走,广告目标读字典 Ad Setting
  fillHfMarket((document.getElementById('hf-brand')||{}).value||'');fillHfSetting('');
  const se=document.getElementById('hf-stage');if(se)se.innerHTML=stageOpts('');
  ['hf-brand','hf-persona','hf-age','hf-stage','hf-type','hf-trigger','hf-evi','hf-metric','hf-guard-m'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['hf-x','hf-target','hf-pct','hf-guard-v','cc-budget','hf-plan-launch','hf-plan-days'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const w=document.getElementById('hf-why');if(w){w.value='';w.readOnly=false;w.style.background='';w.title='';}
  syncMetricByBrand();
  document.querySelectorAll('#v-form .reqstar').forEach(s=>s.remove());
  document.querySelectorAll('#v-form .reqbad').forEach(e=>e.classList.remove('reqbad'));
}
function validateHypo(){
  document.querySelectorAll('#v-form .reqstar').forEach(s=>s.remove());
  document.querySelectorAll('#v-form .reqbad').forEach(e=>e.classList.remove('reqbad'));
  const fields=[['hf-brand','品牌'],['hf-persona','人群'],['hf-age','年龄段'],['hf-type','测试类型'],['hf-trigger','起因'],['hf-evi','证据'],['hf-metric','主指标'],['hf-guard-m','防守底线'],['hf-x','改变 X'],['cc-budget','日预算'],['hf-plan-days','测试周期']];
  // figure(目标值 / 护栏阈值)本期 TBD —— 仅对非锁定品牌(INZ9/其他)仍必填;OK188/17WIN/SBKH 留空待定
  if(!BRAND_METRIC[(document.getElementById('hf-brand')||{}).value]){fields.push(['hf-target','目标值'],['hf-guard-v','防守底线阈值']);}
  const miss=[];
  fields.forEach(([id,name])=>{const el=document.getElementById(id);if(!el||el.disabled)return;if(!(el.value||'').trim()){el.classList.add('reqbad');const fld=el.closest('.fld'),lab=fld&&fld.querySelector('label');if(lab&&!lab.querySelector('.reqstar')){const s=document.createElement('span');s.className='reqstar';s.textContent=' *';lab.appendChild(s);}miss.push(name);}});
  return miss;
}
async function saveHypothesis(status){
  if(!can('hypo','add')){toast('当前岗位没有「立假设 / 新增假设」权限');return;}
  if(status==='待锁定'){const miss=validateHypo();if(miss.length){toast('还有 '+miss.length+' 项必填未完成(已标红 *)');return;}}
  const g=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const brand=g('hf-brand');
  const x=g('hf-x').trim();
  const market=g('hf-market')||brandMarkets(brand)[0]||'USC';   // v76:市场是明确选择(INZ9 可选 MY/SG)
  const now=new Date();const month=now.toLocaleString('en-US',{month:'short'})+' '+now.getFullYear();
  let from='…';try{const ob=getBase().own;if(ob&&ob.base!=null)from=(ob.unit==='周均'?'周均 ':'')+ob.base;}catch(e){}
  const gm=g('hf-guard-m');const guard=gm?(gm+' '+g('hf-guard-op')+' '+g('hf-guard-v')):'无';
  const eviType=(g('hf-evi')||'').replace(/[(（].*$/,'').trim();
  const why=g('hf-why').trim();const evidence=eviType+(why?(' — '+why):'');
  let cap=null;try{const le=document.querySelector('#cc-out .light');if(le)cap=le.classList.contains('red')?'red':le.classList.contains('amber')?'amber':le.classList.contains('green')?'green':'gray';}catch(e){}
  const pi=window._promoteIdea||null;
  const planLaunch=g('hf-plan-launch').trim();
  if(planLaunch&&!parseMD(planLaunch)){toast('预计上线日格式应为 M/D,如 7/12');return;}
  const planDaysRaw=g('hf-plan-days').trim();const planDays=planDaysRaw===''?null:parseInt(planDaysRaw,10);
  if(planDaysRaw!==''&&(isNaN(planDays)||planDays<=0)){toast('测试天数应为正整数');return;}
  const row={statement:x,metric:g('hf-metric'),val_from:from,val_to:g('hf-target'),mode:'新测试',market:market,month:month,brand:brand,test_type:g('hf-type'),owner:(currentUser&&currentUser.name)||'',capacity:cap,status:status,idea_code:pi?pi.code:null,idea_label:pi?(pi.code+' · '+pi.src):null,evidence:evidence,guard:guard,trigger_type:g('hf-trigger'),persona:g('hf-persona'),age_range:g('hf-age'),customer_stage:g('hf-stage')||null,plan_launch:planLaunch||null,plan_test_days:planDays,ad_setting:g('hf-setting')||'SALES',created_by:(currentUser&&currentUser.name)||''};
  let code;
  const editCode=window._editHypoCode||null;
  try{
    if(editCode){
      const upd=Object.assign({},row);delete upd.idea_code;delete upd.idea_label;delete upd.created_by;
      // 编辑 ≠ 重建:这些字段保留原值,不被表单重新计算覆盖
      const orig=hypos.find(x=>x.id===editCode)||{};
      delete upd.mode;delete upd.month;delete upd.owner;delete upd.val_from;
      // 状态:已进入锁定/测试等后续阶段的,编辑不改状态;还在草稿/待锁定阶段的按按钮走
      if(orig.st&&!['草稿','待锁定'].includes(orig.st))delete upd.status;
      // 容量:表单没算出结果(gray/null)时保留原体检结果
      if(!upd.capacity||upd.capacity==='gray')delete upd.capacity;
      const {error}=await db.from('hypotheses').update(upd).eq('code',editCode);
      if(error)throw error;code=editCode;
    }else{
      const {data,error}=await db.from('hypotheses').insert(row).select('code').single();
      if(error)throw error;code=data.code;
    }
  }catch(e){alert('Save failed: '+rpcErr(e));return;}
  if(pi&&!editCode){try{await db.from('ideas').update({status:'已立项'}).eq('code',pi.code);const ii=ideas.find(x=>x.id===pi.code);if(ii)ii.st='已立项';}catch(e){}}
  logAction('hypo',editCode?'edit':'add',code+(pi?(' ← '+pi.code):''));
  window._promoteIdea=null;window._editHypoCode=null;
  try{await loadHypos();}catch(e){}
  try{await loadCreatives();}catch(e){}
  renderHypo();renderCreatives();applyPerms();
  toast('假设已保存 '+code+' · '+status+' — 打开它用「＋ 加素材」逐支建骨架');go('hypo');
}

/* v76:品牌×市场从 brand_aliases 主数据来(登录后 MISNaming.syncFromDb 会调 refreshMktBrands 覆盖),
 * 此处为离线/mock fallback。市场词汇统一为 USC/MY/SG(存量 'KH' 读侧归一为 USC,库已迁移)。 */
const MKT_BRANDS={USC:['OK188KH','17WINKH','SBKH'],MY:['INZ9'],SG:['INZ9']};
function allMktBrands(){return [...new Set(Object.values(MKT_BRANDS).flat())];}
function brandMarkets(b){return Object.keys(MKT_BRANDS).filter(m=>MKT_BRANDS[m].includes(b));}
function refreshMktBrands(){
  try{
    const out={};
    (MISNaming.BRANDS||[]).filter(x=>x.status==='active').forEach(x=>(x.markets||[]).forEach(m=>{(out[m]=out[m]||[]).push(x.code);}));
    if(Object.keys(out).length){Object.keys(MKT_BRANDS).forEach(k=>delete MKT_BRANDS[k]);Object.assign(MKT_BRANDS,out);}
  }catch(e){}
}
function fillHfMarket(brand,cur){
  const e=document.getElementById('hf-market');if(!e)return;
  const list=brandMarkets(brand);
  e.innerHTML=(list.length?list:['USC']).map(m=>`<option${m===cur?' selected':''}>${m}</option>`).join('');
}
function fillHfSetting(cur){
  const e=document.getElementById('hf-setting');if(!e)return;
  const rows=(DICT['Ad Setting']||[]).filter(r=>r.on!==false);
  if(rows.length)e.innerHTML=rows.map(r=>`<option value="${esc(r.c)}"${r.c===(cur||'SALES')?' selected':''}>${esc(r.n||r.c)}</option>`).join('');
}
function marketChange(){
  const m=document.getElementById('f-market').value;
  const bSel=document.getElementById('f-hbrand');
  const keep=bSel.value;
  const list=m?(MKT_BRANDS[m]||[]):allMktBrands();
  bSel.innerHTML='<option value="">All Brands</option>'+list.map(b=>`<option>${b}</option>`).join('');
  bSel.value=list.includes(keep)?keep:'';
  renderHypo();
}
function renderHypo(){
  fillIdeaFilter();fillStageFilter();fillMonthFilter();
  const fm=document.getElementById('f-market').value,fb=document.getElementById('f-hbrand').value,fmo=document.getElementById('f-month').value,fmd=document.getElementById('f-mode').value,f=document.getElementById('f-hst').value,fi=document.getElementById('f-idea').value,fs=document.getElementById('f-stage').value;
  document.getElementById('hypoBody').innerHTML=hypos.filter(h=>(!fm||h.market===fm)&&(!fb||h.brand===fb)&&(!fmo||h.month===fmo)&&(!fmd||h.mode===fmd)&&(!f||h.st===f)&&(!fi||(h.idea||'').split(' ')[0]===fi)&&(!fs||h.stage===fs)).map(h=>`
   <tr class="click" onclick="openDrawer(${hypos.indexOf(h)})">
    <td>
     ${h.idea?`<div class="hcell-idea"><span class="pill ideam" title="来自想法: ${esc(h.idea)}">💡${esc((h.idea+'').split(' ')[0])}</span></div>`:''}
     <div class="hcell-main"><span class="code">${h.id}</span> <span class="hx">${esc(h.x)}</span></div>
    </td>
    <td class="sm" style="color:var(--ink3);white-space:nowrap">${h.created?`<div>${new Date(h.created).toLocaleDateString('zh-CN')}</div><div style="color:var(--ink3);font-size:11px">${new Date(h.created).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</div>`:'—'}</td>
    <td>${h.stage?`<span class="pill" style="background:${stageColor(h.stage)[0]};color:${stageColor(h.stage)[1]};font-size:11px" title="顾客阶段: ${esc(h.stage)}">◑ ${esc(stageZh(h.stage))}</span>`:'<span style="color:var(--ink3)">—</span>'}</td>
    <td><div class="qt"><b>${esc(h.metric)}</b></div><div class="hmeta">${esc(h.from)} → ${esc(h.to)}</div></td>
    <td><span class="mode mode-${h.mode}">${h.mode}</span></td>
    <td><span class="pill" style="background:var(--bg2);color:var(--ink2)">${h.market}</span></td>
    <td><span class="link" onclick="event.stopPropagation();goBrand('${esc(h.brand)}')" title="品牌全景(资产/花费/CAPI)">${esc(h.brand)}</span></td><td>${esc(h.type)}</td><td>${esc(h.owner)}</td>
    <td><span class="st" style="color:${h.cap==='red'?'var(--red)':h.cap==='amber'?'var(--amber)':h.cap==='green'?'var(--green)':'var(--ink3)'}" title="创建时容量体检结果,定义见 Dictionary"><i style="background:${h.cap==='red'?'var(--red)':h.cap==='amber'?'var(--amber)':h.cap==='green'?'var(--green)':'var(--ink3)'}"></i>${h.cap==='red'?'红':h.cap==='amber'?'黄':h.cap==='green'?'绿':'—'}</span></td>
    <td><span class="st st-${h.st}"><i></i>${h.st}</span></td>
   </tr>`).join('')||'<tr><td colspan="11" style="text-align:center;color:var(--ink3);padding:28px">该筛选条件下暂无假设</td></tr>';
  const setN=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setN('stat-h-total',hypos.length);setN('stat-h-testing',hypos.filter(h=>h.st==='测试中').length);
  setN('stat-h-pending',hypos.filter(h=>h.st==='待判定').length);setN('stat-h-settled',hypos.filter(h=>h.st==='已沉淀').length);
  setN('stat-h-scaling',hypos.filter(h=>h.mode==='主力运行').length);
}
function fillIdeaFilter(){
  const sel=document.getElementById('f-idea');if(!sel)return;
  const cur=sel.value,m={};
  hypos.forEach(h=>{const c=(h.idea||'').split(' ')[0];if(c)m[c]=h.idea;});
  sel.innerHTML='<option value="">All Ideas</option>'+Object.keys(m).sort().map(c=>`<option value="${esc(c)}"${c===cur?' selected':''}>${esc(m[c])}</option>`).join('');
}
function fillMonthFilter(){
  const sel=document.getElementById('f-month');if(!sel)return;
  const cur=sel.value,set={};hypos.forEach(h=>{if(h.month)set[h.month]=1;});
  const arr=Object.keys(set).sort((a,b)=>new Date('1 '+b)-new Date('1 '+a));
  sel.innerHTML='<option value="">All Months</option>'+arr.map(m=>`<option${m===cur?' selected':''}>${m}</option>`).join('');
}
function fillStageFilter(){
  const sel=document.getElementById('f-stage');if(!sel)return;
  const cur=sel.value;
  // 只列 Dictionary 里启用的阶段(保持漏斗顺序,不按字母排)
  const rows=(DICT['Customer Stage']||[]).filter(r=>r.on!==false);
  sel.innerHTML='<option value="">All Stages</option>'+rows.map(r=>`<option value="${esc(r.c)}"${r.c===cur?' selected':''}>${esc(r.n?r.n+' · '+r.c:r.c)}</option>`).join('');
}
function editHypothesis(i){
  const h=hypos[i];if(!h)return;
  if(!can('hypo','edit')){toast('当前岗位没有「编辑假设」权限');return;}
  window._editHypoCode=h.id;window._promoteIdea=null;
  resetHypoForm();
  const setV=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null&&v!=='')e.value=v;};
  setV('hf-brand',h.brand);fillHfMarket(h.brand,h.market);fillHfSetting(h.adSetting);syncMetricByBrand();const bcfg=BRAND_METRIC[h.brand];
  setV('hf-type',h.type);setV('hf-trigger',h.trigger);setV('hf-persona',h.persona);setV('hf-age',h.age);
  {const se=document.getElementById('hf-stage');if(se){se.innerHTML=stageOpts(h.stage||'');}}
  setV('hf-plan-launch',h.planLaunch);setV('hf-plan-days',h.planDays!=null?String(h.planDays):'');
  // 锁指标品牌:仅当存的指标 ≠ 锁定指标(旧数据迁移场景)才不回填;指标一致则照常回填,避免编辑清空
  const metricMigrated=!!(bcfg&&bcfg.lockMetric&&bcfg.metrics&&bcfg.metrics[0]&&h.metric!==bcfg.metrics[0][0]);
  if(!(bcfg&&bcfg.lockMetric))setV('hf-metric',h.metric);
  setV('hf-x',h.x);
  if(!metricMigrated)setV('hf-target',h.to);
  if(h.guard&&h.guard!=='无'){
    if(bcfg&&bcfg.guardLock){const g=(''+h.guard).trim().match(/^([\s\S]*?)\s*([≥≤>]+)\s*([\d.]+)$/);if(g&&g[3])setV('hf-guard-v',g[3]);} // 锁防守线品牌:指标/op 固定,只回填阈值数字
    else{const g=(''+h.guard).split(/\s+/);setV('hf-guard-m',g[0]);if(g[1])setV('hf-guard-op',g[1]);if(g[2])setV('hf-guard-v',g[2]);}
  }
  let evi=h.evi||'',eviType=evi,why='';const m=evi.match(/^([\s\S]*?)\s*—\s*([\s\S]*)$/);if(m){eviType=m[1];why=m[2];}
  const evEl=document.getElementById('hf-evi');if(evEl&&eviType){const o=[...evEl.options].find(o=>o.text.replace(/[(（][\s\S]*$/,'').trim()===eviType.trim());if(o)evEl.value=o.value;}
  const whyEl=document.getElementById('hf-why');if(whyEl){whyEl.value=why;whyEl.readOnly=false;whyEl.style.background='';whyEl.title='';}
  const ctx=document.getElementById('formCtx');if(ctx)ctx.innerHTML='编辑假设 <b>'+esc(h.id)+'</b> — 改完点下方「存草稿」或「完成草稿 → 待锁定」保存';
  closeDrawer();go('form');try{updateAll(true);}catch(e){}window.scrollTo(0,0);
}
async function delHypothesis(i){
  const h=hypos[i];if(!h)return;
  if(!can('hypo','delete')){toast('当前岗位没有「删除假设」权限');return;}
  const cr=creatives.filter(c=>(c.hyp||'').startsWith(h.id));
  const worked=cr.filter(c=>(c.versions&&c.versions.length)||(c.runs&&c.runs.length));
  if(worked.length){alert('该假设已有 '+worked.length+' 条素材在用(填了版本 / 有运行记录),不能删除。请改用 Edit。');return;}
  if(!confirm('删除假设 '+h.id+'?'+(cr.length?('\n将一并删除 '+cr.length+' 条空骨架 creative。'):'')+'\n不可恢复。'))return;
  try{
    if(cr.length){const {error:ce}=await db.from('creatives').delete().eq('hyp_code',h.id);if(ce)throw ce;}
    const {error}=await db.from('hypotheses').delete().eq('code',h.id);if(error)throw error;
  }catch(e){alert('删除失败: '+rpcErr(e));return;}
  logAction('hypo','delete',h.id+(cr.length?(' (+'+cr.length+' 空 creative)'):''));
  try{await loadHypos();}catch(e){}try{await loadCreatives();}catch(e){}closeDrawer();renderHypo();renderCreatives();toast(h.id+' 已删除');
}
/* ===== 判定:测试跑完后下结论,状态 → 已沉淀,Results 自动汇总 ===== */
function openVerdictForm(i){
  const h=hypos[i];if(!h)return;
  if(!can('hypo','edit')){toast('当前岗位没有「编辑假设」权限');return;}
  const v=h.verdict||{};
  let x='<h2 style="margin:0 0 4px">'+esc(h.id)+' · 判定</h2><div style="color:var(--ink3);font-size:13px;margin-bottom:14px">'+esc(h.x)+'</div>';
  x+='<div class="row2" style="margin-bottom:12px">'
   +'<div class="fld"><label>结论</label><select id="vd-res"><option'+(v.res==='成立'?' selected':'')+'>成立</option><option'+(v.res==='不成立'?' selected':'')+'>不成立</option><option'+(v.res==='无定论'?' selected':'')+'>无定论</option></select></div>'
   +'<div class="fld"><label>数据置信度</label><select id="vd-conf"><option'+(v.conf==='充分'?' selected':'')+'>充分</option><option'+(v.conf==='勉强'?' selected':'')+'>勉强</option></select><div style="font-size:11px;color:var(--ink3);margin-top:4px">「勉强」不计入 Results 胜率</div></div></div>';
  x+='<div class="fld" style="margin-bottom:12px"><label>学到了什么 <span style="color:var(--red)">(必填)</span></label><textarea id="vd-learn" style="width:100%;min-height:70px" placeholder="这次测试证明/推翻了什么">'+esc(v.learn||'')+'</textarea></div>';
  x+='<div class="fld" style="margin-bottom:12px"><label>下月约束 / 行动</label><textarea id="vd-next" style="width:100%;min-height:56px" placeholder="基于结论,下月怎么做">'+esc(v.next||'')+'</textarea></div>';
  x+='<div style="display:flex;gap:8px"><button class="btn ghost" onclick="guard(()=>saveVerdict('+i+'))">保存判定(状态 → 已沉淀)</button><button class="btn ghost" onclick="openDrawer('+i+')">取消</button></div>';
  document.getElementById('d-title').textContent='判定';
  document.getElementById('d-body').innerHTML=x;
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
async function saveVerdict(i){
  const h=hypos[i];if(!h)return;
  if(!can('hypo','edit')){toast('无权判定');return;}
  const g=id=>document.getElementById(id).value;
  const learn=(g('vd-learn')||'').trim();
  if(!learn){toast('「学到了什么」必填 — 判定的价值就在沉淀');return;}
  const verdict={res:g('vd-res'),conf:g('vd-conf'),learn:learn,next:(g('vd-next')||'').trim()};
  try{const {error}=await db.from('hypotheses').update({verdict:verdict,status:'已沉淀',updated_at:new Date().toISOString()}).eq('code',h.id);if(error)throw error;}
  catch(e){toast('保存失败: '+rpcErr(e));return;}
  h.verdict=verdict;h.st='已沉淀';
  if(verdict.res==='成立'&&h.mode!=='主力运行'&&confirm('判定成立 — 把这个假设转为「主力运行」吗?')){
    try{await db.from('hypotheses').update({mode:'主力运行'}).eq('code',h.id);h.mode='主力运行';}catch(e){}
  }
  logAction('hypo','判定',h.id+' → '+verdict.res+'('+verdict.conf+')');
  toast(h.id+' 已判定:'+verdict.res);
  renderHypo();renderResults();openDrawer(i);
}
function openDrawer(i){
  const h=hypos[i];
  document.getElementById('d-title').textContent=h.id+' · '+h.brand+' · '+h.month;
  let tests=h.tests.length?h.tests.map(t=>`
    <tr><td>${t.n.includes('主力')?'<b style="color:var(--green)">'+esc(t.n)+'</b>':esc(t.n)}</td><td class="code">${esc(t.meta)}</td><td>${esc(t.bud)}</td><td>${t.st.includes('异常')?'<span style="color:var(--red);font-weight:600">'+esc(t.st)+'</span>':esc(t.st)}</td></tr>`).join('')
    :'<tr><td colspan="4" style="color:var(--ink3)">暂无测试记录 — 锁定后创建</td></tr>';
  const cr=creatives.filter(c=>c.hyp.startsWith(h.id));
  let crHtml=`<div class="card" style="margin-top:14px"><h3>Creatives · 关联素材(${cr.length})<button class="btn ghost sm" style="float:right" onclick="openTagMatrix('${h.id}')">素材管理 & 标签 →</button></h3>
    ${cr.length?cr.map(c=>`<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)">
      ${thumbBox(c.empty?'empty':c.th,crImgOf(c),c.label,44)}
      <div style="flex:1"><span class="code">${c.code}</span><br><small style="color:var(--ink3)">${c.st}</small></div>
      <div class="code" style="text-align:right">FDC ${esc(c.fdc||'—')}<br>CPA ${esc(c.cpa||'—')}</div></div>`).join(''):'<div style="padding:10px 0;color:var(--ink3)">还没有素材 — 点「素材管理 & 标签 →」进去加素材、打标签。</div>'}
    </div>`;
  let v=h.verdict?`
    <div class="card" style="margin-top:14px;background:var(--bg2)">
      <h3>Verdict · 验证结论</h3>
      <div class="kv" style="margin:0">
        <dt>结果</dt><dd><span class="res-${h.verdict.res}">${h.verdict.res}</span> <span class="conf-${h.verdict.conf}">数据${h.verdict.conf}</span>${h.verdict.conf==='勉强'?' <small style="color:var(--ink3)">不计入胜率统计</small>':''}</dd>
        <dt>学到了什么</dt><dd>${esc(h.verdict.learn)}</dd>
        <dt>下月约束</dt><dd><b>${esc(h.verdict.next)}</b></dd>
      </div>
    </div>`:'';
  const canDel=cr.every(c=>(!c.versions||c.versions.length===0)&&(!c.runs||c.runs.length===0));
  const dwhy=(()=>{const mm=(''+(h.evi||'')).match(/^([\s\S]*?)\s*—\s*([\s\S]*)$/);return mm?mm[2]:'';})();
  const dfrom=(!h.from||h.from==='(无基准·探索)')?'':h.from;
  const ds=(v,cls)=>`<span class="slot ${v?cls:'empty'}">${v||'…'}</span>`;
  document.getElementById('d-body').innerHTML=`
    <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px">
      ${h.st!=='已沉淀'?`<button class="btn ghost sm" data-perm="hypo:edit" onclick="openVerdictForm(${i})">判定</button>`:''}
      <button class="btn ghost sm" data-perm="hypo:edit" onclick="editHypothesis(${i})">Edit</button>
      ${canDel?`<button class="btn danger sm" data-perm="hypo:delete" onclick="delHypothesis(${i})">Delete</button>`:''}
    </div>
    <div>
      <div class="sentence" style="margin:0">
        <div class="sl"><span class="lab">我相信</span><span>${ds(esc(h.x),'fill')}</span></div>
        <div class="sl"><span class="lab">会让</span><span>${ds(esc(h.metric),'auto')} 从 ${ds(esc(dfrom),'auto')} 变为 ${ds(esc(h.to),'fill')}</span></div>
        <div class="sl"><span class="lab">因为</span><span>${ds(dwhy?esc(dwhy):'','fill')}</span></div>
      </div>
    </div>
    <div style="margin-top:16px"><span class="mode mode-${h.mode}">${h.mode}</span> <span class="st st-${h.st}"><i></i>${h.st}</span></div>
    <div class="kv">
      <dt>来源想法</dt><dd>${h.idea}</dd>
      <dt>测试类型</dt><dd>${h.type}</dd>
      <dt>主指标</dt><dd class="code">${h.metric}(唯一判定权)</dd>
      <dt>防守底线</dt><dd>${h.guard}</dd>
      <dt>人群</dt><dd>${h.persona?dictName('audience',h.persona):'—'}</dd>
      <dt>年龄段</dt><dd>${h.age?dictName('age',h.age):'—'}</dd>
      <dt>本次测维度</dt><dd>${(h.testDims&&h.testDims.length)?h.testDims.map(dimLabel).join(' × '):'<span style="color:var(--ink3)">在「素材管理 & 标签」页勾选</span>'}</dd>
      <dt>证据</dt><dd>${esc(h.evi)}</dd>
      <dt>提出人</dt><dd>${h.owner}</dd>
      <dt>创建时间</dt><dd class="sm">${h.created?new Date(h.created).toLocaleString('zh-CN'):'—'}</dd>
    </div>
    <div class="card" style="margin-top:8px">
      <h3>Tests · 测试记录</h3>
      <table><thead><tr><th>Record</th><th>Meta ID</th><th>Budget · Period</th><th>Status</th></tr></thead><tbody>${tests}</tbody></table>
    </div>${crHtml}${v}`;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('ov').classList.add('show');
  applyPerms();
}
function closeDrawer(){document.getElementById('drawer').classList.remove('open');document.getElementById('ov').classList.remove('show');}
function thumbBox(imgClass,imgSrc,label,px){
  const sz=px||56;
  if(imgSrc)return '<img src="'+imgSrc+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:6px;border:1px solid var(--line);object-fit:cover;flex:none">';
  return '<div class="thumb '+(imgClass||'empty')+'" style="width:'+sz+'px;height:'+sz+'px">'+(label||'')+'</div>';
}
/* v72: 素材列表/假设抽屉的缩略图取最新版本的已上传图片(此前只画色块,上传的图不显示) */
function crImgOf(c){const vs=c.versions||[];const last=vs[vs.length-1];return (last&&last.imgSrc)||'';}
function editCreativeRun(i){
  const c=creatives[i];
  document.getElementById('d-title').textContent=c.code+' · 记录搬迁 / 运行';
  document.getElementById('d-body').innerHTML=`
    <h2>记录搬迁 / 新运行</h2>
    <div class="remark" style="margin:6px 0 12px">同一素材换了 campaign/adset 在这记 —— 保存时自动把当前进行中的运行「结束」,再开这条新的。内容(文案/图)不在这变。</div>
    <div class="row2">
      <div class="fld"><label>阶段</label><select id="cr-phase"><option value="test">测试 Test</option><option value="scale">放量 Scale</option></select></div>
      <div class="fld"><label>起始日期</label><input id="cr-start" type="text" placeholder="如 6/16"></div>
      <div class="fld"><label>本周花费 $(可后补)</label><input id="cr-spend" type="number" min="0" placeholder="如 320"></div>
    </div>
    <div class="row2">
      <div class="fld"><label>Campaign</label><input id="cr-camp" type="text"></div>
      <div class="fld"><label>Adset</label><input id="cr-adset" type="text"></div>
    </div>
    <div class="row"><div class="fld"><label>Meta 广告 id</label><input id="cr-meta" type="text"></div></div>
    <div class="row"><div class="fld"><label>说明(为什么搬 / 测试胜出等)</label><input id="cr-note" type="text"></div></div>
    <div style="display:flex;gap:8px;margin-top:6px">
      <button class="btn ghost" onclick="saveCreativeRun(${i})">保存运行</button>
      <button class="btn ghost" onclick="openCreative(${i})">取消</button>
    </div>`;
  document.getElementById('cr-phase').value='scale';
}
function isoWeekOf(d){const t=new Date(d);t.setHours(0,0,0,0);t.setDate(t.getDate()+3-((t.getDay()+6)%7));const w1=new Date(t.getFullYear(),0,4);return t.getFullYear()+'-W'+String(1+Math.round(((t-w1)/864e5-3+((w1.getDay()+6)%7))/7)).padStart(2,'0');}
async function saveCreativeRun(i){
  const c=creatives[i];c.runs=c.runs||[];
  const start=document.getElementById('cr-start').value||new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  const spendRaw=(document.getElementById('cr-spend')||{value:''}).value;
  const spend=spendRaw===''?null:+spendRaw;
  const startD=parseMD(start)||new Date();
  const open=c.runs.find(r=>r.start&&!r.end);if(open)open.end=start;
  c.runs.push({r:c.runs.length+1,phase:document.getElementById('cr-phase').value,camp:document.getElementById('cr-camp').value,adset:document.getElementById('cr-adset').value,meta:document.getElementById('cr-meta').value,start:start,end:null,snap:null,note:document.getElementById('cr-note').value,week:isoWeekOf(startD),spend:spend});
  try{const {error}=await db.from('creatives').update({runs:c.runs,updated_at:new Date().toISOString()}).eq('gen_code',c.gen);if(error)throw error;}
  catch(e){toast('运行记录保存失败: '+rpcErr(e));return;}
  logAction('creative','edit',(c.gen||c.code||'')+' 运行记录');
  toast('运行记录已保存');
  openCreative(i);
}
// 结束当前运行段(不开新段):填结束日,可选把素材标记已下线
async function endCreativeRun(i){
  const c=creatives[i];const open=(c.runs||[]).find(r=>r.start&&!r.end);
  if(!open){toast('没有进行中的运行段');return;}
  if(!can('creative','edit')){toast('当前岗位没有「编辑 creative」权限');return;}
  const today=new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  if(!confirm('结束当前运行段(运行 '+open.r+',始于 '+open.start+')— 结束日记为今天 '+today+'?'))return;
  open.end=today;
  let patch={runs:c.runs,updated_at:new Date().toISOString()};
  const off=confirm('同时把素材状态标记为「已下线」吗?(取消 = 仅结束这段运行)');
  if(off){patch.status='已下线';patch.stc='off';}
  try{const {error}=await db.from('creatives').update(patch).eq('gen_code',c.gen);if(error)throw error;}
  catch(e){toast('保存失败: '+rpcErr(e));return;}
  if(off){c.st='已下线';c.stc='off';renderCreatives();}
  logAction('creative','edit',(c.gen||'')+' 结束运行'+(off?' + 下线':''));
  toast('运行已结束');openCreative(i);
}
// 补记某一周的花费(跑多周的段,每周补一笔;Budget 已投放按周汇总)
function addWeekSpend(i){
  const c=creatives[i];if(!c)return;
  if(!can('creative','edit')){toast('当前岗位没有「编辑 creative」权限');return;}
  let x='<h2 style="margin:0 0 4px">'+esc(c.code)+' · 补记周花费</h2><div style="color:var(--ink3);font-size:13px;margin-bottom:14px">跑多周的运行,每周补一笔;Budget「已投放」按周自动汇总。</div>';
  x+='<div class="row2" style="margin-bottom:12px"><div class="fld"><label>周(ISO)</label><input id="ws-week" type="text" value="'+isoWeekOf(new Date())+'"></div>'
   +'<div class="fld"><label>该周花费 $</label><input id="ws-amt" type="number" min="0" placeholder="如 320"></div></div>';
  x+='<div style="display:flex;gap:8px"><button class="btn ghost" onclick="guard(()=>saveWeekSpend('+i+'))">保存</button><button class="btn ghost" onclick="openCreative('+i+')">取消</button></div>';
  document.getElementById('d-title').textContent='补记周花费';
  document.getElementById('d-body').innerHTML=x;
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
async function saveWeekSpend(i){
  const c=creatives[i];const wk=(document.getElementById('ws-week').value||'').trim();
  const amt=+(document.getElementById('ws-amt').value||'');
  if(!/^\d{4}-W\d{1,2}$/.test(wk)){toast('周格式:如 2026-W28');return;}
  if(!(amt>=0)||!document.getElementById('ws-amt').value){toast('请填该周花费');return;}
  c.runs=c.runs||[];
  const ex=c.runs.find(r=>r.week===wk&&r.phase==='spend');
  if(ex)ex.spend=amt;else c.runs.push({r:c.runs.length+1,phase:'spend',week:wk,spend:amt,start:null,end:wk,note:'周花费补记',camp:'',adset:'',meta:''});
  try{const {error}=await db.from('creatives').update({runs:c.runs,updated_at:new Date().toISOString()}).eq('gen_code',c.gen);if(error)throw error;}
  catch(e){toast('保存失败: '+rpcErr(e));return;}
  logAction('creative','edit',(c.gen||'')+' 周花费 '+wk+' $'+amt);
  toast('已记 '+wk+' $'+amt);openCreative(i);
}
// 上传图统一压缩:最长边 800px + JPEG 0.82,避免原图 base64(MB 级)灌进 versions JSONB
function shrinkImage(file,cb){
  const r=new FileReader();
  r.onload=e=>{const img=new Image();img.onload=()=>{
    const MAX=800,sc=Math.min(1,MAX/Math.max(img.width,img.height));
    if(sc>=1&&file.size<300*1024)return cb(e.target.result);   // 小图直接用
    const cv=document.createElement('canvas');cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    cb(cv.toDataURL('image/jpeg',0.82));
  };img.src=e.target.result;};
  r.readAsDataURL(file);
}
// 图片上链:压缩后的 dataURL 传 Supabase Storage(creatives/pi/),存公链 URL;失败回退 base64,不阻断保存
async function uploadImage(dataUrl,tag){
  if(!dataUrl||window.__DEMO__||dataUrl.indexOf('data:')!==0)return dataUrl;
  try{
    const blob=await (await fetch(dataUrl)).blob();
    const path='pi/'+(tag||'img').replace(/[^A-Za-z0-9_-]/g,'')+'-'+Date.now()+'.jpg';
    const {error}=await db.storage.from('creatives').upload(path,blob,{contentType:'image/jpeg'});
    if(error)throw error;
    const {data}=db.storage.from('creatives').getPublicUrl(path);
    return (data&&data.publicUrl)||dataUrl;
  }catch(e){console.warn('storage upload fallback:',e.message||e);return dataUrl;}
}
function ecImgPick(input){const f=input.files&&input.files[0];if(!f)return;shrinkImage(f,src=>{window._ecImgSrc=src;const p=document.getElementById('ec-imgprev');if(p)p.innerHTML='<img src="'+src+'" style="width:64px;height:64px;border-radius:6px;border:1px solid var(--line);object-fit:cover;flex:none">';});}
function openCreative(i){
  const c=creatives[i],vs=c.versions||[],cur=vs[vs.length-1]||{copy:{}},cc=cur.copy||{},noVer=vs.length===0;
  const rej=vs.filter(v=>v.status==='rejected'),Mc=rej.filter(v=>v.cause==='copy').length,Mi=rej.filter(v=>v.cause==='image').length;
  const perf=vs.filter(v=>v.ev==='perf'),K=perf.length,Kc=perf.filter(v=>v.chg==='copy'||v.chg==='both').length,Ki=perf.filter(v=>v.chg==='image'||v.chg==='both').length;
  const isDraft=cur.status==='draft';
  const F=[['Primary text','p'],['Headline','h'],['Description','d'],['CTA','c']];
  const curRows=F.map(([lab,k])=>`<div class="cprow"><div class="cplab">${lab}</div><div class="cpcell" style="grid-column:span 2">${esc(cc[k]||'—')}</div></div>`).join('');
  const overview=noVer
    ?`还没有版本 — 填了第一版后这里显示版本数、被拒 / 迭代次数`
    :isDraft
    ?`共 <b>1</b> 版 · <span style="color:var(--ink3)">草稿,未提交 Meta</span>`
    :`共 <b>${vs.length}</b> 版 · 被拒 <b style="color:${rej.length?'var(--red)':'var(--ink2)'}">${rej.length}</b> 次(文案 ${Mc} · 图 ${Mi}) · 效果迭代 <b>${K}</b> 次(文案 ${Kc} · 图 ${Ki})`;
  document.getElementById('d-title').textContent=c.code;
  document.getElementById('d-body').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <h2 style="margin:0">素材概览 · Creative Overview</h2>
      <span style="display:flex;gap:6px">
      ${(c.runs||[]).some(r=>r.start&&!r.end)?`<button class="btn ghost sm" data-perm="creative:edit" onclick="guard(()=>endCreativeRun(${i}))">■ 结束运行</button>`:''}
      ${(c.runs||[]).length?`<button class="btn ghost sm" data-perm="creative:edit" onclick="addWeekSpend(${i})">＋ 补记周花费</button>`:''}
      <button class="btn ghost sm" data-perm="creative:add" onclick="editCreativeRun(${i})">＋ 记录搬迁 / 运行</button>
      </span>
    </div>
    <div style="margin:2px 0 6px"><span class="cst cst-${c.stc}">${c.st}</span></div>
    <div class="kv">
      <dt>关联假设</dt><dd>${esc(c.hyp)}</dd>
      <dt>Format</dt><dd class="code">${c.fmt}</dd>
      <dt>Hook</dt><dd>${c.hook} · ${ZH[c.hook]||''}</dd>
      <dt>Visual Style</dt><dd>${c.vs} · ${ZH[c.vs]||''}</dd>
    </div>
    <div class="card" style="margin-top:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <h3 style="margin:0">现状 · ${noVer?'还没有版本':'当前版本 '+(isDraft?'(草稿)':'v'+cur.v+'(上线中)')}</h3>
        ${noVer?`<button class="btn sm" data-perm="creative:edit" onclick="firstVersion(${i})">Setup</button>`:`<button class="btn ghost sm" data-perm="creative:edit" onclick="editCreativeCopy(${i})">Edit</button>`}
      </div>
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
        ${thumbBox(cur.img,cur.imgSrc,c.label,56)}
        <div class="code">${esc(c.spend||'—')} · FDC ${esc(c.fdc||'—')} · CPA ${esc(c.cpa||'—')}</div>
      </div>
      ${curRows}
    </div>
    <div class="card" style="margin-top:8px">
      <h3>历史记录概览</h3>
      <div style="font-size:13px;line-height:1.9">${overview}</div>
      <button class="btn ghost sm" style="margin-top:10px" onclick="openCreativeDetail(${i})">查看完整版本记录 →</button>
      <div class="remark" style="margin-top:10px">每次换版(被拒 / 效果差)都整版留痕 —— 图 + 文案 + 裁决 / 数据,append-only。明细见版本记录页。</div>
    </div>`;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('ov').classList.add('show');
}
function openCreativeDetail(i){
  window._vformI=i;
  const c=creatives[i],vs=c.versions||[],runs=c.runs||[];
  const evlab={initial:'首次提交',reject:'被拒后换版',perf:'效果差换版',self:'自发优化'};
  const sb=(v)=>{const m={rejected:['vb-rej','❌ 被拒 · '+(v.cause==='copy'?'文案':'图/视频')],live:['vb-live','✅ 上线中'],retired:['vb-ret','⤓ 已下线 · 效果差'],paused:['vb-ret','⏸ 已暂停'],draft:['vb-draft','草稿 · 未提交']};const x=m[v.status]||['vb-ret',v.status];return `<span class="vb ${x[0]}">${x[1]}</span>`;};
  const cards=vs.map(v=>{
    const snap=v.snap?`<span class="code">花费 ${v.snap.spend} · FDC ${v.snap.fdc} · CPA ${v.snap.cpa}</span>`:`<span class="code" style="color:var(--ink3)">未上线 · 无数据</span>`;
    const co=v.copy||{};
    return `<div class="vcard${v.status==='live'?' vcur':''}">
      <div class="vhead">
        <div><span class="vno">v${v.v}</span> ${sb(v)} <span style="color:var(--ink3);font-size:11px">· ${v.date} · ${evlab[v.ev]||''}</span></div>
        <div>${snap}</div>
      </div>
      <div class="vreason">${esc(v.reason||'')}</div>
      <div class="vbody">
        ${thumbBox(v.img,v.imgSrc,c.label,64)}
        <div class="vcopy">
          <div><span class="vk">Primary</span>${esc(co.p||'—')}</div>
          <div><span class="vk">Headline</span>${esc(co.h||'—')}</div>
          <div><span class="vk">Description</span>${esc(co.d||'—')}</div>
          <div><span class="vk">CTA</span>${esc(co.c||'—')}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  const pb=(p)=>p==='scale'?'<span class="vb rb-scale">放量 Scale</span>':'<span class="vb rb-test">测试 Test</span>';
  const runCards=runs.length?runs.map(r=>`<div class="vcard${r.end?'':' vcur'}">
      <div class="vhead">
        <div><span class="vno">运行 ${r.r}</span> ${pb(r.phase)} <span style="color:var(--ink3);font-size:11px">· ${r.start} → ${r.end||'至今'}</span></div>
        <div>${r.snap?`<span class="code">花费 ${r.snap.spend} · FDC ${r.snap.fdc} · CPA ${r.snap.cpa}</span>`:''}</div>
      </div>
      <div class="vreason">${esc(r.note||'')}</div>
      <div class="kv" style="margin:6px 0 0">
        <dt>Campaign</dt><dd class="code">${esc(r.camp)}</dd>
        <dt>Adset</dt><dd class="code">${esc(r.adset)}</dd>
        <dt>Meta 广告 id</dt><dd class="code">${esc(r.meta)}</dd>
      </div>
    </div>`).join(''):'<div class="remark">尚未上线,无运行记录。</div>';
  const rej=vs.filter(v=>v.status==='rejected'),Mc=rej.filter(v=>v.cause==='copy').length,Mi=rej.filter(v=>v.cause==='image').length;
  const perf=vs.filter(v=>v.ev==='perf'),K=perf.length,Kc=perf.filter(v=>v.chg==='copy'||v.chg==='both').length,Ki=perf.filter(v=>v.chg==='image'||v.chg==='both').length;
  const curRun=runs.find(r=>!r.end);
  const phaseTag=curRun?(curRun.phase==='scale'?'<span class="vb rb-scale">放量中</span>':'<span class="vb rb-test">测试中</span>'):'';
  document.getElementById('cv-detail').innerHTML=`
    <div class="head">
      <div>
        <h1>版本记录 · <span class="code" style="font-size:14px">${c.code}</span> ${phaseTag}</h1>
        <div class="sub">${esc(c.hyp)} · ${esc(c.hook)} · 内容 ${vs.length} 版(被拒 ${rej.length} · 效果迭代 ${K}) · 运行 ${runs.length} 段</div>
      </div>
      <div class="filters"><button class="btn ghost" onclick="closeCreativeDetail()">← 返回 Creatives</button></div>
    </div>

    <h3 class="seclabel">运行记录 · Placement(测试 ↔ 放量)<span style="font-weight:400;color:var(--ink3);font-size:11px"> — 同一素材换 campaign/adset 在这记;内容不在这变</span></h3>
    <div class="card hidden" id="rform" style="margin-bottom:14px">
      <h3>记录搬迁 / 新运行 — 同一素材换了 campaign/adset</h3>
      <div class="row2">
        <div class="fld"><label>阶段</label><select id="rf-phase"><option value="test">测试 Test</option><option value="scale">放量 Scale</option></select></div>
        <div class="fld"><label>起始日期</label><input id="rf-start" type="text" placeholder="如 6/16"></div>
      </div>
      <div class="row2">
        <div class="fld"><label>Campaign</label><input id="rf-camp" type="text"></div>
        <div class="fld"><label>Adset</label><input id="rf-adset" type="text"></div>
      </div>
      <div class="row"><div class="fld"><label>Meta 广告 id</label><input id="rf-meta" type="text"></div></div>
      <div class="row"><div class="fld"><label>说明(为什么搬 / 测试胜出等)</label><input id="rf-note" type="text"></div></div>
      <div class="remark">保存时自动把当前进行中的运行「结束」(end = 这条起始日),再开这条新的。同一素材,不新建行。</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn ghost" onclick="saveRun()">保存运行</button>
        <button class="btn ghost" onclick="cancelRun()">取消</button>
      </div>
    </div>
    ${runCards}

    <h3 class="seclabel" style="margin-top:18px">内容版本 · Content Versions<span style="font-weight:400;color:var(--ink3);font-size:11px"> — 文案/图变了才记(被拒 / 效果差);append-only,不覆盖</span></h3>
    <div style="margin-bottom:10px"></div>
    <div class="card hidden" id="vform" style="margin-bottom:14px">
      <h3>新增 / 修改版本 — append,不覆盖历史</h3>
      <div class="row2">
        <div class="fld"><label>换版原因(触发)</label>
          <select id="vf-trig" onchange="vfChgToggle()"><option value="reject">被拒后重投</option><option value="perf">效果差换版</option><option value="self">自发优化</option><option value="initial">首次提交</option></select>
        </div>
        <div class="fld"><label>这一版结果</label>
          <select id="vf-status" onchange="vfCauseToggle()"><option value="live">上线中</option><option value="rejected">被拒</option><option value="retired">已下线</option><option value="draft">草稿</option></select>
        </div>
      </div>
      <div class="row" id="vf-causerow" style="display:none">
        <div class="fld"><label>拒因(被 Meta 拒的是哪部分)</label>
          <select id="vf-cause"><option value="copy">文案</option><option value="image">图 / 视频</option></select>
        </div>
      </div>
      <div class="row" id="vf-chgrow" style="display:none">
        <div class="fld"><label>改了什么(效果迭代:这次动的是文案还是图)</label>
          <select id="vf-chg"><option value="copy">文案</option><option value="image">图 / 视频</option><option value="both">两者</option></select>
        </div>
      </div>
      <div class="row"><div class="fld"><label>Primary text</label><textarea id="vf-p" rows="2"></textarea></div></div>
      <div class="row2">
        <div class="fld"><label>Headline</label><input id="vf-h" type="text"></div>
        <div class="fld"><label>CTA</label><input id="vf-c" type="text"></div>
      </div>
      <div class="row"><div class="fld"><label>Description</label><input id="vf-d" type="text"></div></div>
      <div class="row"><div class="fld"><label>说明(为什么换 / 拒登原文 / 当时数据)</label><input id="vf-reason" type="text"></div></div>
      <div class="remark">图:原型沿用当前版本缩略图(不做上传)。真实环境此处接 Supabase Storage,v1 在「上传」那一刻落痕。</div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn ghost" onclick="saveVersion()">保存版本</button>
        <button class="btn ghost" onclick="cancelVersion()">取消</button>
      </div>
    </div>
    ${cards}`;
  document.getElementById('cv-list').classList.add('hidden');
  document.getElementById('cv-detail').classList.remove('hidden');
  closeDrawer();
  window.scrollTo(0,0);
}
function closeCreativeDetail(){
  document.getElementById('cv-detail').classList.add('hidden');
  document.getElementById('cv-list').classList.remove('hidden');
  window.scrollTo(0,0);
}
function vfCauseToggle(){document.getElementById('vf-causerow').style.display=document.getElementById('vf-status').value==='rejected'?'flex':'none';}
function vfChgToggle(){const t=document.getElementById('vf-trig').value;document.getElementById('vf-chgrow').style.display=(t==='perf'||t==='self')?'flex':'none';}
function cancelVersion(){document.getElementById('vform').classList.add('hidden');}
// 单条素材任一时间只能有一版在线:新版上线 → 之前在线的版本自动「已下线」(被替换)。修掉「衍生新版后旧版仍显示上线中」。
function retirePriorLive(vs){
  if(!vs||!vs.length)return;
  const cur=vs[vs.length-1];
  if(!cur||cur.status!=='live')return;
  for(let j=0;j<vs.length-1;j++){if(vs[j].status==='live')vs[j].status='retired';}
}
async function saveVersion(){
  const i=window._vformI,vs=creatives[i].versions;
  const status=document.getElementById('vf-status').value;
  const ev=document.getElementById('vf-trig').value;
  const cause=status==='rejected'?document.getElementById('vf-cause').value:null;
  const chg=(ev==='perf'||ev==='self')?document.getElementById('vf-chg').value:null;
  const copy={p:document.getElementById('vf-p').value,h:document.getElementById('vf-h').value,d:document.getElementById('vf-d').value,c:document.getElementById('vf-c').value};
  const reason=document.getElementById('vf-reason').value;
  const today=new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  const last=vs[vs.length-1];
  if(last&&last.status==='draft'){last.status=status;last.ev=ev;last.cause=cause;last.chg=chg;last.copy=copy;last.reason=reason;last.date=today;}
  else{vs.push({v:vs.length+1,date:today,ev:ev,status:status,cause:cause,chg:chg,reason:reason,snap:null,img:(last&&last.img)||'',copy:copy});}
  retirePriorLive(vs);
  try{const {error}=await db.from('creatives').update({versions:vs,updated_at:new Date().toISOString()}).eq('gen_code',creatives[i].gen);if(error)throw error;}
  catch(e){alert('保存失败: '+rpcErr(e));return;}
  logAction('creative','edit',(creatives[i].gen||'')+' 换版 v'+vs.length);
  renderCreatives();openCreativeDetail(i);toast('版本已保存');
}
function cancelRun(){document.getElementById('rform').classList.add('hidden');}
function ecCauseToggle(){const r=document.getElementById('ec-causerow');if(r)r.style.display=document.getElementById('ec-status').value==='rejected'?'flex':'none';}
function ecChgToggle(){const r=document.getElementById('ec-chgrow'),t=document.getElementById('ec-trig');if(r&&t)r.style.display=(t.value==='perf'||t.value==='self')?'flex':'none';}
function firstVersion(i){
  const c=creatives[i];window._fvImgSrc=null;
  document.getElementById('d-title').textContent=c.code+' · Setup';
  document.getElementById('d-body').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <h2 style="margin:0">Setup · 文案 + 图</h2>
      <div style="display:flex;gap:6px;flex:none">
        <button class="btn ghost sm" onclick="saveFirstVersion(${i},'draft')">Draft</button>
        <button class="btn ghost sm" onclick="saveFirstVersion(${i},'save')">Save</button>
        <button class="btn ghost sm" onclick="openCreative(${i})">取消</button>
      </div>
    </div>
    <div class="remark" style="margin:6px 0 12px"><b>Draft</b> 可随时先存、不强制填完;<b>Save</b> 则要填完所有内容、之后改才走「换版」。</div>
    <div class="row"><div class="fld"><label>图 / 视频(点选 — 原型仅预览,不真存)</label>
      <div style="display:flex;gap:10px;align-items:center">
        <div id="fv-imgprev">${thumbBox('','',c.label,64)}</div>
        <input type="file" id="fv-imgfile" accept="image/*" onchange="fvImgPick(this)">
      </div></div></div>
    <div class="row"><div class="fld"><label>Ads Code（可自动生成 · 契约 市场_品牌_设定_格式_维度_内容_编号）</label>
      <div style="display:flex;gap:8px"><input id="fv-ads" type="text" style="flex:1" value="${(c.ads||'').replace(/"/g,'&quot;')}">
        <button type="button" class="btn ghost sm" style="flex:none" onclick="MISNaming.fvGen(${i})">⚙ 生成</button></div>
      <small id="fv-adsnote" style="color:var(--ink3)"></small></div></div>
    <div class="row"><div class="fld"><label>Primary text</label><textarea id="fv-p" rows="2"></textarea></div></div>
    <div class="row2">
      <div class="fld"><label>Headline</label><input id="fv-h" type="text"></div>
      <div class="fld"><label>CTA</label><input id="fv-c" type="text"></div>
    </div>
    <div class="row"><div class="fld"><label>Description</label><input id="fv-d" type="text"></div></div>`;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('ov').classList.add('show');
}
function fvImgPick(input){const f=input.files&&input.files[0];if(!f)return;shrinkImage(f,src=>{window._fvImgSrc=src;document.getElementById('fv-imgprev').innerHTML=thumbBox('',src,'',64);});}
// 内容必填(保存时):图 + 4 个文案;Ads Code 可留空
function creativeContentMissing(prefix,hasImg){
  const m=[];if(!hasImg)m.push('图 / 视频');
  [['p','Primary text'],['h','Headline'],['c','CTA'],['d','Description']].forEach(([s,n])=>{if(!(((document.getElementById(prefix+'-'+s)||{}).value)||'').trim())m.push(n);});
  return m;
}
async function saveFirstVersion(i,mode){
  if(!can('creative','edit')){toast('当前岗位没有「编辑 creative」权限');return;}
  if(mode==='save'){const miss=creativeContentMissing('fv',!!window._fvImgSrc);if(miss.length){toast('保存前需填完:'+miss.join('、')+'(存草稿可留空)');return;}}
  const c=creatives[i];
  const copy={p:document.getElementById('fv-p').value,h:document.getElementById('fv-h').value,d:document.getElementById('fv-d').value,c:document.getElementById('fv-c').value};
  const today=new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  const vstatus=mode==='save'?'live':'draft';
  const upImg=window._fvImgSrc?await uploadImage(window._fvImgSrc,c.gen):null;
  const v1={v:1,date:today,ev:'first',status:vstatus,cause:null,chg:null,reason:null,snap:null,img:'',imgSrc:upImg,copy:copy};
  const rowStatus=mode==='save'?'上线中':'待上线';
  const adsv=((document.getElementById('fv-ads')||{}).value||'').trim()||null;
  // v81 登记制(方案一):新式 7 段名保存即登记 —— ref_code 存基名(剥 V 后缀)做归因 join 键;存量老 ref 不覆盖
  const upd={versions:[v1],status:rowStatus,ads_code:adsv,updated_at:new Date().toISOString()};
  if(adsv&&window.MISNaming){const p=MISNaming.parseAdName(adsv);if(p.ok&&p.style==='v2'&&!c.ref)upd.ref_code=p.base;}
  try{const {error}=await db.from('creatives').update(upd).eq('gen_code',c.gen);if(error)throw error;}
  catch(e){alert('保存失败: '+rpcErr(e));return;}
  c.versions=[v1];c.st=rowStatus;c.ads=adsv;if(upd.ref_code)c.ref=upd.ref_code;
  logAction('creative','edit',(c.gen||'')+(mode==='save'?' 第一版':' 草稿'));
  renderCreatives();openCreative(i);toast(mode==='save'?'第一版已保存':'草稿已存');
}
function editCreativeCopy(i){if((creatives[i].versions||[]).length===0)return firstVersion(i);
  if(!can('creative','edit')){toast('当前岗位没有「编辑 creative」权限');return;}
  const vs=creatives[i].versions||[],cur=vs[vs.length-1]||{copy:{}},cc=cur.copy||{},isDraft=cur.status==='draft';
  window._ecImgSrc=null;
  document.getElementById('d-title').textContent=creatives[i].code+' · 编辑这版';
  document.getElementById('d-body').innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <h2 style="margin:0">编辑这版 · 文案 + 图</h2>
      <div style="display:flex;gap:6px;flex:none">
        <button class="btn ghost sm" onclick="saveCreativeCopy(${i},'draft')">Draft</button>
        <button class="btn ghost sm" onclick="saveCreativeCopy(${i},'save')">Save</button>
        <button class="btn ghost sm" onclick="openCreative(${i})">取消</button>
      </div>
    </div>
    <div class="remark" style="margin:6px 0 12px">${isDraft?'这条还是草稿 — 文案 / 图直接改;改完可设为「上线中」提交。':'这版已提交。改文案或图都会<b>存成新一版</b>(append),旧版保留 — 所以要选换版原因。'}</div>
    ${(!isDraft&&window.MISNaming)?(function(){const vn=MISNaming.versionName(i);return vn?`
    <div class="row"><div class="fld"><label>本版投放名(衍生版 = 基码 + V 后缀,去 Meta 建广告用这个名)</label>
      <div style="display:flex;gap:8px"><input type="text" readonly value="${esc(vn)}" style="flex:1;background:var(--bg2)" onclick="this.select()">
      <button type="button" class="btn ghost sm" style="flex:none" onclick="navigator.clipboard.writeText('${esc(vn)}').then(()=>toast('已复制'))">复制</button></div></div></div>`:''})():''}
    <div class="row"><div class="fld"><label>图 / 视频(点选替换 — 原型仅预览,不真存)</label>
      <div style="display:flex;gap:10px;align-items:center">
        <div id="ec-imgprev">${thumbBox(cur.img,cur.imgSrc,creatives[i].label,64)}</div>
        <input type="file" id="ec-imgfile" accept="image/*" onchange="ecImgPick(this)">
      </div>
    </div></div>
    <div class="row2">
      <div class="fld"><label>这一版结果</label><select id="ec-status" onchange="ecCauseToggle()"><option value="draft">草稿</option><option value="live">上线中</option><option value="rejected">被拒</option><option value="retired">已下线</option></select></div>
      <div class="fld" id="ec-trigrow" style="${isDraft?'display:none':''}"><label>换版原因</label><select id="ec-trig" onchange="ecChgToggle()"><option value="reject">被拒后重投</option><option value="perf">效果差换版</option><option value="self">自发优化</option></select></div>
    </div>
    <div class="row" id="ec-causerow" style="display:none"><div class="fld"><label>拒因(被 Meta 拒的是哪部分)</label><select id="ec-cause"><option value="copy">文案</option><option value="image">图 / 视频</option></select></div></div>
    <div class="row" id="ec-chgrow" style="display:none"><div class="fld"><label>改了什么(效果迭代:动的是文案还是图)</label><select id="ec-chg"><option value="copy">文案</option><option value="image">图 / 视频</option><option value="both">两者</option></select></div></div>
    <div class="row"><div class="fld"><label>Primary text</label><textarea id="ec-p" rows="2">${esc(cc.p||'')}</textarea></div></div>
    <div class="row2">
      <div class="fld"><label>Headline</label><input id="ec-h" type="text" value="${esc(cc.h)}"></div>
      <div class="fld"><label>CTA</label><input id="ec-c" type="text" value="${esc(cc.c)}"></div>
    </div>
    <div class="row"><div class="fld"><label>Description</label><input id="ec-d" type="text" value="${esc(cc.d)}"></div></div>
    <div class="row"><div class="fld"><label>说明(为什么换 / 拒登原文 / 当时数据)</label><input id="ec-reason" type="text"></div></div>
    <div class="row"><div class="fld"><label>Ads Code（团队手动命名,可留空）</label><input id="ec-ads" type="text" value="${esc(creatives[i].ads)}"></div></div>
    `;
  document.getElementById('ec-status').value=['draft','live','rejected','retired'].includes(cur.status)?cur.status:'live';
  ecCauseToggle();ecChgToggle();
  document.getElementById('drawer').classList.add('open');document.getElementById('ov').classList.add('show');
}
async function saveCreativeCopy(i,mode){
  if(!can('creative','edit')){toast('当前岗位没有「编辑 creative」权限');return;}
  const vs=creatives[i].versions,last=vs[vs.length-1];
  const newImg=window._ecImgSrc?await uploadImage(window._ecImgSrc,creatives[i].gen):null;
  if(mode==='save'){const miss=creativeContentMissing('ec',!!(newImg||(last&&(last.imgSrc||last.img))));if(miss.length){toast('保存前需填完:'+miss.join('、')+'(存草稿可留空)');return;}}
  let status=mode==='draft'?'draft':(document.getElementById('ec-status').value||'live');
  if(mode==='save'&&status==='draft')status='live';
  const copy={p:document.getElementById('ec-p').value,h:document.getElementById('ec-h').value,d:document.getElementById('ec-d').value,c:document.getElementById('ec-c').value};
  const reason=document.getElementById('ec-reason').value;
  const today=new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  if(last.status==='draft'){last.copy=copy;last.status=status;if(reason)last.reason=reason;if(newImg)last.imgSrc=newImg;last.date=today;if(status==='rejected'){last.cause=document.getElementById('ec-cause').value;}}
  else{const trig=document.getElementById('ec-trig').value;const cause=status==='rejected'?document.getElementById('ec-cause').value:null;const chg=(trig==='perf'||trig==='self')?document.getElementById('ec-chg').value:null;vs.push({v:vs.length+1,date:today,ev:trig,status:status,cause:cause,chg:chg,reason:reason,snap:null,img:last.img||'',imgSrc:newImg||last.imgSrc,copy:copy});}
  retirePriorLive(vs);
  const adsv=((document.getElementById('ec-ads')||{}).value||'').trim()||null;
  const stMap={live:['上线中','prod'],rejected:['被拒','rej'],retired:['已下线','off'],draft:['待上线','wait']};
  const latest=vs[vs.length-1]||{};const rs=stMap[latest.status]||['待上线','wait'];
  try{const {error}=await db.from('creatives').update({versions:vs,ads_code:adsv,status:rs[0],stc:rs[1],updated_at:new Date().toISOString()}).eq('gen_code',creatives[i].gen);if(error)throw error;}catch(e){alert('保存失败: '+rpcErr(e));return;}
  creatives[i].ads=adsv;creatives[i].st=rs[0];creatives[i].stc=rs[1];
  if(latest.status==='live'){const hh=hypos.find(x=>(creatives[i].hyp||'').startsWith(x.id));
    if(hh&&(hh.st==='已锁定'||hh.st==='待锁定')){try{await db.from('hypotheses').update({status:'测试中'}).eq('code',hh.id);hh.st='测试中';renderHypo();}catch(e){}}}
  logAction('creative','edit',(creatives[i].gen||'')+(mode==='save'?' 换版':' 草稿'));
  renderCreatives();openCreative(i);toast(mode==='save'?'已保存':'草稿已存');
}
function saveRun(){
  const i=window._vformI,c=creatives[i];c.runs=c.runs||[];
  const start=document.getElementById('rf-start').value||new Date().toLocaleDateString('en-US',{month:'numeric',day:'numeric'});
  const open=c.runs.find(r=>r.start&&!r.end);if(open)open.end=start;
  c.runs.push({r:c.runs.length+1,phase:document.getElementById('rf-phase').value,camp:document.getElementById('rf-camp').value,adset:document.getElementById('rf-adset').value,meta:document.getElementById('rf-meta').value,start:start,end:null,snap:null,note:document.getElementById('rf-note').value});
  toast('运行记录已加(原型:内存,刷新重置)');
  cancelRun();openCreativeDetail(i);
}

function confirmPaused(code){
  const c=creatives.find(x=>x.code===code);
  if(!confirm('确认你已在 Ads Manager 手动暂停 '+code+'?\n系统只记录已确认的事实,不会替你操作 Meta。'))return;
  c.st='已暂停 6/11';c.stc='paused';c.act=null;
  toast(code+' 已标记为人工确认暂停');renderCreatives();
}
function linkHyp(c){const gen=c.gen||c.code||'';const par=(gen.match(/^(HYP-\d+)/)||[])[1]||((c.hyp||'').split(/[ ·]/)[0]||'');const has=par&&hypos.some(h=>h.id===par);if(has)return '<span class="code" style="color:var(--accent);cursor:pointer" title="跟回上层假设 '+esc(par)+'" onclick="event.stopPropagation();gotoHypo(\''+esc(par)+'\')">'+esc(gen||'—')+'</span>';return '<span class="code">'+esc(gen||'—')+'</span>';}
function gotoHypo(code){const idx=hypos.findIndex(h=>h.id===code);if(idx<0){toast('找不到假设 '+code);return;}go('hypo',document.querySelector('[data-v="hypo"]'));openDrawer(idx);}
/* ===== 素材「预计排期」= 预计上线日 + 测试 period(天) → 自动算结束日 + 倒数 ===== */
// 解析日期 → Date。支持日历选择器的 "YYYY-MM-DD",也兼容旧的手打 "M/D"(默认今年)
function parseMD(s){
  s=(s||'').trim();
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){const d=new Date(+m[1],+m[2]-1,+m[3]);d.setHours(0,0,0,0);return d;}
  m=s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if(m){const d=new Date();d.setMonth(+m[1]-1,+m[2]);d.setHours(0,0,0,0);return d;}
  return null;
}
function fmtMD(d){return (d.getMonth()+1)+'/'+d.getDate();}
function schedCell(c){
  const L=parseMD(c.planLaunch),days=(c.planDays==null||c.planDays==='')?null:+c.planDays;
  if(!L)return '<span class="qt" style="color:var(--ink3)">未排期 —</span>';
  const today=new Date();today.setHours(0,0,0,0);
  const oneDay=864e5;
  let endStr='',cd='',cdCls='';
  if(days!=null&&!isNaN(days)){const E=new Date(L.getTime()+days*oneDay);endStr=' → '+fmtMD(E)+' · '+days+'天';
    if(today<L){const n=Math.round((L-today)/oneDay);cd='还有 '+n+' 天开测';cdCls='soon';}
    else if(today>=E){cd='测试期已到,待判定';cdCls='over';}
    else{const n=Math.round((E-today)/oneDay);cd='测试中 · 剩 '+n+' 天';cdCls='ok';}
  }else{
    if(today<L){const n=Math.round((L-today)/oneDay);cd='还有 '+n+' 天开测';cdCls='soon';}
    else{cd='已上线';cdCls='ok';}
  }
  return `<span class="schedpill">${fmtMD(L)}${endStr}<span class="cd ${cdCls}">${cd}</span></span>`;
}
// 素材的预计排期 = 继承其所属假设(填写入口在 New Hypothesis,一个测试一个窗口,组内素材共用)
function hypSchedOf(c){const lab=c&&(c.hyp||'');const h=hypos.find(x=>lab&&(''+lab).startsWith(x.id));return h||{};}
function fillCHypFilter(){
  const sel=document.getElementById('f-chyp');if(!sel)return;
  const cur=sel.value,set={};creatives.forEach(c=>{const k=((c.hyp||'').split(' ')[0]||'').trim();if(k)set[k]=1;});
  sel.innerHTML='<option value="">All Hypotheses</option>'+Object.keys(set).sort().map(k=>`<option${k===cur?' selected':''}>${esc(k)}</option>`).join('');
}
function crBrandOf(c){const h=hypos.find(x=>(c.hyp||'').startsWith(x.id));return h?h.brand:'';}
function crVar(c,k){const v=c.variants&&c.variants[k];return v?`<div style="font-size:11px;color:var(--violet);white-space:nowrap">· ${esc(v)}</div>`:'';}
// 在测维度标记(v67):列表行内 🧪 = 这条素材这次测的维度,一眼看 overview
function crTestDims(c){const h=hypos.find(x=>(c.hyp||'').startsWith(x.id));return (h&&h.testDims)||[];}
function crTM(c,k){return crTestDims(c).includes(k)?'<span title="本次测试维度">🧪</span> ':'';}
/* v85(V 定,讨论二):素材状态两层映射 ——
 * 第 1 层:没 publish 就是人工状态(待上线等,不变);登记的 ads code 对上系统 2 广告后,
 *   Meta effective_status 自动映射:审核中/上线中/被拒/已暂停(三层合并,title 见层级)/有问题。
 * 第 2 层:账户健康角标(⚠ 被封/欠款,数据等 H 节;mock 有演示)+ 爆量启发式(同账户 ≥3 拒 = 疑似账户事件)。
 * 数据由 MISPerf.loadAdStatuses() 喂进 window._misAdStatus(进 Creatives 页自动拉)。 */
const META_ST={PENDING_REVIEW:['审核中','live','Meta 审核排队中'],IN_PROCESS:['审核中','live','Meta 处理中(刚发布/刚修改)'],
  ACTIVE:['上线中','scale','Meta 在投'],DISAPPROVED:['被拒','alarm','素材审核被拒'],
  PAUSED:['已暂停','done','广告自身被暂停'],ADSET_PAUSED:['已暂停','done','广告组被暂停(传导)'],
  CAMPAIGN_PAUSED:['已暂停','done','广告系列被暂停(传导)'],WITH_ISSUES:['有问题','live','投放受阻(WITH_ISSUES)']};
const ACC_ST_ZH={DISABLED:'账户被封',UNSETTLED:'账户欠款'};
function crStatusCell(c){
  const S=window._misAdStatus;
  const base=(c.ads&&window.MISNaming)?MISNaming.stripVer(String(c.ads).trim()):null;
  const hit=(S&&base&&S.map[base])||null;
  if(!hit||!META_ST[hit.status])return `<span class="cst cst-${c.stc||'wait'}">${esc(c.st||'待上线')}</span>`;
  const [label,cls,tip]=META_ST[hit.status];
  let out=`<span class="cst cst-${cls}" title="${esc(tip)} · Meta:${esc(hit.status)}">${label}</span>`;
  if(hit.status==='DISAPPROVED'&&(S.accDis[hit.acc]||0)>=3)
    out+=` <span class="sub" style="display:inline" title="同账户 ${S.accDis[hit.acc]} 条同时被拒——大概率账户级事件连坐,先别当素材问题(判据:爆量启发式)">· 疑似账户事件</span>`;
  const ah=S.health&&S.health[hit.acc];
  if(ah&&ah!=='ACTIVE')out+=` <span class="mmr-badge mmr-r" title="所在广告账户:${esc(ACC_ST_ZH[ah]||ah)} —— 账户级问题,此广告状态可能已冻结失真">⚠ ${esc(ACC_ST_ZH[ah]||ah)}</span>`;
  return out;
}
function renderCreatives(){
  fillCHypFilter();
  const fb=document.getElementById('f-cbrand').value,fh=document.getElementById('f-chyp').value;
  // 排序(v65):同一假设的素材永远连在一起 —— 组间按该假设最新素材倒序(活跃的在上),组内按 V 序号正序
  const rows=creatives.filter(c=>(!fb||crBrandOf(c)===fb)&&(!fh||(c.hyp||'').startsWith(fh)));
  const hypKey=c=>((c.hyp||'')+' ').split(' ')[0];
  const grpRec={};creatives.forEach((c,i)=>{const h=hypKey(c);if(!(h in grpRec))grpRec[h]=i;});   // creatives 本身已按创建时间倒序
  const vnum=c=>{const m=(c.gen||'').match(/-V(\d+)$/);return m?+m[1]:999;};
  rows.sort((a,b)=>{const ha=hypKey(a),hb=hypKey(b);if(ha!==hb)return (grpRec[ha]||0)-(grpRec[hb]||0);return vnum(a)-vnum(b);});
  document.getElementById('creativeBody').innerHTML=rows.map(c=>`
   <tr class="click" onclick="openCreative(${creatives.indexOf(c)})">
    <td><div class="asset-cell">${thumbBox(c.empty?'empty':c.th,crImgOf(c),c.label,56)}<div style="min-width:0"><span class="code" style="font-size:11px">${c.ads?esc(c.ads):'<span style="color:var(--ink3)">未生成 · 打开素材 ⚙ 生成</span>'}</span></div></div></td>
    <td>${linkHyp(c)}</td>
    <td style="padding-right:24px">${schedCell(hypSchedOf(c))}</td>
    <td><span class="qt">${crTM(c,'format')}<b>${esc(c.fmt||'—')}</b></span>${crVar(c,'format')}</td>
    <td><span class="qt" title="${esc(ZH[c.hook]||c.hook||'')}">${crTM(c,'hook')}${esc(c.hook||'—')}</span>${crVar(c,'hook')}</td>
    <td><span class="qt" title="${esc(ZH[c.vs]||c.vs||'')}">${crTM(c,'visual_style')}${esc(c.vs||'—')}</span>${crVar(c,'visual_style')}</td>
    <td><span class="qt" title="${esc(ZH[c.offer]||c.offer||'')}">${crTM(c,'offer')}${esc(c.offer||'—')}</span>${crVar(c,'offer')}</td>
    <td><span class="qt" title="${esc(ZH[c.game_type]||c.game_type||'')}">${crTM(c,'game_type')}${esc(c.game_type||'—')}</span>${crVar(c,'game_type')}</td>
    <td>${crStatusCell(c)}</td>
    <td style="white-space:nowrap" onclick="event.stopPropagation()">
      ${(!c.versions||c.versions.length===0)?`<button class="btn ghost sm" data-perm="creative:edit" onclick="firstVersion(${creatives.indexOf(c)})">Setup</button>`:`<button class="btn ghost sm" data-perm="creative:edit" onclick="editCreativeCopy(${creatives.indexOf(c)})">Edit</button>`}
      ${c.act==='upload'?`<button class="btn ghost sm" onclick="toast('原型演示:选择文件 → 存 Supabase Storage → 缩略图出现在本行')">上传</button>`:''}
      ${c.act==='confirm'?`<button class="btn danger sm" onclick="confirmPaused('${c.code}')">确认已暂停</button>`:''}
    </td>
   </tr>`).join('')||'<tr><td colspan="10" style="text-align:center;color:var(--ink3);padding:28px">该筛选条件下暂无素材</td></tr>';
  const setN=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
  setN('stat-c-total',creatives.length);setN('stat-c-live',creatives.filter(c=>c.st==='上线中').length);
  setN('stat-c-done',creatives.filter(c=>c.st==='已下线').length);setN('stat-c-wait',creatives.filter(c=>c.st==='待上线').length);
  if(currentUser)applyPerms();   // 重建行后重新按权限显隐按钮
}

async function addDict(){
  if(!can('dict','add')){toast('当前岗位没有「新增词条」权限');return;}
  const code=prompt('新词条 — 代码 (code),例如 new_hook:');if(!code||!code.trim())return;
  const name=prompt('名称 (name):');if(name===null)return;
  const descr=prompt('说明 (description):');if(descr===null)return;
  const arr=DICT[dictTab]||[];
  if(arr.some(r=>r.c===code.trim())){toast('该 code 已存在于「'+dictTab+'」,不能重复');return;}
  try{const {error}=await db.from('dict_entries').insert({tab:dictTab,code:code.trim(),name:(name||'').trim(),descr:(descr||'').trim(),usage:'—',active:true,sort:arr.length});if(error)throw error;}
  catch(e){alert('Add failed: '+rpcErr(e));return;}
  logAction('dict','add',dictTab+' / '+code.trim());await loadDict();renderDict();toast('已新增词条 '+code.trim());
}
async function toggleDict(tab,idx){
  if(!can('dict','edit')){toast('当前岗位没有「编辑词条」权限');return;}
  const r=DICT[tab][idx];
  if(r.on&&!confirm(r.c+' 停用?\n停用后新记录不可选,历史记录不受影响,可随时启用恢复。'))return;
  const nv=!r.on;
  try{const {error}=await db.from('dict_entries').update({active:nv,updated_at:new Date().toISOString()}).eq('tab',tab).eq('code',r.c);if(error)throw error;}
  catch(e){alert('Update failed: '+rpcErr(e));return;}
  r.on=nv;logAction('dict','edit',r.c+(nv?' 启用':' 停用'));toast(r.c+(nv?' 已启用':' 已停用'));renderDict();
}
function renderDict(){
  if(HIDDEN_DICT_TABS.includes(dictTab))dictTab=Object.keys(DICT).find(k=>!HIDDEN_DICT_TABS.includes(k))||dictTab;
  document.getElementById('dictTabs').innerHTML=Object.keys(DICT).filter(k=>!HIDDEN_DICT_TABS.includes(k)).map(k=>`<div class="tabbtn ${k===dictTab?'on':''}" onclick="dictTab='${k}';renderDict()">${k}</div>`).join('');
  const noToggle=dictTab==='Capacity';
  const hasSc=(DICT[dictTab]||[]).some(r=>r.sc);   // v79:Format / Ad Setting 显示广告名短码
  document.getElementById('dictBody').innerHTML=(DICT[dictTab]||[]).map((r,i)=>`
   <tr class="${r.on?'':'inactive'}">
    <td class="code"><b style="color:var(--ink)">${esc(r.c)}</b>${hasSc?`<div class="sub" style="display:block;font-size:10.5px" title="广告名短码(命名契约 v2:进 ads code 的就是这个)">短码 ${esc(r.sc||'—')}</div>`:''}</td><td>${esc(r.n)}</td><td>${esc(r.d)}</td>
    <td>${noToggle?'<span class="code">—</span>':`<button class="btn ${r.on?'danger':'ghost'} sm" data-perm="dict:edit" onclick="toggleDict('${dictTab}',${i})">${r.on?'停用':'启用'}</button>`}</td>
   </tr>`).join('');
  document.getElementById('dictNote').textContent=DICT_NOTES[dictTab]||DICT_NOTES['default'];
  if(currentUser)applyPerms();
}

function getBase(){
  const b=document.getElementById('hf-brand').value,m=document.getElementById('hf-metric').value;
  return {own:data[b]?data[b][m]:null,brand:b,metric:m};
}
function targetAbs(){
  const {own}=getBase();const t=parseFloat(document.getElementById('hf-target').value)||0;
  if(own&&own.base)document.getElementById('hf-pct').value=Math.round((t-own.base)/own.base*100);
  updateAll(true);
}
function targetPct(){
  const {own}=getBase();const p=parseFloat(document.getElementById('hf-pct').value)||0;
  if(own&&own.base)document.getElementById('hf-target').value=Math.round(own.base*(1+p/100)*10)/10;
  updateAll(true);
}
function manualBase(){updateAll(true);}
function updateAll(skipSync){
  const {own,brand,metric}=getBase();
  const x=document.getElementById('hf-x').value.trim();
  const why=document.getElementById('hf-why').value.trim();
  const t=parseFloat(document.getElementById('hf-target').value)||0;
  const bEl=document.getElementById('baseline');
  let manual=document.getElementById('mb-val')?parseFloat(document.getElementById('mb-val').value)||null:null;
  if(own){
    bEl.innerHTML=`<b>${own.base}</b> <small style="color:var(--ink3);font-weight:400">${own.unit||''}</small> <span style="color:var(--ink3)">${metric} · ${brand} · 近 30 天</span>
      <div class="note">${own.placeholder?'⚠️ 占位基准(待数据管道接入 HVR;高门槛 figure 定后替换)':'数据管道自动填充(Meta × 后台 API)'}</div>`;
    if(!skipSync){const p=parseFloat(document.getElementById('hf-pct').value)||0;
      document.getElementById('hf-target').value=Math.round(own.base*(1+p/100)*10)/10;}
  }else if(!brand){
    bEl.innerHTML=`<b style="color:var(--ink3)">请先选择品牌</b><div class="note" style="margin-top:6px">选了品牌即显示该品牌近 30 天真实 baseline + 容量体检</div>`;
  }else if(metric===HVR){
    bEl.innerHTML=`<b style="color:var(--ink3)">基准待定</b><div class="note" style="margin-top:6px">7-Day High-Value Rate 为 7 天 cohort 指标,现数据管道未提供其基准 —— 留空,高门槛 figure 待定(不假填)。</div>`;
  }else{
    bEl.innerHTML=`<b style="color:var(--violet)">无基准</b>
      <div class="explore">🧭 <b>探索型测试</b> — ${brand} 近期无有效数据。目的:建立第一个基准。</div>
      <div class="row" style="margin-top:10px;margin-bottom:0">
        <div class="fld"><label>手填参考成本 $/${metric}(可选)</label>
          <input type="number" id="mb-val" placeholder="例:15" value="${manual||''}" oninput="manualBase()">
          <small>留空则自动借兄弟品牌数据</small>
        </div></div>`;
  }
  const baseTxt=own?(own.unit==='周均'?'周均 '+own.base:own.base):'';
  const s=(v,cls)=>`<span class="slot ${v?cls:'empty'}">${v||'…'}</span>`;
  document.getElementById('sentence').innerHTML=
   `<div class="sl"><span class="lab">我相信</span><span>${s(x,'fill')}</span></div>
    <div class="sl"><span class="lab">会让</span><span>${s(metric,'auto')} 从 ${s(baseTxt,'auto')} 变为 ${s(t?t:'','fill')}</span></div>
    <div class="sl"><span class="lab">因为</span><span>${s(why?(why.length>52?why.slice(0,52)+'…':why):'','fill')}</span></div>`;
  document.getElementById('rule-win').textContent=own?`观察期内 ${metric} ≥ ${t}`:`参考值 ${t}(探索型,判定从宽)`;
  document.getElementById('rule-lose').textContent=own?`${metric} ≤ ${own.base}(未超越基准)`:'—';
  // 算法标注(纯展示,不参与计算/校验)
  const gm=(document.getElementById('hf-guard-m')||{}).value;
  const ma=document.getElementById('metric-algo');if(ma)ma.textContent=(metric===HVR)?'同期新客中,7 天总存款 ≥ 高门槛 的人数 ÷ 新客总数 × 100%':'';
  const ga=document.getElementById('guard-algo');if(ga)ga.textContent=(gm===DQF)?'同期新客中,第一天自己存款 > 最低线 的人数 ÷ 新客总数 × 100%':'';
  capacity(own,brand,metric,t,manual);
}
function capacity(own,brand,metric,target,manual){
  const out=document.getElementById('cc-out');
  // 周期 = 基础卡「测试周期(天)」(hf-plan-days),单一事实源,不再单独填
  const budRaw=(document.getElementById('cc-budget')||{}).value,daysRaw=(document.getElementById('hf-plan-days')||{}).value;
  const echo=document.getElementById('cc-days-echo');if(echo)echo.textContent=daysRaw?(daysRaw+' 天'):'—';
  if(!budRaw||!daysRaw){out.innerHTML='<div class="light gray"><div class="tt"><span class="dot"></span>请填日预算与测试周期(基础卡)</div></div>';return;}
  const bud=parseFloat(budRaw)||0;
  const days=parseFloat(daysRaw)||0;
  const have=bud*days;
  let cost=own?own.cost:null,borrow='';
  if(!cost&&manual){cost=manual;borrow=`<span class="borrow">手填参考值</span>`;}
  if(!cost&&sibling[brand]&&data[sibling[brand]]&&data[sibling[brand]][metric]){
    cost=data[sibling[brand]][metric].cost;borrow=`<span class="borrow">估算基于 ${sibling[brand]}</span>`;
  }
  if(!cost){out.innerHTML=`<div class="light gray"><div class="tt"><span class="dot"></span>该指标暂无单位成本</div><p>在左侧基准卡内手填参考成本即可体检</p></div>`;return;}
  if(!target||!(target>0)){out.innerHTML='<div class="light gray"><div class="tt"><span class="dot"></span>目标值待定,暂无法体检</div><p>填了目标值(或该品牌方向确定)后自动出红/黄/绿</p></div>';return;}
  const weeks=days/7;const needUnits=Math.round(target*weeks);const needSpend=Math.round(needUnits*cost);
  const ratio=have/needSpend;const can=Math.floor(have/cost);
  let cls='green',title='🟢 预算充足',advice=`余量 ${Math.round(ratio*100)}%,结论有容错空间`;
  if(ratio<1){cls='red';title='🔴 物理上够不到成功线';
    advice=`建议:预算提至 $${Math.ceil(needSpend/days)}/日,或成功线降至 ${Math.floor(can/weeks)},或周期延长。坚持上线须写一句理由`;}
  else if(ratio<1.5){cls='amber';title='🟡 刚好够,没有容错';advice='表现略低于基准即出不了结论,建议留 1.5 倍余量';}
  out.innerHTML=`
   <div class="light ${cls}">
     <div class="tt"><span class="dot"></span>${title}${borrow}</div>
     <div class="ccgrid">
       <div><label>预算可支撑</label><b>${can} 个</b></div>
       <div><label>成功线需要</label><b>${needUnits} 个</b></div>
       <div><label>单位成本</label><b>$${cost}</b></div>
     </div>
     <p>${advice}</p>
   </div>
   <div class="calc">需求 ≈ ${target}/周 × ${weeks.toFixed(1)} 周 × $${cost} = $${needSpend}<br>持有 = $${bud}/日 × ${days} 天 = $${have}</div>`;
}

