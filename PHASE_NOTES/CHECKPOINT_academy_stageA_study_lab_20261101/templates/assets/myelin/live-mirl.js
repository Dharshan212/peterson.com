// Live MIRL page + "Live MIRL Dashboard" glass overlay (CONTROL_STATION/application.py LiveMirlShowcasePage / LiveMirlDashboardDialog).
// Same blocks, wording, states and five tabs as the desktop. Every value is derived from this browser's accepted MIRL / SINE events
// (the web has no read model): nothing is estimated, an unmeasured figure reads as unmeasured, and an empty history reads as "No Episode Evidence".
import {el,button,fmt} from './dom.js';
import {SURFACES} from './simulator.js';
const PILLS={episode_created:['start','Start'],sine_displayed:['active','Active'],sine_response_recorded:['evidence','Evidence'],return_intent_recorded:['evidence','Evidence'],return_verification_started:['active','Active'],return_verification_interrupted:['','Interrupted'],relapse_detected:['','Relapse'],return_verified:['completed','Completed'],closure_confirmation_completed:['completed','Completed'],episode_closed:['terminal','Terminal']};
const title=n=>String(n||'').split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')||'Event';
const dash='—',UNAVAILABLE='Unavailable',NOT_RECORDED='Not Recorded',RECOVERED='RETURNED';
const surfaceLabel=id=>{const s=Object.values(SURFACES).find(v=>v.resourceId===id);return s?(s.platform||s.label):null;};
export function duration(s){if(!Number.isFinite(s))return UNAVAILABLE;const t=Math.floor(Math.max(0,s)),d=Math.floor(t/86400),h=Math.floor(t%86400/3600),m=Math.floor(t%3600/60),sec=t%60;return d?`${d}d ${String(h).padStart(2,'0')}h`:h?`${h}h ${String(m).padStart(2,'0')}m`:m?`${m}m ${String(sec).padStart(2,'0')}s`:`${sec}s`;}
const latency=s=>Number.isFinite(s)?`${s.toFixed(1)}s`:dash;
const delta=(a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b))return dash;const g=Math.round(b-a),sign=g<0?'-':'+',x=Math.abs(g),h=Math.floor(x/3600),m=Math.floor(x%3600/60),s=x%60;return h?`${sign}${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${sign}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;};
const recovered=o=>o===RECOVERED;
const nonReturn=row=>{const o=row?.outcome;if(!o||recovered(o)||o==='EMERGENCY')return '';return String(o).replaceAll('_',' ').toUpperCase();};

/* ---------------- model ---------------- */
function mapEvent(e){const t=e.type,o=e.organ,pl=e.payload||{};
  if(o==='MIRL'&&t==='EPISODE_STARTED')return {name:'episode_created',kind:'observed'};
  if(o==='SINE'&&t==='STAGE_DISPLAYED')return {name:'sine_displayed',kind:'observed'};
  if(o==='SINE'&&t==='RETURN_INTENT')return {name:'sine_response_recorded',kind:'observed'};
  if(o==='MIRL'&&t==='RETURN_INTENT')return {name:'return_intent_recorded',kind:'observed'};
  if(o==='MIRL'&&t==='RETURN_STARTED')return {name:'return_verification_started',kind:'observed'};
  if(o==='MIRL'&&t==='RETURN_INTERRUPTED')return {name:'return_verification_interrupted',kind:'observed',code:pl.reason};
  if(o==='MIRL'&&t==='RELAPSE')return {name:'relapse_detected',kind:'observed',code:pl.reason};
  if(o==='MIRL'&&t==='RETURN_VERIFIED')return {name:'return_verified',kind:'derived'};
  if(o==='MIRL'&&t==='RECOVERY_CONFIRMED')return {name:'closure_confirmation_completed',kind:'derived'};
  if(o==='MIRL'&&t==='EPISODE_CLOSED')return {name:'episode_closed',kind:'observed',code:pl.outcome};
  return null;}
export function mirlModel(snaps,live){
  const sessions=snaps.filter(s=>s.session).slice().sort((a,b)=>String(a.session.startedAt).localeCompare(String(b.session.startedAt)));const rows=[],issues=[];
  sessions.forEach((snap,si)=>{const ev=snap.events||[],iv=ev.filter(e=>e.type==='OBSERVATION_INTERVAL');
    ev.filter(e=>e.organ==='MIRL'&&e.type==='EPISODE_STARTED').forEach(start=>{const id=start.episodeId,es=ev.filter(e=>e.episodeId===id&&(e.organ==='SINE'||e.organ==='MIRL')).sort((a,b)=>a.sequence-b.sequence);
      const closeM=es.find(e=>e.organ==='MIRL'&&e.type==='EPISODE_CLOSED')||es.find(e=>e.organ==='SINE'&&e.type==='EPISODE_CLOSED'),trig=es.find(e=>e.organ==='SINE'&&e.type==='EPISODE_STARTED');
      const timeline=[];for(const e of es){const x=mapEvent(e);if(!x)continue;if(x.name==='episode_closed'&&timeline.some(y=>y.name==='episode_closed'))continue;timeline.push({...x,utc:e.utc,eff:e.effectiveSeconds,ref:e.payload?.requestId||e.payload?.attemptId||null});}
      /* the episode is created when SINE-1 is admitted, so it leads the record even though SINE's own display fact is emitted first */
      timeline.sort((p,q)=>(p.name==='episode_created'?0:1)-(q.name==='episode_created'?0:1));timeline.forEach((x,i)=>{x.seq=i+1;});
      if(!closeM||!timeline.some(x=>x.name==='episode_closed')){/* an open or SINE-only closure keeps its own events */}
      const isLive=!!live&&live.episodeId===id&&live.sessionId===snap.session.id,outcome=closeM?(closeM.payload?.outcome==='ENDED'?'SESSION_ENDED':closeM.payload?.outcome??'CLOSED'):(isLive?null:'NOT_RETURNED');
      const ver=[...es].reverse().find(e=>e.organ==='MIRL'&&e.type==='RETURN_VERIFIED'),w=trig&&iv.find(i=>i.payload.start<=trig.effectiveSeconds&&trig.effectiveSeconds<=i.payload.end&&i.payload.resourceId);
      const bad=timeline.filter(x=>!Number.isFinite(Date.parse(x.utc)));bad.forEach(x=>issues.push({code:'INVALID_WALL_TIMESTAMP',episode:id,seq:x.seq}));
      rows.push({episodeId:id,startedUtc:start.utc,startedEff:start.effectiveSeconds,outcome,timeline,stages:es.filter(e=>e.organ==='SINE'&&e.type==='STAGE_DISPLAYED').map(e=>Number(e.payload.stage)).filter(Number.isFinite),
        sessionNo:si+1,triggerUtc:trig?.utc||null,triggerEff:trig?.effectiveSeconds,application:w?(surfaceLabel(w.payload.resourceId)||w.payload.resourceId):null,recoveredUtc:ver?.utc||null,recoveredEff:ver?.effectiveSeconds,
        attempts:es.filter(e=>e.organ==='MIRL'&&e.type==='RETURN_STARTED').length,relapses:es.filter(e=>e.organ==='MIRL'&&e.type==='RELAPSE').length,integrity:bad.length?'DEGRADED':'CONFIRMED',live:isLive});});});
  rows.sort((a,b)=>String(a.startedUtc).localeCompare(String(b.startedUtc))||a.startedEff-b.startedEff);const perDay={};
  rows.forEach((r,i)=>{r.triggerNo=i+1;const d=new Date(r.startedUtc),key=Number.isFinite(+d)?`${String(d.getUTCDate()).padStart(2,'0')}${String(d.getUTCMonth()+1).padStart(2,'0')}${d.getUTCFullYear()}`:'00000000';perDay[key]=(perDay[key]||0)+1;r.id=`EPI-${key}-${String(perDay[key]).padStart(2,'0')}`;
    r.measured=recovered(r.outcome)&&Number.isFinite(r.recoveredEff)&&Number.isFinite(r.startedEff)&&r.recoveredEff>=r.startedEff?r.recoveredEff-r.startedEff:null;});
  const episodes=rows.slice().reverse(),active=episodes.filter(r=>r.outcome===null),closed=episodes.filter(r=>r.outcome!==null);
  const state=!episodes.length?'empty':active.length?'active':'idle',focus=active[0]||closed[0]||null;
  const integrity=!episodes.length?'UNAVAILABLE':episodes.some(r=>r.integrity!=='CONFIRMED')?'DEGRADED':'CONFIRMED';
  const counts={};closed.forEach(r=>{counts[r.outcome]=(counts[r.outcome]||0)+1;});if(active.length)counts.PENDING=active.length;
  const returns=episodes.filter(r=>recovered(r.outcome)),worst=returns.map(r=>r.measured).filter(Number.isFinite);
  return {episodes,active,closed,state,focus,integrity,issues,counts,verified:returns.length,worstDrift:worst.length?Math.max(...worst):null,generatedAt:new Date().toISOString()};
}

/* ---------------- dom helpers ---------------- */
const sp=(cls,...k)=>el('span',{class:cls},...k);
const pill=(role,text)=>el('span',{class:`journey-pill${role?' '+role:''}`},text);
const chip=(text,role)=>el('span',{class:`chip-pill${role?' '+role:''}`},text);
const ARROW='<svg viewBox="0 0 22 8" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 4h16" stroke-dasharray="3 2"/><path d="M14 1l4 3-4 3"/></svg>';
function stat(value,caption,{color=true,small=false}={}){const s=el('div',{class:'metric-stat'+(small?' word':'')+(color?'':' unset')},el('div',{class:'num'},value),el('div',{class:'label'},caption));if(color)s.style.setProperty('--mstat-color','var(--cyan)');return s;}
function strip(row,T){const box=el('div',{class:'journey-strip'});
  if(!row||!row.timeline.length){box.append(el('span',{class:'mirl-note'},'No recorded event evidence for this episode.'));return box;}
  const clock=iso=>`${T.time(iso)} [${T.tag()}]`,closed=row.outcome!==null&&row.outcome!=='NO_CLOSE_RECORDED';   /* an imported episode with no recorded close ends on its last event, not on an invented outcome */
  row.timeline.forEach((e,i)=>{const last=i===row.timeline.length-1,kindL=e.kind==='derived'?'Derived':'Observed',[role,ptext]=PILLS[e.name]||['',title(e.name)];
    if(last&&closed)box.append(el('div',{class:`jflow-outcome ${recovered(row.outcome)?'returned':'terminal-red'}`},el('div',{class:'jf-label'},row.outcome||dash),el('div',{class:'jf-sub'},`${kindL} · ${clock(e.utc)}`)));
    else box.append(el('div',{class:`journey-step${role==='evidence'?' evidence':''}`},el('div',{class:'idx'},`#${e.seq}`),el('div',{class:'name'},title(e.name)),pill(role,ptext),el('div',{class:'ts'},`${kindL} · ${clock(e.utc)}`)));
    if(!last){const l=el('div',{class:'jflow-link'},el('span',{class:'arrow'}),sp('',e.deltaNext!==undefined?e.deltaNext:delta(e.eff,row.timeline[i+1].eff)));l.firstChild.innerHTML=ARROW;box.append(l);}});
  return box;}

