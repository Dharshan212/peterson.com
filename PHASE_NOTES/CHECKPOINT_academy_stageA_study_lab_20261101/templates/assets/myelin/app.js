import {Runtime} from './runtime.js';
import {LocalStore,SessionLock} from './storage.js';
import {mountUI} from './ui.js';
import {mountSimulator} from './simulator.js';
import {mountAcademy} from './academy.js';
import {mountReports,download} from './reports.js';
import {project} from './projections.js';
import {mountPresentation} from './presentation.js';
import {mountDemoExit} from './demo-exit.js';
import {mountAxon} from './axon.js';
const store=await new LocalStore().open(),lock=new SessionLock();let owner=await lock.acquire(),history=[];
try{history=owner?await store.recoverInterrupted():await store.all();}catch(e){store.durable=false;store.error=e.message;}
let current,main=new Runtime(),tutorial=null,wasActive=false,dirty=false,lastSave=0,queued=false;
current=main;
const app={store,ui:null,simulator:null,reports:null,academy:null,
  getRuntime:()=>current,canOwn:()=>owner||current?.namespace==='tutorial',
  snapshots(){const snap=current.session?current.snapshot():null;return current.namespace==='tutorial'?(snap?[snap]:[]):[...history.filter(s=>s.session.id!==snap?.session.id),...(snap?[snap]:[])];},
  async start(speed){if(current.namespace!=='tutorial'&&!owner){owner=await lock.acquire();if(!owner)throw new Error('Another tab owns the local session. Close it and try again.');history=await store.recoverInterrupted();}if(current===main&&main.session){await app.flush();history=await store.all();}current.start({speed});if(current===main)dirty=true;await app.flush();},
  end(reason){current.end(reason);dirty=true;app.flush();},
  async flush(){if(main.session&&dirty){dirty=false;await store.save(main.snapshot());}await store.queue;},
  async exportData(){await app.flush();const data=await store.all(),notes=await store.all('notes'),planner=await store.all('planner'),savedReports=await store.all('reports'),sessionIds=new Set(data.map(s=>s.session.id)),reports=[...savedReports.filter(r=>!sessionIds.has(r.id)),...data.map(s=>{const projection=project([s]);return{id:s.session.id,sessionId:s.session.id,projection,policyVersion:projection.policyVersion};})];download(new Blob([JSON.stringify({schemaVersion:1,sessions:data,notes,planner,reports},null,2)],{type:'application/json'}),'MYELIN_Web_Lite_local_data.json');},
  async clearHistory(){if(['ACTIVE','PAUSED'].includes(main.state)||tutorial)throw new Error('End the active session/tutorial before clearing local history.');if(!owner)throw new Error('This tab does not own local storage.');await store.clear();history=[];main=new Runtime({onChange:changed});current=main;dirty=false;app.ui.resetContext();app.ui.render();app.ui.renderPage();},
  async beginTutorial(){if(tutorial)return;wasActive=main.state==='ACTIVE';if(wasActive)main.pause();await app.flush();tutorial=new Runtime({namespace:'tutorial',onChange:changed});current=tutorial;app.ui.resetContext();changed();},
  endTutorial(){if(!tutorial)return;tutorial.end('ENDED');tutorial=null;current=main;app.ui.resetContext();if(wasActive)main.resume();wasActive=false;changed();app.ui.navigate('control');},
  report(type,projection){return app.reports.report(type,projection);}
};
function changed(){if(current===main)dirty=true;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;app.ui?.render();app.simulator?.render();app.presentation?.update();app.demoExit?.update();});}
main.onChange=changed;app.ui=mountUI(app);app.simulator=mountSimulator(app);app.reports=mountReports(app);app.academy=mountAcademy(app);app.presentation=mountPresentation(app);app.demoExit=mountDemoExit(app);mountAxon();
let last=performance.now();setInterval(()=>{const now=performance.now(),delta=(now-last)/1000;last=now;const r=current;
  if(delta>2.2){const was=r.available;r.setAvailable(false,'observation_gap');r.advance(delta);if(was&&!document.hidden)r.setAvailable(true,'fresh_observation');}
  else r.advance(delta);
  if(now-lastSave>1000){lastSave=now;app.flush();}app.ui.render();app.presentation.update();app.demoExit.update();
},250);
document.addEventListener('visibilitychange',()=>{current.setAvailable(!document.hidden,'visibilitychange');last=performance.now();app.flush();});
window.addEventListener('pagehide',()=>{main.end('INTERRUPTED');app.flush();});
window.addEventListener('error',e=>app.ui.toast(`Interface error: ${e.message}`));
// Read-only diagnostics facilitate acceptance without forging runtime evidence.
Object.defineProperty(window,'MYELIN',{value:Object.freeze({get state(){return current.state;},snapshot:()=>current.snapshot(),projection:()=>project(app.snapshots(),{namespace:current.namespace}),get tutorial(){return current.namespace==='tutorial';},get durable(){return store.durable;},get owner(){return owner;}})});
app.ui.render();document.getElementById('mLoadingOverlay')?.classList.remove('open');
