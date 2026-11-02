// Science Lab Chapter 5 — "Results & Discussion" (SCIENCE_LAB/chapter5_view.py). Same page, panel order, wording and empty states as the desktop.
// Every value is restated from the transferred experiment projection (browser-local accepted events inside the experiment window) and shown as "—" until a transfer exists.
// Nothing here computes a score or an inference beyond counts of those events (the desktop's own rule for this chapter).
import {el,button} from './dom.js';
import {METRICS,metricValues} from './science-ch3.js';
const ORGANS=['SINE','MINE','COSINE','SECANT'],JOURNEY_ORGANS=['SINE','MINE','COSINE','SECANT','COSECANT'];
const ACCENTS={SINE:'#38BDF8',MINE:'#22C55E',COSINE:'#14B8A6',SECANT:'#8E5FC4'},MUTED_BAR='#475569';
const HELD_NOTE='MIRL (verified recoveries), COSECANT (completed returns), STUDY (completed study blocks) and NORMAL BREAK (completed break events) use a different certified unit than a completed episode and are not included in this comparison. Their certified values remain in Chapter 3\'s Whole-MYELIN Analysis panel.';
const BOUNDARY='These results describe software-observed behavioral evidence and should not be interpreted as direct measurement of neural state, neurotransmitter activity, diagnosis, or subjective mental state.';
const SECTIONS=[
  ['1','RESULTS OVERVIEW','SUMMARY','Awaiting certified analysis from Chapter 3.'],
  ['2','BEHAVIOURAL RESULTS','BEHAVIOURAL EVIDENCE','Behavioral results will appear after experiment analysis is complete.'],
  ['3','RESULT PATTERNS','TRENDS & INSIGHTS','Patterns and trends will be extracted from Chapter 3 results.'],
  ['4','DISCUSSION','INTERPRETATION','Discussion will appear after experiment analysis is complete.'],
  ['5','ALTERNATIVE EXPLANATIONS','CRITICAL ANALYSIS','Alternative explanations will be considered once results are available.'],
  ['6','INTERPRETIVE SUMMARY','THESIS SUMMARY','A coherent summary will be generated based on the certified results from Chapter 3.'],
  ['7','LIMITATIONS IN INTERPRETATION','STUDY LIMITATIONS','No result is interpreted until Chapter 3 finalizes the evidence.']];
const LINE_REASON='The certified package does not provide a comparable completed-episode time series for SINE, MINE, COSINE and SECANT. Existing SECANT timeline events do not provide the missing comparable four-organ series.';
const svgNS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={},...kids)=>{const n=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));kids.forEach(c=>n.append(c));return n;};
const norm=s=>String(s).replace(/_/g,' ');

/* ---- facts derived only from the transferred projection's events ---- */
const closedBy=(p,o)=>p.byOrgan[o]?p.byOrgan[o].returned+p.byOrgan[o].cancelled:0;
function episodeRows(p){if(!p)return null;return Object.fromEntries(ORGANS.map(o=>{const has=!!(p.byOrgan[o]&&p.byOrgan[o].events.length);return [o,has?{status:'AVAILABLE',count:closedBy(p,o)}:{status:'NO_EVIDENCE',count:null}];}));}
function wholeRows(p){const b=p.byOrgan,ev=o=>!!(b[o]&&b[o].events.length);
  const row=(source,label,count,has)=>({source,label,status:has?'AVAILABLE':'NO_EVIDENCE',count:has?count:null});
  return [row('SECANT','Completed episodes',closedBy(p,'SECANT'),ev('SECANT')),row('MINE','Completed episodes',closedBy(p,'MINE'),ev('MINE')),row('COSINE','Completed episodes',closedBy(p,'COSINE'),ev('COSINE')),
    row('MIRL','Verified recoveries',b.MIRL?b.MIRL.verified:0,ev('MIRL')),row('SINE','Completed episodes',closedBy(p,'SINE'),ev('SINE')),
    row('NORMAL_BREAK','Completed break events',p.events.filter(e=>e.organ==='NORMAL_BREAK'&&/BREAK_COMPLETE/.test(e.type)).length,ev('NORMAL_BREAK')),
    row('STUDY','Completed study blocks',p.studyBlocks,ev('STUDY')),row('COSECANT','Completed returns',b.COSECANT?b.COSECANT.confirmed:0,ev('COSECANT')),{source:'RESOURCE_INTENT',label:'Resource intent events',status:'UNAVAILABLE',count:null}];}
