// SECANT landing page + "SECANT — Deep Analysis" glass overlay (SECANT/dashboard_view.py + dashboard_projection.py).
// Same frames, wording, nine routes (Overview, Episodes, Distraction History, Study History, Evidence, About, COSECANT, Past SECANT Episodes,
// Past Study Sessions) and empty states as the desktop. Every value is derived from this browser's accepted STUDY / SECANT / COSECANT events;
// the web has no read model, so nothing is estimated and an unrecorded fact reads exactly as the desktop reads it ("No data", "Not recorded").
import {el,button} from './dom.js';
import {SURFACES} from './simulator.js';

const NO='No data',NR='Not recorded',SCOPE_TXT='Recorded evidence in the selected scope.';
const DIST=['SOCIAL','MESSAGING','STREAMING','OFF_TASK'];
const cap=s=>{s=String(s??'').replaceAll('_',' ');return s?s.charAt(0).toUpperCase()+s.slice(1).toLowerCase():s;};
const SURF=Object.values(SURFACES),surfOf=id=>SURF.find(v=>v.resourceId===id)||null;
const titleOf=id=>surfOf(id)?.label||'Title not recorded';
const keyOf=l=>String(l||'').toLowerCase().replace(/\s+/g,'_');
const seq=(a,b)=>a.sequence-b.sequence;
export function durationText(s){if(!Number.isFinite(s))return NR;if(s>0&&s<1)return '<1s';s=Math.floor(s);const h=Math.floor(s/3600),r=s%3600;return (h?`${h}h `:'')+`${Math.floor(r/60)}m ${String(r%60).padStart(2,'0')}s`;}

/* ---------------- model: browser events -> the desktop's SECANT / Study / COSECANT facts ---------------- */
const SEC_NAME={SECANT_ACTION_INTENT:'Return to Study Selected',SECANT_RETURN_STARTED:'Return Process Started',SECANT_RETURN_VERIFIED:'Return Verified',SECANT_RECOVERY_INTERRUPTED:'Recovery Interrupted',SECANT_RECOVERY_CLOSED:'Recovery Closed',SECANT_EPISODE_CLOSED:'Episode Closed',SECANT_EPISODE_FOUNDED:'Episode Founded',SECANT_DISPLAYED:'SECANT Displayed'};
function mapSecant(e,ctx){const t=e.type,p=e.payload||{};
  switch(t){
    case 'EPISODE_STARTED':ctx.stage=1;return {name:'SECANT_EPISODE_FOUNDED',stage:1,reason:''};
    case 'STAGE_DISPLAYED':{const n=Number(p.stage);if(!(n>=1&&n<=3))return null;ctx.stage=n;return {name:'SECANT_DISPLAYED',stage:n,reason:''};}
    case 'RETURN_INTENT':return {name:'SECANT_ACTION_INTENT',stage:ctx.stage,reason:'RETURN TO STUDY'};
    case 'EVIDENCE_HELD':return {name:'SECANT_FROZEN',stage:ctx.stage,reason:'uncertainty'};
    case 'RETURN_STARTED':return {name:'SECANT_RETURN_STARTED',stage:ctx.stage,reason:''};
    case 'RETURN_VERIFIED':return {name:'SECANT_RETURN_VERIFIED',stage:ctx.stage,reason:''};
    case 'RETURN_INTERRUPTED':case 'RELAPSE':return {name:'SECANT_RECOVERY_INTERRUPTED',stage:ctx.stage,reason:p.reason||'interrupted'};
    case 'RECOVERY_CONFIRMED':return {name:'SECANT_RECOVERY_CLOSED',stage:ctx.stage,reason:''};
    case 'EPISODE_CLOSED':return {name:'SECANT_EPISODE_CLOSED',stage:ctx.stage,reason:p.outcome==='RETURNED'?'recovered':String(p.outcome||'closed').toLowerCase()};
    default:return null;}}
function flowTone(r){const n=r.name;
  if(n==='SECANT_DISPLAYED')return {1:'blue',2:'amber',3:'red'}[r.stage]||'neutral';
  if(n==='SECANT_RECOVERY_INTERRUPTED'||n==='SECANT_FROZEN')return 'yellow';
  if(n==='SECANT_EPISODE_CLOSED')return r.reason==='recovered'?'green':'neutral';
  if(['SECANT_ACTION_INTENT','SECANT_RETURN_STARTED','SECANT_RETURN_VERIFIED','SECANT_RECOVERY_CLOSED'].includes(n))return 'green';
  return n==='SECANT_EPISODE_FOUNDED'?'purple':'neutral';}
const coTone=k=>k==='BREAK_STARTED'?'purple':['BREAK_COMPLETE','BREAK_ALREADY_OVER','FINAL_LOCKED','RETURN_CONFIRMATION_LOST','BREAK_CANCELLED'].includes(k)?'yellow':['RETURN_INTENT_RECORDED','RETURN_CONFIRMATION_STARTED','RETURN_CONFIRMATION_RESTARTED','RETURN_CONFIRMED'].includes(k)?'green':'neutral';

function buildBlocks(snap,no){
  const evs=snap.events||[],speed=snap.session.speed||1,st=evs.filter(e=>e.organ==='STUDY'&&e.contextId).sort(seq);
  const ivs=evs.filter(e=>e.type==='OBSERVATION_INTERVAL'&&e.payload&&e.payload.supported).sort(seq);
  return [...new Set(st.map(e=>e.contextId))].map(id=>{
    const es=st.filter(e=>e.contextId===id),prep=es.find(e=>e.type==='PLAN_PREPARED'),start=es.find(e=>e.type==='BLOCK_STARTED'),plan=prep?.payload||start?.payload?.plan||{};
    const wins=[];let open=null;
    for(const e of es){if(e.type==='BLOCK_STARTED'||e.type==='BLOCK_RESUMED')open=e.effectiveSeconds;else if(open!==null&&['BLOCK_PAUSED','BLOCK_COMPLETED','BLOCK_INTERRUPTED'].includes(e.type)){wins.push([open,e.effectiveSeconds]);open=null;}}
    if(open!==null)wins.push([open,Math.max(open,snap.session.activeSeconds||0)]);
    const elapsed=wins.reduce((n,[a,b])=>n+Math.max(0,b-a),0),inWin=p=>wins.some(([a,b])=>p.start>=a-1e-6&&p.start<b-1e-6),runs=[];
    for(const e of ivs){const p=e.payload;if(!inWin(p))continue;const last=runs[runs.length-1];
      if(last&&last.resourceId===p.resourceId&&last.kind===p.kind&&Math.abs(p.start-last.end)<1e-6){last.end=p.end;last.lastUtc=e.utc;last.count++;}
      else runs.push({resourceId:p.resourceId,kind:p.kind,start:p.start,end:p.end,firstUtc:new Date(Date.parse(e.utc)-(p.end-p.start)/speed*1000).toISOString(),lastUtc:e.utc,count:1});}
    const studyRuns=runs.filter(r=>r.kind==='STUDY'),keys=[...new Set(studyRuns.map(r=>r.resourceId))];
    const visits=studyRuns.map(r=>({...r,title:titleOf(r.resourceId),qualification:keys.indexOf(r.resourceId)===0?'PRIMARY':'LATER',single:r.count===1,dur:r.end-r.start}));
    const jumps=visits.map(v=>({visit:v,connector:''}));
    studyRuns.forEach((r,i)=>{if(!i)return;const a=studyRuns[i-1],mid=runs.slice(runs.indexOf(a)+1,runs.indexOf(r)),contiguous=!mid.length&&Math.abs(r.start-a.end)<1e-6;
      jumps[i-1].connector=contiguous&&a.resourceId!==r.resourceId?'Direct observed change':mid.some(x=>DIST.includes(x.kind))?'Interruption recorded':'Evidence gap';});
    const endE=[...es].reverse().find(e=>['BLOCK_COMPLETED','BLOCK_INTERRUPTED'].includes(e.type));
    return {key:`${snap.session.id}|${id}`,blockId:id,sessionId:snap.session.id,sessionNo:no,subject:String(plan.subject||'').trim()||NR,plan,startedUtc:start?.utc||null,endedUtc:endE?.utc||null,elapsed,visits,jumps,keys,events:es.map(e=>({type:e.type,utc:e.utc})),primary:keys.length?titleOf(keys[0]):NR,direct:jumps.filter(j=>j.connector==='Direct observed change').length};});}
