import {$,el,button,text} from './dom.js';
export const SURFACES={task:{kind:'TASK',resourceId:'task:work',label:'Task / Work'},social:{kind:'SOCIAL',resourceId:'social:feed',label:'Social feed'},chatA:{kind:'MESSAGING',resourceId:'message:whatsapp',platform:'WhatsApp',label:'Messaging · WhatsApp'},chatB:{kind:'MESSAGING',resourceId:'message:telegram',platform:'Telegram',label:'Messaging · Telegram'},streamA:{kind:'STREAMING',resourceId:'stream:netflix',platform:'Netflix',label:'Streaming · Netflix'},streamB:{kind:'STREAMING',resourceId:'stream:prime',platform:'Prime Video',label:'Streaming · Prime Video'},study:{kind:'STUDY',resourceId:'study:primary',label:'Exact Study resource'},offtask:{kind:'OFF_TASK',resourceId:'study:off-task',label:'Off-task Study resource'},unknown:{kind:'UNKNOWN',resourceId:'study:uncertain',label:'Uncertain resource'}};
// The simulator is an internal evidence source, not a Control Station panel. The desktop application has no
// "workspace" strip: its evidence comes from the operating system. In the browser the same runtime still needs
// something to consume, so the surfaces below remain available through `app.simulator.select(key)` (used by the
// Academy guide and the demo reset) and through a small tray that stays hidden until it is opened on purpose
// from Local settings. Nothing here changes runtime semantics: it only calls Runtime.setEvidence.
export function mountSimulator(app){
  const tray=el('aside',{id:'wlDevTray',class:'wl-devtray','aria-label':'Demo and simulation tools',hidden:''},
    el('div',{class:'wl-devtray-head'},el('b',{},'DEMO & SIMULATION TOOLS'),button('CLOSE',()=>setOpen(false),{'aria-label':'Close demo and simulation tools'})),
    el('p',{class:'wl-devtray-note'},'SIMULATED · NO EXTERNAL SERVICES. MYELIN Web Lite never observes other websites or applications; this chooses which simulated activity the browser-contained engine receives.'));
  const clock=el('div',{class:'wl-devtray-row',id:'wlDevClock'});
  const tabs=el('div',{class:'wl-sim-tabs'});
  for(const [key,s]of Object.entries(SURFACES))tabs.append(button(s.label,()=>select(key),{'data-surface':key}));
  const detail=el('div',{id:'wlSurface',class:'wl-surface'});
  tray.append(clock,tabs,detail);document.body.append(tray);
  if(app.ui?.demoControls)clock.append(...app.ui.demoControls);
  function setOpen(on){tray.hidden=!on;if(on){render();tabs.querySelector('button')?.focus();}}
  function select(key){app.getRuntime().setEvidence(SURFACES[key]);render();}
  function marks(){const o=app.getRuntime().observation;for(const b of document.querySelectorAll('[data-surface],[data-scenario]'))b.classList.toggle('on',SURFACES[b.dataset.surface||b.dataset.scenario].resourceId===o.resourceId);return o;}
  function render(){const o=marks();if(tray.hidden)return;
    const title=o.label||o.kind;detail.replaceChildren(el('div',{},el('b',{},title),el('p',{},o.kind==='TASK'?'Work on your local task. Staying here supplies simulated supported focus evidence.':o.kind==='STUDY'?'This exact resource is the planned Study target. Its identity is used for SECANT and COSECANT proof.':o.kind==='UNKNOWN'?'Evidence is uncertain. No successful return or qualifying distraction dwell is inferred.':'This surface supplies simulated activity to the same organ authorities used in real-time mode.')),el('code',{},o.resourceId||'UNAVAILABLE'));
  }
  // The Academy guide offers a few of these surfaces inside its own bubble when a lesson needs the visitor to "switch application".
  function picker(host,keys){host.replaceChildren(el('span',{class:'ac-scenario-cap'},'SIMULATED ACTIVITY · in desktop MYELIN you would switch applications yourself'),el('div',{class:'ac-scenario-row'},keys.map(k=>button(SURFACES[k].label,()=>select(k),{class:'ac-btn ghost','data-scenario':k}))));marks();}
  return {select,render,picker,open:()=>setOpen(true),close:()=>setOpen(false),toggle:()=>setOpen(tray.hidden),get isOpen(){return !tray.hidden;},surfaces:SURFACES};
}