function patterns(p){const ver=p.events.filter(e=>e.type==='RETURN_VERIFIED'),rel=p.events.filter(e=>e.type==='RELAPSE'),out=[];
  if(rel.some(r=>ver.some(v=>v.sequence<r.sequence&&(v.episodeId==null||r.episodeId==null||v.episodeId===r.episodeId))))out.push({code:'RELAPSE_AFTER_VERIFIED_RETURN',label:'Relapse after verified return',description:'A relapse event followed a verified return in the experiment window.'});
  if(ver.length>=2)out.push({code:'MULTIPLE_VERIFIED_RETURNS',label:'Multiple verified returns',description:`${ver.length} verified returns were recorded in the experiment window.`});
  return out;}
function facts(p){const win=p.events,vals=metricValues({time:p.end},{start:p.start,end:p.end},win);
  const metricRows=METRICS.map(m=>({code:m[0],label:m[1],value:vals[m[0]],status:vals[m[0]]==null?'NO_EVIDENCE':'AVAILABLE',reason:m[6]}));
  return {vals,metricRows,available:metricRows.filter(m=>m.status==='AVAILABLE').length,pats:patterns(p),whole:wholeRows(p)};}
function sectionLines(p,f){
  const wl=r=>`${norm(r.source)} — ${r.label}: ${r.status==='AVAILABLE'?r.count:r.status==='NO_EVIDENCE'?'No evidence':'Unavailable'} [${r.status}]`;
  const overview=[`Experiment ID: ${p.experimentId}`,`Parent Session ID: ${p.sessionIds[0]}`,'Analysis: CERTIFIED','Transfer: TRANSFERRED',`Experiment window: [${p.start}, ${p.end}) effective seconds`,`Available metrics: ${f.available} of ${f.metricRows.length}`,`Certified patterns: ${f.pats.length}`,'The selected experiment is a bounded subset of the full parent session.','Source coverage: BROWSER LOCAL EVENTS=AVAILABLE; RESOURCE INTENT=UNAVAILABLE','Experiment-window summary:',...f.whole.map(wl)];
  const behav=f.metricRows.map(m=>`${m.label}: ${m.status==='AVAILABLE'?m.value:'No evidence'} [${m.status}] — ${m.reason}`);
  const pats=f.pats.length?f.pats.map(x=>`${x.label}: ${x.description} [${x.code}]`):['No certified patterns were present in the transferred package.'];
  const disc=[],ver=f.vals.verified_returns,codes=f.pats.map(x=>x.code);
  if(ver!=null)disc.push(`The selected experiment contained ${ver} factually verified return event(s). This describes observed recovery behavior within the experiment window and does not establish an explanation for return.`);
  if(codes.includes('RELAPSE_AFTER_VERIFIED_RETURN'))disc.push('A factual relapse was observed after a verified return in at least one MIRL episode. This supports treating return and sustained re-engagement as distinct behavioral events.');
  if(codes.includes('MULTIPLE_VERIFIED_RETURNS'))disc.push('Multiple verified returns occurred during the selected experiment, indicating repeated recovery events rather than one uninterrupted behavioral trajectory.');
  if(f.metricRows.some(m=>m.status!=='AVAILABLE'))disc.push('Some behavioral quantities remain unavailable because the current durable evidence does not support a complete certified calculation.');
  if(!disc.length)disc.push('The transferred package contains no additional certified discussion rule.');
  const alt=[],row=s=>f.whole.find(r=>r.source===s);
  if(Number(ver)>0)alt.push('Software-observed return does not prove subjective attentional recovery.');
  if(row('NORMAL_BREAK').status==='AVAILABLE'&&row('NORMAL_BREAK').count)alt.push('Recorded breaks may be deliberate and task-compatible.');
  if(row('MINE').status==='AVAILABLE'&&row('MINE').count)alt.push('Messaging activity may be purposeful rather than distracting.');
  alt.push('Missing durable Resource Intent history limits complete task-alignment reconstruction.');
  const summary=[`Experiment ${p.experimentId} transferred the exact certified Chapter 3 package for parent session ${p.sessionIds[0]}.`,`Within this experiment, ${f.available} of ${f.metricRows.length} metric values were available and ${f.pats.length} certified pattern(s) were retained.`,'Interpretation is limited to observed or derived software-observed evidence and the limitations carried by the package.'];
  const limits=['Counts describe software-observed behavior in the selected window; external processes and biological measures are unavailable.','Everything shown here was recorded and analysed inside this browser; nothing is monitored outside it.',BOUNDARY];
  return [overview,behav,pats,disc,alt,summary,limits];}
