// Science Lab Chapter 2 — "Parts of MYELIN": five living organ schematics (SCIENCE_LAB/schematics.py, SCIENCE_LAB/chapters.py).
// Presentation only: every click changes local widget state. Nothing here reads or commands the MYELIN runtime, and the fact
// tables in schematics-data.js are the desktop's own constants. The step cadence, node/connector/popup vocabulary and the demo
// sequences follow the desktop widgets one to one; "timing not to scale" is the desktop's own wording.
import {el,button} from './dom.js';
import {FACTS} from './schematics-data.js';
const STEP=220;
const svg=(w,inner,h=w)=>`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
const dot=(x,y,r,c,o=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="none" opacity="${o}"/>`;
const SYM={
  human:()=>svg(56,'<circle cx="28" cy="11.2" r="7.3"/><path d="M28 18.5V34.7M15.7 28L28 22.4L40.3 28M28 34.7L17.9 49.3M28 34.7L38.1 49.3"/>'),
  monitor:()=>svg(56,'<rect x="6.7" y="6.7" width="42.6" height="28" rx="4"/><path d="M12.7 20.7H43.3M28 34.7V41.4M16.8 48.2H39.2"/>'),
  evidence:()=>svg(48,'<path d="M24 10.6V27.8"/>'+dot(24,36.5,2.6,'currentColor')),
  check:()=>svg(40,'<path d="M8.8 20.8L16.8 28.8L32 12"/>'),
  pause:()=>svg(40,'<rect x="12" y="10.4" width="6.4" height="19.2" rx="2" fill="currentColor" stroke="none"/><rect x="22.4" y="10.4" width="6.4" height="19.2" rx="2" fill="currentColor" stroke="none"/>'),
  messaging:()=>svg(52,'<rect x="7.3" y="8.3" width="37.4" height="25" rx="8"/><path d="M15.5 33.3L12.5 40.6L25 33.3"/>'+dot(18,20.8,1.8,'currentColor')+dot(26,20.8,1.8,'currentColor')+dot(34,20.8,1.8,'currentColor')),
  timer:()=>svg(48,'<circle cx="24" cy="24" r="16"/><path d="M24 13V24L32 28"/>'),
  neutral:()=>svg(48,'<circle cx="24" cy="24" r="14"/><path d="M17 24H31"/>'),
  ott:()=>svg(56,'<rect x="6" y="9" width="36" height="26" rx="4"/><path d="M20 16V28L30 22Z"/><path d="M24 35V40M16 44H32"/>'+dot(44,38,5.5,'var(--acc)')),
  study:()=>svg(56,'<path d="M7 13L28 17V47L7 43Z"/><path d="M49 13L28 17V47L49 43Z"/>'),
  exact:()=>svg(56,'<rect x="10" y="6" width="30" height="36" rx="4"/><path d="M17 16H33M17 23H33M17 30H27"/><rect x="31" y="34" width="16" height="13" rx="2.5"/><path d="M35 34V31A4 4 0 0 1 43 31V34"/>'),
  sine:(lit)=>{const m=(k,x,y,c)=>dot(x,y,lit===k?4.6:3,c,lit===k?1:.55);return svg(72,'<circle cx="36" cy="36" r="24.5"/><path d="M20.1 36C28.6 22.5 33.5 49.5 39.7 36C44.6 26.2 48.3 43.4 52 36"/>'+m('sine_1',36,4.5,'#3DDCFF')+m('sine_2',67.5,36,'#F5A623')+m('sine_3',36,67.5,'#FF4D6D'));},
  mine:(lit)=>{const m=(k,x,y,c)=>dot(x,y,lit===k?4.6:3,c,lit===k?1:.55);return svg(72,'<rect x="12" y="22" width="30" height="22" rx="7"/><path d="M20 44L16 52L29 44"/><rect x="28" y="32" width="30" height="22" rx="7"/><path d="M50 54L55 61L41 54"/>'+dot(22,33,1.6,'currentColor')+dot(27,33,1.6,'currentColor')+dot(32,33,1.6,'currentColor')+m('mine_1',48,12,'#F5A623')+m('mine_2',64,34,'#FF4D6D')+m('recovery',46,66,'#39D98A'));},
  cosine:(lit)=>{const m=(k,x,y,c)=>dot(x,y,lit===k?4.6:3,c,lit===k?1:.55);return svg(72,'<rect x="16" y="18" width="40" height="28" rx="5"/><path d="M32 25V39L44 32Z"/><path d="M36 46V52M28 56H44"/>'+m('intention',36,8,'#38BDF8')+m('break',65,34,'#F5A623')+m('recovery',36,66,'#39D98A'));},
  cosecant:(lit)=>{const m=(k,x,y,c)=>dot(x,y,lit===k?4.6:3,c,lit===k?1:.55);return svg(72,'<circle cx="36" cy="36" r="17"/><path d="M36 25V36L44 41"/><path d="M12 30A27 27 0 0 1 60 30M60 42A27 27 0 0 1 12 42" opacity=".55"/>'+m('break',36,6,'#39D98A')+m('overdue',66,36,'#F5A623')+m('recovery',36,66,'#39D98A')+m('final',6,36,'#FF4D6D'));}
};
const ORGAN_ACCENT={sine:'#3DDCFF',mine:'#B7A1FF',cosine:'#7C9CFF',cosecant:'#39D98A'};
const sym=(k,lit)=>SYM[k](lit);
const bdgClass=a=>({'#F5A623':'amber','#FF4D6D':'red','#39D98A':'green'}[a]||'cyan');
// ---------------------------------------------------------------- vocabulary: node, connector, caption, popup, info strip
function Reg(){return {nodes:{},conns:{},reduced:false,timers:new Set()};}
function node(reg,id,key,title,caption,acc,{lit=null,organ=false}={}){
  const holder=el('div',{class:'sch-sym'});holder.innerHTML=sym(key,lit);
  const n=el('div',{class:`sch-node${organ?' org':''}`,style:`--acc:${acc}`,'data-node':id},holder,el('b',{},title),caption?el('span',{},caption):null);
  const api={el:n,set:on=>n.classList.toggle('on',!!on),lit:v=>{holder.innerHTML=sym(key,v);}};reg.nodes[id]=api;return api;
}
function conn(reg,id){
  const spans=[0,1,2].map(()=>el('span',{},'›')),c=el('div',{class:'sch-conn','aria-hidden':'true'},...spans);let i=0,t=null;
  const stop=()=>{if(t){clearInterval(t);reg.timers.delete(t);t=null;}spans.forEach(s=>s.classList.remove('hot'));};
  const api={el:c,stop,pulse(){if(reg.reduced)return;stop();i=0;t=setInterval(()=>{spans.forEach((s,k)=>s.classList.toggle('hot',k===i));i++;if(i>spans.length)stop();},90);reg.timers.add(t);}};
  if(id)reg.conns[id]=api;return api;
}
const cap=(text,{role='muted',bold=false}={})=>el('p',{class:`sch-cap ${role}${bold?' bold':''}`},text);
const dbtn=(label,fn,attrs={})=>button(label,fn,{class:'sch-btn',...attrs});
const strip=rows=>el('div',{class:'sch-info'},rows.map(([k,v])=>el('div',{class:'sch-info-row'},el('b',{},k),el('span',{},v))));
const card=(...kids)=>el('div',{class:'sch-card'},...kids);
const heading=text=>el('h3',{class:'sch-h'},text);
const nrow=(...items)=>el('div',{class:'sch-row'},...items.map(i=>i.el||i));
const timingLabel=(text,tip)=>el('span',{class:'sch-timing',title:tip},text);
function banner(sub){return card(el('div',{class:'sch-badge-row'},el('span',{class:'sch-demo-badge'},'SCHEMATIC DEMONSTRATION · NOT LIVE TELEMETRY')),cap(sub));}
// Miniature popups: separate widgets that only imitate the real popups' wording (SCIENCE_LAB/schematics.py _MiniPopup family).
function popup(reg,kind,facts,{onButton,onDuration,range=[5,30],start=10,none='NO BUTTONS · AWAITING VERIFIED FOCUS RETURN'}={}){
  const badge=el('span',{class:'sch-stage-badge'}),tag=el('span',{class:'sch-pop-tag'},'SCHEMATIC'),head=el('b',{class:'sch-pop-head'}),msg=el('p',{class:'sch-pop-msg'}),ctx=el('p',{class:'sch-pop-ctx',hidden:''}),dur=el('b',{class:'sch-pop-dur',hidden:''}),status=el('p',{class:'sch-pop-status',hidden:''}),count=el('b',{class:'sch-pop-count',hidden:''});
  const spin=el('input',{type:'number',min:String(range[0]),max:String(range[1]),value:String(start),'aria-label':'Minutes'}),spinWrap=el('label',{class:'sch-pop-spin',hidden:''},el('span',{},'MINUTES:'),spin),btns=el('div',{class:'sch-pop-btns'});
  const root=el('div',{class:'sch-popup','data-kind':kind,role:'group','aria-label':'Schematic popup preview'},el('div',{class:'sch-pop-top'},badge,tag),head,msg,ctx,dur,status,count,spinWrap,btns);
  let enabled=false,stage=null,glowT=null;
  const pulse=(n=4)=>{if(reg.reduced)return;clearInterval(glowT);let k=0;root.classList.add('glow');glowT=setInterval(()=>{k++;root.classList.toggle('glow',k%2===1);if(k>=n){clearInterval(glowT);root.classList.remove('glow');}},180);};
  const api={el:root,get stage(){return stage;},
    show(key){stage=key;const f=facts[key];badge.textContent=f.label;badge.className=`sch-stage-badge ${bdgClass(f.accent)}`;head.textContent=f.headline;msg.replaceChildren(...String(f.message||'').split('\n').flatMap((l,i)=>i?[el('br'),l]:[l]));
      ctx.textContent=f.context||'';ctx.hidden=!f.context;dur.hidden=true;status.textContent=f.status||'';status.hidden=!f.status;count.hidden=true;count.textContent='';
      spinWrap.hidden=!['mine_1_duration','set_a_limit','break_length'].includes(key);root.dataset.variant=['mine_2a','mine_2b'].includes(key)?'critical':'normal';
      btns.replaceChildren();api.buttons=[];
      for(const label of f.buttons){const b=dbtn(label,()=>{if(['SET IMPORTANT TIME','START WATCHING','SET TIME'].includes(label))onDuration?.(Number(spin.value));onButton?.(label);});b.disabled=!enabled;btns.append(b);api.buttons.push(b);}
      if(!f.buttons.length)btns.append(el('span',{class:'sch-pop-none'},none));
      pulse(root.dataset.variant==='critical'?6:4);},
    buttons:[],enable(v){enabled=v;api.buttons.forEach(b=>b.disabled=!v);},
    visible(v){root.hidden=!v;},countdown(t){count.textContent=t;count.hidden=!t;},
    breakSet(minutes){api.show('break_set');dur.textContent=`${minutes} MINS`;dur.hidden=false;},stop(){clearInterval(glowT);root.classList.remove('glow');}};
  return api;
}
// Sequential step queue: pausing keeps the remaining steps, PLAY resumes them, REPLAY restarts the last sequence.
function runner(reg,intro,onToggle,reset){
  let pending=[],last=[],paused=false,t=null;
  const advance=()=>{if(paused||!pending.length)return;const [d,fn]=pending.shift();fn();if(pending.length)t=setTimeout(advance,reg.reduced?0:d);};
  const api={run(steps,remember=true){clearTimeout(t);if(remember)last=[...steps];pending=[...steps];paused=false;advance();},
    pause(){paused=true;clearTimeout(t);},play(){if(paused&&pending.length){paused=false;advance();}else if(!pending.length)api.run(intro());},
    replay(){reset?.();api.run(last.length?[...last]:intro(),false);},
    halt(){clearTimeout(t);paused=false;pending=[];for(const c of Object.values(reg.conns))c.stop();for(const x of reg.timers)clearInterval(x);reg.timers.clear();},
    reduced(on){reg.reduced=on;onToggle?.(on);if(on)for(const c of Object.values(reg.conns))c.stop();}};
  return api;
}
function demoControls(run){const rm=dbtn('REDUCED MOTION',()=>{const on=rm.getAttribute('aria-pressed')!=='true';rm.setAttribute('aria-pressed',String(on));rm.classList.toggle('on',on);run.reduced(on);},{'aria-pressed':'false'});
  return card(el('div',{class:'sch-demo-controls'},el('h3',{class:'sch-h'},'DEMO CONTROLS'),el('div',{class:'sch-demo-btns'},dbtn('PLAY FLOW',()=>run.play()),dbtn('PAUSE',()=>run.pause()),dbtn('REPLAY',()=>run.replay()),rm)));}