function buildEpisodes(snap,no,blocks,ended){
  const sec=(snap.events||[]).filter(e=>e.organ==='SECANT'&&e.episodeId).sort(seq);
  return sec.filter(e=>e.type==='EPISODE_STARTED').map(start=>{const es=sec.filter(e=>e.episodeId===start.episodeId),ctx={stage:0},rows=[];
    for(const e of es){const m=mapSecant(e,ctx);if(m)rows.push({...m,utc:e.utc,eff:e.effectiveSeconds,seq:e.sequence});}
    const closeE=rows.find(r=>r.name==='SECANT_EPISODE_CLOSED'),stage=Math.max(0,...rows.filter(r=>r.name==='SECANT_DISPLAYED').map(r=>r.stage));
    const block=blocks.find(b=>b.blockId===start.contextId),rid=block?.plan?.resourceId,sp=surfOf(start.resourceId);
    return {key:`${snap.session.id}|${start.episodeId}`,episodeId:start.episodeId,sessionId:snap.session.id,sessionNo:no,foundedUtc:start.utc,rows,closed:!!closeE,closeReason:closeE?.reason||null,valid:!!closeE||ended,stage,
      resourceId:start.resourceId,source:titleOf(start.resourceId),platform:sp?.platform?keyOf(sp.platform):NR,studyResource:block&&rid&&block.keys.includes(rid)?titleOf(rid):'Title not recorded'};});}
function buildBreaks(snap,no){
  const co=(snap.events||[]).filter(e=>e.organ==='COSECANT'&&e.episodeId).sort(seq);
  return [...new Set(co.map(e=>e.episodeId))].map(id=>{const es=co.filter(e=>e.episodeId===id),events=[];let state='INACTIVE',reminder=null,lost=false,allowance=null,target=null;
    for(const e of es){const t=e.type,p=e.payload||{};let kind=null,to=null;
      if(t==='BREAK_STARTED'){kind=t;to='BREAK_ACTIVE';allowance=p.seconds;target=p.resourceId||e.resourceId;}
      else if(t==='BREAK_COMPLETE'||t==='BREAK_ALREADY_OVER'){kind=t;to=t;reminder=to;}
      else if(t==='FINAL_LOCKED'){kind=t;to='FINAL_LOCK';reminder=to;}
      else if(t==='RETURN_INTENT'){kind='RETURN_INTENT_RECORDED';to=state;}
      else if(t==='RETURN_STARTED'){kind=lost?'RETURN_CONFIRMATION_RESTARTED':'RETURN_CONFIRMATION_STARTED';to='RETURN_CONFIRMING';}
      else if(t==='RETURN_INTERRUPTED'){kind='RETURN_CONFIRMATION_LOST';to=reminder||'BREAK_COMPLETE';lost=true;}
      else if(t==='RETURN_CONFIRMED'){kind=t;to='CONFIRMED';}
      else if(t==='EPISODE_CLOSED'&&p.outcome!=='RETURNED'){const down=p.outcome==='ENDED';kind=down?'SAFE_SHUTDOWN':'BREAK_CANCELLED';to=down?'SHUTDOWN':'CANCELLED';}
      if(kind){events.push({kind,to,utc:e.utc});state=to;}}
    return {key:`${snap.session.id}|${id}`,sessionId:snap.session.id,sessionNo:no,startedUtc:es[0].utc,allowance,target,events};});}
export function secantModel(snaps,live){
  const sessions=snaps.filter(s=>s.session).slice().sort((a,b)=>String(a.session.startedAt).localeCompare(String(b.session.startedAt))),episodes=[],breaks=[],blocks=[],list=[];
  sessions.forEach((snap,i)=>{const no=i+1,ended=!['ACTIVE','PAUSED'].includes(snap.session.state),bl=buildBlocks(snap,no);
    blocks.push(...bl);episodes.push(...buildEpisodes(snap,no,bl,ended));breaks.push(...buildBreaks(snap,no));list.push({id:snap.session.id,no,state:snap.session.state,ended});});
  const alias=(rows,pfx,get)=>{const per={};rows.slice().sort((a,b)=>String(get(a)).localeCompare(String(get(b)))).forEach(r=>{const d=new Date(get(r)),k=Number.isFinite(+d)?`${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCMonth()+1).padStart(2,'0')}${d.getUTCFullYear()}`:'00000000';per[k]=(per[k]||0)+1;r.id=`${pfx}-${k}-${String(per[k]).padStart(2,'0')}`;});};
  alias(episodes,'SEC',r=>r.foundedUtc);alias(breaks,'COSEC',r=>r.startedUtc);
  episodes.sort((a,b)=>String(b.foundedUtc).localeCompare(String(a.foundedUtc)));breaks.sort((a,b)=>String(b.startedUtc).localeCompare(String(a.startedUtc)));blocks.sort((a,b)=>String(b.startedUtc||'').localeCompare(String(a.startedUtc||'')));
  return {sessions:list,sel:list.length?list[list.length-1]:null,episodes,breaks,blocks,live:live||null,generatedAt:new Date().toISOString()};}