function secantText(p){const s=p.byOrgan.SECANT;
  if(!s||!s.events.length)return 'SECANT — NO EVIDENCE\nNo SECANT event was recorded inside this experiment window.\nNo evidence does not prove non-use.';
  const rows=[['SECANT episodes observed',s.episodes],['Stages displayed',s.stages],['Return intents',s.intents],['Verified returns',s.verified],['Stable outcomes (derived)',s.returned],['Relapses',s.relapses],['Cancelled / not returned',s.cancelled],['Study blocks completed',p.studyBlocks]];
  return ['SECANT — experiment-scoped Study recovery',`Browser-contained events inside [${p.start}, ${p.end}) effective seconds.`,'',...rows.map(([k,v])=>`${k}: ${v}`),'','Counts are restated from accepted events; no inference is made beyond them.'].join('\n');}

/* ---- behavioural journey route (certified-style events only) ---- */
function node(e){const t=e.type,o=e.organ,pl=e.payload||{};
  if(t==='STAGE_DISPLAYED')return {stage:'TRIGGER',label:/^\d+$/.test(String(pl.stage))?`${o}-${pl.stage} displayed`:`${o} stage displayed${pl.stage?` · ${norm(pl.stage)}`:''}`};
  if(t==='RETURN_INTENT')return {stage:'RETURN',label:'Return intent'};
  if(t==='RETURN_STARTED')return {stage:'RETURN',label:'Return started'};
  if(t==='RETURN_VERIFIED')return {stage:'VERIFIED_RETURN',label:'Return verified'};
  if(t==='RETURN_CONFIRMED'||t==='RECOVERY_CONFIRMED')return {stage:'VERIFIED_RETURN',label:'Return confirmed'};
  if(t==='EPISODE_CLOSED')return {stage:'EPISODE_CLOSURE',label:`Episode closed${pl.outcome?` · ${norm(pl.outcome)}`:''}`};
  if(t==='BREAK_STARTED')return {stage:'BREAK_LANE',label:'Break started'};
  if(/^BREAK_COMPLETE/.test(t))return {stage:'BREAK_LANE',label:'Break completed'};
  if(t==='RELAPSE')return {stage:'RELAPSE',label:'Relapse after return'};
  return null;}
function journeyEvents(p,organ){const keep=organ==='SINE'?['SINE','MIRL']:[organ];
  return p.events.filter(e=>keep.includes(e.organ)).map(e=>{const n=node(e);return n&&{...n,source:e.organ,t:Math.max(0,(e.effectiveSeconds??p.start)-p.start),seq:e.sequence};}).filter(Boolean).sort((a,b)=>a.t-b.t||a.seq-b.seq).filter((n,i,a)=>!i||n.label!==a[i-1].label||n.source!==a[i-1].source||n.t!==a[i-1].t);}

/* ---- panels ---- */
const chip=(text,id)=>el('span',{class:'c5x-chip',...(id?{id}:{})},text);
function barChart(rows){const W=328,H=140,base=H-26,avail=base-30,keys=ORGANS,slot=W/keys.length,bw=Math.min(64,slot*.42);
  const s=svg('svg',{viewBox:`0 0 ${W} ${H}`,class:'c5x-canvas',role:'img','aria-label':'Completed episodes by organ'});
  if(rows){const counts=keys.map(k=>rows[k]).filter(r=>r.status==='AVAILABLE').map(r=>r.count),peak=Math.max(0,...counts);
    keys.forEach((k,i)=>{const r=rows[k],cx=slot*i+slot/2,ok=r.status==='AVAILABLE',h=ok?(peak>0?avail*r.count/peak:0):4;
      s.append(svg('rect',{x:cx-bw/2,y:base-Math.max(2,h),width:bw,height:Math.max(2,h),rx:3,fill:ok?ACCENTS[k]:MUTED_BAR,class:'c5x-bar'}));
      const v=svg('text',{x:cx,y:Math.max(12,base-h-6),'text-anchor':'middle',class:'c5x-bar-v'});v.textContent=ok?String(r.count):'No evidence';s.append(v);
      const l=svg('text',{x:cx,y:base+16,'text-anchor':'middle',class:'c5x-bar-l'});l.textContent=k;s.append(l);});}
  if(rows)s.append(svg('line',{x1:0,y1:base,x2:W,y2:base,class:'c5x-axis'}));return s;}
