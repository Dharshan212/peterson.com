// Science Lab Chapter 3 — "Data Analysis" (SCIENCE_LAB/chapter3_view.py). Same page, panel order, wording and empty states as the desktop;
// every value is read from the browser-local runtime's accepted events inside the experiment window and shown as "—" until it exists.
// Nothing here computes a score or an inference beyond sums and counts of those events (the desktop's own rule for this chapter).
import {el,button,fmt} from './dom.js';
const STAGES=[['OFF_TASK_DWELL','Off-task dwell',5],['TRIGGER','Trigger',1],['RETURN','Return',3],['VERIFIED_RETURN','Verified return',2],['EPISODE_CLOSURE','Episode closure',1]];
const ORGANS=['SINE','MINE','COSINE','SECANT','COSECANT'];
const ROSTER=[['SECANT','SECANT'],['MINE','MINE'],['COSINE','COSINE'],['MIRL','MIRL'],['SINE','SINE'],['NORMAL BREAK','NORMAL_BREAK'],['STUDY','STUDY'],['COSECANT','COSECANT'],['RESOURCE INTENT',null]];
const ico=inner=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICONS={target:ico('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),diverge:ico('<path d="M12 21V12M12 12L5 4M12 12L19 4"/>'),return_clock:ico('<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/>'),check_return:ico('<path d="M4 12.5L9.5 18L20 6.5"/>'),loop:ico('<path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"/>'),wave:ico('<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>'),swap:ico('<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>'),hourglass:ico('<path d="M6 3h12M6 21h12M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9"/>'),doc:ico('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'),rail:ico('<path d="M5 6h10M5 12h14M5 18h8M17 4l3 2-3 2"/>'),info:ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r=".8" fill="currentColor"/>'),dots:ico('<path d="M12 5v.01M12 12v.01M12 19v.01"/>')};
export const METRICS=[
  ['task_aligned_time','Task-aligned time','target','','MEASURED · DURATION','Awaiting experiment evidence','Duration supported as aligned with the intended task.'],
  ['off_task_dwell','Off-task dwell','diverge','blue','MEASURED · DURATION','Awaiting off-task evidence','Duration represented as off-task in the approved behavioural timeline.'],
  ['return_latency','Return latency','return_clock','purple','DERIVED · DURATION','Awaiting approved return evidence','Time associated with the approved return pathway.'],
  ['verified_returns','Verified returns','check_return','green','COUNT','Awaiting verified-return evidence','Returns confirmed by the relevant MYELIN recovery authority.'],
  ['relapses','Relapses','loop','','COUNT','Awaiting relapse evidence','Approved recovery interruptions after return.'],
  ['post_return_persistence','Post-return persistence','wave','','DERIVED · DURATION','Awaiting post-return evidence','Aligned duration maintained after verified return.'],
  ['context_switches','Context switches','swap','','COUNT','Awaiting context evidence','Meaningful behavioural context transitions.'],
  ['experiment_duration','Experiment duration','hourglass','cyan','MEASURED · DURATION','No active experiment','Elapsed duration of the Science Lab experiment window.']];
const OFF=['SOCIAL','MESSAGING','STREAMING','OFF_TASK'],ON=['TASK','STUDY'];
const icoSpan=n=>{const s=el('span',{class:'c3-empty-ico'});s.innerHTML=ICONS[n];return s;};
const pill=(t,cls='')=>el('span',{class:`c3-pill ${cls}`},t);
function windowEvents(r,exp){if(!exp)return [];if(r.experiment&&exp.id===r.experiment.id)return r.events.filter(e=>e.sequence>=exp.startSequence);return exp.events||[];}
export function metricValues(r,exp,win){
  if(!exp)return Object.fromEntries(METRICS.map(m=>[m[0],null]));
  const iv=win.filter(e=>e.type==='OBSERVATION_INTERVAL'&&e.payload.supported);const len=e=>e.payload.end-e.payload.start;
  const sum=(kinds,from=-Infinity)=>iv.filter(e=>kinds.includes(e.payload.kind)&&e.payload.start>=from).reduce((n,e)=>n+len(e),0);
  const lat=win.filter(e=>['RECOVERY_CONFIRMED','RETURN_CONFIRMED'].includes(e.type)&&Number.isFinite(e.payload.latencySeconds)).map(e=>e.payload.latencySeconds);
  const ver=win.filter(e=>e.type==='RETURN_VERIFIED'||e.type==='RETURN_CONFIRMED');
  const end=exp.end??r.time;
  return {task_aligned_time:fmt(sum(ON)),off_task_dwell:fmt(sum(OFF)),return_latency:lat.length?fmt(lat.reduce((a,b)=>a+b,0)/lat.length):null,verified_returns:String(win.filter(e=>e.type==='RETURN_VERIFIED').length),relapses:String(win.filter(e=>e.type==='RELAPSE').length),
    post_return_persistence:ver.length?fmt(sum(ON,ver[0].effectiveSeconds)):null,context_switches:String(win.filter(e=>e.type==='RESOURCE_CHANGED').length),experiment_duration:fmt(Math.max(0,end-exp.start))};
}
function stageStates(r,win,organ){
  const eps=win.filter(e=>e.organ===organ&&e.type==='EPISODE_STARTED');const ep=eps.at(-1);
  if(!ep){const dwell={SINE:r.sine,MINE:r.mine,COSINE:r.cosine,SECANT:r.secant,COSECANT:r.cosecant}[organ]?.dwell||0;return {states:STAGES.map((s,i)=>i===0&&dwell>0?'active':'pending'),episode:null};}
  const es=win.filter(e=>e.episodeId===ep.episodeId); /* MIRL verifies a SINE episode under the same episode id */ const has=t=>es.some(e=>t.includes(e.type));
  const done=[true,has(['STAGE_DISPLAYED']),has(['RETURN_INTENT','RETURN_STARTED']),has(['RETURN_VERIFIED']),has(['EPISODE_CLOSED'])];
  const first=done.indexOf(false);return {states:done.map((d,i)=>d?'done':i===first?'active':'pending'),episode:ep.episodeId,closed:done[4]};
}
const feedKind=e=>/BREAK/.test(e.type)?'break':e.type==='EPISODE_STARTED'?'off_task_dwell':e.type==='STAGE_DISPLAYED'||e.type==='POPUP_REQUESTED'?'trigger':/RETURN_(INTENT|STARTED)/.test(e.type)?'return':/VERIFIED/.test(e.type)?'verified_return':/CLOSED|CONFIRMED/.test(e.type)?'episode_closure':'neutral';
export function buildChapterThree({r,latest,selectedId,organ='SINE',onOrgan,actions}){
  const exp=r.experiment||latest||null,running=!!r.experiment,live=['ACTIVE','PAUSED'].includes(r.state),win=windowEvents(r,exp);
  const status=running?'RUNNING':exp?(exp.status==='INTERRUPTED'?'INTERRUPTED':'ENDED'):live?'READY':'NO ACTIVE SESSION';
  const field=(label,value)=>el('div',{class:'c3-field'},el('span',{},label),el('b',{},value));
  const sec=(title,sub,tag,...kids)=>el('section',{class:'card c3-sec'},el('div',{class:'c3-sec-h'},el('h2',{class:'c3-h'},title),tag||null),sub?el('p',{class:'c3-sub'},sub):null,...kids);
  // hero + transfer
  const canTransfer=!!latest&&!running;
  const hero=el('div',{class:'card lab-hero'},el('span',{class:'lab-eyebrow'},'CHAPTER 3'),el('h2',{},'DATA ANALYSIS'),el('div',{class:'lab-sub cyan'},'Live behavioural telemetry and research evidence.'),el('p',{class:'lab-p'},'Chapter 3 analyses behavioural evidence from the selected Science Lab experiment and prepares the results for transfer to Chapter 5.'));
  const tbtn=button('TRANSFER RESULTS',actions.transfer,{id:'c3TransferBtn',class:'c3-transfer-btn','aria-label':'Transfer certified Chapter 3 results to Chapter 5'});tbtn.disabled=!canTransfer;
  const transfer=el('div',{class:'c3-transfer'},el('div',{},el('span',{class:'lab-eyebrow sm'},'CHAPTER 3 → CHAPTER 5'),el('h2',{class:'c3-tr-h'},'TRANSFER RESULTS'),el('p',{class:'c3-sub'},running?'Available after the experiment ends.':canTransfer?'Send certified analysis to Chapter 5.':'Available after END EXPERIMENT.')),tbtn);
  // experiment strip
  const startB=button('START EXPERIMENT',actions.start,{id:'c3Start',class:'c3-ctl','aria-label':'Start Science Lab experiment'}),endB=button('END EXPERIMENT',actions.end,{id:'c3End',class:'c3-ctl','aria-label':'End Science Lab experiment'}),refB=button('REFRESH',actions.refresh,{id:'c3Refresh',class:'c3-ctl','aria-label':'Refresh Science Lab evidence'});
  startB.disabled=r.state!=='ACTIVE'||running;endB.disabled=!running;
  const strip=sec('SCIENCE EXPERIMENT','Research observation window attached to the active MYELIN session.',null,
    el('div',{class:'c3-fields'},field('EXPERIMENT ID',exp?exp.id:'—'),field('PARENT SESSION',exp?exp.sessionId:r.session&&live?r.session.id:'—'),field('STATUS',status)),el('div',{class:'c3-ctls'},startB,endB,refB),
    el('div',{class:'c3-conn'},`BROWSER-CONTAINED · ${live?'SESSION ACTIVE':'NO ACTIVE SESSION'}`),el('p',{class:'c3-note'},'Ending the Science Lab experiment does not stop the parent MYELIN session.'));
  // timeline
  const st=stageStates(r,win,organ);
  const orgBtns=ORGANS.map(o=>button(o,()=>onOrgan(o),{class:`c3-organ${o===organ?' on':''}`,'aria-pressed':String(o===organ),title:`${o} organ (presentation filter only)`}));
  const bar=el('div',{class:'c3-bar',role:'img','aria-label':'Episode bar'},STAGES.map(([k,l,w],i)=>el('div',{class:`c3-seg ${k.toLowerCase()} ${st.states[i]}`,style:`flex:${w}`})));
  const labels=el('div',{class:'c3-bar-labels'},STAGES.map(([k,l,w])=>el('span',{style:`flex:${w}`},l.toUpperCase().replace(' ',' '))));
  const tlState=!exp?'LIVE TIMELINE IDLE':running?'LIVE ORGAN STATE':exp.status==='INTERRUPTED'?'INTERRUPTED · FINAL CERTIFICATION UNAVAILABLE':'EXPERIMENT ENDED';
  const tlNote=!exp?'START EXPERIMENT TO VIEW LIVE ORGAN TIMELINE':st.episode?`${organ} · episode ${st.episode}${st.closed?' · closed':''}`:'Waiting for qualifying factual organ activity. No episode is assumed.';
  const timeline=sec('BEHAVIOURAL TIMELINE','One common, continuous episode bar. Its structure is identical for SINE, MINE, COSINE and COSECANT -- only organ identity and factual events change (spec section 7).',pill(tlState,'cyan'),
    el('div',{class:'c3-organs'},el('span',{class:'c3-organs-l'},'ACTIVE ORGAN'),el('div',{class:'c3-organ-row',role:'group','aria-label':'Active organ (presentation filter only)'},...orgBtns)),bar,labels,el('p',{class:'c3-note upper'},tlNote));
  // metrics
  const vals=metricValues(r,exp,win);
  const cards=METRICS.map(([k,title,icon,accent,badge,qual,tip])=>{const v=vals[k];const i=el('span',{class:`c3-m-ico ${accent}`});i.innerHTML=ICONS[icon];
    return el('div',{class:'c3-metric',title:tip,'data-metric':k},el('div',{class:'c3-m-top'},i,el('b',{},title.toUpperCase())),el('div',{class:'c3-m-val'},v??'—'),el('p',{class:'c3-m-q'},v!==null&&v!==undefined?'Measured from this experiment window.':qual),el('span',{class:'c3-m-badge'},badge));});
  const metrics=sec('KEY METRICS','Behavioural measurements from the selected Science Lab experiment.',null,el('div',{class:'c3-metrics'},cards),el('p',{class:'c3-note'},'Metrics are behavioural measurements. Availability depends on certified Science Lab evidence.'));
  // evidence feed
  const visible=win.filter(e=>!['OBSERVATION_INTERVAL'].includes(e.type));
  const feedItems=visible.slice(-40).map(e=>el('div',{class:`c3-feed-item ${feedKind(e)}`},el('span',{class:'c3-feed-t'},fmt(e.effectiveSeconds-(exp?.start||0))),el('div',{},el('b',{},`${e.organ} · ${e.type.replaceAll('_',' ')}`),el('small',{},`${e.evidenceQuality||'SIMULATED'} · ${e.source||'SIMULATED'}`))));
  const feed=sec('LIVE EVIDENCE FEED','Chronological behavioral evidence from the selected Science Lab experiment.',pill(!exp?'AWAITING EVIDENCE':running?'LIVE':'FINAL CAPTURE','cyan'),
    visible.length?el('div',{class:'c3-feed'},...feedItems):el('div',{class:'c3-empty'},icoSpan('rail'),el('div',{},el('p',{},'Chronological behavioral events will appear here when a Science Lab experiment is connected to certified MYELIN evidence.'),el('p',{class:'dim'},'No live telemetry is simulated in this dummy page.'))),
    el('p',{class:'c3-note'},'Feed items represent behavioral/system evidence. Scientific interpretation belongs to later analysis.'));
  // derived findings (only once the window is closed)
  const ended=exp&&!running;const eps=win.filter(e=>e.type==='EPISODE_STARTED').length,verifiedN=win.filter(e=>e.type==='RETURN_VERIFIED').length,relN=win.filter(e=>e.type==='RELAPSE').length;
  const findings=ended?[['Episodes observed',`${eps} behavioural episode${eps===1?'':'s'} began inside the experiment window.`],['Verified returns',`${verifiedN} return verification${verifiedN===1?'':'s'} recorded against ${eps} episode${eps===1?'':'s'}.`],['Relapses',`${relN} recovery interruption${relN===1?'':'s'} recorded after return.`],...(vals.return_latency?[['Return latency',`Mean approved-return latency ${vals.return_latency} (effective time).`]]:[])]:[];
  const derived=sec('DERIVED FINDINGS','Behavioral relationships calculated from validated experiment evidence.',pill(ended?'FINAL ANALYSIS':'AWAITING ANALYSIS','cyan'),
    findings.length?el('div',{class:'c3-findings'},findings.map(([t,s],i)=>el('div',{class:'c3-finding'},el('i',{},String(i+1).padStart(2,'0')),el('div',{},el('b',{},t),el('p',{},s))))):el('div',{class:'c3-empty'},icoSpan('doc'),el('div',{},el('p',{},'Validated behavioral comparisons will appear here when a Science Lab experiment is connected to certified evidence.'),el('p',{class:'dim'},'No derived result is simulated in this dummy page.'))),
    el('p',{class:'c3-note'},'Derived findings summarize relationships calculated from validated behavioral evidence. They do not explain biological or psychological cause.'));
  // coverage + limitations
  const cov=ROSTER.map(([label,organName])=>{let s='pending',reason='Awaiting coverage snapshot';if(exp){if(!organName){s='unavailable';reason='Web Lite has no Resource Intent authority.';}else{const has=win.some(e=>e.organ===organName);s=has?'available':'no_evidence';reason=has?'Safe read authority + matching evidence.':'Safe read authority + no matching evidence.';}}return [label,s,reason];});
  const covLabel={available:'AVAILABLE',no_evidence:'NO EVIDENCE',unavailable:'UNAVAILABLE',pending:'—'};
  const coverage=sec('SOURCE COVERAGE','Shows whether each approved MYELIN evidence source can contribute to the selected experiment.',pill(exp?'FINAL SNAPSHOT':'AWAITING COVERAGE SNAPSHOT','cyan'),
    el('div',{class:'c3-cov'},cov.map(([l,s,why])=>el('div',{class:`c3-cov-row ${s}`},el('div',{},el('b',{},l),el('small',{},why)),el('span',{class:'c3-cov-st'},covLabel[s])))),
    el('div',{class:'c3-legend'},[['AVAILABLE','Safe read authority + matching evidence.'],['NO EVIDENCE','Safe read authority + no matching evidence.'],['UNAVAILABLE','Source cannot currently be read safely.']].map(([k,v])=>el('p',{},el('b',{},k),el('span',{},v)))));
  const noEv=cov.filter(c=>c[1]==='no_evidence').map(c=>c[0]);
  const expLim=exp?`Browser-contained simulated evidence only${r.speed>1||exp.speedNote?'; accelerated clock reports effective seconds':''}. ${noEv.length?`No matching evidence from: ${noEv.join(', ')}.`:'Every readable source contributed evidence.'}`:'Awaiting evidence coverage.';
  const limits=sec('LIMITATIONS','Evidence gaps and measurement boundaries that constrain interpretation.',null,
    el('div',{class:'c3-lim boundary'},el('b',{},'MEASUREMENT BOUNDARY'),el('p',{},'Science Lab measures behavioral/software evidence around task alignment, divergence, intervention, return, and recovery. It does not directly measure dopamine, neural firing, brain-network activity, motivation, boredom, stress, fatigue, or subjective effort.')),
    el('div',{class:'c3-lim evidence'},el('b',{},'EXPERIMENT-SPECIFIC LIMITATIONS'),el('p',{},expLim)));
  // whole-MYELIN analysis
  const count=(organName,type)=>win.filter(e=>e.organ===organName&&e.type===type).length;
  const closed=(organName)=>win.filter(e=>e.organ===organName&&e.type==='EPISODE_CLOSED').length;
  const rows=[['SINE','Completed episodes',ended?closed('SINE'):null],['MINE','Completed episodes',ended?closed('MINE'):null],['COSINE','Completed episodes',ended?closed('COSINE'):null],['MIRL','Verified recoveries',ended?count('SINE','RECOVERY_CONFIRMED')+count('MIRL','RECOVERY_CONFIRMED'):null],['SECANT','Completed episodes',ended?closed('SECANT'):null],['COSECANT','Completed returns',ended?count('COSECANT','RETURN_CONFIRMED'):null],['STUDY','Completed study blocks',ended?count('STUDY','BLOCK_COMPLETED'):null],['NORMAL BREAK','Completed break events',ended?win.filter(e=>e.organ==='NORMAL_BREAK'&&/COMPLETED|ACKNOWLEDGED|RESUME/.test(e.type)).length:null]];
  const whole=sec('WHOLE-MYELIN ANALYSIS','Final session-level summary prepared for Chapter 5.',pill(ended?'RESULT PACKAGE READY · WEB LOCAL':'AWAITING COMPLETED MYELIN RUN','cyan'),
    el('div',{class:'c3-whole'},rows.map(([o,m,v])=>el('div',{class:'c3-whole-row'},el('b',{},o),el('span',{},m),el('em',{},v===null?'—':String(v))))),
    el('div',{class:'c3-whole-st'},el('p',{},el('span',{},'Session status'),el('em',{},exp?(running?'RUNNING':(r.state==='ENDED'?'STOPPED':status)):'—')),el('p',{},el('span',{},'Analysis status'),el('b',{},ended?'WEB LOCAL · READY FOR TRANSFER':'AWAITING COMPLETED MYELIN RUN'))),el('p',{class:'c3-note'},ended?'Whole-session counts cover the experiment window only.':'Whole-session analysis will appear after STOP.'));
  return el('div',{class:'c3-page'},hero,transfer,strip,timeline,metrics,feed,derived,el('div',{class:'c3-two'},coverage,limits),whole);
}
