import {Organ} from './shared.js';
export class Cosecant extends Organ {
  constructor(r){super(r,'COSECANT');this.confirm=0;}
  get active(){return !['IDLE','CLOSED'].includes(this.state);}
  start(seconds){
    if(this.active || this.r.study.state!=='ACTIVE' || (this.r.secant.unresolved && this.r.secant.stage!==1))throw new Error('Study break is available during active Study or SECANT-1.');
    this.begin();this.state='BREAK_ACTIVE';this.duration=seconds;this.deadline=this.r.time+seconds;this.resource=this.r.study.plan.resourceId;this.confirm=0;this.returning=false;
    this.r.study.state='PAUSED';this.r.study.emit('BLOCK_PAUSED',{reason:'COSECANT'});this.r.secant.holdBreak();this.emit('BREAK_STARTED',{seconds,resourceId:this.resource});
  }
  tick(dt,o){
    if(!this.active)return;
    const elapsed=this.r.time-this.deadline;
    let target=elapsed<0?'BREAK_ACTIVE':elapsed<300?'BREAK_COMPLETE':elapsed<360?'BREAK_ALREADY_OVER':'FINAL_LOCK';
    if(this.state!==target){this.state=target;if(target!=='BREAK_ACTIVE'){this.emit(target==='FINAL_LOCK'?'FINAL_LOCKED':target);this.request(target,target==='FINAL_LOCK'?[]:['return']);}}
    // Desktop break return evidence is admitted after expiry, not during the planned break.
    const exact=elapsed>=0 && this.r.available && o.kind==='STUDY' && o.resourceId===this.resource;
    if(!exact){if(this.returning)this.emit('RETURN_INTERRUPTED',{reason:'exact_resource_lost'});this.confirm=0;this.returning=false;return;}
    if(!this.returning){this.returning=true;this.confirm=0;this.emit('RETURN_STARTED');return;}
    this.confirm+=dt;
    if(this.confirm>=3){this.emit('RETURN_CONFIRMED',{resourceId:this.resource,seconds:3});this.close('RETURNED');this.r.secant.releaseBreak();this.r.study.state='ACTIVE';this.r.study.emit('BLOCK_RESUMED',{reason:'COSECANT_CONFIRMED'});}
  }
  command(a){if(a==='return' && ['BREAK_COMPLETE','BREAK_ALREADY_OVER'].includes(this.state)){this.emit('RETURN_INTENT');this.hide('intent_only');return true;}return false;}
}
