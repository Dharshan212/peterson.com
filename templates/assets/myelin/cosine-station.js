// COSINE page + "COSINE — Deep Analysis" glass overlay (CONTROL_STATION/application.py CosineLivePage / CosineDeepAnalysisDialog).
// Same blocks, wording, states and seven tabs as the desktop. Every value is derived from this browser's accepted COSINE events (the web has no read model):
// nothing is estimated, an unrecorded fact reads as unrecorded, and an empty history reads exactly like the desktop's empty database.
import {el,button} from './dom.js';
import {SURFACES} from './simulator.js';
import {COS} from './cosine-data.js';
const EV=COS.COSINE_EVENT_LABELS,OUT=COS.COSINE_OUTCOME_LABELS,REASON=COS.COSINE_CLOSURE_REASON_LABELS,CLS=COS.COSINE_EVENT_CLASS_LABELS,CHOICE=COS.COSINE_CHOICE_LABELS,STATE=COS.COSINE_STATE_LABELS;
const KEEP=new Set(['COSINE','SINE','OTT','UTC','MYELIN']);
const human=t=>String(t||'').replaceAll('_',' ').split(/\s+/).filter(Boolean).map(w=>KEEP.has(w.toUpperCase())?w:w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
const evLabel=n=>EV[n]||human(n),outLabel=o=>!o?'—':OUT[o]||human(o),reasonLabel=r=>!r?'—':REASON[r]||human(r),clsLabel=c=>CLS[c]||human(c),choiceLabel=c=>!c?'—':CHOICE[c]||human(c);
const titleOf=id=>{const s=Object.values(SURFACES).find(v=>v.resourceId===id);return s?s.label:null;};
const platformOf=id=>{const s=Object.values(SURFACES).find(v=>v.resourceId===id);return s?(s.platform||null):null;};
const keyOf=l=>String(l||'').toLowerCase().replace(/\s+/g,'_');
export function fmtDelta(s){if(!Number.isFinite(s)||s<1)return '';const t=Math.round(s);if(t<60)return `${t}s`;const m=Math.floor(t/60),r=t%60;if(m<60)return r?`${m}m ${r}s`:`${m}m`;const h=Math.floor(m/60),mm=m%60;return mm?`${h}h ${mm}m`:`${h}h`;}
const payloadText=p=>{const e=Object.entries(p||{});return e.length?e.map(([k,v])=>`${k}: ${v}`).join(' · '):'—';};

/* ---------------- model ---------------- */
function mapEvent(e,ctx){const t=e.type,pl=e.payload||{},st=pl.stage;
  const req={INTENT_GATE:'INTENT_GATE_REQUESTED',DURATION:'DURATION_REQUESTED',BREAK_ACK:'BREAK_ACK_REQUESTED',FINAL_CALLBACK:'FINAL_CALLBACK_REQUESTED'},dis={INTENT_GATE:'INTENT_GATE_DISPLAYED',BREAK_ACK:'BREAK_ACK_DISPLAYED',FINAL_CALLBACK:'FINAL_CALLBACK_DISPLAYED'};
  switch(t){
    case 'EPISODE_STARTED':return [{name:'COSINE_SESSION_STARTED',cls:'OBSERVED'},{name:'OTT_PLATFORM_ENTERED',cls:'OBSERVED'},{name:'CONTENT_OBSERVED',cls:'OBSERVED',title:titleOf(e.resourceId)}];
    case 'POPUP_REQUESTED':{if(!req[st])return [];const out=[];if(st==='DURATION'&&ctx.choice==='RETURN_INTENTION')out.push({name:'RETURN_INTENT_CONVERTED_TO_BREAK',cls:'DERIVED'});out.push({name:req[st],cls:'PRESENTATION'});return out;}
    case 'STAGE_DISPLAYED':return dis[st]?[{name:dis[st],cls:'PRESENTATION'}]:[];
    case 'INTENT_CHOSEN':if(pl.choice==='RETURN'){ctx.choice='RETURN_INTENTION';return [{name:'RETURN_INTENT_RECORDED',cls:'USER_ACTION'},{name:'RETURN_INTENT_WINDOW_STARTED',cls:'DERIVED'}];}ctx.choice='INTENTIONAL_BREAK';return [{name:'BREAK_INTENT_RECORDED',cls:'USER_ACTION'}];
    case 'BREAK_COMMITTED':ctx.minutes=Math.round((pl.seconds||0)/60);return [{name:'BREAK_DURATION_COMMITTED',cls:'USER_ACTION',payload:{duration_minutes:ctx.minutes}},{name:'BREAK_STARTED',cls:'DERIVED'}];
    case 'BREAK_ACKNOWLEDGED':return [{name:'BREAK_ACKNOWLEDGED',cls:'USER_ACTION'}];
    case 'BREAK_COMPLETED':return [{name:'BREAK_DEADLINE_REACHED',cls:'DERIVED'}];
    case 'RETURN_STARTED':return [{name:'RETURN_CANDIDATE_STARTED',cls:'OBSERVED'}];
    case 'RETURN_VERIFIED':return [{name:'RETURN_VERIFICATION_COMPLETED',cls:'OBSERVED'},{name:'CLOSURE_CONFIRMATION_STARTED',cls:'DERIVED'}];
    case 'RETURN_INTERRUPTED':return [{name:'RETURN_VERIFICATION_INTERRUPTED',cls:'OBSERVED',payload:{reason:pl.reason}}];
    case 'RELAPSE':return [{name:'CLOSURE_CONFIRMATION_INTERRUPTED',cls:'OBSERVED',payload:{reason:pl.reason}}];
    case 'RECOVERY_CONFIRMED':return [{name:'RETURN_CONFIRMED',cls:'DERIVED'}];
    case 'EPISODE_CLOSED':return [{name:'COSINE_SESSION_CLOSED',cls:'DERIVED',closed:pl.outcome}];
    case 'PLATFORM_CHANGED':return [{name:'HOPPER_TRANSITION',cls:'OBSERVED',platform:pl.to,payload:{from_platform:keyOf(pl.from),to_platform:keyOf(pl.to)},hop:{from:pl.from,to:pl.to}},{name:'CONTENT_OBSERVED',cls:'OBSERVED',title:titleOf(e.resourceId)}];
    default:return [];}}
export function cosineModel(snaps,live){
  const sessions=snaps.filter(s=>s.session).slice().sort((a,b)=>String(a.session.startedAt).localeCompare(String(b.session.startedAt))),rows=[];
  sessions.forEach((snap,si)=>{const cos=(snap.events||[]).filter(e=>e.organ==='COSINE');let gen=0;
    cos.filter(e=>e.type==='EPISODE_STARTED').forEach(start=>{const id=start.episodeId,es=cos.filter(e=>e.episodeId===id).sort((a,b)=>a.sequence-b.sequence),ctx={choice:null,minutes:null},events=[];
      const startP=platformOf(start.resourceId)||'Unknown';let curP=startP;
      for(const e of es)for(const m of mapEvent(e,ctx)){const label=m.platform||(e.type==='PLATFORM_CHANGED'?e.payload.to:curP);if(m.name==='HOPPER_TRANSITION')curP=label;events.push({name:m.name,cls:m.cls,utc:e.utc,eff:e.effectiveSeconds,platform:label,platformKey:keyOf(label),payload:m.payload||{},title:m.title||null,hop:m.hop,closed:m.closed,request:e.payload?.requestId||e.payload?.attemptId||null});}
      events.forEach((x,i)=>{x.seq=i+1;});
      const closeE=es.find(e=>e.type==='EPISODE_CLOSED'),raw=closeE?.payload?.outcome,cb=events.some(x=>x.name==='FINAL_CALLBACK_DISPLAYED');
      let reason=null,outcome=null;if(closeE){if(raw==='RETURNED'){reason='RETURN_CONFIRMED';outcome=cb?'RETURNED_AFTER_CALLBACK':ctx.choice==='RETURN_INTENTION'?'RETURNED_AFTER_INTENT':'EARLY_RETURN';}else{reason=raw==='ENDED'?'STOPPED':String(raw||'NOT_ENOUGH_INFORMATION');outcome='INCOMPLETE';}}
      const hops=events.filter(x=>x.name==='HOPPER_TRANSITION').map(x=>({to:x.platformKey,label:x.platform,utc:x.utc}));gen++;
      const isLive=!!live&&live.episodeId===id&&live.sessionId===snap.session.id;
      rows.push({key:`${snap.session.id}|${id}`,episodeId:id,sessionNo:si+1,generation:gen,startedUtc:start.utc,endedUtc:closeE?.utc||null,closed:!!closeE,reason,outcome,startKey:keyOf(startP),startLabel:startP,userChoice:ctx.choice==='BREAK'?'INTENTIONAL_BREAK':ctx.choice,minutes:ctx.minutes,hops,hopperCount:hops.length,events,eventCount:events.length,live:isLive});});});
  rows.sort((a,b)=>String(a.startedUtc).localeCompare(String(b.startedUtc)));const perDay={};
  rows.forEach(r=>{const d=new Date(r.startedUtc),key=Number.isFinite(+d)?`${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCMonth()+1).padStart(2,'0')}${d.getUTCFullYear()}`:'00000000';perDay[key]=(perDay[key]||0)+1;r.id=`COS-${key}-${String(perDay[key]).padStart(2,'0')}`;});
  const episodes=rows.slice().reverse(),count=n=>episodes.reduce((s,e)=>s+e.events.filter(x=>x.name===n).length,0);
  return {episodes,latest:episodes[0]||null,overview:{captured:episodes.length,confirmed:count('RETURN_CONFIRMED'),breaks:count('BREAK_STARTED'),usual:'UNAVAILABLE',usualReason:'Phase 2 definition not certified'},generatedAt:new Date().toISOString()};}
export const choiceText=r=>{const conv=r.events.some(x=>x.name==='RETURN_INTENT_CONVERTED_TO_BREAK');if(r.userChoice==='INTENTIONAL_BREAK')return r.minutes!=null?`Intentional break · ${r.minutes} min`:'Intentional break';if(r.userChoice==='RETURN_INTENTION')return conv?(r.minutes!=null?`Return intention → converted · ${r.minutes} min break`:'Return intention → converted'):'Return intention';return null;};

/* ---------------- journey grouping (cosine_build_groups / cosine_describe_group) ---------------- */
function stageKey(e){const n=e.name;
  if(['COSINE_SESSION_STARTED','OTT_PLATFORM_ENTERED','CONTENT_OBSERVED','HOPPER_TRANSITION'].includes(n))return `platform:${e.platformKey}`;
  if(n.startsWith('INTENT_GATE_'))return 'gate';
  if(['RETURN_INTENT_RECORDED','BREAK_INTENT_RECORDED','RETURN_INTENT_WINDOW_STARTED'].includes(n))return 'choice';
  if(n==='RETURN_INTENT_CONVERTED_TO_BREAK')return 'converted';
  if(['DURATION_REQUESTED','BREAK_DURATION_COMMITTED'].includes(n))return 'duration';
  if(n==='BREAK_STARTED'||n.startsWith('BREAK_ACK'))return 'break';
  if(n==='BREAK_DEADLINE_REACHED')return 'deadline';
  if(['FINAL_CALLBACK_REQUESTED','FINAL_CALLBACK_DISPLAYED'].includes(n))return 'callback';
  if(n==='RETURN_CANDIDATE_STARTED'||n==='FINAL_CALLBACK_HIDDEN_FOR_FOCUS'||n==='FINAL_CALLBACK_RESTORED_AFTER_RELAPSE'||n.startsWith('RETURN_VERIFICATION_')||n.startsWith('CLOSURE_CONFIRMATION_'))return 'verify';
  if(n==='RETURN_CONFIRMED')return 'confirmed';
  if(n==='COSINE_SESSION_CLOSED')return 'closed';
  return 'other';}
export function buildGroups(r){const groups=[];let cur=null;for(const e of r.events){const k=stageKey(e);if(!cur||cur.key!==k){cur={key:k,events:[]};groups.push(cur);}cur.events.push(e);}return groups;}
function describe(g,r){const key=g.key,ev=g.events,has=n=>ev.some(e=>e.name===n),count=n=>ev.filter(e=>e.name===n).length;
  if(key.startsWith('platform:'))return ['platform',ev[0].platform,has('COSINE_SESSION_STARTED')?'Episode started':has('HOPPER_TRANSITION')?'Hopper switch':'Platform recorded'];
  if(key==='gate')return ['intent','Intent Gate','COSINE asked what you wanted next'];
  if(key==='choice')return ['intent',r.userChoice==='INTENTIONAL_BREAK'?'Intentional Break':'Return Intention','Recorded user choice'];
  if(key==='converted')return ['intent','Intention Converted','Return window elapsed'];
  if(key==='duration')return ['intent',r.minutes!=null?`${r.minutes} min Break`:'Break Committed','Duration you entered'];
  if(key==='break')return ['intent','Break Started','Started and acknowledged'];
  if(key==='deadline')return ['intent','Break Deadline','Callback prepared'];
  if(key==='callback')return ['intent','Final Callback','One logical callback'];
  if(key==='verify'){const intr=count('RETURN_VERIFICATION_INTERRUPTED')+count('CLOSURE_CONFIRMATION_INTERRUPTED'),rest=count('FINAL_CALLBACK_RESTORED_AFTER_RELAPSE'),done=count('RETURN_VERIFICATION_COMPLETED');
    if(intr||rest){const bits=[];if(intr)bits.push(`${intr} interruption${intr>1?'s':''}`);if(rest)bits.push(`${rest} restore${rest>1?'s':''}`);if(done)bits.push(`${done} verified`);return ['verify','Return / Relapse Loop',bits.join(' · ')];}
    return ['verify','Return Verified',done?'Verification completed':'Return candidate observed'];}
  if(key==='confirmed')return ['outcome',r.outcome?outLabel(r.outcome):'Return Confirmed','Recorded closure outcome'];
  if(key==='closed')return ['outcome','Closed',r.reason?`Reason ${reasonLabel(r.reason)}`:'Episode closed'];
  return ['verify',evLabel(ev[0].name),`${ev.length} events`];}

/* ---------------- dom helpers ---------------- */
const sp=(cls,...k)=>el('span',{class:cls},...k);
const chip=(text,tone)=>el('span',{class:`cx-chip${tone?' '+tone:''}`},text);
const dot=(tone,size)=>el('i',{class:`cx-dot ${tone}${size?' '+size:''}`,'aria-hidden':'true'});
const ARROW='<svg viewBox="0 0 22 8" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 4h16" stroke-dasharray="3 2"/><path d="M14 1l4 3-4 3"/></svg>';
const ICONS={switch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg>',loop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"/></svg>',ret:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>'};
const arrowEl=d=>{const a=el('div',{class:'cx-arrow'},el('span',{}),sp('',d||''));a.firstChild.innerHTML=ARROW;return a;};
const iconEl=k=>{const i=el('div',{class:'cx-ico'});i.innerHTML=ICONS[k];return i;};
const class_tag=c=>el('span',{class:`cx-tag ${c}`},clsLabel(c));
export function journeyStrip(r,T){const groups=buildGroups(r),box=el('div',{class:'cx-strip'});
  groups.forEach((g,i)=>{const [fam,title,sub]=describe(g,r),first=g.events[0],last=g.events[g.events.length-1],cover=g.events.length===1?`#${first.seq} · 1 ev`:`#${first.seq}–${last.seq} · ${g.events.length} ev`;
    if(i){const prev=groups[i-1].events[groups[i-1].events.length-1];box.append(arrowEl(fmtDelta(first.eff-prev.eff)));
      const icon=fam==='platform'&&g.events.some(e=>e.name==='HOPPER_TRANSITION')?'switch':title==='Return / Relapse Loop'?'loop':fam==='outcome'&&g.key==='confirmed'?'ret':null;if(icon){box.append(iconEl(icon));box.append(arrowEl(''));}}
    box.append(el('div',{class:`cx-node ${fam}`},sp('cover',cover),sp('fam',fam.toUpperCase()),sp('ttl',title),sp('sub',sub),sp('stamp',T.time(first.utc))));});
  return box;}
const LEGEND=[['Platform','platform'],['Intent / intervention','intent'],['Return verification','verify'],['Outcome','outcome']];
const legend=()=>el('div',{class:'cx-legend'},LEGEND.map(([t,f])=>el('span',{},el('i',{class:`cx-sw ${f}`}),t)));
const CHRONO='Connector values are plain elapsed wall-clock between two recorded UTC event timestamps, shown as neutral chronology only. They are not COSINE credited time and are never summed or aggregated.';
const goodOutcome=o=>o==='RETURNED_AFTER_INTENT'||o==='RETURNED_AFTER_CALLBACK';

/* ---------------- COSINE page ---------------- */
export function buildCosinePage({model,live,T,state,actions}){
  const m=model,cur=m.episodes.find(e=>e.key===state.sel)||m.latest;
  const msg=m.episodes.length?'Recorded evidence available.':'No captured COSINE episodes.';
  const top=el('div',{class:'cx-top'},el('div',{},el('div',{class:'cx-top-t'},dot('teal','big'),el('h1',{},'COSINE — STREAMING REGULATION')),el('p',{},'Choice-Oriented Streaming Insight and Navigation Engine')),el('div',{class:'cx-top-a'},button('REFRESH',actions.refresh,{class:'btn-block outline',id:'cxRefresh'}),button('OPEN ANALYSIS',actions.open,{class:'cx-open',id:'cxOpen'})));
  const sb=live.active?['COSINE episode active','Live Status',live.paused?'PAUSED':'ACTIVE',true]:!live.available?['Evidence unavailable','','UNAVAILABLE',false]:['No active episode','','INACTIVE',false];
  const strip=el('div',{class:`episode-banner${sb[3]?' ok':''}`,id:'cxBanner'},el('div',{},el('div',{class:`episode-status-lbl${sb[3]?' ok-dot':''}`},sp('episode-status-dot'),'Episode'),el('div',{class:'episode-status-value',style:'font-size:16px'},sb[0])),el('div',{class:'episode-outcome'},sb[1]?el('div',{class:'lbl'},sb[1]):null,el('div',{class:'val'},sb[2])));
  let banner;
  if(live.active){const facts=[['State',live.state,false],['Break chosen',live.minutes!=null?`${live.minutes} min`:'—',live.minutes==null],['Platform switches',String(live.hops),false],['Global pause',live.paused?'Paused':'Not paused',false]];
    banner=bannerCard('CURRENT EPISODE',live.platform||'—',[chip(live.state)],'Factual live snapshot · durable history remains separate',facts);}
  else if(cur){const rec=cur.endedUtc||cur.startedUtc,ch=choiceText(cur),facts=[['Your choice',ch||'No choice recorded',!ch],['Platform switches',cur.hopperCount?`${cur.hopperCount} recorded`:'None recorded',!cur.hopperCount],['Closure reason',reasonLabel(cur.reason),false],['Recorded',`${T.day(rec)} · ${T.time(rec)}`,false]];
    banner=bannerCard('RECENT EPISODE',cur.startLabel,[chip(cur.closed?'CLOSED':'OPEN EVIDENCE'),cur.outcome?chip(outLabel(cur.outcome).toUpperCase(),goodOutcome(cur.outcome)?'teal':'indigo'):null],cur.id,facts);}
  else banner=el('div',{class:'cx-empty'},chip('EMPTY','amber'),el('b',{},msg),el('span',{},'COSINE evidence will appear here when available.'));
  const o=m.overview,tiles=[['Captured Episodes',String(o.captured),'Distinct episodes in the database snapshot','teal',false],['Confirmed Returns',String(o.confirmed),'Return confirmed events recorded','green',false],['Breaks Started',String(o.breaks),'Break started events recorded','indigo',false],['Usual Return',o.usual,o.usualReason,'plain',true]];
  const metrics=el('div',{class:'cx-metrics'},tiles.map(([c,v,s,tone,un])=>el('div',{class:`cx-tile ${tone}`},el('div',{class:`cx-num${un?' un':''}`},v),el('b',{},c.toUpperCase()),el('span',{},s))));
  const cap=el('p',{class:'cx-cap'},'DATABASE SNAPSHOT COUNTS · NOT A DATED WINDOW');
  const parts=[top,strip,banner,metrics,cap];
  if(cur){
    const path=[[cur.startKey,cur.startLabel],...cur.hops.map(h=>[h.to,h.label])],pcard=el('section',{class:'card cx-card'},el('div',{class:'cx-card-h'},el('h2',{},'Platform Behaviour')),el('p',{class:'cx-k'},'PLATFORM PATH'),...path.flatMap(([k,l],i)=>[i?el('span',{class:'cx-down'},'↓'):null,el('div',{class:'cx-pn'},el('b',{},l),sp('',k))]).filter(Boolean),el('hr',{}),el('div',{class:'cx-hops'},el('b',{},String(cur.hopperCount)),el('span',{},'RECORDED HOPPER TRANSITIONS')),chip('TIME METRICS HELD · chronology + switch counts only','amber'));
    const evs=cur.events.slice().reverse().slice(0,7),ecard=el('section',{class:'card cx-card'},el('div',{class:'cx-card-h'},el('h2',{},'Latest Events'),sp('cx-sub',`Last ${evs.length} of ${cur.eventCount} recorded`)),...evs.map(e=>el('div',{class:'cx-ev'},dot(e.cls.toLowerCase()),el('div',{class:'cx-ev-b'},el('b',{},evLabel(e.name)),el('div',{},class_tag(e.cls),sp('cx-mono',T.time(e.utc)))),sp('cx-mono cx-seq',`#${e.seq}`))));
    parts.push(el('div',{class:'cx-two'},pcard,ecard));
    const groups=buildGroups(cur),covered=groups.reduce((s,g)=>s+g.events.length,0),total=cur.eventCount;
    const tgl=button(state.fullFlow?`Hide all ${total} events`:`Show all ${total} events`,()=>{state.fullFlow=!state.fullFlow;actions.rerender();},{class:'cx-btn sm',id:'cxToggle','aria-expanded':String(!!state.fullFlow)});
    const entries=[];if(cur.hopperCount)entries.push([`${cur.hopperCount} Hopper transition${cur.hopperCount>1?'s':''}`,'indigo']);const ch=choiceText(cur);if(ch)entries.push([ch,'amber']);
    const intr=cur.events.filter(e=>e.name==='RETURN_VERIFICATION_INTERRUPTED'||e.name==='CLOSURE_CONFIRMATION_INTERRUPTED').length,rest=cur.events.filter(e=>e.name==='FINAL_CALLBACK_RESTORED_AFTER_RELAPSE').length;
    if(rest)entries.push([`${rest} callback restore${rest>1?'s':''}`,'violet']);if(intr)entries.push([`${intr} interruption${intr>1?'s':''} in episode`,'violet']);if(cur.outcome)entries.push([outLabel(cur.outcome),'teal']);if(cur.reason)entries.push([reasonLabel(cur.reason),'muted']);
    const flow=el('section',{class:'card cx-card cx-flow',id:'cxFlow'},el('div',{class:'cx-card-h'},el('h2',{},'Recent Episode Flow'),sp('cx-sub','Real recorded order · never re-sequenced')),
      el('div',{class:'cx-bar'},sp('',`${total} recorded events · condensed into ${groups.length} milestones · nothing dropped (${covered}/${total} covered)`),tgl),
      el('p',{class:'cx-sess'},`${cur.id}  ·  ${total} recorded events  ·  ${groups.length} milestones  ·  ${outLabel(cur.outcome)}`),journeyStrip(cur,T),el('div',{class:'cx-chips'},entries.map(([t,tone])=>chip(t,tone))),legend(),el('p',{class:'cx-chrono'},CHRONO));
    if(state.fullFlow){const list=el('div',{class:'cx-all'},cur.events.map(e=>el('div',{class:'cx-ev cx-allrow'},sp('cx-mono cx-seq',`#${e.seq}`),el('b',{},evLabel(e.name)),el('div',{class:'cx-r'},sp('cx-mono',T.time(e.utc)),class_tag(e.cls)))));
      flow.append(el('hr',{}),el('h3',{class:'cx-allh'},`ALL ${total} RECORDED EVENTS`),el('p',{class:'cx-hint'},'Real sequence, real event name, real class, real UTC timestamp. Nothing re-ordered. Full recorded event sequence.'),list);}
    parts.push(flow);}
  else{
    /* no episode yet: the same three frames the desktop draws, each with its honest empty text */
    const pcard=el('section',{class:'card cx-card',id:'cxPlatform'},el('div',{class:'cx-card-h'},el('h2',{},'Platform Behaviour')),el('p',{class:'cx-k'},'PLATFORM PATH'),el('p',{class:'cx-hint cx-none'},'No platform path recorded'),el('hr',{}),el('div',{class:'cx-hops'},el('b',{},'0'),el('span',{},'RECORDED HOPPER TRANSITIONS')),chip('TIME METRICS HELD \u00b7 chronology + switch counts only','amber'));
    const ecard=el('section',{class:'card cx-card',id:'cxEvents'},el('div',{class:'cx-card-h'},el('h2',{},'Latest Events'),sp('cx-sub','Last 0 of 0 recorded')),el('p',{class:'cx-hint cx-none'},'No recorded events'));
    parts.push(el('div',{class:'cx-two'},pcard,ecard));
    const tgl=button('Show all 0 events',()=>{},{class:'cx-btn sm',id:'cxToggle'});tgl.disabled=true;
    parts.push(el('section',{class:'card cx-card cx-flow',id:'cxFlow'},el('div',{class:'cx-card-h'},el('h2',{},'Recent Episode Flow'),sp('cx-sub','Real recorded order \u00b7 never re-sequenced')),
      el('div',{class:'cx-bar'},sp('','0 recorded events \u00b7 condensed into 0 milestones \u00b7 nothing dropped (0/0 covered)'),tgl),
      el('div',{class:'cx-strip'},el('p',{class:'cx-hint cx-none'},'No recorded episode flow')),legend(),el('p',{class:'cx-chrono'},CHRONO)));}
  return el('div',{class:'mh-wrap cx-page','aria-label':'COSINE'},...parts);
  function bannerCard(kicker,name,chips,ident,facts){return el('div',{class:'cx-banner'},el('div',{class:'cx-bl'},sp('cx-kick',kicker),el('div',{class:'cx-bn'},el('b',{},name),...chips.filter(Boolean)),sp('cx-ident',ident)),el('div',{class:'cx-facts'},facts.map(([k,v,mu])=>el('div',{},sp('k',k.toUpperCase()),el('b',{class:mu?'mu':''},v)))));}
}

/* ---------------- Deep Analysis overlay ---------------- */
const TABS=[['overview','Overview'],['episodes','Episodes'],['intent','Intent'],['ret','Return'],['hopper','Hopper'],['evidence','Evidence'],['about','About']];
export function createCosineAnalysis({getModel,T,state,actions}){
  let root=null,tab='overview',opener=null,body=null;
  const cur=()=>{const m=getModel();return m.episodes.find(e=>e.key===state.sel)||null;},sel=()=>{const m=getModel();return m.episodes.find(e=>e.key===state.sel)||m.latest;};
  const sec=(t,h)=>[el('h2',{class:'cx-sec'},t.toUpperCase()),h?el('p',{class:'cx-hint'},h):null],note=(t,amber)=>el('div',{class:`cx-note${amber?' amber':''}`},t);
  const kv=(items,cols=4)=>el('div',{class:'cx-kv',style:`--cols:${cols}`},items.map(([k,v,tone])=>el('div',{class:'cx-kvt'},el('span',{},String(k).toUpperCase()),el('b',{class:tone||''},String(v)))));
  const table=(headers,rows,tints)=>el('div',{class:'cx-tw'},el('table',{class:'cx-table'},el('thead',{},el('tr',{},headers.map(h=>el('th',{},h.toUpperCase())))),el('tbody',{},rows.map((r,i)=>el('tr',{class:tints?.[i]||''},r.map(c=>el('td',{},c)))))));
  const display=r=>r.id;
  const views={
    overview(){const m=getModel(),o=m.overview,out=[...sec('COSINE snapshot','Counts supplied by the durable COSINE projection.')];
      out.push(kv([['Captured episodes',o.captured],['Confirmed returns',o.confirmed],['Breaks started',o.breaks],['Usual return',o.usual,'unavail']]));
      const r=sel();if(!r){out.push(note(m.episodes.length?'Recorded evidence available.':'No captured COSINE episodes.'));return out;}
      out.push(...sec('Selected episode','Every value below is read verbatim from recorded evidence.'));
      const ch=choiceText(r);out.push(kv([['Episode',display(r)],['Starting platform',r.startLabel],['Closure reason',reasonLabel(r.reason)],['Closure outcome',outLabel(r.outcome)],['Recorded choice',ch||'No choice recorded',ch?'':'none'],['Break chosen',r.minutes!=null?`${r.minutes} min`:'No break',r.minutes!=null?'':'none'],['Hopper transitions',r.hopperCount],['Event count',r.eventCount]]));return out;},
    episodes(){const m=getModel(),out=[...sec('All captured episodes','Incomplete means the episode ended without a recorded completion outcome; it is not a failure grade.')];
      const zone=`Display timezone: ${T.tag()}`;out.push(el('p',{class:'cx-hint'},zone));
      const selKey=sel()?.key,rows=[],tints=[];
      m.episodes.forEach(r=>{const ch=choiceText(r),tone=goodOutcome(r.outcome)?'teal':r.outcome==='HANDOVER'?'amber':'indigo',open=state.flowFor===r.key,rec=r.endedUtc||r.startedUtc;
        const b=button(open?'HIDE MAP':'VIEW MAP',()=>{state.flowFor=open?null:r.key;state.sel=r.key;actions.rerender();render();},{class:'cx-btn sm','aria-label':`${open?'Hide':'View'} the journey map for ${r.id}`,title:"Show this episode's journey map"});
        rows.push([r.id,String(r.sessionNo),String(r.generation),r.startLabel,ch||'None recorded',r.minutes!=null?`${r.minutes} min`:'—',String(r.hopperCount),reasonLabel(r.reason),chip(outLabel(r.outcome),tone),String(r.eventCount),T.day(rec),T.time(rec),b]);tints.push(r.key===selKey?'sel':'');});
      out.push(table(['Episode','Session','Gen','Start platform','Recorded choice','Break','Hops','Closure reason','Outcome','Events','Date','Time','Map'],rows,tints));
      const f=m.episodes.find(e=>e.key===state.flowFor);if(f){const groups=buildGroups(f),covered=groups.reduce((s,g)=>s+g.events.length,0);
        out.push(...sec(`Episode flow — ${display(f)}`,`${f.eventCount} recorded events · condensed into ${groups.length} milestones · nothing dropped (${covered}/${f.eventCount} covered) · ${outLabel(f.outcome)}`),journeyStrip(f,T),legend(),el('p',{class:'cx-chrono'},CHRONO));}
      out.push(note('Only the starting platform is shown. Choosing a single representative platform for a multi-platform episode needs a rule that does not exist yet, so none is invented here.'));return out;},
    intent(){const m=getModel(),out=[...sec('Recorded intent','Durable user-action evidence only. A recorded choice is what the person chose — it is not proof of what followed.')],withI=m.episodes.filter(e=>e.userChoice);
      out.push(table(['Episode','Choice event','Recorded choice','Converted','Break committed','Later outcome','Time (UTC)'],withI.map(r=>{const ev=r.events.find(x=>x.name==='BREAK_INTENT_RECORDED')||r.events.find(x=>x.name==='RETURN_INTENT_RECORDED'),conv=r.events.some(x=>x.name==='RETURN_INTENT_CONVERTED_TO_BREAK');return [display(r),evLabel(ev.name),choiceLabel(r.userChoice),conv?'Converted':'—',r.minutes!=null?`${r.minutes} min`:'—',outLabel(r.outcome),new Date(ev.utc).toISOString().slice(11,19)];})));
      const without=m.episodes.filter(e=>!e.userChoice);out.push(...sec('Episodes with no recorded choice',`${without.length} of ${m.episodes.length} episodes never reached a recorded choice. They are not failures and must never be counted as refusals.`),kv(without.map(r=>[display(r),r.reason?(r.outcome?`${reasonLabel(r.reason)} · ${outLabel(r.outcome)}`:reasonLabel(r.reason)):'—',''])),note('A failed-return-intention rate is not shown. No approved definition is supplied.',true));return out;},
    ret(){const r=sel(),out=[];if(!r){out.push(note('No episode selected.'));return out;}
      out.push(...sec(`Return pathway — ${display(r)}`,'The exact recorded return-event chain, in real sequence. Nothing is summarised away.'));
      const names=['RETURN_CANDIDATE_STARTED','RETURN_VERIFICATION_COMPLETED','RETURN_VERIFICATION_INTERRUPTED','CLOSURE_CONFIRMATION_STARTED','CLOSURE_CONFIRMATION_INTERRUPTED','FINAL_CALLBACK_HIDDEN_FOR_FOCUS','FINAL_CALLBACK_RESTORED_AFTER_RELAPSE','RETURN_CONFIRMED'],chain=r.events.filter(e=>names.includes(e.name));
      if(!chain.length)out.push(note(`This episode has no return-pathway events. It closed with reason ${reasonLabel(r.reason)} before any return verification began.`));
      else out.push(el('div',{class:'cx-chain'},chain.flatMap((e,i)=>{const extra=[e.payload.branch?`branch ${human(e.payload.branch)}`:null,e.payload.reason?`reason ${human(e.payload.reason)}`:null].filter(Boolean).map(x=>` · ${x}`).join('');return [i?el('span',{class:'cx-down'},'↓'):null,el('div',{class:'cx-ev'},dot(e.cls.toLowerCase()),el('div',{class:'cx-ev-b'},el('b',{},evLabel(e.name)),el('span',{class:'cx-hint'},`${T.time(e.utc)} · ${clsLabel(e.cls)}${extra}`)))];}).filter(Boolean)));return out;},
    hopper(){const m=getModel(),out=[...sec('Same-episode platform transitions','Every transition below belongs to ONE logical COSINE episode. No Hopper story is assembled across separate episodes.')],withH=m.episodes.filter(e=>e.hopperCount),selKey=sel()?.key;
      if(!withH.length)out.push(note('No Hopper transitions recorded.'));
      withH.forEach(r=>{const path=[[r.startKey,r.startLabel,r.startedUtc],...r.hops.map(h=>[h.to,h.label,h.utc])],strip=el('div',{class:'cx-strip'});path.forEach(([k,l,u],i)=>{if(i){strip.append(arrowEl(''),iconEl('switch'),arrowEl(''));}strip.append(el('div',{class:'cx-node platform'},sp('fam','PLATFORM'),sp('ttl',l),sp('sub',i?'Hopper switch':'Episode started'),sp('stamp',T.time(u))));});
        out.push(el('section',{class:`cx-block${r.key===selKey?' on':''}`},el('div',{class:'cx-bh'},el('b',{},display(r)),sp('cx-hint',`${r.hopperCount} transition${r.hopperCount>1?'s':''} · chronology only`)),strip));});
      out.push(note('TIME METRICS HELD · chronology + switch counts only',true));return out;},
    evidence(){const r=sel(),out=[];if(!r){out.push(note('No episode selected.'));return out;}
      out.push(...sec(`Raw evidence — ${display(r)}`,'Every recorded row for this episode, verbatim and in real sequence. Sanitized payloads and withheld counts are supplied by the read model.'));
      out.push(table(['#','Event','Class','Time','Platform','Title','Request id','Payload'],r.events.map(e=>[String(e.seq),evLabel(e.name),class_tag(e.cls),`${T.time(e.utc)} [${T.tag()}]`,e.platform||'—',e.title||'—',e.request||'—',payloadText(e.payload)])));
      out.push(...sec('Event classes are not grades','These describe where a row came from, not how good the evidence is.'),kv([[clsLabel('OBSERVED'),'Seen directly by the foreground observer'],[clsLabel('USER_ACTION'),'A choice the person actually made'],[clsLabel('PRESENTATION'),'Something COSINE displayed'],[clsLabel('DERIVED'),'Concluded by the engine from its own state']]));
      out.push(note('No CLEAN, DEGRADED, GOOD or BAD evidence-quality grade exists in COSINE evidence, and none is invented here.',true),note('Window titles are shown verbatim but are not an identity authority. Recorded evidence has shown titles naming other services while the recorded platform key says otherwise — never derive platform or content identity from a title string. '+(r.imported?'Here the title column shows the content title recorded with each event.':'Here the title column shows the simulator surface the episode was observed on.')));return out;},
    about(){const out=[],p=t=>el('p',{class:'cx-p'},t),li=t=>el('p',{class:'cx-p li'},t);
      out.push(...sec('What COSINE is'),p('COSINE — Choice-Oriented Streaming Insight and Navigation Engine — observes supported OTT activity through certified software evidence, and offers a choice at the moment it matters.'),p('It records what actually happened, as discrete durable events:'));
      ['Intention — the choice you made at the intent gate, recorded as your own action.','Negotiated breaks — the duration you entered, and whether you acknowledged it.','Return behaviour — return candidates, verification, and interruptions.','Callback events — including a callback hidden for focus and restored after a relapse.','Platform transitions — movement between supported services inside one episode.','Closure evidence — the recorded reason and outcome that ended the episode.'].forEach(t=>out.push(li(t)));
      out.push(...sec('Scientific boundary'),p('COSINE observes computer behaviour. That is the whole of its evidence, and the limit of what it may claim.'));
      ['It does not read thoughts.','It does not measure the brain.','It does not score focus, motivation, self-control or attention.','A recognised OTT window being in the foreground does not prove a video was playing. COSINE observes the window, never the player.','A recorded choice is a choice, not an outcome. Intent is never counted as a completed return.'].forEach(t=>out.push(li(t)));
      out.push(...sec('What this page is'),p("This page presents the browser-local COSINE evidence through MYELIN Web Lite's read of its own accepted events. Current episode facts arrive independently through the live COSINE state."),p('Two areas are deliberately held. Platform time totals are not shown while the COSINE clock-ownership question is open, and the SINE handoff episode is carried as context only, never interpreted. Uncertified metrics read UNAVAILABLE rather than showing a plausible number.'));return out;}};
  function chrome(){const r=sel(),m=getModel();root.querySelector('#cxSub').textContent=r?`${display(r)} · ${r.eventCount} recorded events · durable projection`:(m.episodes.length?'Recorded evidence available.':'No captured COSINE episodes.');
    root.querySelector('#cxFoot').textContent=`Durable projection · ${m.episodes.reduce((s,e)=>s+e.eventCount,0)} events`;const ex=root.querySelector('#cxExport'),can=m.episodes.length>0;ex.disabled=!can;ex.title=can?'Export current COSINE durable evidence as a printable report':'Durable COSINE evidence is unavailable.';}
  function render(){if(!root)return;chrome();[...root.querySelectorAll('.cx-tab')].forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});const top=body.scrollTop;body.replaceChildren(...views[tab]().filter(Boolean));body.scrollTop=top;}
  function close(){if(!root)return;document.removeEventListener('keydown',onKey,true);root.remove();root=null;body=null;(opener&&opener.isConnected?opener:null)?.focus();opener=null;}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.key==='Tab'&&root){const f=[...root.querySelectorAll('button,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}}
  function open(from){if(root){root.querySelector('.glass-close')?.focus();return;}opener=from||document.activeElement;
    const closeBtn=button('',close,{class:'glass-close','aria-label':'Close COSINE Deep Analysis'});closeBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const tabs=el('div',{class:'cx-tabs',role:'tablist','aria-label':'COSINE Deep Analysis sections'},TABS.map(([k,t],i)=>{const b=el('button',{type:'button',class:'cx-tab',role:'tab','data-tab':k,on:{click:()=>{tab=k;render();}}},t.toUpperCase());b.addEventListener('keydown',e=>{const n=e.key==='ArrowRight'?(i+1)%TABS.length:e.key==='ArrowLeft'?(i+TABS.length-1)%TABS.length:null;if(n!==null){e.preventDefault();tab=TABS[n][0];render();tabs.children[n].focus();}});return b;}));
    body=el('div',{class:'cx-body',id:'cxBody',role:'tabpanel',tabindex:'-1'});
    const icon=el('span',{class:'cx-icon','aria-hidden':'true'});icon.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14c2.5-7 5-7 7.5 0s5 7 7.5 0 2-5 3-5"/></svg>';
    root=el('div',{class:'glass-overlay open cx-dash',id:'cxDash',role:'dialog','aria-modal':'true','aria-labelledby':'cxTitle'},el('div',{class:'glass-panel cx-panel'},
      el('div',{class:'cx-head'},icon,el('div',{class:'cx-titles'},el('b',{id:'cxTitle'},'COSINE — DEEP ANALYSIS'),el('span',{id:'cxSub'},'')),el('div',{class:'cx-centre'},'Choice-Oriented Streaming Insight and Navigation Engine'),button('REFRESH',()=>{actions.rerender();render();},{class:'cx-btn muted sm',id:'cxDashRefresh',title:'Request the shared durable analytics read'}),button('EXPORT PDF',actions.export,{class:'cx-btn amber sm',id:'cxExport'}),closeBtn),
      tabs,body,el('div',{class:'cx-foot'},sp('','COSINE · Durable evidence'),el('span',{class:'mono',id:'cxFoot'},''))));
    root.addEventListener('mousedown',e=>{if(e.target===root)close();});document.body.append(root);document.addEventListener('keydown',onKey,true);render();closeBtn.focus();}
  return {open,close,refresh:render,get isOpen(){return !!root;}};
}