/* ---------------- Live MIRL page ---------------- */
export function buildMirlPage({model,live,T,actions}){
  const m=model,focus=m.focus,active=m.state==='active',integrity=m.integrity;
  const parts=[];if(!live.signal)parts.push('Live signal unavailable');parts.push('All committed evidence',`Integrity: ${integrity}`,`${m.issues.length} Exclusions`);
  const top=el('div',{class:'mirl-topline'},el('h2',{},sp('dot'),'Live MIRL — Authoritative Overview'),sp('hint',parts.join('  |  ')));
  const statusValue=active?'Episode Active':m.state==='idle'?'No Active Episode':'No Episode Evidence';
  const outcomeVal=active?'In Progress':m.state==='idle'?(focus?.outcome?String(focus.outcome):dash):'No factual MIRL episode has been recorded.';
  const banner=el('div',{class:`episode-banner${active?' ok':''}`,id:'mirlBanner'},el('div',{},el('div',{class:`episode-status-lbl${active?' ok-dot':''}`},sp('episode-status-dot'),'Episode Status'),el('div',{class:'episode-status-value'},statusValue)),
    m.state==='empty'?el('div',{class:'episode-outcome'},el('div',{class:'val muted'},outcomeVal)):el('div',{class:'episode-outcome'},el('div',{class:'lbl'},'Latest Outcome'),el('div',{class:'val'},outcomeVal),active?el('div',{class:'mirl-open',id:'mirlOpenFor'},`Open for ${duration(live.time-focus.startedEff)}`):null));
  const triggerText=live.triggerNo!=null?String(live.triggerNo):focus?String(focus.triggerNo):NOT_RECORDED,sessionText=live.sessionNo!=null?String(live.sessionNo):focus?String(focus.sessionNo):NOT_RECORDED;
  const stats=el('div',{class:'metric-stat-row mirl-3'},[[triggerText,'Trigger'],[live.sineStage,'SINE Stage'],[sessionText,'Session No.']].map(([v,c])=>stat(v,c,{small:!(/^\d+$/.test(v)||v.startsWith('SINE-'))})));
  const prev=button('',()=>{journey.scrollBy({left:-156,behavior:'smooth'});},{class:'mirl-chev','aria-label':'Scroll journey left'}),next=button('',()=>{journey.scrollBy({left:156,behavior:'smooth'});},{class:'mirl-chev','aria-label':'Scroll journey right'});
  prev.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>';next.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  const has=!!(focus&&focus.timeline.length);prev.disabled=next.disabled=!has;
  const journey=strip(focus,T);journey.id='mirlJourney';
  const jcard=el('section',{class:'card mirl-journey'},el('div',{class:'journey-card-head'},el('div',{class:'title'},focus?`Event Journey — ${focus.id}`:'Event Journey'),el('div',{class:'journey-nav'},sp('hint',focus?`${focus.timeline.length} recorded events`:'No episode recorded'),prev,next)),journey);
  const latencyText=focus?(Number.isFinite(focus.imported?focus.verifiedLatency:focus.measured)?latency(focus.imported?focus.verifiedLatency:focus.measured):(nonReturn(focus)||dash)):dash,timer=live.sineTimer;
  const outcomes=[[latencyText,'Return Latency'],[timer,'SINE Timer',{id:'mirlSineTimer'}],[String(m.verified),'Verified Returns'],[Number.isFinite(m.worstDrift)?duration(m.worstDrift):UNAVAILABLE,'Worst Drift']].map(([v,c,o],i)=>{const measured=v!==dash,t=stat(v,c,{color:measured,small:v.length>8});if(o?.id)t.querySelector('.num').id=o.id;return t;});
  const cta=el('div',{class:'btn-cta-row'},button('REFRESH',actions.refresh,{class:'btn-block outline mirl-refresh',id:'mirlRefresh'}),button('',actions.open,{class:'btn-cta',id:'mirlOpenDash'}));
  cta.lastChild.innerHTML='<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>Open Full Dashboard';
  return el('div',{class:'mh-wrap mirl-page','aria-label':'Live MIRL'},top,banner,stats,jcard,el('div',{class:'metric-stat-row'},outcomes),cta);
}

