// MINE Main Station page + "MINE — Deep Analysis" glass overlay (CONTROL_STATION/application.py MineDashboardShowcasePage / MineDeepAnalysisDialog).
// Same blocks, wording, states and five tabs as the desktop. Every value is derived from this browser's accepted MINE events (the web has no read model):
// nothing is estimated, an unrecorded fact reads "Not recorded", and an empty history reads exactly like the desktop's empty database.
import {el,button} from './dom.js';
import {SURFACES} from './simulator.js';
import {mbiBand} from './projections.js';
import {MINE} from './mine-data.js';
const L=MINE.MINE_EVENT_LABELS,STATE=MINE.MINE_STATE_LABELS,BUCKETS=MINE.MINE_TIMELINE_BUCKETS;
const NB='Not recorded',UNAV='Unavailable',DASH='—';
const words=v=>String(v||'').replaceAll('_',' ').trim().replace(/\s+/g,' ');
const branchWords=t=>!t?DASH:t==='ITS_IMPORTANT'?"IT'S IMPORTANT":String(t).replaceAll('_',' ');
const platformOf=id=>{const s=Object.values(SURFACES).find(v=>v.resourceId===id);return s?(s.platform||null):null;};
const titleCase=s=>words(s).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function dwellText(v){if(typeof v!=='number'||!Number.isFinite(v)||v<0)return NB;const w=Math.floor(v),h=Math.floor(w/3600),m=Math.floor(w%3600/60),s=w%60,base=h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,frac=v-w;return frac>0.0005?`${base}.${frac.toFixed(3).slice(2).replace(/0+$/,'')}`:base;}
function deltaText(v){if(typeof v!=='number'||!Number.isFinite(v)||v<0)return '';if(v<1)return `+${v.toFixed(3)}s`;const r=Math.round(v),h=Math.floor(r/3600),m=Math.floor(r%3600/60),s=r%60;return h?`+${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`+${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}

/* ---------------- model ---------------- */
function mapEvent(e,es){const t=e.type,pl=e.payload||{},st=pl.stage;
  const req={'MINE-1':'MINE1_REQUESTED','MINE-2A':'MINE2A_REQUESTED','MINE-2B':'MINE2B_REQUESTED',DURATION:'IMPORTANT_DURATION_REQUESTED'},dis={'MINE-1':'MINE1_DISPLAYED','MINE-2A':'MINE2A_DISPLAYED','MINE-2B':'MINE2B_DISPLAYED'};
  switch(t){
    case 'EPISODE_STARTED':return [{name:'MINE_EPISODE_STARTED',cls:'DERIVED'}];
    case 'POPUP_REQUESTED':return req[st]?[{name:req[st],cls:'PRESENTATION'}]:[];
    case 'STAGE_DISPLAYED':return dis[st]?[{name:dis[st],cls:'PRESENTATION'}]:[];
    case 'BRANCH_CHOSEN':return [pl.branch==='A'?{name:'RETURN_INTENT_RECORDED',cls:'USER_ACTION',facts:{choice:'I_WILL_COME_BACK'}}:{name:'IMPORTANT_INTENT_RECORDED',cls:'USER_ACTION',facts:{choice:'ITS_IMPORTANT'}}];
    case 'ALLOWANCE_COMMITTED':return [{name:'IMPORTANT_ALLOWANCE_STARTED',cls:'DERIVED',facts:{duration_minutes:Math.round((pl.seconds||0)/60)}}];
    case 'RETURN_STARTED':return [{name:es.some(x=>x.type==='VERIFICATION_STARTED'&&x.payload?.attemptId===pl.attemptId)?'RETURN_VISUAL_CONFIRMING_STARTED':'RETURN_VERIFICATION_STARTED',cls:'OBSERVED'}];
    case 'VERIFICATION_STARTED':return [{name:'RETURN_VERIFICATION_STARTED',cls:'OBSERVED'}];
    case 'RETURN_VERIFIED':return [{name:'RETURN_VERIFICATION_COMPLETED',cls:'OBSERVED'},{name:'CLOSURE_CONFIRMATION_STARTED',cls:'DERIVED'}];
    case 'RETURN_INTERRUPTED':return [{name:'RETURN_VERIFICATION_INTERRUPTED',cls:'OBSERVED',facts:{reason:pl.reason}}];
    case 'RELAPSE':return [{name:'CLOSURE_CONFIRMATION_INTERRUPTED',cls:'OBSERVED',facts:{reason:pl.reason}}];
    case 'RECOVERY_CONFIRMED':return [{name:'CLOSURE_CONFIRMATION_COMPLETED',cls:'DERIVED'}];
    case 'EPISODE_CLOSED':return [{name:'MINE_SESSION_CLOSED',cls:'DERIVED',closed:pl.outcome}];
    case 'MESSAGING_DWELL_SEGMENT_COMPLETED':return [{name:'MESSAGING_DWELL_SEGMENT_COMPLETED',cls:'OBSERVED',facts:{dwell_seconds:pl.dwellSeconds},platform:pl.platform}];
    case 'PLATFORM_CHANGED':return [{name:'MESSAGING_PLATFORM_TRANSITION',cls:'OBSERVED',facts:{from_platform:pl.from,to_platform:pl.to},platform:pl.to}];
    default:return [];}}
export function eventText(ev){const n=ev.name,text=L[n]||titleCase(n)||'Recorded MINE event',f=ev.facts||{};
  if(n==='MESSAGING_PLATFORM_TRANSITION'){const a=words(f.from_platform),b=ev.platform||words(f.to_platform);return a&&b?`Messenger hop: ${a} → ${b}`:text;}
  if(n==='MESSAGING_DWELL_SEGMENT_COMPLETED'){const d=[ev.platform,dwellText(f.dwell_seconds)].filter(Boolean).join(' · ');return d?`${text}: ${d}`:text;}
  if(n==='RETURN_INTENT_RECORDED'||n==='IMPORTANT_INTENT_RECORDED'){const c=words(f.choice);return c?`${branchWords(f.choice)} selected`:text;}
  if(n==='IMPORTANT_ALLOWANCE_STARTED')return Number.isInteger(f.duration_minutes)?`${text}: ${f.duration_minutes} minutes`:text;
  if(n==='MINE_SESSION_CLOSED'&&ev.outcome)return `${text}: ${ev.outcome}`;
  if(/_INTERRUPTED$/.test(n)){const r=words(f.reason);return r?`${text}: ${r}`:text;}
  return text;}
const eventPill=ev=>{const n=ev.name;if(n==='MINE_CANDIDATE_STARTED')return ['start','Start'];if(n.endsWith('_REQUESTED'))return ['','Pending'];if(n.endsWith('_DISPLAYED'))return ['active','Active'];if(n.endsWith('_INTERRUPTED'))return ['evidence','Interrupted'];if(n.endsWith('_COMPLETED')||n==='RETURN_CONFIRMED')return ['completed','Completed'];if(ev.cls==='USER_ACTION')return ['completed','Selected'];if(ev.cls==='PRESENTATION')return ['active','Displayed'];if(ev.cls==='OBSERVED')return ['evidence','Observed'];return ['','Derived'];};
const analysisPill=ev=>({RETURN_VERIFICATION_STARTED:['active','Verifying'],RETURN_VERIFICATION_COMPLETED:['completed','Verified'],RETURN_VERIFICATION_INTERRUPTED:['evidence','Interrupted'],CLOSURE_CONFIRMATION_STARTED:['active','Confirming'],CLOSURE_CONFIRMATION_COMPLETED:['completed','Completed'],CLOSURE_CONFIRMATION_INTERRUPTED:['evidence','Interrupted'],RETURN_CONFIRMED:['completed','Confirmed'],MINE_SESSION_CLOSED:['completed','Closed']}[ev.name]||eventPill(ev));
const statusRole=ev=>({completed:'green',active:'blue',evidence:'amber',start:'cyan'}[analysisPill(ev)[0]]||'muted');
export function mineModel(snaps,live){
  const sessions=snaps.filter(s=>s.session).slice().sort((a,b)=>String(a.session.startedAt).localeCompare(String(b.session.startedAt))),rows=[];
  sessions.forEach((snap,si)=>{const ev=snap.events||[],mine=ev.filter(e=>e.organ==='MINE');
    mine.filter(e=>e.type==='EPISODE_STARTED').forEach(start=>{const id=start.episodeId,es=mine.filter(e=>e.episodeId===id).sort((a,b)=>a.sequence-b.sequence),events=[];
      for(const e of es)for(const m of mapEvent(e,es))events.push({...m,utc:e.utc,eff:e.effectiveSeconds,platform:m.platform||platformOf(e.resourceId)});
      const closeE=es.find(e=>e.type==='EPISODE_CLOSED'),callback=events.some(x=>/^MINE2[AB]_DISPLAYED$/.test(x.name)),raw=closeE?.payload?.outcome;
      const outcome=!closeE?'':raw==='RETURNED'?(callback?'RETURNED AFTER CALLBACK':'RETURNED'):raw==='ENDED'?'SESSION ENDED':words(raw).toUpperCase();
      events.forEach(x=>{if(x.name==='MINE_SESSION_CLOSED')x.outcome=outcome;});events.forEach((x,i)=>{x.seq=i+1;x.delta=i?Math.max(0,x.eff-events[i-1].eff):null;});
      const branchE=es.find(e=>e.type==='BRANCH_CHOSEN'),route=[],startP=platformOf(start.resourceId)||es.map(e=>e.payload?.platform).find(Boolean)||null;if(startP)route.push(startP);
      const hops=es.filter(e=>e.type==='PLATFORM_CHANGED');hops.forEach(h=>{const to=h.payload.to;if(to&&route[route.length-1]!==to)route.push(to);});
      const isLive=!!live&&live.episodeId===id&&live.sessionId===snap.session.id;
      rows.push({key:`${snap.session.id}|${id}`,episodeId:id,sessionNo:si+1,startedUtc:start.utc,startedEff:start.effectiveSeconds,endedUtc:closeE?.utc||null,closed:!!closeE,outcome,branch:branchE?(branchE.payload.branch==='A'?'I_WILL_COME_BACK':'ITS_IMPORTANT'):'',startingPlatform:startP||'',route,hops:hops.map(h=>({from:h.payload.from,to:h.payload.to,utc:h.utc})),events,returnVerified:es.some(e=>e.type==='RETURN_VERIFIED'),closureConfirmed:es.some(e=>e.type==='RECOVERY_CONFIRMED'),live:isLive,reason:closeE?.payload?.outcome&&raw!=='RETURNED'?raw:''});});});
  rows.sort((a,b)=>String(a.startedUtc).localeCompare(String(b.startedUtc))||a.startedEff-b.startedEff);const perDay={};
  rows.forEach(r=>{const d=new Date(r.startedUtc),key=Number.isFinite(+d)?`${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCMonth()+1).padStart(2,'0')}${d.getUTCFullYear()}`:'00000000';perDay[key]=(perDay[key]||0)+1;r.id=`MINE-${key}-${String(perDay[key]).padStart(2,'0')}`;});
  const episodes=rows.slice().reverse(),latest=episodes[0]||null;
  const news=episodes.flatMap(r=>r.events.map(e=>({...e,episode:r.id}))).sort((a,b)=>String(b.utc).localeCompare(String(a.utc))||b.seq-a.seq).slice(0,3);
  const dwell=[];episodes.slice(0,10).forEach(r=>{let n=0;r.events.filter(e=>e.name==='MESSAGING_DWELL_SEGMENT_COMPLETED').forEach(e=>{n++;dwell.push({platform:e.platform||NB,seconds:e.facts.dwell_seconds,band:mbiBand(e.facts.dwell_seconds),episode:r.id,segment:n,utc:e.utc});});});
  dwell.sort((a,b)=>String(b.utc).localeCompare(String(a.utc)));
  return {episodes,latest,news,dwell,available:true,generatedAt:new Date().toISOString()};}
const summaryOf=r=>{const names=new Set(r.events.map(e=>e.name)),c=[];if(r.startingPlatform)c.push(`Messaging began on ${r.startingPlatform}.`);if(names.has('MINE1_DISPLAYED'))c.push('MINE-1 was displayed.');const b=branchWords(r.branch);if(b!==DASH)c.push(`${b} was selected.`);if(names.has('MINE2A_DISPLAYED'))c.push('MINE-2A was displayed.');if(names.has('MINE2B_DISPLAYED'))c.push('MINE-2B was displayed.');if(r.returnVerified)c.push('Return verification completed.');c.push(r.closed?(r.outcome?`The episode closed with ${r.outcome}.`:'The episode closed; no closure outcome was recorded.'):'No closure event was recorded.');return c.join(' ')||'No episode summary facts were recorded.';};
const named=(r,...n)=>r.events.find(e=>n.includes(e.name))||null;
function historyStatus(r){if(!r.closed)return ['OPEN / INCOMPLETE','amber','No closure event recorded'];const s=r.outcome||'CLOSED';return [s,s.startsWith('RETURNED')?'green':(s==='COSINE HANDOVER'||s==='STUDY PREEMPTION')?'blue':'red',r.reason?`Reason: ${words(r.reason)}`:'Closure event recorded'];}

/* ---------------- dom helpers ---------------- */
const sp=(cls,...k)=>el('span',{class:cls},...k);
const dot=(role,small)=>el('i',{class:`mn-dot ${role}${small?' sm':''}`,'aria-hidden':'true'});
const pill=(role,text)=>el('span',{class:`journey-pill${role?' '+role:''}`},text);
const ARROW='<svg viewBox="0 0 22 8" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 4h16" stroke-dasharray="3 2"/><path d="M14 1l4 3-4 3"/></svg>';
const link=t=>{const l=el('div',{class:'jflow-link'},el('span',{class:'arrow'}),sp('',t||''));l.firstChild.innerHTML=ARROW;return l;};
const stepCard=(idx,name,role,ptext,kind,stamp)=>el('div',{class:`journey-step${role==='evidence'?' evidence':''}`},el('div',{class:'idx'},`#${idx}`),el('div',{class:'name'},name),pill(role,ptext),el('div',{class:'ts'},`${kind} · ${stamp}`));
const outcomeNode=(text,sub,kind)=>el('div',{class:`jflow-outcome ${kind}`},el('div',{class:'jf-label'},text),sub?el('div',{class:'jf-sub'},sub):null);
const field=(c,v)=>el('div',{class:'mn-field'},sp('c',`${c}:`),sp('v',v));
const bullet=t=>el('div',{class:'mn-b'},dot('cyan',true),sp('t',t));
const stamp=(T,iso,date)=>{if(!Number.isFinite(Date.parse(iso)))return DASH;return date?T.isoMin(iso):`${T.time(iso)} [${T.tag()}]`;};
function mapStrip(r,T,withClose){const box=el('div',{class:'journey-strip mn-strip'});
  if(!r){return box;}
  const close=withClose?r.events.find(e=>e.name==='MINE_SESSION_CLOSED'):null,path=close?r.events.filter(e=>e!==close):r.events;
  path.forEach((e,i)=>{if(i)box.append(link(deltaText(e.delta)));const [role,pt]=withClose?eventPill(e):analysisPill(e);box.append(stepCard(e.seq,eventText(e),role,pt,withClose?titleCase(e.cls||'Recorded'):'Observed',stamp(T,e.utc,false)));});
  if(close){if(path.length)box.append(link(deltaText(close.delta)));box.append(outcomeNode(r.outcome||'CLOSED',`${titleCase(close.cls||'Recorded')} · ${stamp(T,close.utc,false)}`,(r.outcome||'').startsWith('RETURNED')?'returned':'terminal-red'));}
  else{if(path.length)box.append(link(''));box.append(outcomeNode('OPEN / INCOMPLETE','No closure event recorded','open'));}
  return box;}

/* ---------------- MINE Main Station page ---------------- */
export function buildMinePage({model,live,T,actions}){
  const m=model,cur=m.latest,msg=m.episodes.length?'No MINE episodes available':'No MINE episodes available';
  const title=el('div',{class:'card mn-title'},el('div',{},el('h1',{},'MINE MAIN STATION'),el('p',{},'Dedicated Dashboard')),el('div',{class:'mn-title-a'},button('REFRESH',actions.refresh,{class:'btn-block outline',id:'mnRefresh'}),button('',actions.view,{class:'btn-cta',id:'mnView'})));
  title.querySelector('#mnView').innerHTML='<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>VIEW ANALYSIS';
  let bn;if(live.active){const match=m.episodes.find(e=>e.live);bn=['Episode',match?match.id:live.hasEpisode?'MINE EPISODE ACTIVE':'Messaging candidate active','Live Status',live.paused?'PAUSED':'ACTIVE',true];}
  else if(!live.available)bn=['Episode','Evidence unavailable','','UNAVAILABLE',false];else bn=['Episode','No active episode','','INACTIVE',false];
  const banner=el('div',{class:`episode-banner${bn[4]?' ok':''}`,id:'mnBanner'},el('div',{},el('div',{class:`episode-status-lbl${bn[4]?' ok-dot':''}`},sp('episode-status-dot'),bn[0]),el('div',{class:'episode-status-value',style:'font-size:16px'},bn[1])),el('div',{class:'episode-outcome'},bn[2]?el('div',{class:'lbl'},bn[2]):null,el('div',{class:'val'},bn[3])));
  const activity=el('section',{class:'card mn-card'},el('div',{class:'mn-card-h'},dot('cyan',true),el('h2',{},'MINE Activity')),...[['Current state',live.state],['Current platform',live.platform],['Branch',live.branch],['Return status',live.returnStatus]].map(([c,v])=>field(c,v)));
  const news=el('section',{class:'card mn-card'},el('div',{class:'mn-card-h'},el('h2',{},'Latest News')),...(m.news.length?m.news.map(e=>bullet(`${stamp(T,e.utc,false)} · ${eventText(e)}`)):[bullet('No durable MINE events available')]));
  const tl=cur?(()=>{const out=[];BUCKETS.forEach((names,i)=>{const hit=cur.events.filter(e=>names.includes(e.name));if(hit.length)out.push(i>=4?hit[hit.length-1]:hit[0]);});return out.map(eventText);})():[];
  const timeline=el('section',{class:'card mn-card'},el('div',{class:'mn-card-h'},el('h2',{},'Episode Timeline'),sp('mn-id',cur?cur.id:DASH)),...(cur?(tl.length?tl:['No compact timeline milestones recorded']):[msg]).slice(0,7).map(bullet));
  const strip=mapStrip(cur,T,true);strip.id='mnPageMap';if(!cur)strip.append(outcomeNode(msg,'','unavailable'));
  const prev=button('',()=>strip.scrollBy({left:-220,behavior:'smooth'}),{class:'mirl-chev','aria-label':'Scroll map left'}),next=button('',()=>strip.scrollBy({left:220,behavior:'smooth'}),{class:'mirl-chev','aria-label':'Scroll map right'});
  prev.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';next.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  const map=el('section',{class:'card mn-card mn-map'},el('div',{class:'journey-card-head'},el('div',{class:'title'},'Map Of That Episode'),el('div',{class:'journey-nav'},sp('mn-id',cur?cur.id:DASH),prev,next)),strip);
  const hist=el('section',{class:'card mn-card'},el('div',{class:'mn-card-h'},dot('cyan',true),el('h2',{},'History')),
    el('div',{class:'mn-tblwrap'},el('table',{class:'gtable mn-hist'},el('thead',{},el('tr',{},['#','Episode ID','Start Time','End Time','Status','Notes'].map(h=>el('th',{},h)))),el('tbody',{},m.episodes.length?m.episodes.map((r,i)=>{const [st,role,notes]=historyStatus(r);return el('tr',{},el('td',{class:'mono'},String(i+1)),el('td',{class:'mono'},r.id),el('td',{class:'mono'},stamp(T,r.startedUtc,true)),el('td',{class:'mono'},r.closed?stamp(T,r.endedUtc,true):'OPEN'),el('td',{},el('span',{class:'mn-status'},dot(role,true),st)),el('td',{class:'mn-notes'},notes));}):[el('tr',{},el('td',{colspan:'6',class:'mn-empty'},msg))]))));
  return el('div',{class:'mh-wrap mn-page','aria-label':'MINE Main Station'},title,banner,el('div',{class:'mn-row3'},activity,news,timeline),map,hist);
}

/* ---------------- Deep Analysis overlay ---------------- */
const TABS=[['overview','Overview'],['episode_path','Episode Path'],['mbi','MBI'],['return_closure','Return & Closure'],['about','About']];
const BANDS=['10 MIN OR LESS','11–30 MIN','31–60 MIN','61–120 MIN','MORE THAN 120 MIN'];
export function createMineAnalysis({getModel,T,actions}){
  let root=null,tab='overview',sel=null,band=BANDS[0],opener=null,body=null;
  const cur=()=>{const m=getModel();return m.episodes.find(e=>e.key===sel)||m.latest;};
  const gcard=(...k)=>el('section',{class:'gcard mn-g'},...k),note=(t,tone)=>el('div',{class:`mn-note${tone?' '+tone:''}`},t),sec=(t,h)=>[el('h2',{class:'mn-sec'},t),h?el('p',{class:'mn-hint'},h):null],gh=t=>el('h3',{class:'mn-gh'},t);
  const evMsg='No MINE episodes available';
  const stat=(c,v)=>el('div',{class:'gstat'},el('div',{class:'lbl'},c),el('div',{class:'val'},String(v)));
  const stats=(items,cols)=>el('div',{class:'mn-stats',style:`--cols:${cols}`},items.map(([c,v])=>stat(c,v)));
  const grid=(headers,rows)=>el('div',{class:'mn-tblwrap'},el('table',{class:'gtable mn-grid'},el('thead',{},el('tr',{},headers.map(h=>el('th',{},h)))),el('tbody',{},rows.map(r=>el('tr',{},r.map(c=>el('td',{},c)))))));
  const trace=(items,{withNote})=>{const row=el('div',{class:'mn-trace'});if(!items.length){row.append(el('span',{class:'mn-hint'},withNote?'No return evidence recorded':'No overview milestones recorded'));return row;}
    items.forEach((it,i)=>{if(i)row.append(el('span',{class:'mn-rule'}));row.append(el('div',{class:'mn-tn'},withNote?null:el('b',{},it.cap),dot(it.role),withNote?el('b',{},it.cap):null,it.note?el('span',{class:'mn-tnote'},it.note):null,el('span',{class:'mn-tt'},it.time)));});return row;};
  const views={
    overview(){const r=cur(),out=[...sec('Episode Overview','High-level summary and key insights from the selected episode.')];if(!r){out.push(note(evMsg));return out;}
      out.push(gcard(gh('Selected Episode Summary'),el('p',{class:'mn-p'},summaryOf(r))));
      const buckets=[['START','cyan',['MINE_CANDIDATE_STARTED']],['MINE-1','purple',['MINE1_DISPLAYED']],['BRANCH','purple',['RETURN_INTENT_RECORDED','IMPORTANT_INTENT_RECORDED']],['MINE-2','purple',['MINE2A_DISPLAYED','MINE2B_DISPLAYED']],['RETURN','cyan',['RETURN_VERIFICATION_COMPLETED','RETURN_CONFIRMED']],['CLOSED','green',['MINE_SESSION_CLOSED']]],tr=[];
      buckets.forEach(([cap,role,names])=>{let e=named(r,...names);if(!e&&cap==='START')e=named(r,'MINE_EPISODE_STARTED');if(e){if(cap==='CLOSED')role=(r.outcome||'').startsWith('RETURNED')?'green':r.outcome==='COSINE HANDOFF'?'blue':'red';tr.push({cap,role,time:stamp(T,e.utc,false)});}});
      out.push(gcard(gh('Episode Trace'),el('p',{class:'mn-hint'},'Timeline of key events in this episode.'),trace(tr,{withNote:false})));
      const b=branchWords(r.branch);out.push(stats([['Episode ID',r.id],['Platform',r.startingPlatform||NB],['Branch',b===DASH?NB:b],['Return',r.returnVerified?'VERIFIED':'NOT RECORDED'],['Outcome',r.outcome||(r.closed?'CLOSED — NOT RECORDED':'OPEN / INCOMPLETE')]],5));return out;},
    episode_path(){const m=getModel(),r=cur(),out=[...sec('Episode Path','The complete recorded route through this selected MINE episode.')];
      const combo=el('select',{class:'mirl-picker','aria-label':'Choose which MINE episode to analyse',id:'mnPicker'});m.episodes.forEach(e=>combo.append(el('option',{value:e.key},`${e.id}   ${e.outcome||(e.closed?'CLOSED — OUTCOME NOT RECORDED':'OPEN / INCOMPLETE')}`)));combo.disabled=!m.episodes.length;if(r)combo.value=r.key;
      const back=button('Back To Latest',()=>{sel=m.latest?.key||null;render();},{class:'btn-block outline sm',id:'mnBack'}),mapB=button('MAP THIS EPISODE',()=>{sel=combo.value||null;render();},{class:'btn-cta',id:'mnMap'});back.disabled=mapB.disabled=!m.episodes.length;
      const strip=r?mapStrip(r,T,false):el('div',{class:'journey-strip mn-strip'},sp('mn-hint',evMsg));
      out.push(gcard(gh('Complete Episode Path'),el('p',{class:'mn-hint'},'Chronological path for the selected episode, with timing and status.'),el('div',{class:'mn-ctl'},sp('mn-hint','Selected Episode'),combo,sp('spacer'),back,mapB),strip));
      const bl=['I_WILL_COME_BACK','ITS_IMPORTANT'].map(tk=>{const s=r&&r.branch===tk,rec=r&&['I_WILL_COME_BACK','ITS_IMPORTANT'].includes(r.branch);return el('div',{class:'mn-br'},dot(s?'cyan':'muted',true),el('b',{class:s?'':'dim'},branchWords(tk).toUpperCase()),sp('spacer'),el('span',{class:`mn-badge${s?' on':''}`},s?'SELECTED':rec?'NOT TAKEN':'UNAVAILABLE'));});
      const route=r?r.route:[],chain=el('div',{class:'mn-chain'});route.forEach((p,i)=>{if(i)chain.append(el('span',{class:'mn-arr'},'→'));chain.append(el('div',{class:'mn-hop'},dot('cyan',true),el('b',{},p),sp('mn-tag',i===0?'START':`HOP ${i}`)));});
      const hs=r?r.hops.length:0,status=!r?evMsg:!route.length?'No messaging platform evidence recorded':!hs?'No messenger hops recorded':`${hs} recorded messenger hop${hs!==1?'s':''}`;
      let step=null;if(r){const sel0=named(r,'RETURN_INTENT_RECORDED','IMPORTANT_INTENT_RECORDED')||named(r,'MINE_EPISODE_STARTED')||r.events[0];if(sel0){const i=r.events.indexOf(sel0),pv=r.events[i-1],nx=r.events[i+1];step=[['Step',`#${sel0.seq}`],['Event',eventText(sel0)],['Observed',stamp(T,sel0.utc,true)],['Platform',sel0.platform||NB],['Previous state',pv?eventText(pv):NB],['Next state',nx?eventText(nx):NB],['Status',analysisPill(sel0)[1]||NB]];}}
      step=step||['Step','Event','Observed','Platform','Previous state','Next state','Status'].map(c=>[c,NB]);
      out.push(el('div',{class:'mn-g3'},gcard(gh('Branch Route'),el('p',{class:'mn-hint'},'Selected branch for this episode.'),...bl),gcard(gh('Messenger Hop'),el('p',{class:'mn-hint'},'Recorded messaging-platform route for this episode.'),chain,el('p',{class:'mn-hint sm'},status)),gcard(gh('Selected Step Detail'),...step.map(([c,v])=>field(c,v)))));return out;},
    mbi(){const m=getModel(),recs=m.dwell,meas=recs.filter(x=>Number.isFinite(x.seconds)),out=[...sec('MBI','Messaging Bit Interval / factual dwell history for the latest 10 formal episodes.')];
      const msg=meas.length?'Factual messaging dwell is recorded for these episodes.':'Factual messaging dwell duration was not recorded for these episodes.';
      out.push(stats(BANDS.map(b=>[b,meas.length?meas.filter(x=>x.band===b).length:UNAV]),5));
      out.push(gcard(gh('MBI Dwell Table'),el('p',{class:'mn-hint'},'Every recorded segment from the latest 10 formal episodes, newest first.'),
        recs.length?grid(['Platform','Dwell Time','MBI Band','Episode ID','Notes'],recs.map(x=>[x.platform,dwellText(x.seconds),x.band||NB,x.episode,`Segment ${x.segment}`])):grid(['Platform','Dwell Time','MBI Band','Episode ID','Notes'],[]),note(msg)));
      const combo=el('select',{class:'mirl-picker','aria-label':'Choose a dwell band',id:'mnBand'});BANDS.forEach(b=>combo.append(el('option',{value:b},b)));combo.value=band;combo.disabled=!meas.length;const fl=el('div',{class:'mn-filtered'});
      const fill=()=>{const hit=meas.filter(x=>x.band===combo.value);fl.replaceChildren(...(hit.length?hit.map(x=>note(`${x.episode} · ${x.platform||NB} · ${dwellText(x.seconds)}`,'cyan')):[note(meas.length?'No factual dwell segments in this band':'MBI dwell records unavailable')]));};combo.onchange=()=>{band=combo.value;fill();};fill();
      const s=meas[0]||recs[0]||null,det=[['Platform',s?.platform||NB],['Dwell',s?dwellText(s.seconds):NB],['Band',s?.band||NB],['Episode',s?s.episode:NB],['Segment',s?String(s.segment):NB],['Completed',s?stamp(T,s.utc,true):NB],['Source',meas.length?'MESSAGING DWELL SEGMENT':NB],['Scope','LATEST 10 FORMAL EPISODES']];
      out.push(el('div',{class:'mn-g3'},gcard(gh('Filtered Band View'),el('p',{class:'mn-hint'},'Dwell entries for the selected band.'),combo,fl),gcard(gh('Selected Dwell Detail'),el('p',{class:'mn-hint'},'Detailed information for the selected messaging dwell.'),...det.map(([c,v])=>field(c,v))),
        gcard(gh('MBI Status'),el('p',{class:'mn-hint'},'Factual dwell-source boundary.'),el('p',{class:'mn-p b'},msg),el('p',{class:'mn-hint'},'Source: certified platform identity plus durable factual dwell seconds.'),el('p',{class:'mn-hint'},'Approved boundary: dwell_seconds ≤ 600 → 10 MIN OR LESS.'),el('p',{class:'mn-hint'},'Event-to-event elapsed time is never used as messaging dwell.'))));return out;},
    return_closure(){const r=cur(),out=[...sec('Return & Closure','Recovery and closure sequence for the selected MINE episode.')];if(!r){out.push(note(evMsg));return out;}
      const rc=r.events.filter(e=>/^(RETURN_VISUAL|RETURN_VERIF|RETURN_CONFIRMED|CLOSURE_CONF|FINAL_CALLBACK)/.test(e.name)),detected=named(r,'RETURN_VISUAL_CONFIRMING_STARTED','RETURN_VERIFICATION_STARTED','RETURN_VERIFICATION_COMPLETED','RETURN_CONFIRMED'),visual=named(r,'RETURN_VISUAL_CONFIRMING_STARTED'),verifying=named(r,'RETURN_VERIFICATION_STARTED'),verified=named(r,'RETURN_VERIFICATION_COMPLETED','RETURN_CONFIRMED'),cStart=named(r,'CLOSURE_CONFIRMATION_STARTED'),cInt=named(r,'CLOSURE_CONFIRMATION_INTERRUPTED'),closedE=named(r,'MINE_SESSION_CLOSED');
      const st=e=>e?stamp(T,e.utc,true):NB,outc=r.outcome,fin=r.closed?'CLOSED':'OPEN / INCOMPLETE';
      out.push(el('h2',{class:'mn-sec mn-sec2'},'Recovery Snapshot'));
      out.push(stats([['Return Detected',st(detected)],['Return Verified',r.returnVerified?'YES':'NOT RECORDED'],['Closure Confirmed',r.closureConfirmed?'YES':'NOT RECORDED'],['Final State',fin],['Return Latency',NB],['Callback Result',outc||NB],['Closed At',r.closed?st(closedE):NB]],4));
      const latestBy=new Map();rc.forEach(e=>latestBy.set(e.name,e));const te=[...latestBy.values()].sort((a,b)=>a.seq-b.seq).map(e=>({cap:eventText(e),role:statusRole(e),note:JSON.stringify(e.facts||{})==='{}'?'No additional facts recorded':Object.entries(e.facts).map(([k,v])=>`${titleCase(k)}: ${words(v)}`).join(' · '),time:stamp(T,e.utc,false)}));
      out.push(gcard(gh('Return & Closure Trace'),!detected?el('p',{class:'mn-hint'},'No return evidence recorded'):null,trace(te,{withNote:true})));
      const idx=detected?r.events.indexOf(detected):-1,prev=idx>0?r.events[idx-1]:null,from=detected?(detected.platform||NB):NB,cs=r.closureConfirmed?'CONFIRMED':cInt?'INTERRUPTED':cStart?'STARTED — NOT COMPLETED':'NOT RECORDED';
      const cards=[['Return Detail',[['Detected at',st(detected)],['Returned from',from],['Previous state',prev?eventText(prev):NB],['Verification',r.returnVerified?'VERIFIED':'NOT RECORDED'],['Callback result',outc||NB]]],['Verification Detail',[['Return detected',st(detected)],['Visual confirming',st(visual)],['Return verifying',st(verifying)],['Return verified',st(verified)]]],['Closure Detail',[['Closure started',st(cStart)],['Closure state',cs],['Closed at',r.closed?st(closedE):NB],['Closure result',outc||fin],['Episode duration',NB]]]];
      out.push(el('div',{class:'mn-g3'},cards.map(([t,pairs])=>gcard(gh(t),...pairs.map(([c,v])=>field(c,v))))));
      out.push(gcard(gh('Recovery Ledger'),rc.length?grid(['#','Time','Event','State','Platform / Context','Detail'],rc.map((e,i)=>[String(e.seq||i+1),stamp(T,e.utc,false),eventText(e),el('span',{class:'mn-status'},dot(statusRole(e),true),analysisPill(e)[1].toUpperCase()),e.platform||NB,JSON.stringify(e.facts||{})==='{}'?'No additional facts recorded':Object.entries(e.facts).map(([k,v])=>`${titleCase(k)}: ${words(v)}`).join(' · ')])):el('p',{class:'mn-hint'},'No return evidence recorded')));return out;},
    about(){const out=[...sec('About MINE')];
      out.push(gcard(el('h3',{class:'mn-big'},'MINE'),el('b',{class:'mn-sub'},'Messaging Intervention Nudge Escalation'),el('p',{class:'mn-p'},'MINE observes qualifying messaging activity and provides structured interventions when messaging use continues during a MYELIN session. The MINE Main Station presents factual episode activity, history, return and closure information, helping users recognize extended messaging interruptions and return to their intended task.')));
      const chain=el('div',{class:'mn-aflow'});MINE.SHOWCASE_MINE_ABOUT_FLOW.forEach((s,i)=>{if(i)chain.append(el('span',{class:'mn-arr'},'→'));chain.append(el('span',{class:'mn-fn'},s));});
      out.push(gcard(gh('How MINE Works'),el('p',{class:'mn-hint'},'From messaging detection to episode closure.'),chain,...MINE.SHOWCASE_MINE_ABOUT_TIMING.map(t=>el('p',{class:'mn-hint sm'},t))));
      out.push(el('div',{class:'mn-g2'},gcard(gh('Purpose'),...MINE.SHOWCASE_MINE_ABOUT_PURPOSE.map(bullet)),gcard(gh('MINE Main Station'),el('p',{class:'mn-hint'},'The analysis dashboard provides a complete view of each episode.'),...MINE.SHOWCASE_MINE_ABOUT_TABS.map(([a,b])=>el('div',{class:'mn-at'},el('b',{},a),el('span',{},b))))));
      out.push(gcard(gh('Scientific Boundary'),el('p',{class:'mn-hint'},'Important limitations and scope.'),note('MINE records behavioral and computer-resource evidence. It does not directly measure attention, dopamine, brain activity, addiction, or other neural states.','amber'),el('p',{class:'mn-hint'},'MINE is a behavioral observation tool, not a medical device. All interpretations are based on observable digital behavior only.')));
      const ver=[['Project','MYELIN Web Lite v1'],['Module','MINE Main Station'],['Dashboard type','Read-only analysis'],['Durable data source',getModel().imported?getModel().src.durable:'browser-local MINE events'],['Live data source',getModel().imported?getModel().src.live:'browser-local MINE runtime'],['Status',getModel().imported?getModel().src.status:'Browser-contained simulation']];
      out.push(gcard(gh('Version & System Information'),el('p',{class:'mn-hint'},'Module details and configuration.'),...ver.map(([c,v])=>field(c,v))));return out;}};
  function chrome(){const r=cur();root.querySelector('#mnSub').textContent=r?r.id:evMsg;root.querySelector('#mnFoot').textContent=r?`${r.events.length} recorded steps`:'No recorded episode selected';
    const ex=root.querySelector('#mnExport'),can=!!getModel().episodes.some(e=>e.closed);ex.disabled=!can;ex.title=can?'Export the latest completed MINE episode as a printable report':'A completed durable MINE episode is required.';}
  function render(){if(!root)return;chrome();[...root.querySelectorAll('.mn-tab')].forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});const top=body.scrollTop;body.replaceChildren(...views[tab]().filter(Boolean));body.scrollTop=top;}
  function close(){if(!root)return;document.removeEventListener('keydown',onKey,true);root.remove();root=null;body=null;(opener&&opener.isConnected?opener:null)?.focus();opener=null;}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.key==='Tab'&&root){const f=[...root.querySelectorAll('button,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}}
  function open(from){if(root){root.querySelector('.glass-close')?.focus();return;}opener=from||document.activeElement;sel=sel&&getModel().episodes.some(e=>e.key===sel)?sel:(getModel().latest?.key||null);
    const closeBtn=button('',close,{class:'glass-close','aria-label':'Close MINE Deep Analysis'});closeBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const tabs=el('div',{class:'mn-tabs',role:'tablist','aria-label':'MINE Deep Analysis sections'},TABS.map(([k,t],i)=>{const b=el('button',{type:'button',class:'mn-tab',role:'tab','data-tab':k,on:{click:()=>{tab=k;render();}}},t.toUpperCase());b.addEventListener('keydown',e=>{const n=e.key==='ArrowRight'?(i+1)%TABS.length:e.key==='ArrowLeft'?(i+TABS.length-1)%TABS.length:null;if(n!==null){e.preventDefault();tab=TABS[n][0];render();tabs.children[n].focus();}});return b;}));
    body=el('div',{class:'mn-body',id:'mnBody',role:'tabpanel',tabindex:'-1'});
    const icon=el('span',{class:'mn-icon','aria-hidden':'true'});icon.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>';
    root=el('div',{class:'glass-overlay open mn-dash',id:'mnDash',role:'dialog','aria-modal':'true','aria-labelledby':'mnTitle'},el('div',{class:'glass-panel mn-panel'},
      el('div',{class:'mn-head'},icon,el('div',{class:'mn-titles'},el('b',{id:'mnTitle'},'MINE — DEEP ANALYSIS'),el('span',{id:'mnSub'},'Evidence not loaded')),el('div',{class:'mn-centre'},'Messaging Intervention Nudge Escalation'),button('REFRESH',()=>render(),{class:'btn-block outline sm',id:'mnDashRefresh'}),button('EXPORT PDF',actions.export,{class:'btn-block outline sm',id:'mnExport'}),closeBtn),
      tabs,body,el('div',{class:'mn-foot'},sp('','MINE · Durable episode analysis'),el('span',{class:'mono',id:'mnFoot'},'Evidence unavailable'))));
    root.addEventListener('mousedown',e=>{if(e.target===root)close();});document.body.append(root);document.addEventListener('keydown',onKey,true);render();closeBtn.focus();}
  return {open,close,refresh:render,get isOpen(){return !!root;}};
}