/* ---------------- presentation (prepare_presentation) ---------------- */
export function prepare(m,T){
  if(m&&m.imported)return m.imported;       // imported database evidence arrives already prepared (secant-import.js); simulator models are prepared below
  const stamp=u=>u?T.time(u):NR,full=u=>u?`${T.day(u)} · ${T.time(u)}`:NR,sel=m.sel;
  const selEp=sel?m.episodes.filter(e=>e.sessionId===sel.id):[],selBl=sel?m.blocks.filter(b=>b.sessionId===sel.id):[],selBr=sel?m.breaks.filter(b=>b.sessionId===sel.id):[];
  const epItem=e=>{const ql='PENDING',v=e.valid,closure=e.closed?cap(e.closeReason):'In progress',pick=n=>e.rows.filter(r=>r.name===n),intents=pick('SECANT_ACTION_INTENT'),verified=pick('SECANT_RETURN_VERIFIED'),intr=pick('SECANT_RECOVERY_INTERRUPTED'),last=e.rows[e.rows.length-1];
    const rows=e.rows.map(r=>({...r,label:SEC_NAME[r.name]||cap(r.name),detail:r.reason?cap(r.reason):r.stage?`Stage ${r.stage}`:'Recorded',tone:v?flowTone(r):'neutral'}));
    return {key:e.key,sessionId:e.sessionId,sessionNo:e.sessionNo,displayId:e.id,valid:v,resourceId:e.resourceId,source:e.source,platform:e.platform,started:full(e.foundedUtc),date:T.day(e.foundedUtc),
      stage:v?(e.stage?`SECANT-${e.stage}`:NR):'Pending',outcome:v?closure:`Pending · ${ql}`,
      returnIntent:v?(intents.length?`OCCURRED AT · ${stamp(intents[intents.length-1].utc)}`:NR):'Pending',verification:v?(verified.length?`Confirmed · OCCURRED AT · ${stamp(verified[verified.length-1].utc)}`:NR):'Pending',
      interruption:v?([...new Set(intr.map(r=>cap(r.reason)))].join(', ')||NR):'Pending',closure:v?closure:'Pending',studyResource:e.studyResource,recordedAt:full(last?.utc),
      events:rows.map((r,i)=>[String(i+1),stamp(r.utc),r.label,e.source,`OCCURRED AT · ${v?'Recorded':ql}`]),
      nodes:rows.map(r=>['SECANT',r.label,`${r.detail}${v?'':` · ${ql}`} · OCCURRED AT`,stamp(r.utc),r.tone,'']),rawRows:rows};};
  const archive=m.episodes.map(epItem),selArch=archive.filter(a=>a.sessionId===sel?.id);
  const recent=selArch[0]||Object.fromEntries(['displayId','source','stage','outcome','recordedAt','studyResource','returnIntent','verification','interruption','closure','platform'].map(k=>[k,NO]));
  const recentFields=[['Episode ID',recent.displayId],['Distraction Source',recent.source],['Stage Reached',recent.stage],['Closure',recent.outcome],['Recorded At',recent.recordedAt],['Current study material',recent.studyResource]];
  const recentFlow=selArch[0]?selArch[0].nodes:[];
  const all=selArch.flatMap(a=>a.rawRows.map((r,i)=>({utc:r.utc,row:[a.events[i][2],a.events[i][3],a.events[i][4]]}))).sort((a,b)=>Date.parse(a.utc)-Date.parse(b.utc)).map((x,i)=>[String(i+1),stamp(x.utc),...x.row]);
  const eligible=selEp.filter(e=>e.valid),count=n=>eligible.reduce((s,e)=>s+e.rows.filter(r=>r.name===n).length,0),excl=selEp.length-eligible.length,note=`Finalized validated evidence; ${excl} recorded episodes excluded`;
  const counts=[eligible.length,count('SECANT_RETURN_VERIFIED'),count('SECANT_RECOVERY_INTERRUPTED')];
  const secMetrics=['CAPTURED EPISODES','VERIFIED RETURNS','INTERRUPTED RECOVERIES'].map((n,i)=>[n,selEp.length?String(counts[i]):NO,note]);
  const hasBlocks=selBl.length>0,visits=selBl.flatMap(b=>b.visits),hasVisits=visits.length>0,SEL='Selected MYELIN session';
  const resCount=selBl.reduce((n,b)=>n+b.keys.length,0),direct=selBl.reduce((n,b)=>n+b.direct,0);
  const stMetrics=[['STUDY RESOURCES',String(resCount),SEL],['DIRECT STUDY JUMPS',hasBlocks&&!hasVisits?NR:String(direct),SEL],['TOTAL STUDY TIME',hasBlocks?durationText(selBl.reduce((n,b)=>n+b.elapsed,0)):NO,'Recorded Study timer elapsed'],['CONFIRMED UNCERTAIN RESOURCES',hasBlocks&&!hasVisits?NR:'0',SEL]];
  const distMetrics=[...secMetrics,['DISTRACTION SOURCES',String(new Set(eligible.map(e=>e.resourceId)).size),SEL]];
  const histRows=vs=>vs.map((v,i)=>[String(i+1),v.title,v.single?'Single observation':durationText(v.dur),stamp(v.firstUtc),stamp(v.lastUtc),v.qualification]);
  const evRows=vs=>vs.map((v,i)=>[String(i+1),v.title,'STUDY ALIGNED',NR,NR,v.qualification]);
  const jumpNodes=js=>js.map(j=>[j.visit.qualification,j.visit.title,'Study-aligned',stamp(j.visit.lastUtc),'green',j.connector]);
  const av=visits[0],evAttr=av?[av.title,'STUDY ALIGNED',NR,NR,'STUDY ALIGNED',NR,av.qualification,'Behavioural only']:Array(8).fill(NO);
  const primary=selBl.flatMap(b=>b.keys.length?[b.primary]:[])[0]||NR;
  const later=(()=>{for(const b of selBl)if(b.keys.length>1)return titleOf(b.keys[1]);return 'None';})();
  const coVal=b=>{const kinds=new Set(b.events.map(e=>e.kind)),ret=[...b.events].reverse().find(e=>e.kind==='RETURN_CONFIRMED'),lc=[...b.events].reverse().find(e=>['RETURN_CONFIRMED','RETURN_CONFIRMATION_LOST','RETURN_CONFIRMATION_STARTED','RETURN_CONFIRMATION_RESTARTED'].includes(e.kind))?.kind;
    const outcome=kinds.has('RETURN_CONFIRMED')?'Returned':kinds.has('BREAK_CANCELLED')?'Break Cancelled':kinds.has('SAFE_SHUTDOWN')?'Closed':'In progress';
    const conf=ret?'Confirmed':['Break Cancelled','Closed'].includes(outcome)?NR:lc==='RETURN_CONFIRMATION_LOST'?'Interrupted':lc?'Confirming':NR;
    return {target:b.target?titleOf(b.target):'Title not recorded',outcome,returned:ret?stamp(ret.utc):NR,confirmation:conf,allowance:durationText(b.allowance)};};
  const co=selBr[0]||null,cv=co?coVal(co):null,cEv=co?co.events:[],lastEv=cEv[cEv.length-1];
  const coMetrics=[['RECORDED BREAKS','BREAK_STARTED'],['COMPLETED ALLOWANCES','BREAK_COMPLETE'],['CONFIRMED RETURNS','RETURN_CONFIRMED'],['CANCELLED BREAKS','BREAK_CANCELLED']].map(([n,k])=>[n,selBr.length?String(selBr.filter(b=>b.events.some(e=>e.kind===k)).length):NO,'Validated same-session breaks; 0 invalid breaks excluded']);
  const stArchive=m.blocks.map(b=>{const started=full(b.startedUtc);return {key:b.key,sessionId:b.sessionId,sessionNo:b.sessionNo,date:started.split(' · ')[0],title:b.subject,started,ended:full(b.endedUtc),duration:durationText(b.elapsed),primary:b.primary,
    resources:histRows(b.visits),evidence:b.visits.map((v,i)=>[String(i+1),v.title,'STUDY ALIGNED','STUDY ALIGNED',NR]),direct:String(b.direct),events:b.events.map((e,i)=>[String(i+1),stamp(e.utc),cap(e.type),'Recorded']),nodes:jumpNodes(b.jumps),resourceCount:b.visits.length};});
  const banner=sel?`RECORDED EVIDENCE · SESSION ${sel.no}`:'RECORDED EVIDENCE · No data';
  const lifeAll=m.episodes,lifeOk=lifeAll.filter(e=>e.valid),lifeNote=`Lifetime finalized validated evidence; ${lifeAll.length-lifeOk.length} recorded episodes excluded`;
  const life=['CAPTURED EPISODES','VERIFIED RETURNS','INTERRUPTED RECOVERIES'].map((n,i)=>[n,lifeAll.length?String([lifeOk.length,lifeOk.reduce((s,e)=>s+e.rows.filter(r=>r.name==='SECANT_RETURN_VERIFIED').length,0),lifeOk.reduce((s,e)=>s+e.rows.filter(r=>r.name==='SECANT_RECOVERY_INTERRUPTED').length,0)][i]):NO,lifeNote]);
  return {banner,
    landing:{status:['●  EPISODE',recent.outcome,'RECORDED','cyan'],recent:recentFields,badges:[recent.outcome,recent.stage],metrics:[...life,stMetrics[0]],behaviour:[recent.source,recent.platform,recent.stage,recent.outcome],events:all.slice(-5).reverse(),flow:recentFlow},
    overview:{metrics:[...secMetrics,...stMetrics.slice(0,3)],recent:recentFields,study:[['Primary resource',primary],['Later resource',later],['Confirmed uncertain resources',stMetrics[3][1]],['Observed study path','Qualified Study resources'],['Distraction videos','Excluded']],events:all,
      insights:[['Scope',sel?`Session ${sel.no}`:NO],['Session lifecycle',sel?(sel.ended?cap(sel.state):'In progress'):NO],['Study area',selBl.length?selBl[0].subject:NO],['Study Jump','Gaps and interruptions remain distinct.']],flow:recentFlow},
    episodes:{metrics:distMetrics,rows:selArch.map((a,i)=>[String(i+1),a.displayId,a.source,a.stage,a.outcome,a.recordedAt]),recent:recentFields,flow:recentFlow},
    distraction:{metrics:distMetrics,rows:selArch.map((a,i)=>[String(i+1),a.source,a.started,a.stage,a.returnIntent,a.verification,a.closure]),attrs:[['Distraction Source',recent.source],['Return Intent',recent.returnIntent],['Return Verified',recent.verification],['Stage Reached',recent.stage],['Closure',recent.closure],['Outcome scope','Behavioural only'],['Recovery Interruption',recent.interruption],['Recorded At',recent.recordedAt]],flow:recentFlow},
    study:{metrics:stMetrics,rows:histRows(visits),jumps:jumpNodes(selBl.flatMap(b=>b.jumps))},
    evidence:{metrics:stMetrics,rows:evRows(visits),attrs:['Resource','Initial Classification','Initial Confidence','User Confirmation','Effective Classification','Effective Confidence','Qualification','Evidence scope'].map((k,i)=>[k,evAttr[i]]),nodes:av?[['OBSERVATION','STUDY ALIGNED',NR,NR,'green','']]:[]},
    cosecant:{main:[['BREAK ID',co?co.id:NO],['LAST RECORDED STATE',co?cap(lastEv?.to):NO],['BREAK TYPE',co?NR:NO],['SELECTED ALLOWANCE',co?cv.allowance:NO],['RETURN TARGET',co?cv.target:NO],['OUTCOME',co?cv.outcome:NO]],
      recent:[['Break ID',co?co.id:NO],['Selected Allowance',co?cv.allowance:NO],['Return Target',co?cv.target:NO],['Return Confirmation',co?cv.confirmation:NO],['Outcome',co?cv.outcome:NO],['Recorded At',co?full(lastEv?.utc):NO]],metrics:coMetrics,
      history:[['Break ID',co?co.id:NO],['Break Type',co?NR:NO],['Selected Allowance',co?cv.allowance:NO],['Return Target',co?cv.target:NO],['Allowance Status',cEv.some(e=>e.kind==='BREAK_COMPLETE')?'Completed':cEv.some(e=>e.kind==='BREAK_CANCELLED')?'Cancelled':NR],['Return Status',co?cv.confirmation:NO],['Outcome',co?cv.outcome:NO]],
      events:cEv.map(e=>[cap(e.kind),'Recorded',stamp(e.utc)]),returns:selBr.map(b=>{const v=coVal(b);return [v.target,v.returned,v.confirmation,v.outcome];}),flow:cEv.map(e=>['COSECANT',cap(e.kind),cap(e.to),stamp(e.utc),coTone(e.kind),''])},
    secArchive:archive.map(a=>({...a,date:a.started.split(' · ')[0]})),stArchive};
}