function donut(rows){const S=150,side=Math.max(60,S-20),R=side/2-7,C=2*Math.PI*R,cx=164,cy=75;
  const s=svg('svg',{viewBox:`0 0 328 ${S}`,class:'c5x-canvas',role:'img','aria-label':'Completed organ-episode share'});
  const av=rows?Object.fromEntries(ORGANS.filter(k=>rows[k].status==='AVAILABLE').map(k=>[k,rows[k].count])):{},total=Object.values(av).reduce((a,b)=>a+b,0);
  s.append(svg('circle',{cx,cy,r:R,fill:'none',class:'c5x-ring','stroke-width':14}));
  if(total>0){let off=0;ORGANS.forEach(k=>{const c=av[k]||0;if(c<=0)return;const len=c/total*C;
    s.append(svg('circle',{cx,cy,r:R,fill:'none',stroke:ACCENTS[k],'stroke-width':14,'stroke-dasharray':`${len} ${C}`,'stroke-dashoffset':-off,transform:`rotate(-90 ${cx} ${cy})`,class:'c5x-arc'}));off+=len;});}
  const t=svg('text',{x:cx,y:cy+6,'text-anchor':'middle',class:'c5x-donut-v'});t.textContent=!rows?'—':!total&&!Object.keys(av).length?'N/A':String(total);s.append(t);return s;}
function chartCard(title,chipText,...kids){return el('section',{class:'card c5x-chart'},el('div',{class:'c5x-chart-h'},el('h3',{class:'c5x-chart-t'},title),chip(chipText)),...kids);}

