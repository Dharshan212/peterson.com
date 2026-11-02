import {$,el,button,text} from './dom.js';
import {blobSVG} from './mascot.js';
import {setting,setSetting} from './storage.js';
import {SURFACES} from './simulator.js';
export function mountAcademy(app){
  // The original mascot, bubble, spotlight, HUD and chapter map remain the UI.
  document.querySelectorAll('[data-blob]').forEach(host=>{const svg=new DOMParser().parseFromString(blobSVG(),'image/svg+xml').documentElement;host.replaceChildren(document.importNode(svg,true));});
  $('acWatch').hidden=true;$('acVideo').hidden=true;$('acLauncher').hidden=false;
  let open=false,index=0,token=0,raf=null,lastRing=null;let curTarget='',arranged='';
  // Two tutorial states (never both): READ = explanation, dim layer allowed; ACT = the visitor is asked to use MYELIN, so the
  // dim layer is removed completely and the coach shrinks to a small instruction bubble; DONE = the requested action was
  // detected from real runtime facts (the guide never performs or fakes an action). NEXT only advances when it is detected.
  let phase='read',needsAct=false,achieved=false,baseSpeed=60,ourSpeed=-1,popupGoneAt=0,lastSay='';
  const trivial=fn=>/^\(\)\s*=>\s*true$/.test(String(fn));
  const satisfied=()=>{try{return !!lessons[index].step[2](app.getRuntime());}catch{return false;}};
  // ---- tutorial clock (tutorial runtime only; no runtime code, threshold or event rule is touched) -------------------
  // While the visitor reads, the tutorial runtime's clock multiplier is held at 0 so a popup cannot expire or escalate
  // under the explanation. While the visitor must answer a popup it runs at real time (1x) so its display window is
  // humanly usable (SINE-1 lasts 45 effective seconds: 0.75 s at 60x). Everything else uses the clock the session started with.
  const tutRuntime=()=>{const r=app.getRuntime();return r&&r.namespace==='tutorial'&&['ACTIVE','PAUSED'].includes(r.state)?r:null;};
  function clockPolicy(){const r=tutRuntime();if(!r)return;if(r.speed>0&&r.speed!==ourSpeed&&r.speed!==0)baseSpeed=r.speed;
    const want=phase!=='act'?0:(lessons[index].step[4]??(curTarget==='#wlPopup'?1:baseSpeed));if(r.speed!==want){r.speed=want;ourSpeed=want;}
    const label=want===0?'ISOLATED TUTORIAL · CLOCK HELD':`ISOLATED TUTORIAL · ${want===1?'REAL TIME':want+'×'}`;if($('acSim').textContent!==label)text('acSim',label);}
  function holdClockNow(){const r=tutRuntime();if(!r)return;if(r.speed>0&&r.speed!==ourSpeed)baseSpeed=r.speed;r.speed=0;ourSpeed=0;}
  // ---- coach / intervention-popup layout --------------------------------------------------------------
  // Intervention popups (#wlPopup, #wlBreakActive) are centred by popups.css. While the guide is open the coach and
  // the popup must never cover each other, and in the ACT state the coach must not cover the control it asks you to use,
  // so the layout is chosen from the real rectangles. The popup is raised above the dim layer (popups.css), keeps its own
  // focus behaviour and is never hidden by the coach.
  const body=document.body;
  function resetLayout(){delete body.dataset.acLayout;body.style.removeProperty('--pp-maxh');body.style.removeProperty('--pp-top');body.style.removeProperty('--pp-s');const c=$('acCoach');c.classList.remove('compact','mini');for(const k of ['top','bottom','left','right','max-height','width'])c.style.removeProperty(k);}
  const small=()=>phase!=='read';
  function placeDefault(){resetLayout();const c=$('acCoach'),pop=curTarget==='#wlPopup';c.style.left=pop?'24px':'auto';c.style.right=pop?'auto':'24px';c.style.bottom='24px';c.style.top='auto';c.style.width=`${Math.min(small()?440:560,innerWidth-48)}px`;}
  const hit=(a,b,m=10)=>a&&b&&a.left<b.right+m&&a.right>b.left-m&&a.top<b.bottom+m&&a.bottom>b.top-m;
  function targetRect(){if(!curTarget||curTarget==='#wlPopup'||curTarget==='#acScenario')return null;const t=document.querySelector(curTarget);if(!t)return null;const b=t.getBoundingClientRect();return b.width&&b.height?b:null;}
  function ensureVisible(){if(!curTarget||curTarget==='#wlPopup'||curTarget==='#acScenario')return;const t=document.querySelector(curTarget);if(!t)return;const b=t.getBoundingClientRect();if(b.width&&(b.top<64||b.bottom>innerHeight-8))t.scrollIntoView({block:'center'});}
  function arrange(){
    const coach=$('acCoach'),pop=document.getElementById('wlPopup')||document.getElementById('wlBreakActive'),vw=innerWidth,vh=innerHeight,tr=targetRect();
    const key=[phase,pop?`${pop.dataset.stage||'x'}:${pop.offsetWidth}x${pop.offsetHeight}`:'-',vw,vh,curTarget,tr?`${Math.round(tr.left)},${Math.round(tr.top)}`:'-',($('acSay')?.textContent||'').length].join('|');
    if(key===arranged)return;arranged=key;placeDefault();
    if(!pop){
      if(vw<=700){if(hit(coach.getBoundingClientRect(),tr)){coach.style.setProperty('top','52px','important');coach.style.setProperty('bottom','auto','important');}return;}
      const cands=[{right:'24px',bottom:'24px'},{left:'24px',bottom:'24px'},{right:'24px',top:'52px'},{left:'24px',top:'52px'}];
      for(const c of cands){for(const k of ['left','right','top','bottom'])coach.style[k]='auto';Object.assign(coach.style,c);if(!hit(coach.getBoundingClientRect(),tr))break;}
      return;
    }
    const pw=pop.offsetWidth,ph=pop.offsetHeight,TOP=52,EXIT=48;
    if(vw<=700){coach.style.setProperty('top','52px','important');coach.style.setProperty('bottom','auto','important');coach.classList.add('mini');coach.style.setProperty('max-height','36dvh','important');const ch=coach.offsetHeight;body.style.setProperty('--pp-maxh',`${Math.max(200,vh-52-ch-12-12-EXIT)}px`);body.dataset.acLayout='mobile';return;}
    const w0=Math.min(small()?440:560,vw-48);coach.style.width=`${w0}px`;coach.style.left='24px';coach.style.right='auto';
    if(vw>=pw+w0+24+24+12){body.dataset.acLayout='side';return;}
    const stackFits=()=>ph+TOP+EXIT+coach.offsetHeight+24<=vh;
    if(stackFits()){body.dataset.acLayout='stack';body.style.setProperty('--pp-top',`${TOP}px`);return;}
    coach.classList.add('compact');coach.style.width=`${Math.min(400,vw-48)}px`;
    if(stackFits()){body.dataset.acLayout='stack';body.style.setProperty('--pp-top',`${TOP}px`);return;}
    const free=vw-pw-12-24-24;
    if(free>=300){coach.style.width=`${Math.min(400,free)}px`;body.dataset.acLayout='corner';body.style.setProperty('--pp-top',`${TOP}px`);return;}
    // Smallest windows: slim coach (title, text, buttons) across the bottom, popup scaled down just enough to clear it.
    coach.classList.remove('compact');coach.classList.add('mini');coach.style.width=`${Math.min(760,vw-48)}px`;
    const sc=Math.max(.66,Math.min(1,(vh-TOP-EXIT-coach.offsetHeight-24)/ph));
    body.dataset.acLayout='stack';body.style.setProperty('--pp-top',`${TOP}px`);body.style.setProperty('--pp-s',String(sc));
  }
  const start=()=>{const r=app.getRuntime();if(['ACTIVE','PAUSED'].includes(r.state))r.end('INTERRUPTED');r.start({speed:60});r.setEvidence(SURFACES.task);return r;};
  function study(r){r.command('STUDY','prepare',{studyMinutes:90,breakMinutes:1,subject:'Academy Study',task:'Read the exact Study resource',resourceId:'study:primary'});r.command('STUDY','start');r.setEvidence(SURFACES.study);}
  const chapters=[
    {name:'CONTROL',title:'The Control Station',page:'control',setup:()=>{const r=app.getRuntime();if(['ACTIVE','PAUSED'].includes(r.state))r.end('INTERRUPTED');},steps:[['.hero-card','This is the Control Station of MYELIN — Core: the Engine Core ring with START, PAUSE / RESUME, STOP and EMERGENCY, then session health, the current resource, Normal Break, the escalation stage and the live COSINE and MINE cards. Telemetry fills the right-hand column.',()=>true],['#btnEngineStart','Press START to begin a tutorial session. Its events are isolated from your ordinary local history.',r=>r.state==='ACTIVE'],['#btnEnginePause','Pause freezes every organ clock at once. The same button then reads RESUME.',r=>r.events.some(e=>e.type==='SESSION_RESUMED'),r=>r.state==='PAUSED'?'The session is paused. Press RESUME (the same button) to continue.':'Press PAUSE. The same button will then read RESUME.'],['#menuToggle','Press MENU. Every organ and tool of MYELIN — Core is listed there; none of them depends on this guide.',()=>app.ui.sidebarOpen],['#mainSidebar','Core: Control, Study Mode (COSECANT) and Metric Hub. Research: Science Lab, Live MIRL (SINE), MINE, COSINE and SECANT Dashboard. SenseHub is marked COMING SOON and is not available yet. Change Theme sits at the foot.',()=>true]]},
    {name:'SINE',title:'SINE and MIRL',page:'control',setup:()=>{const r=start();r.setEvidence(SURFACES.social);r.advance(5);},steps:[['#wlPopup','SINE-1 is founded after 300 supported social seconds. A displayed popup is recorded separately from its request.',r=>r.sine.stage===1],['#wlPopup','Choose I’M BACK. It records an intention only; the episode remains unresolved.',r=>r.mirl.events?.length||r.events.some(e=>e.organ==='SINE'&&e.type==='RETURN_INTENT')],['#acScenario','In desktop MYELIN you would simply go back to your work. Here, choose Task / Work in the box. Wait for 10 seconds verification and 60 seconds confirmation on the 60× clock.',r=>r.sine.outcome==='RETURNED',null,null,['task','social']]]},
    {name:'COSINE',title:'COSINE — streaming',page:'cosine',setup:()=>{const r=start();r.setEvidence(SURFACES.streamA);r.advance(5);},steps:[['#wlPopup','The intent gate follows five supported streaming minutes. Choose I’M COMING BACK.',r=>r.cosine.state==='RETURN_INTENT_OBSERVING'],['#acScenario','Switch streaming platforms in the box. This preserves the same episode and records its hopper history.',r=>r.events.some(e=>e.organ==='COSINE'&&e.type==='PLATFORM_CHANGED'),null,1,['streamA','streamB']],['#acScenario','Choose Task / Work in the box to verify a return. A break branch instead accepts 10–200 whole minutes.',r=>r.cosine.outcome==='RETURNED',null,null,['task','streamA']]]},
    {name:'MINE',title:'MINE — messaging',page:'mine',setup:()=>{const r=start();r.setEvidence(SURFACES.chatA);r.advance(10);},steps:[['#wlPopup','MINE-1 follows ten supported messaging minutes. Choose I WILL COME BACK for branch A.',r=>r.mine.branch==='A'],['#acScenario','Switch to Telegram in the box. Platform switching preserves the episode. Branch A allows 795 further supported messaging seconds.',r=>r.events.some(e=>e.organ==='MINE'&&e.type==='PLATFORM_CHANGED'),null,1,['chatA','chatB']],['#acScenario','Choose Task / Work in the box. Ordinary return uses 10 + 60 seconds. After MINE-2, its three-second visual hide is an additional phase.',r=>r.mine.outcome==='RETURNED',null,null,['task','chatB']]]},
    {name:'STUDY',title:'Study and COSECANT',page:'study-mode',setup:()=>{const r=start();study(r);},steps:[['[data-study-action="break"]','The prepared Study block has active-time accounting. Press START BREAK.',r=>r.cosecant.active,null,1],['#acScenario','Choose the off-task resource in the box and let the one-minute tutorial break expire. The overdue stages are five minutes, then one further minute.',r=>r.events.some(e=>e.organ==='COSECANT'&&e.type==='BREAK_COMPLETE'),null,10,['offtask','study']],['#acScenario','Select the Exact Study resource in the box. Three fresh continuous seconds authorize return and Study resume.',r=>r.cosecant.outcome==='RETURNED',null,null,['study','offtask']]]},
    {name:'SECANT',title:'SECANT — Study recovery',page:'secant',setup:()=>{const r=start();study(r);r.setEvidence(SURFACES.offtask);r.advance(5);},steps:[['#wlPopup','SECANT-1 is founded by its factual first display after 300 supported off-task seconds. Need Break is available only at stage 1.',r=>r.secant.stage===1],['#wlPopup','Choose RETURN TO STUDY. It records an intention only. Stages 2 and 3 follow 600 and 795 seconds. Stage 3 has no buttons.',r=>r.events.some(e=>e.organ==='SECANT'&&e.type==='RETURN_INTENT')],['#acScenario','Select the Exact Study resource in the box. Verification takes 10 seconds; confirmation takes another 60. Uncertainty cannot earn recovery.',r=>r.secant.outcome==='RETURNED',null,null,['study','offtask']]]},
    {name:'RECORDS',title:'Records and Science Lab',page:'metric-hub',setup:()=>start(),steps:[['#page-metric-hub','Metric Hub reads accepted events. Tutorial projections stay separate from your local history.',()=>true],['#menuToggle','Open Science Lab from MENU and select Chapter 3 to start and end an explicit experiment.',r=>r.experiments.length>0],['#page-science-lab','Transfer the finalized Chapter 3 package to Chapter 5. No neurological hypothesis is generated.',()=>app.ui.labTransferred]]},
    {name:'TOOLS',title:'Clock, reports and GET CHART',page:'control',setup:()=>start(),steps:[['#scGear','Clock timezone is a display preference. It does not change effective organ timing.',()=>true],['#btnEngineStop','Stop this tutorial session to finalize it. Unresolved outcomes remain non-successful.',r=>r.state==='ENDED'],['#getChartBtn','GET CHART keeps the original neon poster, PDF print and JPG export. Reports use the same projection as dashboards.',()=>true]]}
  ];
  const lessons=chapters.flatMap((chapter,c)=>chapter.steps.map((step,s)=>({chapter,c,s,step})));
  function render(){
    const l=lessons[index],r=app.getRuntime(),last=index===lessons.length-1;
    const root=$('acRoot');root.dataset.popup=String(l.step[0]==='#wlPopup');root.dataset.phase=phase;
    text('acLesson',l.chapter.title);text('acChip',l.chapter.name);text('acHudName',l.chapter.title);text('acCount',`${index+1} / ${lessons.length}`);
    lastSay=(phase!=='read'&&l.step[3])?l.step[3](r):l.step[1];text('acSay',lastSay);
    text('acAsk',phase==='read'?(needsAct?'Read this, then press TRY IT. The dark background clears so you can use MYELIN.':'Read this, then press NEXT.'):phase==='act'?'Your turn: use MYELIN now. The guide is watching for your action.':'✓ Action detected. Press NEXT to continue.');
    $('acAsk').hidden=false;$('acSim').hidden=false;
    const next=()=>{if(!(achieved||satisfied())){text('acHint','That action is not complete yet. Follow the highlighted control, or use Skip tour.');$('acHint').hidden=false;return;}if(last)stop();else go(index+1);};
    $('acActions').replaceChildren(button('BACK',()=>go(Math.max(0,index-1)),{class:'ac-btn ghost',disabled:index===0}),
      phase==='read'&&needsAct?button('TRY IT',()=>setPhase('act'),{class:'ac-btn primary','data-ac':'try'}):button(last?'FINISH':'NEXT',next,{class:'ac-btn primary','data-ac':'next'}));
    $('acBar').style.width=`${(index+1)/lessons.length*100}%`;
    $('acDim').classList.toggle('off',phase!=='read');
    {const sc=$('acScenario'),keys=l.step[5];if(keys){const sig=keys.join();if(sc.dataset.keys!==sig){sc.dataset.keys=sig;app.simulator.picker(sc,keys);}sc.hidden=false;}else{sc.hidden=true;delete sc.dataset.keys;}}
    clockPolicy();
  }
  function focusTarget(){const t=document.querySelector(curTarget);if(!t)return;try{if(curTarget==='#acScenario')t.querySelector('button')?.focus({preventScroll:true});else if(curTarget==='#wlPopup'||t.matches('button,input,select,textarea,[tabindex]'))t.focus({preventScroll:true});}catch{/* focus is a convenience only */}}
  function focusCoach(){requestAnimationFrame(()=>{try{document.querySelector('#acActions [data-ac]')?.focus({preventScroll:true});}catch{/* focus is a convenience only */}});}
  function setPhase(p){phase=p;arranged='';lastRing=null;render();if(p==='act'){ensureVisible();focusTarget();}else if(p==='done')focusCoach();}
  function draw(){
    if(!open)return;const l=lessons[index];curTarget=l.step[0];arranged='';popupGoneAt=0;
    if(curTarget==='#mainSidebar'){if(!app.ui.sidebarOpen)app.ui.openSidebar();}else if(curTarget!=='#menuToggle'&&app.ui.sidebarOpen)app.ui.closeSidebar();
    phase='read';needsAct=!trivial(l.step[2])&&!satisfied();achieved=!needsAct;
    render();ensureVisible();startLoop();focusCoach();
  }
  function startLoop(){
    const my=++token;lastRing=null;cancelAnimationFrame(raf);
    const tick=()=>{raf=null;if(!open||my!==token||document.hidden)return;
      const l=lessons[index];
      if(needsAct&&!achieved&&satisfied()){achieved=true;setPhase('done');}          // detected from real runtime facts only
      if(phase!=='read'&&l.step[3]){const t=l.step[3](app.getRuntime());if(t!==lastSay){lastSay=t;text('acSay',t);}}
      clockPolicy();
      const target=document.querySelector(l.step[0]),b=target?.getBoundingClientRect();
      const showRing=!!b&&b.width>0&&b.height>0&&phase!=='done'&&!(phase==='act'&&l.step[0]==='#wlPopup');
      const next=showRing?[b.left-5,b.top-5,b.width+10,b.height+10]:null,ring=$('acRing');
      if(!next){if(!ring.hidden)ring.hidden=true;lastRing=null;}
      else if(!lastRing||next.some((v,i)=>Math.abs(v-lastRing[i])>.5)){[ring.style.left,ring.style.top,ring.style.width,ring.style.height]=[`${next[0]}px`,`${next[1]}px`,`${next[2]}px`,`${next[3]}px`];ring.hidden=false;lastRing=next;}
      if(phase==='act'&&l.step[0]==='#wlPopup'&&!satisfied()){
        if(!document.getElementById('wlPopup')){popupGoneAt=popupGoneAt||performance.now();if(performance.now()-popupGoneAt>2500&&$('acHint').hidden){text('acHint','The popup display window ended before an action was recorded. Press REPLAY LESSON to try again.');$('acHint').hidden=false;}}else popupGoneAt=0;}
      arrange();raf=requestAnimationFrame(tick);};
    tick();
  }
  async function go(next){const previous=lessons[index];index=next;setSetting('academy',{index});$('acHint').hidden=true;const l=lessons[index];if(l.s===0||l.c!==previous?.c){l.chapter.setup();holdClockNow();await app.ui.navigate(l.chapter.page);}draw();}
  async function launch(){if(!open){await app.beginTutorial();open=true;}$('acIntro').hidden=true;$('acRoot').hidden=false;index=Math.max(0,Math.min(Number(setting('academy',{index:0}).index)||0,lessons.length-1));lessons[index].chapter.setup();holdClockNow();await app.ui.navigate(lessons[index].chapter.page);draw();}
  function stop(){open=false;token++;resetLayout();$('acDim').classList.remove('off');delete $('acRoot').dataset.phase;cancelAnimationFrame(raf);raf=null;$('acRoot').hidden=true;$('acIntro').hidden=true;setSetting('academySeen',true);app.endTutorial();}
  $('acLauncher').onclick=()=>{if(open){render();return;}$('acIntro').hidden=false;};$('acStart').onclick=app.ui.guard(launch);$('acSkipIntro').onclick=()=>{$('acIntro').hidden=true;setSetting('academySeen',true);};$('acSkip').onclick=stop;
  $('acReplay').onclick=app.ui.guard(()=>{const first=lessons.findIndex(l=>l.c===lessons[index].c);go(first);});
  $('acHintBtn').onclick=()=>{text('acHint','Use the highlighted control. Choose the workspace resource explicitly; clicking a return button records intent only. There is no timeout that pretends success.');$('acHint').hidden=!$('acHint').hidden;};
  $('acMapBtn').onclick=()=>{const content=el('div',{class:'wl-grid'},chapters.map((c,i)=>button(c.title,app.ui.guard(async()=>{app.ui.closeModal();await go(lessons.findIndex(l=>l.c===i));}))));app.ui.openModal('Academy chapter map',content);};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(open)stop();else if(!$('acIntro').hidden){$('acIntro').hidden=true;setSetting('academySeen',true);}}});
  document.addEventListener('visibilitychange',()=>{if(open){token++;cancelAnimationFrame(raf);raf=null;if(!document.hidden)startLoop();}});
  if(!setting('academySeen',false))$('acIntro').hidden=false;
  return {launch,stop,get open(){return open;},chapters};
}
