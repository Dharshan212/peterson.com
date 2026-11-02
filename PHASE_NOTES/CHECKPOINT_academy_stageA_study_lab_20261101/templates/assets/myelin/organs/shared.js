import {uid} from '../events.js';
export class Organ {
  constructor(runtime,name) {this.r=runtime;this.name=name;this.state='IDLE';this.episodeId=null;this.stage=0;this.popup=null;this.outcome=null;}
  emit(type,payload={}) {return this.r.emit(this.name,type,payload,{episodeId:this.episodeId});}
  begin() {this.episodeId=uid(this.name.toLowerCase());this.started=this.r.time;this.outcome=null;this.emit('EPISODE_STARTED');}
  request(stage,actions=[],extra={}) {
    if(this.popup)this.hide('replaced');
    this.popup={id:uid('popup'),organ:this.name,episodeId:this.episodeId,stage,actions,displayed:false,generation:this.r.generation,...extra};
    this.emit('POPUP_REQUESTED',{requestId:this.popup.id,stage});
  }
  display(id) {
    if(!this.popup || this.popup.id!==id || this.popup.displayed)return false;
    this.popup.displayed=true;this.popup.displayedAt=this.r.time;
    this.emit('STAGE_DISPLAYED',{requestId:id,stage:this.popup.stage});return true;
  }
  hide(reason) {if(this.popup){this.emit('POPUP_WITHDRAWN',{requestId:this.popup.id,reason});this.popup=null;}}
  close(outcome='CANCELLED') {
    this.hide(outcome);if(this.episodeId && this.state!=='CLOSED')this.emit('EPISODE_CLOSED',{outcome});
    this.state='CLOSED';this.outcome=outcome;this.recovery=null;
  }
  cancel(reason) {if(this.episodeId)this.close(reason);else {this.hide(reason);this.state='IDLE';this.dwell=0;}}
  intent() {this.emit('RETURN_INTENT');this.hide('return_intent');}
}
// Each attempt is bound to one exact resource. The three-second MINE hide
// is an additional phase; COSINE's hide is within its ten-second verification.
export function recover(o,dt,focus,{visual=0,hideAt=0}={}) {
  if(!focus){
    if(o.recovery){o.emit(o.recovery.phase==='CONFIRMING'?'RELAPSE':'RETURN_INTERRUPTED',{attemptId:o.recovery.id,reason:o.r.available?'evidence_changed':'unavailable'});o.recovery=null;}
    return false;
  }
  const resource=o.r.observation.resourceId;
  if(o.recovery && o.recovery.resource!==resource){o.emit('RETURN_INTERRUPTED',{attemptId:o.recovery.id,reason:'resource_changed'});o.recovery=null;}
  if(!o.recovery){o.recovery={id:uid('attempt'),phase:visual?'VISUAL':'VERIFYING',seconds:0,resource,onset:o.r.time};o.emit('RETURN_STARTED',{attemptId:o.recovery.id,onset:o.r.time,latencySeconds:o.r.time-o.started});return false;}
  const a=o.recovery;a.seconds+=dt;
  if(a.phase==='VISUAL' && a.seconds>=visual){o.hide('visual_return_only');a.phase='VERIFYING';a.seconds=0;o.emit('VERIFICATION_STARTED',{attemptId:a.id});}
  else if(a.phase==='VERIFYING'){
    if(hideAt && a.seconds>=hideAt)o.hide('visual_return_only');
    if(a.seconds>=10){a.phase='CONFIRMING';a.seconds=0;o.emit('RETURN_VERIFIED',{attemptId:a.id,onset:a.onset,latencySeconds:a.onset-o.started});}
  } else if(a.phase==='CONFIRMING' && a.seconds>=60){o.emit('RECOVERY_CONFIRMED',{attemptId:a.id,onset:a.onset,latencySeconds:a.onset-o.started});o.close('RETURNED');return true;}
  return false;
}