const S=(fn)=>[STEP,fn];
const chips=(labels,reg)=>{const els=labels.map(l=>el('span',{class:'sch-chip'},l));return els;};
const seqChips=els=>[...els.map(c=>S(()=>c.classList.add('on'))),...els.map(c=>S(()=>c.classList.remove('on')))];
// ---------------------------------------------------------------- SINE
function sineSchematic(){
  const reg=Reg(),N=reg.nodes,C=reg.conns,F=FACTS.SINE_STAGE_FACTS,T=FACTS.SINE_TIMING_FACTS;let run;
  const pop=popup(reg,'sine',F,{onButton:l=>{if(l==="I'M BACK"||l==="I'M BACK NOW")run.run(returnSteps());else if(l==='NEED A BREAK')run.run(breakSteps());}});
  node(reg,'user','human','USER','Works on an intended task.','#38BDF8');node(reg,'monitor','monitor','MONITOR','Observes certified software context.','#38BDF8');node(reg,'evidence','evidence','ELIGIBLE OFF-TASK EVIDENCE','Durable candidate admitted.','#38BDF8');node(reg,'sine','sine','SINE','Blue · gentle intervention.','#3DDCFF',{organ:true});
  conn(reg,'um');conn(reg,'me');conn(reg,'es');
  const resolved=cap('',{role:'cyan',bold:true});
  node(reg,'ri','evidence',"RETURN INTENT","Recorded when I'M BACK is pressed.",'#38BDF8');conn(reg,'rm');node(reg,'mirl','check','MIRL','Verifies recovery.','#39D98A');
  node(reg,'brk','pause','NORMAL BREAK','Break authority decides the pathway.','#94A3B8');conn(reg,'bg');node(reg,'gate','check','WELCOME BACK','Not a SINE stage.','#39D98A');
  node(reg,'s1','sine','SINE 1','45s display.','#3DDCFF',{lit:'sine_1'});node(reg,'s2','sine','SINE 2','60s display.','#F5A623',{lit:'sine_2'});node(reg,'s3','sine','SINE 3 · PROTECTED','No buttons.','#FF4D6D',{lit:'sine_3'});
  const ca=conn(reg,'ea'),cb=conn(reg,'eb'),cm=conn(reg,'em');node(reg,'ver','check','VERIFIED RECOVERY','Recovery authority = MIRL.','#39D98A');
  const reset=()=>{for(const n of Object.values(N))n.set(false);N.sine.lit(null);resolved.textContent='';pop.show('sine_1');pop.enable(false);};
  const intro=()=>[S(()=>N.user.set(true)),S(()=>C.um.pulse()),S(()=>N.monitor.set(true)),S(()=>C.me.pulse()),S(()=>N.evidence.set(true)),S(()=>C.es.pulse()),S(()=>{N.sine.set(true);N.sine.lit('sine_1');}),S(()=>pop.show('sine_1')),S(()=>pop.enable(true))];
  const returnSteps=()=>[S(()=>pop.enable(false)),S(()=>N.ri.set(true)),S(()=>C.rm.pulse()),S(()=>N.mirl.set(true)),S(()=>{resolved.textContent='VERIFIED RETURN · RESOLVED';})];
  const breakSteps=()=>[S(()=>pop.enable(false)),S(()=>N.brk.set(true)),S(()=>C.bg.pulse()),S(()=>N.gate.set(true))];
  const escalation=()=>[S(()=>N.s1.set(true)),S(()=>ca.pulse()),S(()=>N.s2.set(true)),S(()=>cb.pulse()),S(()=>N.s3.set(true)),S(()=>cm.pulse()),S(()=>N.ver.set(true)),S(()=>{resolved.textContent='VERIFIED RETURN · RESOLVED';})];
  run=runner(reg,intro,on=>pop.stop());pop.show('sine_1');pop.enable(false);
  const root=el('div',{class:'sch-pane','data-organ':'sine'},
    banner('Select an organ to explore how its signal pathway moves through MYELIN. DEMO SPEED — TIMING NOT TO SCALE.'),
    card(el('div',{class:'sch-row'},N.user.el,C.um.el,N.monitor.el,C.me.el,N.evidence.el,C.es.el,N.sine.el)),pop.el,
    card(el('div',{class:'sch-split'},el('div',{class:'sch-col'},nrow(N.ri,C.rm,N.mirl),cap('Button press records intent. MIRL verifies recovery.'),resolved),el('div',{class:'sch-col'},nrow(N.brk,C.bg,N.gate),cap('Re-arms the ordinary SINE-1 → SINE-2 interval after acknowledgement. Carries SineStage.NONE.')))),
    card(el('div',{class:'sch-h-row'},heading('ESCALATION PATH'),dbtn('SHOW ESCALATION',()=>run.run(escalation()))),nrow(N.s1,ca,timingLabel(`${T.stage_1_to_2_baseline} × F`,T.f_tooltip),N.s2,cb,timingLabel(`${T.stage_2_to_3_baseline} × F`,T.f_tooltip),N.s3,cm,N.ver)),
    strip([['ROLE','Escalating intervention authority.'],['INPUT','Durable eligible trigger evidence.'],['ACTION','Blue → Amber → Protected Red.'],['OUTPUT','Intervention facts / response intent.'],['CONNECTED SYSTEM','MIRL recovery verification · Normal Break branch.']]),
    cap('General SINE pathway shown. Study Mode uses its own study-specific presentation while preserving SINE authority.'),demoControls(run));
  return {el:root,run,intro,reset,popup:pop};
}
// ---------------------------------------------------------------- MINE
function mineSchematic(){
  const reg=Reg(),N=reg.nodes,C=reg.conns,F=FACTS.MINE_STAGE_FACTS,T=FACTS.MINE_TIMING_FACTS,B=FACTS.MINE_BRANCH_FACTS;let run;
  const pop=popup(reg,'mine',F,{range:[T.important_minutes_min,T.important_minutes_max],start:10,onButton:l=>{if(l==='I WILL COME BACK')run.run(returnIntent());else if(l==="IT'S IMPORTANT")run.run(important());},onDuration:m=>run.run(allowance(m))});
  node(reg,'user','human','USER','Works on an intended task.','#38BDF8');node(reg,'monitor','monitor','MONITOR','Observes certified software context.','#38BDF8');node(reg,'msg','messaging','CERTIFIED MESSAGING','MONITOR routes messaging context to MINE.','#38BDF8');node(reg,'gate','timer',T.initial_gate,'Supported messaging time.','#F5A623');node(reg,'mine','mine','MINE','Messaging-specific intervention.','#B7A1FF',{organ:true});
  ['um','mm','mg','gm'].forEach(k=>conn(reg,k));
  node(reg,'ri','evidence','RETURN INTENT','Recorded when I WILL COME BACK is pressed.','#F5A623');conn(reg,'rc');node(reg,'clock','timer',T.return_intent_window,'New qualifying messaging window.','#F5A623');
  node(reg,'neutral','neutral','NEUTRAL','Unsupported context.','#94A3B8');conn(reg,'nc');conn(reg,'c2a');node(reg,'m2a','evidence','MINE-2A','FINAL CALLBACK · NO BUTTONS','#FF4D6D');
  node(reg,'dur','timer',`${T.important_minutes_min}–${T.important_minutes_max} MIN`,'Whole-minute duration entry.','#F5A623');conn(reg,'da');node(reg,'allow','timer','IMPORTANT ALLOWANCE','Chosen by user.','#F5A623');conn(reg,'a2b');node(reg,'m2b','evidence','MINE-2B','FINAL CALLBACK · NO BUTTONS','#FF4D6D');
  node(reg,'focus','check','FOCUS OBSERVED','','#39D98A');conn(reg,'r1');node(reg,'conf','timer','RETURN CONFIRMING',`${T.final_callback_hide_seconds} s`,'#39D98A');conn(reg,'r2');node(reg,'ver','timer','RETURN VERIFYING',`${T.return_verification_seconds} s`,'#39D98A');conn(reg,'r3');node(reg,'stab','timer','STABILITY CONFIRMING',`${T.closure_confirmation_seconds} s`,'#39D98A');conn(reg,'r4');node(reg,'closed','check','MINE CLOSED','Return confirmed.','#39D98A');
  const allowCap=cap('',{role:'cyan',bold:true}),recCap=cap('',{role:'cyan',bold:true}),plats=chips(['PLATFORM A','PLATFORM B','PLATFORM C'],reg);
  const reset=()=>{for(const n of Object.values(N))n.set(false);N.mine.lit(null);plats.forEach(c=>c.classList.remove('on'));allowCap.textContent='';recCap.textContent='';pop.visible(true);pop.show('mine_1');pop.enable(false);};
  const intro=()=>[S(()=>N.user.set(true)),S(()=>C.um.pulse()),S(()=>N.monitor.set(true)),S(()=>C.mm.pulse()),S(()=>N.msg.set(true)),S(()=>C.mg.pulse()),S(()=>N.gate.set(true)),S(()=>C.gm.pulse()),S(()=>{N.mine.set(true);N.mine.lit('mine_1');}),S(()=>pop.show('mine_1')),S(()=>pop.enable(true))];
  const recovery=(early)=>[...(early?[S(()=>{recCap.textContent='Early return — recovery begins before MINE-2.';})]:[]),S(()=>N.focus.set(true)),S(()=>C.r1.pulse()),S(()=>N.conf.set(true)),S(()=>pop.visible(false)),S(()=>C.r2.pulse()),S(()=>N.ver.set(true)),S(()=>C.r3.pulse()),S(()=>N.stab.set(true)),S(()=>C.r4.pulse()),S(()=>{N.closed.set(true);N.mine.lit('recovery');}),S(()=>{recCap.textContent='RETURN CONFIRMED · MINE CLOSED';})];
  const returnIntent=()=>[S(()=>pop.enable(false)),S(()=>N.ri.set(true)),S(()=>C.rc.pulse()),S(()=>{N.clock.set(true);N.mine.lit(null);}),S(()=>C.c2a.pulse()),S(()=>{N.m2a.set(true);N.mine.lit('mine_2');}),S(()=>pop.show('mine_2a')),...recovery(false)];
  const important=()=>[S(()=>pop.show('mine_1_duration')),S(()=>pop.enable(true))];
  const allowance=m=>[S(()=>pop.enable(false)),S(()=>N.dur.set(true)),S(()=>C.da.pulse()),S(()=>N.allow.set(true)),S(()=>{allowCap.textContent=`${m} MIN ALLOWANCE`;}),S(()=>C.a2b.pulse()),S(()=>{N.m2b.set(true);N.mine.lit('mine_2');}),S(()=>pop.show('mine_2b')),...recovery(false)];
  const early=()=>[S(()=>pop.enable(false)),...recovery(true)];
  const relapse=()=>[S(()=>N.ver.set(true)),S(()=>{recCap.textContent='MESSAGING RELAPSE';}),S(()=>pop.visible(true)),S(()=>{recCap.textContent='SAME MINE-2 RESTORED · TRY RETURN AGAIN';})];
  const detour=()=>[S(()=>N.clock.set(true)),S(()=>C.nc.pulse()),S(()=>N.neutral.set(true)),S(()=>N.neutral.set(false)),S(()=>C.nc.pulse()),S(()=>N.clock.set(true))];
  run=runner(reg,intro,()=>pop.stop(),reset);pop.show('mine_1');pop.enable(false);
  const root=el('div',{class:'sch-pane','data-organ':'mine'},
    banner('MINE receives certified messaging context from MONITOR. It does not identify messaging applications independently.'),
    card(el('div',{class:'sch-row'},N.user.el,C.um.el,N.monitor.el,C.mm.el,N.msg.el,C.mg.el,N.gate.el,C.gm.el,N.mine.el)),pop.el,
    card(el('div',{class:'sch-split'},
      card(el('h4',{class:'sch-h sm'},'BRANCH A · I WILL COME BACK'),nrow(N.ri,C.rc,N.clock),cap('NEW CLOCK STARTS HERE — starts after MINE-1, not at original messaging entry.',{bold:true}),cap(`Continuous example: ${T.initial_gate} + ${T.return_intent_window} = ${T.continuous_total}`,{role:'cyan',bold:true}),
        dbtn('SHOW NEUTRAL DETOUR',()=>run.run(detour())),el('div',{class:'sch-row'},N.neutral.el,C.nc.el,cap(B.neutral_pause_note,{role:'cyan',bold:true})),
        dbtn('SHOW PLATFORM SWITCH',()=>run.run(seqChips(plats))),el('div',{class:'sch-chips'},...plats),cap(B.platform_switch_note),
        dbtn('EARLY FOCUS RETURN',()=>run.run(early())),cap(B.early_return_note),el('div',{class:'sch-row'},C.c2a.el,N.m2a.el)),
      card(el('h4',{class:'sch-h sm'},"BRANCH B · IT'S IMPORTANT"),nrow(N.dur,C.da,N.allow),allowCap,cap("Runs on MINE's effective clock. Global Pause freezes it — ordinary neutral context does not."),dbtn('EARLY FOCUS RETURN',()=>run.run(early())),cap('Returning early can close MINE without waiting for allowance expiry.'),el('div',{class:'sch-row'},C.a2b.el,N.m2b.el)))),
    card(el('div',{class:'sch-h-row'},heading("MINE'S OWN RECOVERY SEQUENCE"),dbtn('SHOW RELAPSE',()=>run.run(relapse()))),cap(B.recovery_owner_note,{role:'cyan',bold:true}),nrow(N.focus,C.r1,N.conf,C.r2,N.ver,C.r3,N.stab,C.r4,N.closed),recCap,cap('Popup hides during Return Confirming; verification continues in the background.')),
    card(cap(B.study_preemption_note,{bold:true}),cap(B.global_pause_note,{bold:true})),
    strip([['ROLE','Messaging-specific intervention authority.'],['INPUT','Certified messaging context from MONITOR.'],['FIRST GATE',`${T.initial_gate} supported messaging time.`],['BRANCH A','I WILL COME BACK → new 13:15 messaging window.'],['BRANCH B',"IT'S IMPORTANT → 5–30 min allowance."],['FINAL CALLBACK','MINE-2A / MINE-2B → no buttons.'],['RETURN',`${T.final_callback_hide_seconds}s + ${T.return_verification_seconds}s + ${T.closure_confirmation_seconds}s confirmation sequence.`]]),
    strip([['INITIAL GATE',`${T.initial_gate} supported messaging.`],['RETURN-INTENT WINDOW',`${T.return_intent_window} supported messaging.`],['IMPORTANT ALLOWANCE',`${T.important_minutes_min}–${T.important_minutes_max} min, chosen by user.`],['FINAL VISUAL',`${T.final_callback_hide_seconds} s.`],['RETURN VERIFY',`${T.return_verification_seconds} s.`],['CLOSURE STABILITY',`${T.closure_confirmation_seconds} s.`]]),
    cap('DEMO TIMING NOT TO SCALE.',{bold:true}),demoControls(run));
  return {el:root,run,intro,reset,popup:pop};
}
// ---------------------------------------------------------------- COSINE
function cosineSchematic(){
  const reg=Reg(),N=reg.nodes,C=reg.conns,F=FACTS.COSINE_POPUP_FACTS,T=FACTS.COSINE_TIMING_FACTS,B=FACTS.COSINE_BRANCH_FACTS;let run;
  const pop=popup(reg,'cosine',F,{range:[T.break_minutes_min,T.break_minutes_max],start:30,none:'FINAL CALLBACK · NO ACTION BUTTONS',onButton:l=>{if(l==="SORRY, I'LL COME BACK")run.run(returnIntention());else if(l==='YEAH, I WANT SOME BREAK')run.run(directFromIntention());else if(l==='YAY')run.run(yay());},onDuration:m=>run.run(breakStart(m))});
  node(reg,'user','human','USER','Works on an intended task.','#38BDF8');node(reg,'monitor','monitor','MONITOR','Observes certified software context.','#38BDF8');node(reg,'ott','ott','CERTIFIED OTT','Native app / certified host identity.','#38BDF8');node(reg,'gate','timer',T.initial_gate,'Supported OTT time.','#38BDF8');node(reg,'cosine','cosine','COSINE','Streaming intervention.','#7C9CFF',{organ:true});
  ['um','mo','og','gc'].forEach(k=>conn(reg,k));
  node(reg,'ri','evidence','RETURN INTENTION','An intention only -- not verified recovery.','#38BDF8');conn(reg,'rw');node(reg,'window','timer',T.return_intent_window,'New OTT window.','#38BDF8');node(reg,'bi','evidence','BREAK INTENT','Directly opens the duration workflow.','#38BDF8');node(reg,'ba','timer','BREAK ACTIVE','Chosen by user.','#F5A623');
  node(reg,'focus','check','FOCUS OBSERVED','','#39D98A');conn(reg,'r1');node(reg,'conf','timer','RETURN CONFIRMING',`${T.final_callback_hide_seconds} s hide`,'#39D98A');conn(reg,'r2');node(reg,'ver','timer','RETURN VERIFYING',`${T.return_verification_seconds} s total`,'#39D98A');conn(reg,'r3');node(reg,'stab','timer','STABILITY CONFIRMING',`${T.closure_confirmation_seconds} s`,'#39D98A');conn(reg,'r4');node(reg,'closed','check','COSINE CLOSED','Return confirmed.','#39D98A');
  const breakCap=cap('',{role:'cyan',bold:true}),recCap=cap('',{role:'cyan',bold:true}),hops=chips(['NETFLIX','PRIME VIDEO','DISNEY+'],reg);let minutes=30;
  const reset=()=>{for(const n of Object.values(N))n.set(false);N.cosine.lit(null);hops.forEach(c=>c.classList.remove('on'));breakCap.textContent='';recCap.textContent='';pop.visible(true);pop.show('intention');pop.enable(false);};
  const intro=()=>[S(()=>N.user.set(true)),S(()=>C.um.pulse()),S(()=>N.monitor.set(true)),S(()=>C.mo.pulse()),S(()=>N.ott.set(true)),S(()=>C.og.pulse()),S(()=>N.gate.set(true)),S(()=>C.gc.pulse()),S(()=>{N.cosine.set(true);N.cosine.lit('intention');}),S(()=>pop.show('intention')),S(()=>pop.enable(true))];
  const recovery=early=>[...(early?[S(()=>{recCap.textContent='Early return — recovery begins before any final callback.';})]:[]),S(()=>N.focus.set(true)),S(()=>C.r1.pulse()),S(()=>N.conf.set(true)),S(()=>pop.visible(false)),S(()=>C.r2.pulse()),S(()=>N.ver.set(true)),S(()=>C.r3.pulse()),S(()=>N.stab.set(true)),S(()=>C.r4.pulse()),S(()=>{N.closed.set(true);N.cosine.lit('recovery');}),S(()=>{recCap.textContent='RETURN CONFIRMED · COSINE CLOSED';})];
  const returnIntention=()=>[S(()=>pop.enable(false)),S(()=>pop.visible(false)),S(()=>N.ri.set(true)),S(()=>C.rw.pulse()),S(()=>{N.window.set(true);N.cosine.lit(null);})];
  const failed=()=>[S(()=>N.window.set(true)),S(()=>{pop.visible(true);pop.show('set_a_limit');}),S(()=>pop.enable(true))];
  const directFromIntention=()=>[S(()=>pop.enable(false)),S(()=>N.bi.set(true)),S(()=>pop.show('break_length')),S(()=>pop.enable(true))];
  const direct=()=>[S(()=>N.bi.set(true)),S(()=>{pop.visible(true);pop.show('break_length');}),S(()=>pop.enable(true))];
  const breakStart=m=>{minutes=m;return [S(()=>pop.enable(false)),S(()=>N.ba.set(true)),S(()=>{breakCap.textContent=`${m} MIN BREAK`;}),S(()=>{pop.breakSet(m);N.cosine.lit('break');}),S(()=>pop.enable(true))];};
  const yay=()=>[S(()=>pop.enable(false)),S(()=>pop.visible(false)),S(()=>{breakCap.textContent='ACKNOWLEDGED · SAME DEADLINE CONTINUES';})];
  const deadline=()=>[S(()=>{pop.visible(true);pop.show('final_callback');N.cosine.lit('break');}),...recovery(false)];
  const relapse=()=>[S(()=>N.ver.set(true)),S(()=>{recCap.textContent='OTT RELAPSE';}),S(()=>pop.visible(true)),S(()=>{recCap.textContent='SAME FINAL CALLBACK RESTORED · TRY RETURN AGAIN';})];
  run=runner(reg,intro,()=>pop.stop(),reset);pop.show('intention');pop.enable(false);
  const root=el('div',{class:'sch-pane','data-organ':'cosine'},
    banner('COSINE receives certified OTT context from MONITOR. It does not identify streaming platforms from window-title text by itself.'),
    card(el('div',{class:'sch-row'},N.user.el,C.um.el,N.monitor.el,C.mo.el,N.ott.el,C.og.el,N.gate.el,C.gc.el,N.cosine.el)),pop.el,
    card(el('div',{class:'sch-split'},
      card(el('h4',{class:'sch-h sm'},"BRANCH A · SORRY, I'LL COME BACK"),nrow(N.ri,C.rw,N.window),cap('NEW WINDOW STARTS AFTER YOUR CHOICE — not measured from the original episode start.',{bold:true}),dbtn('EARLY FOCUS RETURN',()=>run.run(recovery(true))),cap('Actual focus can begin recovery before any break workflow.'),dbtn('5:00 OTT COMPLETES',()=>run.run(failed())),cap(B.failed_return_note)),
      card(el('h4',{class:'sch-h sm'},'BRANCH B · YEAH, I WANT SOME BREAK'),nrow(N.bi),cap('Opens the SAME duration-entry popup used by the failed-return branch, in its BREAK LENGTH presentation.'),dbtn('OPEN DURATION ENTRY',()=>run.run(direct()))))),
    card(heading('BREAK ACTIVE'),cap("Runs on COSINE's effective clock. Global Pause freezes it."),nrow(N.ba),breakCap,dbtn('EARLY FOCUS RETURN',()=>run.run(recovery(true))),cap('Returning early can close COSINE without waiting for the break deadline.'),dbtn('BREAK DEADLINE',()=>run.run(deadline()))),
    card(el('div',{class:'sch-h-row'},heading("COSINE'S RETURN CHAIN"),dbtn('SHOW OTT RELAPSE',()=>run.run(relapse()))),cap(B.hide_milestone_note,{role:'cyan',bold:true}),nrow(N.focus,C.r1,N.conf,C.r2,N.ver,C.r3,N.stab,C.r4,N.closed),recCap,cap('Final-callback route: popup hides at 3 s; early-return routes verify directly.')),
    card(el('div',{class:'sch-h-row'},heading('PLATFORM HOPPER'),dbtn('SHOW PLATFORM HOP',()=>run.run(seqChips(hops)))),el('div',{class:'sch-chips'},...hops),cap(B.hopper_note)),
    card(cap(B.study_preemption_note,{bold:true}),cap(B.global_pause_note,{bold:true})),
    el('div',{class:'sch-info'},el('b',{class:'sch-info-h'},'CURRENT SUPPORTED PLATFORMS'),el('div',{class:'sch-plats'},...FACTS.COSINE_PLATFORM_FACTS.map(p=>el('span',{},p.toUpperCase()))),cap('YouTube is not part of the current COSINE platform map.')),
    strip([['ROLE','Streaming intervention authority.'],['INPUT','Certified OTT context from MONITOR.'],['FIRST GATE',`${T.initial_gate} supported OTT time.`],['BRANCH A',"SORRY, I'LL COME BACK → new 5:00 OTT window."],['BRANCH B','YEAH, I WANT SOME BREAK → 10–200 min duration.'],['BREAK','ENJOY THE SHOW · YAY acknowledges, does not extend the deadline.'],['FINAL CALLBACK','HOPE YOU ENJOYED THE SHOW → no buttons.'],['RETURN',`${T.final_callback_hide_seconds}s hide milestone inside ${T.return_verification_seconds}s verify + ${T.closure_confirmation_seconds}s closure.`]]),
    strip([['INITIAL GATE',`${T.initial_gate} supported OTT.`],['RETURN-INTENT WINDOW',`${T.return_intent_window} supported OTT.`],['BREAK DURATION',`${T.break_minutes_min}–${T.break_minutes_max} min, chosen by user.`],['FINAL-CALLBACK HIDE',`${T.final_callback_hide_seconds} s milestone inside verification.`],['RETURN VERIFY',`${T.return_verification_seconds} s total.`],['CLOSURE STABILITY',`${T.closure_confirmation_seconds} s.`]]),
    cap('DEMO TIMING NOT TO SCALE.',{bold:true}),demoControls(run));
  return {el:root,run,intro,reset,popup:pop};
}
// ---------------------------------------------------------------- COSECANT
function cosecantSchematic(){
  const reg=Reg(),N=reg.nodes,C=reg.conns,F=FACTS.COSECANT_POPUP_FACTS,T=FACTS.COSECANT_TIMING_FACTS,B=FACTS.COSECANT_BRANCH_FACTS;let run;
  const pop=popup(reg,'cosecant',F,{none:'NO BUTTONS · EXACT STUDY RETURN REQUIRED',onButton:l=>{if(l==='RETURN TO STUDY')run.run(returnIntent());}});
  node(reg,'user','human','USER','Studies an intended resource.','#38BDF8');node(reg,'study','study','STUDY MODE','Owns the intended Study block.','#38BDF8');node(reg,'resource','exact','EXACT STUDY RESOURCE','Frozen as the return target.','#38BDF8');node(reg,'request','evidence','APPROVED BREAK REQUEST','Parked until admission.','#38BDF8');node(reg,'monitor','monitor','MONITOR','Confirms the exact return target.','#38BDF8');node(reg,'cosecant','cosecant','COSECANT','Break-return regulation.','#39D98A',{organ:true});
  ['us','sr','rq','qm','mc'].forEach(k=>conn(reg,k));
  node(reg,'ba','timer','BREAK ACTIVE','Study paused. Return target registered.','#39D98A');
  node(reg,'bc','timer','BREAK COMPLETE','Return intent available.','#39D98A');conn(reg,'o1');node(reg,'bo','timer','BREAK ALREADY OVER','Return intent still available.','#F5A623');conn(reg,'o2');node(reg,'fl','evidence','FINAL LOCK','COME BACK PLEASE · no buttons.','#FF4D6D');node(reg,'intent','evidence','RETURN INTENT','Recorded when RETURN TO STUDY is pressed.','#F5A623');
  node(reg,'cmpIntent','evidence','RETURN TO STUDY','= RETURN INTENT.','#F5A623');node(reg,'cmpEvidence','exact','EXACT RESOURCE','= RETURN EVIDENCE.','#39D98A');node(reg,'generic','neutral','GENERIC FOCUS','✕ Does not release the lock.','#94A3B8');node(reg,'exactCmp','exact','EXACT STUDY RESOURCE','✓ Can start confirmation.','#39D98A');
  node(reg,'confirmed','check','RETURN CONFIRMED','Break context retired.','#39D98A');conn(reg,'cr');node(reg,'resumes','study','STUDY RESUMES','Monitor/coordinator resumes Study -- not COSECANT itself.','#39D98A');
  const escCap=cap('',{role:'cyan',bold:true}),spin=el('input',{type:'number',min:'1',max:'1440',value:'10','aria-label':'Break duration in minutes'});
  const reset=()=>{for(const n of Object.values(N))n.set(false);N.cosecant.lit(null);escCap.textContent='';pop.visible(true);pop.countdown('');pop.show('break_complete');pop.enable(false);};
  const intro=()=>[S(()=>N.user.set(true)),S(()=>C.us.pulse()),S(()=>N.study.set(true)),S(()=>C.sr.pulse()),S(()=>N.resource.set(true)),S(()=>C.rq.pulse()),S(()=>N.request.set(true)),S(()=>C.qm.pulse()),S(()=>N.monitor.set(true)),S(()=>C.mc.pulse()),S(()=>{N.cosecant.set(true);N.cosecant.lit('break');}),S(()=>N.ba.set(true)),S(()=>pop.show('break_complete')),S(()=>pop.enable(true))];
  const breakRequest=()=>[S(()=>N.request.set(true)),S(()=>C.qm.pulse()),S(()=>N.monitor.set(true)),S(()=>C.mc.pulse()),S(()=>{N.cosecant.set(true);N.cosecant.lit('break');}),S(()=>N.ba.set(true))];
  const returnIntent=()=>[S(()=>pop.enable(false)),S(()=>N.intent.set(true)),S(()=>{escCap.textContent='RETURN INTENT RECORDED — not return evidence. Waiting for the exact Study resource.';})];
  const overdue=()=>[S(()=>N.bc.set(true)),S(()=>C.o1.pulse()),S(()=>{N.bo.set(true);N.cosecant.lit('overdue');}),S(()=>{pop.show('break_already_over');pop.enable(true);}),S(()=>C.o2.pulse()),S(()=>N.fl.set(true)),S(()=>pop.show('final_lock'))];
  const generic=()=>[S(()=>N.generic.set(true)),S(()=>{escCap.textContent='GENERIC FOCUS OBSERVED — does not release COSECANT.';}),S(()=>N.generic.set(false))];
  const exact=()=>[S(()=>N.exactCmp.set(true)),S(()=>{pop.show('return_confirming');N.cosecant.lit('recovery');}),S(()=>pop.countdown('3')),S(()=>pop.countdown('2')),S(()=>pop.countdown('1')),S(()=>{pop.countdown('✓');N.confirmed.set(true);}),S(()=>{escCap.textContent='RETURN CONFIRMED';}),S(()=>C.cr.pulse()),S(()=>N.resumes.set(true)),S(()=>{escCap.textContent='COSECANT CONFIRMS RETURN · COORDINATOR RESUMES STUDY';})];
  const loss=()=>[S(()=>{pop.show('return_confirming');pop.countdown('2');}),S(()=>{escCap.textContent='EXACT RESOURCE BECOMES UNCERTAIN / MISMATCHED / STALE';}),S(()=>pop.countdown('')),S(()=>{pop.show('break_already_over');pop.enable(true);}),S(()=>{escCap.textContent='CONFIRMATION LOST — RETURNED TO CURRENT OVERDUE STAGE';})];
  run=runner(reg,intro,()=>pop.stop(),reset);pop.show('break_complete');pop.enable(false);
  const root=el('div',{class:'sch-pane','data-organ':'cosecant'},
    banner('COSECANT does not infer return from a button click or generic focus. It confirms return using the exact registered Study resource.'),
    card(el('div',{class:'sch-row'},N.user.el,C.us.el,N.study.el,C.sr.el,N.resource.el,C.rq.el,N.request.el,C.qm.el,N.monitor.el,C.mc.el,N.cosecant.el)),pop.el,
    card(heading('BREAK ACTIVE'),cap(B.admission_note),nrow(N.ba),el('div',{class:'sch-spin-row'},el('label',{},el('span',{},'BREAK DURATION (DEMO VALUE — MINUTES):'),spin)),cap(`Example only. The real minimum is ${T.break_minimum_seconds} seconds and the maximum is ${T.break_maximum_hours} hours -- COSECANT does not enforce a standard break length.`),dbtn('SHOW BREAK REQUEST',()=>run.run(breakRequest()))),
    card(el('div',{class:'sch-h-row'},heading('OVERDUE ESCALATION'),dbtn('SHOW OVERDUE PATH',()=>run.run(overdue()))),cap('BREAK COMPLETE begins immediately at the break deadline -- the +5:00 delay comes after it, not before.'),nrow(N.bc,C.o1,timingLabel(`+${T.already_over_delay}`,'5 minutes after break completion.'),N.bo,C.o2,timingLabel(`+${T.final_lock_delay}`,'1 minute after Break Already Over.'),N.fl),nrow(N.intent),cap(B.button_intent_note,{role:'cyan',bold:true})),
    card(el('div',{class:'sch-split cmp'},el('div',{class:'sch-col'},nrow(N.cmpIntent,N.cmpEvidence),cap('INTENT ≠ EVIDENCE',{role:'cyan',bold:true})),el('div',{class:'sch-col'},nrow(N.generic,N.exactCmp),cap(B.exact_resource_note,{role:'cyan',bold:true})))),
    card(heading('EXACT RETURN VERIFICATION'),cap(B.continuity_note,{role:'cyan',bold:true}),el('div',{class:'sch-btn-row'},dbtn('SHOW GENERIC FOCUS FIRST',()=>run.run(generic())),dbtn('SHOW EXACT RETURN',()=>run.run(exact())),dbtn('SHOW RETURN LOSS',()=>run.run(loss()))),cap('SHOW EXACT RETURN works from any reminder stage or Final Lock -- Final Lock is an escalation, not a mandatory stage every break must reach.'),nrow(N.confirmed,C.cr,N.resumes),escCap,cap(B.loss_note)),
    card(cap(B.exact_target_note,{bold:true}),cap(B.resume_boundary_note,{bold:true})),
    strip([['ROLE','Approved Study break-return regulation authority.'],['INPUT','Exact Study resource + break admission from MONITOR.'],['BREAK','User-selected duration (60 s – 24 h). No canonical length.'],['REMINDERS','BREAK COMPLETE → +5:00 → BREAK ALREADY OVER → +1:00 → FINAL LOCK.'],['BUTTON','RETURN TO STUDY → intent only, never evidence.'],['RELEASE','Only the exact registered Study resource. Never generic focus.'],['RETURN',`${T.return_confirmation_seconds} continuous seconds → RETURN CONFIRMED.`],['RESUME','COSECANT confirms return. Monitor/coordinator resumes Study.']]),
    strip([['BREAK BOUNDS',`${T.break_minimum_seconds} s minimum, ${T.break_maximum_hours} h maximum.`],['OVERDUE +5',`${T.already_over_delay} after break end.`],['FINAL LOCK +1',`${T.final_lock_delay} after that.`],['RETURN VERIFY',`${T.return_confirmation_seconds} continuous seconds of exact presence.`]]),
    cap('DEMO TIMING NOT TO SCALE.',{bold:true}),demoControls(run));
  return {el:root,run,intro,reset,popup:pop};
}
// ---------------------------------------------------------------- SECANT (static pathway chooser, as on the desktop)
function secantSchematic(){
  const reg=Reg(),N=reg.nodes;
  const defs=[['STUDY EVIDENCE','Confirmed off-task · 5:00 supported dwell','evidence'],['SECANT-1','Factual display → episode founded','study'],['SECANT-2','+10:00 continued qualifying off-task','timer'],['SECANT-3','+13:15 continued escalation eligibility','study']];
  const top=defs.map(([t,c,k],i)=>node(reg,`t${i}`,k,t,c,'#3DDCFF'));
  const rdefs=[['RETURN','Intent / observed Study return process','exact'],['VERIFIED','10 seconds supported verification','check'],['RECOVERY CLOSED','60 seconds supported confirmation','check']];
  const bottom=rdefs.map(([t,c,k],i)=>node(reg,`b${i}`,k,t,c,'#48D9A4'));
  const all=[...top,...bottom],status=el('p',{class:'sch-secant-status'},'Select a demonstration pathway below.');
  const MSG={escalation:'Demonstration: SECANT-1 → SECANT-2 → SECANT-3, all within the same episode. Not every episode reaches stage 3.',recovery:'Demonstration: return from SECANT-1 → verification → confirmation → recovery closed. MIRL is not this pathway.',interrupted:'Demonstration: recovery interrupted by evidence_gap or return_away; the same episode continues under runtime law. A behavioural evidence gap is not a successful return.',break:'Demonstration: approved break is governed by COSECANT. Ordinary SECANT escalation does not own the permitted break interval.'};
  const ACT={escalation:[0,1,2,3],recovery:[1,4,5,6],interrupted:[1,4],break:[]};
  const show=p=>{all.forEach((n,i)=>n.set(ACT[p].includes(i)));status.textContent=MSG[p];};
  const paths=el('div',{class:'sch-secant-paths'},...[['Escalation','escalation'],['Verified recovery','recovery'],['Interrupted evidence','interrupted'],['Approved break','break']].map(([l,p])=>button(l,()=>show(p),{class:'sch-path','data-path':p})));
  const root=el('div',{class:'sch-pane sch-card secant','data-organ':'secant'},el('h2',{class:'sch-secant-h'},'SECANT · Study off-task and recovery regulation'),el('p',{class:'sch-secant-note'},FACTS.SECANT_BOUNDARY_NOTE),strip([['DEMONSTRATION ONLY','No runtime, session or database is controlled here.']]),el('div',{class:'sch-row'},...top.map(n=>n.el)),el('p',{class:'sch-secant-note'},'Return can begin from any applicable stage. Display-anchored timers respect runtime holds; expiry alone does not found an episode, and a button press does not prove recovery.'),el('div',{class:'sch-row'},...bottom.map(n=>n.el)),status,paths,strip([['COSECANT BRANCH','Selected allowance → BREAK COMPLETE → +5 min reminder → +1 min final lock → exact Study-resource confirmation. Independent runtime authority.']]));
  show('escalation');
  return {el:root,run:{halt(){}},intro:()=>[],reset(){}};
}
// ---------------------------------------------------------------- Chapter 2 host
export function buildChapterTwo({organ='sine',onOrgan}={}){
  const makers={sine:sineSchematic,mine:mineSchematic,cosine:cosineSchematic,secant:secantSchematic,cosecant:cosecantSchematic};
  const panes={},played={};let current=null;const stack=el('div',{class:'sch-stack'});
  const btns={};
  const select=key=>{if(!makers[key]||key===current)return;if(current&&panes[current])panes[current].run.halt();current=key;onOrgan?.(key);
    if(!panes[key]){panes[key]=makers[key]();}
    stack.replaceChildren(panes[key].el);for(const [k,b] of Object.entries(btns)){b.classList.toggle('on',k===key);b.setAttribute('aria-pressed',String(k===key));}
    if(!played[key]){played[key]=true;if(panes[key].run.run)panes[key].run.run(panes[key].intro());}};
  const selector=el('div',{class:'sch-selector',role:'group','aria-label':'Organ'},...FACTS.CHAPTER_TWO_ORGANS.map(o=>{const b=button(o.title,()=>select(o.key),{class:'sch-organ-btn',title:o.subtitle,'aria-label':`${o.title} organ`,'data-organ':o.key});btns[o.key]=b;return b;}));
  const root=el('div',{class:'sch-ch2'},el('div',{class:'card lab-hero'},el('span',{class:'lab-eyebrow'},'CHAPTER 2'),el('h2',{class:'sch-title'},'PARTS OF MYELIN'),el('div',{class:'lab-sub'},'Living Organ Schematics'),el('p',{class:'lab-p'},'Select an organ to explore how its signal pathway moves through MYELIN.')),selector,stack);
  select(organ);
  return root;
}