/* ---------------- dashboard overlay ---------------- */
const TABS=['Current Episode','Episode History','Event Timeline','History Evidence','Data Quality'];
export function createMirlDashboard({getModel,getLive,T,actions}){
  let root=null,tab=0,opener=null,picked='',collapsed={},body=null;const strips=3;
  const clock=iso=>Number.isFinite(Date.parse(iso))?`${T.time(iso)} [${T.tag()}]`:UNAVAILABLE,hm=iso=>Number.isFinite(Date.parse(iso))?`${T.hm(iso)} [${T.tag()}]`:UNAVAILABLE;
  const gcard=(...k)=>el('section',{class:'gcard'},...k),gstat=(c,v)=>el('div',{class:'gstat'},el('div',{class:'lbl'},c),el('div',{class:'val'},v));
  const empty=t=>el('p',{class:'mirl-note'},t),dayHeading=(d,n)=>el('div',{class:'mirl-day'},el('b',{},d.toUpperCase()),sp('',`${n} episode(s)`));
  const kv=lines=>el('pre',{class:'gkv'},lines);
  function story(row){const m=(t)=>sp('mirl-m',t),s=(t,c='')=>sp(`mirl-v ${c}`.trim(),String(t));const out=row.outcome;const l=[];
    l.push([m('Episode '),s(row.id),m(' opened on '),s(T.day(row.startedUtc)),m(' at '),s(hm(row.startedUtc)),m(' on '),row.application?s(row.application):m('an unnamed surface'),m(' — trigger '),s(row.triggerNo),m(', session '),s(row.sessionNo),m('.')]);
    const last=row.timeline.length?row.timeline[row.timeline.length-1].name:null;l.push([m('MYELIN escalated as far as '),s(row.stages.length?`SINE-${Math.max(...row.stages)}`:NOT_RECORDED),m(' and recorded '),s(row.timeline.length),m(' event(s)'),last?m(', the last being '):null,last?s(last):null,m('.')]);
    if(recovered(out))l.push(Number.isFinite(row.measured)?[m('You returned after '),s(duration(row.measured),'green'),m(', verified at '),s(hm(row.recoveredUtc),'green'),m('.')]:[m('You returned, but the exact latency could not be measured.')]);
    else if(out===null)l.push([m('The episode is '),s('still open','amber'),m('.')]);
    else l.push([m('You did not return — it ended '),s(String(out).replaceAll('_',' '),'red'),m('.')]);
    l.push([m('It carries '),s(row.attempts),m(' recovery attempt(s) and '),s(row.relapses),m(' relapse(s), with evidence integrity '),s(row.integrity,row.integrity==='CONFIRMED'?'green':'muted'),m('.')]);
    return el('p',{class:'mirl-story'},...l.flatMap((parts,i)=>[i?' ':null,...parts.filter(Boolean)]).filter(x=>x!==null));}
  function banner(row,activeNow,size){return el('div',{class:`episode-banner${activeNow?' ok':''}`},el('div',{},el('div',{class:`episode-status-lbl${activeNow?' ok-dot':''}`},sp('episode-status-dot'),'Episode Status'),el('div',{class:'episode-status-value',style:`font-size:${size}px`},activeNow?'Episode Active':'No Active Episode — Inspecting Closed Episode')),el('div',{class:'episode-outcome'},el('div',{class:'lbl'},'Latest Outcome'),el('div',{class:'val'},activeNow?'In Progress':(row.outcome?String(row.outcome):dash))));}
  const views=[
    (m,live)=>{if(!m.focus)return [empty('No factual MIRL episode has been recorded.')];const f=m.focus,a=m.state==='active';
      return [banner(f,a,16),el('div',{class:'gstat-row'},gstat('Trigger',live.triggerNo!=null?String(live.triggerNo):String(f.triggerNo)),gstat('SINE Stage',live.sineStage),gstat('Elapsed Time',a?duration(live.time-f.startedEff):duration(f.measured))),story(f)];},
    (m)=>{const eps=m.episodes;if(!eps.length)return [empty('No episode has been recorded.')];const drawn=Math.min(strips,eps.length);let cap=`${m.active.length} open · ${m.closed.length} closed episode(s), newest first.`;if(eps.length>drawn)cap+=`  Journeys for the newest ${drawn} are drawn; open any other episode's journey with its own button.`;
      const out=[empty(cap)];let index=0;const card=row=>{const idx=index++;const shown=collapsed[row.episodeId]===undefined?idx<drawn:!collapsed[row.episodeId];const st=strip(row,T);st.hidden=!shown;const tg=button(shown?'HIDE JOURNEY':'SHOW JOURNEY',()=>{collapsed[row.episodeId]=!st.hidden;st.hidden=!st.hidden;tg.textContent=st.hidden?'SHOW JOURNEY':'HIDE JOURNEY';},{class:'btn-block outline sm'});tg.disabled=!row.timeline.length;
        return gcard(el('div',{class:'mirl-card-head'},sp('mirl-id',row.id),sp('spacer'),sp('muted',`${row.timeline.length} recorded events`),chip(row.outcome?String(row.outcome).replaceAll('_',' '):'IN PROGRESS',row.outcome?(recovered(row.outcome)?'green':'red'):'cyan'),sp('muted',`${T.day(row.startedUtc)} · ${T.time(row.startedUtc)} [${T.tag()}]`),tg),st);};
      if(m.active.length){out.push(dayHeading('Open now',m.active.length));m.active.forEach(r=>out.push(card(r)));}
      const per={};m.closed.forEach(r=>{const d=T.day(r.startedUtc);(per[d]=per[d]||[]).push(r);});for(const [d,rs] of Object.entries(per)){out.push(dayHeading(d,rs.length));rs.forEach(r=>out.push(card(r)));}return out;},
    (m)=>{const eps=m.episodes;const sel=el('select',{class:'mirl-picker','aria-label':'Episode',id:'mirlPicker'});eps.forEach(r=>sel.append(el('option',{value:r.episodeId},`${T.day(r.startedUtc)}  ·  ${r.id}  ·  ${r.outcome?String(r.outcome):'In Progress'}  ·  ${r.timeline.length} event(s)`)));
      const row=eps.find(r=>r.episodeId===picked)||m.focus;if(!eps.length)sel.disabled=true;else sel.value=row.episodeId;sel.onchange=()=>{picked=sel.value;render();};
      const out=[el('label',{class:'mirl-pick'},sp('lbl','Episode'),sel)];if(!row||!row.timeline.length){out.push(empty('No authoritative event to show.'));return out;}
      out.push(empty(`${row.id} · ${row.timeline.length} authoritative event(s) — episode_seq order`));
      row.timeline.forEach(e=>{const [role,pt]=PILLS[e.name]||['',title(e.name)];out.push(gcard(el('div',{class:'mirl-trow'},sp('mono muted',`#${e.seq}`),sp('mirl-tt',title(e.name)),sp('spacer'),pill(role,pt),chip(`${title(e.kind)} ${clock(e.utc)}`,'cyan'),e.code?chip(String(e.code)):null,e.ref?chip('Has Evidence'):null)));});return out;},
    (m)=>{const eps=m.episodes;const rows=eps.map((r,i)=>{const rec=recovered(r.outcome);return [String(i+1),r.id,hm(r.startedUtc),rec&&r.recoveredUtc?hm(r.recoveredUtc):UNAVAILABLE,r.stages.length?`SINE-${Math.max(...r.stages)}`:NOT_RECORDED,r.triggerUtc?clock(r.triggerUtc):UNAVAILABLE,r.application||UNAVAILABLE,rec&&Number.isFinite(r.measured)?duration(r.measured):(nonReturn(r)||UNAVAILABLE)];});
      const tbl=el('table',{class:'gtable'},el('thead',{},el('tr',{},['#','Episode ID','Time Distracted','Time Recovered','Highest SINE','Trigger Time','Application','Return Latency'].map(h=>el('th',{},h)))),el('tbody',{},rows.map(r=>el('tr',{},r.map((c,i)=>el('td',{class:i===0?'mono':''},c))))));
      return [empty(eps.length?`${eps.length} episode(s) in this projection — every column is a recorded or projected value; nothing is estimated.`:'No episode has been recorded.'),el('div',{class:'gtable-wrap mirl-tbl'},tbl)];},
    (m)=>{const live=getLive();const a=gcard(el('h3',{},'Authoritative Evidence Boundary'),el('p',{class:m.integrity==='CONFIRMED'?'green':''},m.episodes.length?(m.integrity==='CONFIRMED'?'All recorded episode events carry readable timestamps.':'Some recorded events carry unreadable timestamps and are listed below.'):'No projection loaded'),
        kv([`Integrity status: ${m.integrity}`,`Integrity issues: ${m.issues.length}`,`Metric exclusions: ${m.exclusionCount??m.issues.length}`,m.imported?`Evidence population: ${m.src.population}`:'Evidence population: This browser\'s accepted MIRL and SINE events','Population scope: All committed evidence',m.imported?`Range: ${m.src.range}`:'Range: All local sessions',`Projected at: ${m.generatedAt}`,m.imported?`Projector: ${m.src.projector}`:'Projector: web-lite local event projection','Episode ordering: episode_seq','Missing evidence: Display as unavailable; never paint as completed','Scientific boundary: Behavioral and software evidence only'].join('\n')));
      const keys=Object.entries(m.counts),b=gcard(el('h3',{},'Recorded Outcome Population'),el('p',{},m.imported?'Counts below are the desktop read model\'s native outcome counts. An episode with no recorded close that a later episode superseded is shown as NOT_RETURNED; the latest one with no recorded close is shown as NO CLOSE RECORDED, because a file cannot say whether it was still running.':'Counts below come from the accepted events unchanged. An episode with no closing event is shown as NOT_RETURNED once its session is over, because no recorded event ever ended it.'),kv(keys.length?keys.map(([k,v])=>`${k}: ${v}`).join('\n'):'No counts published.'));
      const c=gcard(el('h3',{},'Integrity Issues and Exclusions'),m.issues.length?kv(m.issues.slice(0,12).map(i=>`${i.code}: ${i.episode} #${i.seq}`).join('\n')+(m.issues.length>12?`\n… ${m.issues.length-12} more`:'')):el('p',{class:'mirl-note'},'No integrity issue or metric exclusion was recorded.'));void live;return [a,b,c];}];
  function chips(m,live){const open=m.state==='active';const out=[chip(open?'MIRL: Episode Open':m.state==='idle'?'MIRL: No Open Episode':'MIRL: No Evidence',open?'green':m.state==='idle'?'red':''),chip(`Integrity: ${m.integrity}`,m.integrity==='CONFIRMED'?'green':''),chip(m.imported?m.src.chip:'Source: Local Events','cyan')];if(!live.signal)out.push(chip('Live Signal: Unavailable'));return out;}
  function render(){if(!root)return;const m=getModel(),live=getLive();
    root.querySelector('.glass-header-right .chips').replaceChildren(...chips(m,live));root.querySelector('#mirlExcl').textContent=`Exclusions: ${m.exclusionCount??m.issues.length}`;
    root.querySelector('#mirlProjected').textContent=`Projected ${T.day(m.generatedAt)} · ${T.time(m.generatedAt)} [${T.tag()}]`;
    [...root.querySelectorAll('.glass-tab')].forEach((b,i)=>{b.classList.toggle('active',i===tab);b.setAttribute('aria-selected',String(i===tab));b.tabIndex=i===tab?0:-1;});
    const top=body.scrollTop;body.replaceChildren(...views[tab](m,live).filter(Boolean));body.scrollTop=top;}
  function close(){if(!root)return;document.removeEventListener('keydown',onKey,true);root.remove();root=null;body=null;(opener&&opener.isConnected?opener:null)?.focus();opener=null;}
  function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.key==='Tab'&&root){const f=[...root.querySelectorAll('button,select,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  function open(from){if(root){root.querySelector('.glass-close')?.focus();return;}opener=from||document.activeElement;
    const closeBtn=button('',close,{class:'glass-close','aria-label':'Close Live MIRL Dashboard'});closeBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const tabs=el('div',{class:'glass-tabbar',role:'tablist','aria-label':'Live MIRL Dashboard sections'},TABS.map((t,i)=>{const b=el('button',{type:'button',class:'glass-tab',role:'tab',on:{click:()=>{tab=i;render();}}},t);b.addEventListener('keydown',e=>{const n=e.key==='ArrowDown'||e.key==='ArrowRight'?(i+1)%TABS.length:e.key==='ArrowUp'||e.key==='ArrowLeft'?(i+TABS.length-1)%TABS.length:null;if(n!==null){e.preventDefault();tab=n;render();tabs.children[n].focus();}});return b;}));
    body=el('div',{class:'glass-content',id:'mirlDashBody',role:'tabpanel',tabindex:'-1'});
    const logo=el('span',{class:'mirl-logo','aria-hidden':'true'});logo.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12c3-6 6-6 9 0s6 6 9 0"/></svg>';
    const exp=button('EXPORT MIRL REPORT',actions.export,{class:'btn-block outline',id:'mirlExport'});
    root=el('div',{class:'glass-overlay open mirl-dash',id:'mirlDash',role:'dialog','aria-modal':'true','aria-labelledby':'mirlDashTitle'},
      el('div',{class:'glass-panel'},el('div',{class:'glass-header'},el('div',{class:'glass-header-left'},logo,sp('glass-header-title','MYELIN')),el('div',{class:'glass-header-center',id:'mirlDashTitle'},'Live MIRL Dashboard'),el('div',{class:'glass-header-right'},el('span',{class:'chips'}),closeBtn)),
        el('div',{class:'glass-subline'},el('div',{class:'sub-left'},sp('','Authoritative Native MIRL Episode Evidence'),el('span',{id:'mirlExcl'},'Exclusions: —')),exp),
        el('div',{class:'glass-body'},tabs,body),el('div',{class:'glass-footer'},sp('','MYELIN v2.0 · Corrected Design Preview'),el('span',{class:'mono',id:'mirlProjected'},'Not loaded'))));
    root.addEventListener('mousedown',e=>{if(e.target===root)close();});document.body.append(root);document.addEventListener('keydown',onKey,true);render();closeBtn.focus();}
  return {open,close,refresh:render,get isOpen(){return !!root;}};
}