/* ---------------- dom helpers ---------------- */
const sp=(cls,...k)=>el('span',{class:cls},...k);
const GREEN=['Verified','Matched','Yes','Return verified','Confirmed'],AMBER=['Uncertain','Late','Interrupted'],RED=['No','Missed','Not matched','Not returned'];
const resultTone=t=>GREEN.includes(t)?'ok':AMBER.includes(t)?'warn':RED.includes(t)?'bad':'';
const hdr=h=>String(h).split('\n').flatMap((x,i)=>i?[el('br'),x]:[x]);
const PALETTE=['cyan','green','purple','teal','blue','blue'],LAND=['teal','green','purple','blue'];
const metricRow=vals=>el('div',{class:'sq-metrics',style:`--n:${vals.length}`},vals.map(([l,v,n],i)=>el('div',{class:`sq-metric t-${PALETTE[i]}`},sp('sq-ml',l),el('b',{class:'sq-mv'},v),sp('sq-mn',n))));
const panel=(title,subtitle,...kids)=>el('section',{class:'sq-panel'},el('h3',{class:'sq-pt'},title),subtitle?el('p',{class:'sq-ps'},subtitle):null,...kids);
const kvPanel=(title,rows,subtitle)=>panel(title,subtitle,el('div',{class:'sq-kv'},rows.flatMap(([k,v])=>[sp('k',String(k).toUpperCase()),sp('v',v)])));
const strip=(rows,active)=>el('div',{class:`sq-strip${active?' active':''}`},rows.map(([k,v])=>el('div',{},sp('k',k),el('b',{class:active&&(k==='BREAK ACTIVE'||k==='STATE')?'ok':''},v))));
function tablePanel(title,subtitle,cols,rows,o={}){
  const h=Math.max(200,Math.min(rows.length,o.max||6)*32+34),wide=o.widths?o.widths.reduce((a,b)=>a+b,0):0;
  const table=el('table',{class:'sq-table',style:wide?`width:${wide}px;table-layout:fixed`:''},
    el('colgroup',{},cols.map((c,i)=>el('col',{style:o.widths?`width:${o.widths[i]}px`:c==='#'?'width:42px':''}))),
    el('thead',{},el('tr',{},cols.map(c=>el('th',{scope:'col'},hdr(c))))),
    el('tbody',{},rows.map((r,ri)=>{const tr=el('tr',{class:o.selected&&o.selected(ri)?'sel':''},r.map(c=>el('td',{title:String(c),class:resultTone(c)},c)));
      if(o.onRow){tr.tabIndex=0;tr.setAttribute('data-focus',o.rowKey(ri));tr.setAttribute('aria-selected',String(!!o.selected(ri)));tr.addEventListener('click',()=>o.onRow(ri));
        tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();o.onRow(ri);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();(e.key==='ArrowDown'?tr.nextElementSibling:tr.previousElementSibling)?.focus();}});}
      return tr;})));
  return el('section',{class:'sq-panel sq-tp'},el('h3',{class:'sq-pt'},title),el('p',{class:'sq-ps'},subtitle),el('div',{class:'sq-tw',style:`height:${h}px`,tabindex:'0',role:'region','aria-label':`${title} table`,...(o.id?{id:o.id}:{})},table));}