export function buildChapterFive({p,state,actions}){
  const f=p?facts(p):null,rows=episodeRows(p),lines=p?sectionLines(p,f):null;
  /* hero */
  const hist=button('SHOW HISTORY',actions.history,{class:'c5x-btn',id:'c5History',title:'Browse every durable Science Lab experiment, independent of the current transferred result.'});
  const exp=button('EXPORT PDF',actions.exportPdf,{class:'c5x-btn c5x-export',id:'c5Export'});exp.disabled=!p;exp.title=p?'Export the current experiment as a MYELIN Report PDF.':'Available after Chapter 3 results are transferred and validated.';
  const hero=el('div',{class:'card c5x-hero'},el('div',{class:'c5x-hero-t'},el('span',{class:'lab-eyebrow'},'CHAPTER 5'),el('h2',{},'RESULTS & DISCUSSION'),el('p',{class:'c5x-sub'},'Interpret and present the analyzed results from Chapter 3 in thesis form.')),
    el('div',{class:'c5x-hero-a'},hist,el('div',{class:'c5x-exp'},exp,el('span',{class:'c5x-helper'},'Generate a thesis-style report of Chapter 5.'))));
  /* source strip + details toggle */
  const source=el('div',{class:'c5x-source'},el('div',{class:'c5x-source-t'},el('b',{},'SOURCE: CHAPTER 3 CERTIFIED ANALYSIS PACKAGE'),el('span',{id:'c5SourceBody'},p?`Experiment ${p.experimentId} · Parent Session ${p.sessionIds[0]} · Analysis: CERTIFIED`:'Chapter 5 consumes the final, certified analysis from Chapter 3.')),
    el('div',{class:'c5x-col'},el('em',{},'STATUS'),el('strong',{id:'c5Status'},p?'TRANSFERRED':'Awaiting Chapter 3')),
    el('div',{class:'c5x-col dep'},el('em',{},'DEPENDENCY'),el('strong',{class:'cy'},'Chapter 3 → Chapter 5'),el('small',{},p?'Exact certified package retained':'Analysis informs Discussion')));
  const toggle=button(state.details?'CLOSE DETAILS':'OPEN DETAILS',()=>{state.details=!state.details;sync();},{class:'c5x-btn c5x-details',id:'c5Details','aria-expanded':String(!!state.details)});
  /* quick summary */
  const qs=[['EXPERIMENT ID',p?p.experimentId:'—'],['PARENT SESSION ID',p?p.sessionIds[0]:'—'],['ANALYSIS',p?'CERTIFIED':'—'],['TRANSFER',p?'TRANSFERRED':'—'],['AVAILABLE METRICS',p?`${f.available} of ${f.metricRows.length}`:'—'],['CERTIFIED PATTERNS',p?String(f.pats.length):'—']];
  const quick=el('div',{class:'card c5x-quick',id:'c5Quick'},qs.map(([k,v])=>el('div',{class:'c5x-q'},el('span',{},k),el('b',{},v))));
  /* charts */
  const trend=chartCard('ORGAN TREND ACROSS EPISODES',p?'NOT ENOUGH CERTIFIED HISTORY':'AWAITING CHAPTER 3',el('p',{class:'c5x-p'},'Intended basis: certified organ-episode counts across episodes, experiments, or sessions.'),
    el('div',{class:'c5x-empty'},el('b',{},'NOT ENOUGH CERTIFIED HISTORY FOR TREND'),el('span',{},LINE_REASON)));
  const bars=chartCard('COMPLETED EPISODES BY ORGAN',rows?'WEB LOCAL':'AWAITING CHAPTER 3',el('p',{class:'c5x-p'},'Certified completed-episode counts for SINE, MINE, COSINE and SECANT in the finalized parent MYELIN session. Completed does not necessarily mean recovered.'),barChart(rows),el('p',{class:'c5x-p sm'},HELD_NOTE));
  const legend=el('div',{class:'c5x-legend'},ORGANS.map(k=>el('div',{class:'c5x-leg'},el('i',{style:`background:${ACCENTS[k]}`}),el('span',{},k),el('b',{},!rows?'—':rows[k].status==='AVAILABLE'?String(rows[k].count):'No evidence'))));
  const share=chartCard('COMPLETED ORGAN-EPISODE SHARE',rows?'WEB LOCAL':'AWAITING CHAPTER 3',el('p',{class:'c5x-p'},'Share of the summed completed organ-episode counts among SINE, MINE, COSINE and SECANT in the finalized parent MYELIN session -- not a measure of time, dwell, unique user episodes, distraction probability, or session duration.'),donut(rows),legend,el('p',{class:'c5x-p sm'},HELD_NOTE));
  const charts=el('div',{class:'c5x-charts'},trend,bars,share);
  /* SECANT text panel */
  const secant=el('textarea',{class:'c5x-secant','aria-label':'SECANT experiment results',id:'c5Secant'});secant.readOnly=true;secant.value=p?secantText(p):'SECANT — awaiting a certified experiment package.';
  /* behavioural journey */
  const routeBox=el('div',{class:'c5x-route',id:'c5Route'}),basis=el('p',{class:'c5x-p sm c5x-basis',id:'c5Basis'}),organBtns=el('div',{class:'c5x-organs'}),insp=el('button',{type:'button',class:'c5x-btn sm',id:'c5Inspect'},'INSPECT'),expd=el('button',{type:'button',class:'c5x-btn sm',id:'c5Expand'},'EXPAND');
  function route(){
    organBtns.replaceChildren(...JOURNEY_ORGANS.map(o=>button(o,()=>{state.organ=o;route();},{class:`c5x-btn c5x-organ${o===state.organ?' on':''}`,'aria-pressed':String(o===state.organ)})));
    insp.textContent=state.inspect?'HIDE BASIS':'INSPECT';expd.textContent=state.expand?'COLLAPSE':'EXPAND';routeBox.classList.toggle('open',!!state.expand);basis.hidden=!state.inspect;
    basis.textContent=`Basis: the experiment's accepted events, filtered to source in [${state.organ==='SINE'?'SINE, MIRL':state.organ}], ordered by time. No event is computed or inferred here -- each row is one recorded event.`;
    if(!p){routeBox.replaceChildren(el('p',{class:'c5x-p'},'Awaiting certified analysis from Chapter 3.'));return;}
    const ev=journeyEvents(p,state.organ);
    if(!ev.length){routeBox.replaceChildren(el('p',{class:'c5x-p'},`No certified journey events for ${state.organ} exist in the transferred package's timeline. Only an aggregate completed-episode count is certified for this organ (see the bar chart above) -- no route is drawn rather than inventing one.`));return;}
    routeBox.replaceChildren(...ev.map((n,i)=>el('div',{class:'c5x-ev'},el('span',{class:'c5x-ev-t'},`+${n.t.toFixed(1)}s`),el('span',{class:'c5x-ev-rail'},el('i',{}),i<ev.length-1?el('u',{}):null),el('div',{class:'c5x-ev-c'},el('b',{},n.label),el('span',{class:'c5x-ev-chips'},el('em',{},norm(n.stage)),el('em',{},n.source))))));}
  insp.addEventListener('click',()=>{state.inspect=!state.inspect;route();});expd.addEventListener('click',()=>{state.expand=!state.expand;route();});
  const journey=el('section',{class:'card c5x-chart c5x-journey'},el('div',{class:'c5x-chart-h'},el('h3',{class:'c5x-chart-t'},'BEHAVIORAL JOURNEY -- SELECTED EXPERIMENT'),chip(p?'WEB LOCAL':'AWAITING CHAPTER 3')),
    el('p',{class:'c5x-p'},'Certified event route for the selected experiment, by organ. Only an organ with certified timeline events shows a detailed route.'),
    el('div',{class:'c5x-jbar'},organBtns,el('div',{class:'c5x-util'},insp,expd)),basis,routeBox,
    el('div',{class:'c5x-legend2'},el('span',{},'■  FACTUAL EVENT (certified)'),el('span',{},'◇  NARRATIVE ANNOTATION -- illustrative only, never measured')),
    el('p',{class:'c5x-p xs'},'MYELIN certifies no fact about a user\'s internal thoughts for any experiment; this route contains factual events only.'));
  route();
  const dash=el('div',{class:'c5x-dash',id:'c5Dash'},charts,secant,journey);
  /* seven detail sections */
  const grid=el('div',{class:'c5x-grid',id:'c5Grid'},SECTIONS.map(([n,t,tag,body],i)=>el('section',{class:'card c5x-sec'},el('div',{class:'c5x-sec-h'},el('span',{class:'c5x-badge'},n),el('h3',{},t),el('i',{},'›')),el('b',{class:'c5x-dash-m'},'—'),el('p',{class:'c5x-p'},lines?lines[i].join('\n\n'):body),el('span',{class:'c5x-tag'},tag))));
  const note=el('div',{class:'c5x-note'},el('b',{},'IMPORTANT NOTE'),el('span',{},'Chapter 5 interprets behavioural outcomes from controlled experiments. It does not infer neural mechanisms, clinical status, or diagnostic conclusions.'));
  function sync(){dash.hidden=!!state.details;grid.hidden=!state.details;toggle.textContent=state.details?'CLOSE DETAILS':'OPEN DETAILS';toggle.setAttribute('aria-expanded',String(!!state.details));}
  sync();
  return el('div',{class:'c5x-page',id:'wlC5'},hero,el('div',{class:'c5x-srcrow'},source,toggle),quick,dash,grid,note);
}

/* ---- SHOW HISTORY dialog body (every local experiment; ineligible rows stay visible with their reason) ---- */
export function buildHistory({entries,onView}){
  const list=el('div',{class:'c5x-hist'},entries.length?entries.map(x=>{const ok=x.status!=='INTERRUPTED'&&Number.isFinite(x.end);const b=button('VIEW RESULTS',()=>onView(x),{class:'c5x-btn sm','aria-label':`View results for ${x.id}`});b.disabled=!ok;
    return el('div',{class:'card c5x-hrow'},el('div',{},el('b',{},`${x.id}  ·  session ${x.sessionId}`),el('span',{},ok?`${x.status}  ·  window [${x.start}, ${x.end}) effective seconds`:`${x.status}  ·  no durable end boundary`)),b);}):[el('p',{class:'c5x-p'},'No durable experiments are recorded in this browser yet.')]);
  return el('div',{class:'c5x-histwrap'},el('p',{class:'c5x-p',id:'c5HistStatus'},entries.length?`${entries.length} experiment record(s) in this browser.`:'No records.'),list);
}
