import {Organ} from './shared.js';
import {uid,minutes} from '../events.js';
export class Study extends Organ {
  constructor(r){super(r,'STUDY');this.state='EMPTY';this.activeSeconds=0;this.blockId=null;this.plan=null;}
  prepare(p){
    if(['ACTIVE','PAUSED'].includes(this.state))throw new Error('Complete the current block before preparing another.');
    const duration=minutes(p.studyMinutes,1,1440),breakSeconds=minutes(p.breakMinutes,1,1440);
    const subject=String(p.subject||'').trim(),task=String(p.task||'').trim();
    if(!subject || !task)throw new Error('Enter a subject and task.');
    this.plan={subject:subject.slice(0,200),task:task.slice(0,500),duration,breakSeconds,resourceId:p.resourceId||'study:primary'};
    this.blockId=uid('study');this.episodeId=this.blockId;this.activeSeconds=0;this.state='READY';this.emit('PLAN_PREPARED',{...this.plan,blockId:this.blockId});
  }
  start(){if(this.state!=='READY')return false;this.r.preemptNormal();this.state='ACTIVE';this.started=this.r.time;this.emit('BLOCK_STARTED',{plan:this.plan});this.r.secant.open(this.blockId);return true;}
  pause(){if(this.state!=='ACTIVE' || this.r.secant.unresolved || this.r.cosecant.active)throw new Error('Resolve the active recovery or break before pausing Study.');this.state='PAUSED';this.emit('BLOCK_PAUSED');this.r.secant.invalidate();return true;}
  resume(){if(this.state!=='PAUSED' || this.r.cosecant.active || this.r.secant.unresolved)throw new Error('Resume requires completed break/recovery coordination.');this.state='ACTIVE';this.emit('BLOCK_RESUMED');return true;}
  tick(dt){if(this.state==='ACTIVE'){this.activeSeconds=Math.min(this.plan.duration,this.activeSeconds+dt);if(this.activeSeconds>=this.plan.duration)this.complete();}}
  complete(){if(!['ACTIVE','PAUSED'].includes(this.state))return false;this.r.secant.cancel('STUDY_COMPLETED');this.r.cosecant.cancel('STUDY_COMPLETED');this.state='COMPLETED';this.emit('BLOCK_COMPLETED',{activeSeconds:this.activeSeconds,plannedSeconds:this.plan.duration});return true;}
  cancel(reason){if(['ACTIVE','PAUSED','READY'].includes(this.state)){this.emit('BLOCK_INTERRUPTED',{reason,activeSeconds:this.activeSeconds});this.state='SHUTDOWN';}}
}