const ARROW='<svg viewBox="0 0 40 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" preserveAspectRatio="none"><path d="M1 6h37M32 2l6 4-6 4"/></svg>';
function flowPanel(title,subtitle,nodes,o={}){
  const box=el('div',{class:`sq-flow${o.large?' lg':''}${o.study?' study':''}${o.sem?' sem':''}`,tabindex:'0',role:'region','aria-label':`${title} (scrolls horizontally)`});
  nodes.forEach((n,i)=>{const [cat,name,info,stampT,tone,gap]=n;box.append(el('div',{class:`sq-node t-${tone}`},sp('c',cat),sp('n',name),sp('i',info),sp('s',stampT)));
    if(i<nodes.length-1){const c=el('div',{class:`sq-conn${o.study?' wide':gap&&gap.length>=12?' mid':''}`},sp('g',gap||''),el('span',{class:'sq-arrow'}));c.lastChild.innerHTML=ARROW;box.append(c);}});
  return el('section',{class:'sq-panel sq-fp',...(o.id?{id:o.id}:{})},el('h3',{class:'sq-pt'},title),el('p',{class:'sq-ps'},subtitle),box);}

/* ---------------- SECANT landing page ---------------- */
export function buildSecantPage({model,T,actions}){
  const d=prepare(model,T),L=d.landing;
  const head=el('div',{class:'sq-head'},el('div',{class:'sq-head-t'},el('i',{class:'sq-dot','aria-hidden':'true'},'●'),el('div',{},el('h1',{},'SECANT — STUDY RECOVERY REGULATION'),el('p',{},'Study Escape and Cognitive Attention Navigation Tracker'))),
    el('div',{class:'sq-head-a'},button('REFRESH',actions.refresh,{class:'sq-btn',id:'sqRefresh'}),button('OPEN DEEP ANALYSIS',actions.open,{class:'sq-open',id:'sqOpen'})));
  const status=el('section',{class:'sq-status',id:'sqStatus'},el('div',{},sp('sq-cap',L.status[0]),el('b',{class:`sq-msg t-${L.status[3]}`},L.status[1])),el('b',{class:'sq-state'},L.status[2]));
  const rec=el('section',{class:'sq-recent',id:'sqRecent'},el('div',{class:'sq-rl'},sp('sq-cap','RECENT EPISODE'),el('div',{class:'sq-rs'},el('b',{},L.recent[1][1]),sp('sq-badge',L.badges[0]),sp('sq-badge ok',L.badges[1])),sp('sq-mono',L.recent[0][1])),
    ...['STAGE REACHED','CLOSURE','RECORDED AT','STUDY RESOURCE'].map((t,i)=>el('div',{class:'sq-rf'},sp('sq-cap',t),el('b',{},L.recent[2+i][1]))));
  const tiles=el('div',{class:'sq-tiles',id:'sqTiles'},L.metrics.map(([l,v,n],i)=>el('div',{class:`sq-tile t-${LAND[i]}`},el('b',{class:'sq-tv'},v),sp('sq-tl',l),sp('sq-tn',n))));
  const beh=panel('DISTRACTION / EPISODE BEHAVIOUR',null,sp('sq-cap','PLATFORM PATH'),el('div',{class:'sq-path'},el('b',{},L.behaviour[0]),sp('sq-mono',L.behaviour[1])),el('p',{class:'sq-bs'},L.behaviour[2]),el('p',{class:'sq-bo'},L.behaviour[3]));
  beh.id='sqBehaviour';
  const evs=panel('LATEST EVENTS','Recorded event times; occurrence order preserved.',...L.events.map(e=>el('div',{class:'sq-evl'},el('i',{class:'sq-evd','aria-hidden':'true'},'●'),el('span',{class:'e'},e[2]),sp('s',e[3]),sp('t',e[1]))));
  evs.id='sqLatest';
  const flow=flowPanel('RECENT SECANT EPISODE FLOW',SCOPE_TXT,L.flow,{large:true,sem:true,id:'sqFlow'});
  return el('div',{class:'mh-wrap sq-page','aria-label':'SECANT'},head,status,rec,tiles,el('div',{class:'sq-info'},beh,evs),flow,el('p',{class:'sq-banner',id:'sqBanner'},d.banner));
}

