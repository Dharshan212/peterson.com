import {event,uid,copy,POLICY_VERSION} from './events.js';
import {Sine} from './organs/sine.js';
import {Mirl} from './organs/mirl.js';
import {Mine} from './organs/mine.js';
import {Cosine} from './organs/cosine.js';
import {Study} from './organs/study.js';
import {Secant} from './organs/secant.js';
import {Cosecant} from './organs/cosecant.js';
import {NormalBreak} from './organs/normal-break.js';
export class Runtime {
  constructor({namespace='user',wallNow=()=>Date.now(),onChange=()=>{}}={}){
    this.namespace=namespace;this.wallNow=wallNow;this.onChange=onChange;this.generation=0;this.state='IDLE';this.session=null;this.events=[];this.sequence=0;this.time=0;this.elapsed=0;this.speed=1;this.available=true;this.source='SIMULATED';this.observation={kind:'TASK',resourceId:'task:work'};this.experiments=[];this.experiment=null;this.resetOrgans();
  }
  resetOrgans(){this.sine=new Sine(this);this.mirl=new Mirl(this);this.mine=new Mine(this);this.cosine=new Cosine(this);this.study=new Study(this);this.secant=new Secant(this);this.cosecant=new Cosecant(this);this.normalBreak=new NormalBreak(this);this.organs=[this.sine,this.mirl,this.mine,this.cosine,this.study,this.secant,this.cosecant,this.normalBreak];}
  emit(organ,type,payload={},identity={}){const e=event(this,organ,type,payload,identity);this.events.push(e);return e;}
  start({speed=1}={}){
    if(['ACTIVE','PAUSED'].includes(this.state))throw new Error('A session already owns this runtime.');
    if(![1,30,60].includes(speed))throw new Error('Unsupported clock speed.');
    this.generation++;this.time=0;this.elapsed=0;this.events=[];this.sequence=0;this.speed=speed;this.resetOrgans();this.experiments=[];this.experiment=null;
    this.session={id:uid(this.namespace==='tutorial'?'tutorial':'session'),namespace:this.namespace,startedAt:new Date(this.wallNow()).toISOString(),speed,mode:speed===1?'REAL_TIME':'ACCELERATED_DEMO',policyVersion:POLICY_VERSION};
    this.state='ACTIVE';this.emit('SESSION','SESSION_STARTED',{speed,mode:this.session.mode});this.changed();return this.session.id;
  }
  pause(){if(this.state!=='ACTIVE')return false;this.state='PAUSED';this.emit('SESSION','SESSION_PAUSED');this.invalidateProof('global_pause');this.changed();return true;}
  resume(){if(this.state!=='PAUSED')return false;this.state='ACTIVE';this.emit('SESSION','SESSION_RESUMED');this.changed();return true;}
  invalidateProof(reason){for(const o of [this.mirl,this.mine,this.cosine,this.secant])if(o.recovery){o.emit('RETURN_INTERRUPTED',{attemptId:o.recovery.id,reason});o.recovery=null;}this.cosecant.confirm=0;this.cosecant.returning=false;}
  end(reason='ENDED'){
    if(!['ACTIVE','PAUSED'].includes(this.state))return false;
    for(const o of this.organs)o.cancel(reason);
    if(this.experiment)this.endExperiment(reason==='ENDED'?'COMPLETED':'INTERRUPTED');
    this.state=reason;this.emit('SESSION','SESSION_ENDED',{outcome:reason,activeSeconds:this.time,elapsedSeconds:this.elapsed});this.session.endedAt=new Date(this.wallNow()).toISOString();this.generation++;this.changed();return true;
  }
  setEvidence(observation){
    if(!['TASK','SOCIAL','MESSAGING','STREAMING','STUDY','OFF_TASK','UNKNOWN','ORDINARY'].includes(observation.kind))throw new Error('Unknown evidence kind');
    if(observation.resourceId!==this.observation.resourceId&&!this.sine.episodeId)this.sine.dwell=0;
    this.observation={...observation};if(this.session && ['ACTIVE','PAUSED'].includes(this.state)){this.emit('WORKSPACE','RESOURCE_CHANGED',{...observation});if(this.state==='ACTIVE')this.tick(0);}this.changed();
  }
  setAvailable(value,reason='visibility'){
    value=!!value;if(this.available===value)return;this.available=value;
    if(this.session && ['ACTIVE','PAUSED'].includes(this.state)){const old=this.source;this.source='BROWSER_OBSERVED';this.emit('WORKSPACE',value?'EVIDENCE_AVAILABLE':'EVIDENCE_UNAVAILABLE',{reason});this.source=old;if(!value)this.invalidateProof(reason);if(this.state==='ACTIVE')this.tick(0);}this.changed();
  }
  advance(seconds,generation=this.generation){
    if(generation!==this.generation || !Number.isFinite(seconds) || seconds<0)return false;
    if(!['ACTIVE','PAUSED'].includes(this.state))return false;
    this.elapsed+=seconds;
    if(this.state==='ACTIVE'){
      const intervalStart=this.time;let remaining=seconds*this.speed;
      // A bounded integration interval, not independent organ callback clocks.
      while(remaining>1e-8){const dt=Math.min(.25,remaining);this.time=Number((this.time+dt).toFixed(6));this.tick(dt);remaining-=dt;}
      if(seconds>0)this.emit('WORKSPACE','OBSERVATION_INTERVAL',{start:intervalStart,end:this.time,kind:this.available?this.observation.kind:'UNKNOWN',resourceId:this.observation.resourceId,supported:this.available&&this.observation.kind!=='UNKNOWN'});
    }
    this.changed();return true;
  }
  tick(dt){
    const o=this.available?this.observation:{kind:'UNKNOWN',resourceId:null};
    if(this.cosecant.active){this.cosecant.tick(dt,o);return;}
    if(['ACTIVE','PAUSED'].includes(this.study.state)){
      if(this.study.state==='ACTIVE'){this.study.tick(dt);if(this.study.state==='ACTIVE')this.secant.tick(dt,o);}return;
    }
    if(this.normalBreak.holds){this.normalBreak.tick(dt);return;}
    this.mirl.tick(dt,o);this.sine.tick(dt,o);this.mine.tick(dt,o);this.cosine.tick(dt,o);
  }
  preemptNormal(){if(this.normalBreak.holds)throw new Error('Finish Normal Break and its resume gate before Study.');for(const o of [this.sine,this.mirl,this.mine,this.cosine])o.cancel('STUDY_PREEMPTED');}
  display(id,generation=this.generation){if(this.state!=='ACTIVE' || !this.available || generation!==this.generation)return false;const o=this.organs.find(o=>o.popup?.id===id);if(!o)return false;const ok=o.display(id);if(ok)this.changed();return ok;}
  command(organ,action,value,generation=this.generation){
    if(this.state!=='ACTIVE' || generation!==this.generation)return false;
    const o=this.organs.find(o=>o.name===organ);if(!o)return false;
    let ok=false;
    if(organ==='SINE' && action==='normal-break'){this.normalBreak.requestBreak();ok=true;}
    else if(organ==='SECANT' && action==='study-break'){if(!o.popup?.displayed || o.stage!==1)return false;this.cosecant.start(this.study.plan.breakSeconds);ok=true;}
    else if(organ==='STUDY'){
      if(action==='prepare'){o.prepare(value);ok=true;}
      else if(action==='break'){this.cosecant.start(o.plan.breakSeconds);ok=true;}
      else if(['start','pause','resume','complete'].includes(action))ok=o[action]();
    } else ok=o.command?.(action,value) || false;
    this.changed();return ok;
  }
  startExperiment(){if(this.state!=='ACTIVE' || this.experiment)throw new Error('Start a session; only one experiment may run at a time.');const e={id:uid('experiment'),sessionId:this.session.id,start:this.time,startElapsed:this.elapsed,startSequence:this.sequence+1,studyInitiallyActive:this.study.state==='ACTIVE',status:'RUNNING',namespace:this.namespace};this.experiment=e;this.emit('SCIENCE','EXPERIMENT_STARTED',{experimentId:e.id});this.changed();return e;}
  endExperiment(status='COMPLETED'){
    if(!this.experiment)return null;const e=this.experiment;this.emit('SCIENCE','EXPERIMENT_ENDED',{experimentId:e.id,status});
    e.end=this.time;e.endElapsed=this.elapsed;e.endSequence=this.sequence;e.status=status;e.events=copy(this.events.filter(x=>x.sequence>=e.startSequence && x.sequence<e.endSequence));
    this.experiments.push(copy(e));this.experiment=null;this.changed();return e;
  }
  snapshot(){return {session:copy({...this.session,state:this.state,activeSeconds:this.time,elapsedSeconds:this.elapsed}),events:copy(this.events),experiments:copy(this.experiments),activeExperiment:copy(this.experiment),study:this.study.plan?{blockId:this.study.blockId,plan:copy(this.study.plan),state:this.study.state,activeSeconds:this.study.activeSeconds}:null};}
  changed(){this.onChange(this);}
}