/* ---------------- Deep Analysis overlay ---------------- */
const GROUP_OF=r=>['episodes','distraction_history','past_secant_episodes'].includes(r)?'distraction':['study_history','evidence','past_study_sessions'].includes(r)?'study':r;
const HIST=['past_secant_episodes','past_study_sessions'];
const SUBNAV=[['episodes','EPISODES'],['distraction_history','DISTRACTION HISTORY'],['study_history','STUDY HISTORY'],['evidence','EVIDENCE']];
const HISTNAV=[['past_secant_episodes','PAST SECANT EPISODES'],['past_study_sessions','PAST STUDY SESSIONS']];
const NAV=[['overview','OVERVIEW'],['distraction','DISTRACTION'],['study','STUDY'],['about','ABOUT']];
const title=s=>s.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
const CLOCK='<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 8V4M8 8l3 1"/></svg>';
export function createSecantAnalysis({getModel,T,actions}){
  let root=null,body=null,opener=null,r={},cur=null;
  const st={face:'secant',route:'overview',ret:'overview',secDate:'',secSel:null,secShow:false,stDate:'',stSel:null,stShow:false,msg:'',focus:null,toBottom:false};
  const data=()=>prepare(getModel(),T);
  const note=(t,tone)=>el('p',{class:`sq-note${tone?' '+tone:''}`},t);
  const histHeader=(ttl,sub,pickId,dates,val,onDate,viewLabel,viewId,canView,onView,backId)=>{
    const pick=el('select',{class:'sq-select',id:pickId,'aria-label':`${ttl} date`},el('option',{value:''},'SELECT DATE'),dates.map(x=>el('option',{value:x},x)));pick.value=val;pick.addEventListener('change',()=>onDate(pick.value));
    const view=button(viewLabel,onView,{class:'sq-btn ghost',id:viewId});view.disabled=!canView;
    const back=button('',()=>go(st.ret),{class:'sq-btn history',id:backId});back.innerHTML=`${CLOCK}<span>← BACK TO CURRENT VIEW</span>`;
    return el('div',{class:'sq-hh'},el('div',{},el('h2',{},ttl),el('p',{},sub)),el('div',{class:'sq-hh-a'},pick,view,back));};
  const pages={
    overview(d){const o=d.overview;return [metricRow(o.metrics),el('div',{class:'sq-two'},kvPanel('RECENT SECANT EPISODE',o.recent,'Most recent distraction episode and outcome.'),kvPanel('RECENT STUDY SNAPSHOT',o.study,'Current study context and resource evidence.')),
      el('div',{class:'sq-two w32'},tablePanel('LATEST EVENTS','Recorded event times; occurrence order preserved.',['#','TIME','EVENT','SOURCE','TYPE'],o.events,{id:'sqOvEvents'}),kvPanel('OVERVIEW INSIGHTS',o.insights,SCOPE_TXT)),
      flowPanel('RECENT SECANT JOURNEY',SCOPE_TXT,o.flow,{sem:true,id:'sqOvFlow'})];},
    episodes(d){const e=d.episodes;return [metricRow(e.metrics),el('div',{class:'sq-two w32'},tablePanel('EPISODE LIST','Recent distraction episodes captured by SECANT.',['#','EPISODE ID','SOURCE','STAGE REACHED','OUTCOME','RECORDED AT'],e.rows,{id:'sqEpList'}),kvPanel('RECENT EPISODE',e.recent,SCOPE_TXT)),
      flowPanel('RECENT DISTRACTION EPISODE FLOW',SCOPE_TXT,e.flow,{sem:true,id:'sqEpFlow'})];},
    distraction_history(d){const h=d.distraction;return [metricRow(h.metrics),el('div',{class:'sq-two w32'},tablePanel('DISTRACTION HISTORY','Factual history of distraction episodes and return outcomes.',['#','SOURCE','STARTED','STAGE','RETURN INTENT','VERIFIED','CLOSURE'],h.rows,{id:'sqDhList'}),kvPanel('DISTRACTION ATTRIBUTES',h.attrs,SCOPE_TXT)),
      el('p',{class:'sq-cyan'},'No brain-state claims. Behaviour and software evidence only.'),flowPanel('DISTRACTION RETURN FLOW','Intent, interruption, verification, and closure in recorded order.',h.flow,{sem:true,id:'sqDhFlow'})];},
    study_history(d){const s=d.study;return [metricRow(s.metrics),tablePanel('STUDY HISTORY','Only study-aligned resources are shown. Distraction videos are excluded.',['#','RESOURCE','SUPPORTED FOREGROUND\nDURATION','FIRST OBSERVED','LAST OBSERVED','QUALIFICATION'],s.rows,{id:'sqShList'}),
      flowPanel('STUDY JUMP EFFECT','Study-resource movement with interruptions and evidence gaps preserved.',s.jumps,{study:true,id:'sqShFlow'})];},
    evidence(d){const v=d.evidence;return [metricRow(v.metrics),el('div',{class:'sq-two w32'},tablePanel('EVIDENCE SUMMARY',SCOPE_TXT,['#','RESOURCE','CLASSIFICATION','CONFIDENCE','USER CONFIRMATION','QUALIFICATION'],v.rows,{id:'sqEvList',widths:[42,120,183,134,219,171]}),kvPanel('EVIDENCE ATTRIBUTES',v.attrs,SCOPE_TXT)),
      el('p',{class:'sq-cyan'},'No brain-state claims. Behaviour and software evidence only.'),flowPanel('CONFIRMATION FLOW','Uncertain resources enter the study chain only after recorded confirmation.',v.nodes,{id:'sqEvFlow'})];},
    about(d){const info=[['DASHBOARD TYPE','Reader / Presentation','View recorded evidence'],['FACES','SECANT + COSECANT','Two analysis views in one dashboard'],['EVIDENCE SCOPE','Behavioural only','User activity and software events'],['EXPORT','Study Recovery Report','One finalized parent session; Study + SECANT + COSECANT']];
      const arch=flowPanel('READER ARCHITECTURE','Recorded evidence is read and supplied through presentation setters.',[['RECORDED INPUT','Durable projection','Recorded evidence','Read-only','teal','→'],['DASHBOARD','SECANT + COSECANT','Read and analyse','Prepared values','blue','→'],['OUTPUT','Presentation only','Visual exploration','No authority','purple','']],{id:'sqArch'});
      return [metricRow(info),el('div',{class:'sq-two'},kvPanel('PURPOSE',[['Purpose','Explore distraction, recovery, and study-navigation evidence.'],['Authority','Reader and presentation interface only.'],['Background','Does not control physiology or influence background systems.'],['SOURCE SCOPE','Display values are prepared from recorded evidence.']]),
        kvPanel('DASHBOARD STRUCTURE',[['OVERVIEW','Common summary and key metrics'],['DISTRACTION','Episodes and Distraction History'],['STUDY','Study History and Evidence'],['ABOUT','Dashboard scope, data, structure, and rules']])),
        el('div',{class:'sq-two'},kvPanel('DATA FOUNDATION',[['secant_events','Episode, recovery, and outcome evidence'],['study_resource_events','Study resource interaction evidence'],['study_resources','Qualified resource evidence'],['study_events','Study session and transition evidence'],['cosecant_events','COSECANT break evidence']]),
          kvPanel('SCIENTIFIC BOUNDARY',[['Shows','Observed behaviour, software events, durations, classifications, confirmations'],['Does not claim','Brain activity, dopamine, mental state, motivation, or neurological condition'],['Current source',d&&d.ctx?'Imported database file snapshot, read-only, this browser only':'Read-only browser-local projection']])),
        arch,el('p',{class:'sq-amber'},'This dashboard does not control timers, Monitor, Resource Intent, Study, SINE, MIRL, MINE, COSINE, SECANT, or COSECANT.')];},
    cosecant(d){const c=d.cosecant;return [strip(c.main,true),strip(c.recent,false),metricRow(c.metrics),
      el('div',{class:'sq-three'},kvPanel('BREAK HISTORY',c.history),tablePanel('LATEST EVENTS',SCOPE_TXT,['EVENT','TYPE','TIME'],c.events,{id:'sqCoEvents',widths:[384,144,108]}),tablePanel('RETURN HISTORY',SCOPE_TXT,['INTENDED TARGET','RETURN CONFIRMED AT','CONFIRMATION','OUTCOME'],c.returns,{id:'sqCoReturns',widths:[360,242,158,192]})),
      flowPanel('RECENT COSECANT EPISODE FLOW','Recorded allowance and return facts; reminder is a state, not a display receipt.',c.flow,{sem:true,id:'sqCoFlow'})];},
    past_secant_episodes(d){const arch=d.secArchive,dates=[...new Set(arch.map(a=>a.date))],filt=st.secDate?arch.filter(a=>a.date===st.secDate):[],sel=filt.find(a=>a.key===st.secSel)||null,out=[];
      out.push(histHeader('PAST SECANT EPISODES','Select a date, choose an episode, then view its full flow.','sqSecDate',dates,st.secDate,v=>{st.secDate=v;st.secSel=null;st.secShow=false;render(false);},'VIEW FLOW','sqSecView',!!sel,()=>{st.secShow=true;st.toBottom=true;render();},'sqSecBack'));
      out.push(tablePanel('HISTORICAL EPISODE LIST',SCOPE_TXT,['#','EPISODE ID','SOURCE','STARTED','STAGE','OUTCOME'],filt.map((a,i)=>[String(i+1),a.displayId,a.source,a.started,a.stage,a.outcome]),{id:'sqSecList',rowKey:i=>`sec:${filt[i].key}`,selected:i=>filt[i].key===st.secSel,onRow:i=>{st.secSel=filt[i].key;st.secShow=false;st.focus=`sec:${filt[i].key}`;render();}}));
      if(!arch.length||(st.secDate&&!filt.length))out.push(panel('NO DATA','No data for the selected SECANT episode view.'));
      else if(!sel)out.push(panel('SELECT A HISTORICAL EPISODE','Select a date and an episode above, then press VIEW FLOW.'));
      else if(!st.secShow)out.push(panel('EPISODE SELECTED',`${sel.started} · ${sel.source||NR} · ${sel.outcome}. Press VIEW FLOW.`));
      else out.push(strip([['EPISODE ID',sel.displayId],['SOURCE',sel.source],['STAGE REACHED',sel.stage],['OUTCOME',sel.outcome],['EVENTS',String(sel.events.length)]]),
        kvPanel('SELECTED HISTORICAL EPISODE',[['Episode ID',sel.displayId],['Distraction Source',sel.source],['Started',sel.started],['Stage Reached',sel.stage],['Return Intent',sel.returnIntent],['Return Verified',sel.verification],['Recovery Interruption',sel.interruption],['Closure',sel.closure],['Related Study resource',sel.studyResource],['Event count',String(sel.events.length)]],SCOPE_TXT),
        tablePanel('FULL EVENT HISTORY',(d.ctx&&d.ctx.secant_archive_events)||'Clock basis shown per event: OCCURRED AT is the browser-recorded event time. Quality exclusions remain visible.',['#','TIME','EVENT','SOURCE','TYPE'],sel.events,{id:'sqSecEvents',max:12}),
        flowPanel(`HISTORICAL SECANT FLOW — ${sel.displayId} · ${sel.started} · ${sel.source}`,'Complete selected path in recorded order; scroll horizontally for all nodes.',sel.nodes,{large:true,sem:true,id:'sqSecHistFlow'}));
      return out;},
    past_study_sessions(d){const arch=d.stArchive,dates=[...new Set(arch.map(a=>a.date))],filt=st.stDate?arch.filter(a=>a.date===st.stDate):[],sel=filt.find(a=>a.key===st.stSel)||null,out=[];
      out.push(histHeader('PAST STUDY SESSIONS','Select a date, choose a session, then view its Study Jump Effect.','sqStDate',dates,st.stDate,v=>{st.stDate=v;st.stSel=null;st.stShow=false;render(false);},'VIEW STUDY MAP','sqStView',!!sel,()=>{st.stShow=true;st.toBottom=true;render();},'sqStBack'));
      out.push(tablePanel('HISTORICAL STUDY SESSION LIST',SCOPE_TXT,['DATE','STUDY AREA','DURATION','RESOURCES'],filt.map(a=>[a.date,a.title,a.duration,String(a.resourceCount)]),{id:'sqStList',rowKey:i=>`st:${filt[i].key}`,selected:i=>filt[i].key===st.stSel,onRow:i=>{st.stSel=filt[i].key;st.stShow=false;st.focus=`st:${filt[i].key}`;render();}}));
      if(!arch.length||(st.stDate&&!filt.length))out.push(panel('NO DATA','No data for the selected Study session view.'));
      else if(!sel)out.push(panel('SELECT A HISTORICAL STUDY SESSION','Select a date and a session above, then press VIEW STUDY MAP.'));
      else if(!st.stShow)out.push(panel('STUDY SESSION SELECTED',`${sel.date} · ${sel.title} · ${sel.duration}. Press VIEW STUDY MAP.`));
      else out.push(strip([['PAST STUDY SESSION',sel.title],['DATE',sel.date],['DURATION',sel.duration],['RESOURCES',String(sel.resourceCount)],['DIRECT STUDY JUMPS',sel.direct]]),
        kvPanel('SELECTED STUDY SESSION',[['Date',sel.date],['Study area',sel.title],['Started',sel.started],['Ended',sel.ended],['Duration',sel.duration],['Primary resource',sel.primary],['Resource entries',String(sel.resourceCount)]],SCOPE_TXT),
        tablePanel('FULL STUDY RESOURCE HISTORY','Observed resource candidates; excluded videos never enter the Study Jump Effect.',['#','RESOURCE','SUPPORTED FOREGROUND\nDURATION','FIRST OBSERVED','LAST OBSERVED','QUALIFICATION'],sel.resources,{id:'sqStRes',max:12}),
        tablePanel('EVIDENCE / QUALIFICATION SUMMARY','Initially uncertain resources enter the jump only after confirmation as study-aligned.',['#','RESOURCE','INITIAL','LATER STATUS','CONFIRMATION'],sel.evidence,{id:'sqStEvid',max:12}),
        tablePanel('SESSION EVENT HISTORY',SCOPE_TXT,['#','TIME','EVENT','TYPE'],sel.events,{id:'sqStEvents',max:12}),
        flowPanel(`HISTORICAL STUDY JUMP EFFECT — ${sel.date} · ${sel.title} · ${sel.duration}`,'Study-resource movement with interruptions and evidence gaps preserved.',sel.nodes,{large:true,study:true,id:'sqStHistFlow'}));
      return out;}};
  function go(route){st.route=route;st.face=route==='cosecant'?'cosecant':'secant';st.msg='';render(false);}
  function openHistory(route){if(!HIST.includes(st.route))st.ret=st.route;if(route==='past_secant_episodes'){st.secDate='';st.secSel=null;st.secShow=false;}else{st.stDate='';st.stSel=null;st.stShow=false;}go(route);}
  function paint(d){const g=GROUP_OF(st.route),sec=st.face==='secant';
    r.faces.forEach(b=>{const on=b.dataset.k===st.face;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    r.navHost.hidden=!sec;r.navBtns.forEach(b=>{const on=b.dataset.k===g;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    const sub=sec&&(g==='distraction'||g==='study');r.subHost.hidden=!sub;r.hint.textContent=g==='distraction'?'DISTRACTION contains:':'STUDY contains:';
    r.subBtns.forEach(b=>{const k=b.dataset.k,vis=(g==='distraction'&&['episodes','distraction_history'].includes(k))||(g==='study'&&['study_history','evidence'].includes(k));b.hidden=!vis;b.classList.toggle('on',k===st.route);b.setAttribute('aria-selected',String(k===st.route));b.tabIndex=k===st.route?0:-1;});
    r.histBtns.forEach(b=>{const k=b.dataset.k,vis=(g==='distraction'&&k==='past_secant_episodes')||(g==='study'&&k==='past_study_sessions');b.hidden=!vis;b.classList.toggle('on',k===st.route);b.setAttribute('aria-pressed',String(k===st.route));});
    r.footL.textContent=st.msg||`${st.face.toUpperCase()} · ${title(st.route.replaceAll('_',' '))} Analysis`;r.footR.textContent=d.banner;
    body.setAttribute('aria-label',`${title(st.route.replaceAll('_',' '))} analysis`);}
  function render(keep=true){if(!root)return;const d=data(),top=body.scrollTop;paint(d);body.replaceChildren(...pages[st.route](d).filter(Boolean));
    if(st.toBottom){st.toBottom=false;body.scrollTop=body.scrollHeight;}else body.scrollTop=keep?top:0;
    if(st.focus){body.querySelector(`[data-focus="${st.focus}"]`)?.focus();st.focus=null;}}
  function close(){if(!root)return;document.removeEventListener('keydown',onKey,true);root.remove();root=null;body=null;(opener&&opener.isConnected?opener:null)?.focus();opener=null;}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.key==='Tab'&&root){const f=[...root.querySelectorAll('button,select,[tabindex="0"]')].filter(x=>!x.disabled&&!x.hidden&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}}
  function arrows(list,pick){list.forEach((b,i)=>b.addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const vis=list.filter(x=>!x.hidden),at=vis.indexOf(b),n=vis[(at+(e.key==='ArrowRight'?1:vis.length-1))%vis.length];e.preventDefault();pick(n);n.focus();}));}
  function exportPdf(){
    if(data().imported){st.msg='Report export is not available for imported database evidence.';paint(data());return;}
    if(st.route==='past_secant_episodes'){const a=data().secArchive.find(x=>x.key===st.secSel);if(!a){st.msg='Select a recorded SECANT episode before exporting its parent session.';paint(data());return;}actions.export({sessionId:a.sessionId});return;}
    if(st.route==='past_study_sessions'){const a=data().stArchive.find(x=>x.key===st.stSel);if(!a){st.msg='Select a recorded Study block before exporting its parent session.';paint(data());return;}actions.export({sessionId:a.sessionId});return;}
    actions.export({});}
  function open(from){if(root){root.querySelector('.glass-close')?.focus();return;}opener=from||document.activeElement;
    Object.assign(st,{face:'secant',route:'overview',ret:'overview',secDate:'',secSel:null,secShow:false,stDate:'',stSel:null,stShow:false,msg:'',focus:null,toBottom:false});
    const closeBtn=button('',close,{class:'glass-close sq-x','aria-label':'Close SECANT Deep Analysis',title:'Return to SECANT Dashboard'});closeBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const mkTab=(label,k,fn)=>{const b=el('button',{type:'button',class:'sq-tab',role:'tab','data-k':k,on:{click:fn}},label);return b;};
    const faces=[['secant','SECANT'],['cosecant','COSECANT']].map(([k,t])=>mkTab(t,k,()=>go(k==='cosecant'?'cosecant':'overview'))),faceBox=el('div',{class:'sq-face',role:'tablist','aria-label':'Dashboard face'},faces);
    const navBtns=NAV.map(([k,t])=>mkTab(t,k,()=>go({overview:'overview',distraction:'episodes',study:'study_history',about:'about'}[k]))),navHost=el('div',{class:'sq-nav',role:'tablist','aria-label':'SECANT sections'},navBtns);
    const hint=el('span',{class:'sq-hint'},''),subBtns=SUBNAV.map(([k,t])=>mkTab(t,k,()=>go(k))),histBtns=HISTNAV.map(([k,t])=>{const b=el('button',{type:'button',class:'sq-btn history',id:`sqHist_${k}`,'data-k':k,on:{click:()=>openHistory(k)}});b.innerHTML=`${CLOCK}<span>${t}</span>`;return b;});
    const subHost=el('div',{class:'sq-sub'},hint,el('div',{class:'sq-sub-t',role:'tablist','aria-label':'Section contents'},subBtns),el('span',{class:'sq-gap'}),histBtns);
    arrows(faces,b=>b.click());arrows(navBtns,b=>b.click());arrows(subBtns,b=>b.click());
    const footL=el('span',{class:'sq-footl',id:'sqFootL','aria-live':'polite'},''),footR=el('span',{class:'sq-footr',id:'sqFootR'},'');
    body=el('div',{class:'sq-body',id:'sqBody',role:'tabpanel',tabindex:'-1'});
    const glyph=el('span',{class:'sq-glyph','aria-hidden':'true'});glyph.innerHTML='<svg viewBox="0 0 30 30" width="30" height="30" fill="none"><defs><linearGradient id="sqGl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14e0ee"/><stop offset="1" stop-color="#5a9fff"/></linearGradient></defs><path d="M3 21C9 8 13 13 16 19c5 9 8-12 12-10" stroke="url(#sqGl)" stroke-width="2.7" stroke-linecap="round"/></svg>';
    const exp=button('EXPORT PDF',exportPdf,{class:'sq-btn amber',id:'sqExport'});if(data().imported){exp.disabled=true;exp.title='Report export is not available for imported database evidence.';}
    root=el('div',{class:'glass-overlay open sq-dash',id:'sqDash',role:'dialog','aria-modal':'true','aria-labelledby':'sqTitle'},el('div',{class:'glass-panel sq-shell'},
      el('div',{class:'sq-header'},glyph,el('div',{class:'sq-titles'},el('b',{id:'sqTitle'},'SECANT — DEEP ANALYSIS'),el('span',{},'Study Escape and Cognitive Attention Navigation Tracker')),faceBox,el('span',{class:'sq-gap'}),
        button('REFRESH',()=>{actions.rerender();render();},{class:'sq-btn',id:'sqDashRefresh'}),el('div',{class:'sq-exp'},exp,sp('sq-expc','Study + SECANT + COSECANT · one session')),closeBtn),
      navHost,subHost,body,el('div',{class:'sq-foot'},footL,footR)));
    r={faces,navHost,navBtns,subHost,subBtns,histBtns,hint,footL,footR};
    root.addEventListener('mousedown',e=>{if(e.target===root)close();});document.body.append(root);document.addEventListener('keydown',onKey,true);render(false);closeBtn.focus();}
  return {open,close,refresh:()=>render(),get isOpen(){return !!root;},go:route=>{if(root)go(route);}};
}
