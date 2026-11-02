import {Organ,recover} from './shared.js';
import {uid} from '../events.js';
export class Secant extends Organ {
  constructor(r){super(r,'SECANT');this.dwell=0;this.remaining=null;this.scope=null;this.held=false;this.breakHeld=false;this.pendingId=null;}
  get unresolved(){return !!this.episodeId && this.state!=='CLOSED';}
  open(scope){this.scope=scope;this.episodeId=null;this.pendingId=null;this.state='OBSERVING';this.stage=0;this.dwell=0;this.recovery=null;this.breakHeld=false;this.emit('SCOPE_OPENED',{scope});}
  invalidate(){if(this.recovery){this.emit('RETURN_INTERRUPTED',{reason:'evidence_unavailable',attemptId:this.recovery.id});this.recovery=null;}this.held=true;}
  tick(dt,o){
    if(!this.scope || this.breakHeld)return;
    const known=this.r.available && o.kind!=='UNKNOWN';
    const qualifies=known && (['SOCIAL','MESSAGING','STREAMING','OFF_TASK'].includes(o.kind));
    const exact=known && o.kind==='STUDY' && o.resourceId===this.r.study.plan?.resourceId;
    if(this.state==='CLOSED'){this.episodeId=null;this.stage=0;this.dwell=0;this.state='OBSERVING';}
    if(!this.episodeId){
      this.dwell=qualifies?this.dwell+dt:0;
      if(!qualifies && this.popup){this.hide('founding_evidence_lost');this.pendingId=null;}
      if(this.dwell>=300 && !this.popup){this.pendingId=uid('secant');this.request(1,['return','study-break']);}
      return;
    }
    if(!known){if(!this.held)this.emit('EVIDENCE_HELD',{remaining:this.remaining});this.held=true;this.hide('uncertainty');this.invalidate();return;}
    const had=!!this.recovery;
    this.held=false;
    if(recover(this,dt,exact))return;
    if(exact){this.held=true;if(this.recovery?.phase==='CONFIRMING')this.hide('verified_entry');return;}
    if(had && !this.recovery)this.emit('RECOVERY_RELEASED',{remaining:this.remaining});
    if(this.remaining!==null){this.remaining-=dt;if(this.remaining<=0 && this.stage<3){this.remaining=null;this.requestStage(this.stage+1);}}
    if(!this.popup && this.withdrawn!==this.stage)this.requestStage(this.stage);
  }
  requestStage(n){this.request(n,n===1?['return','study-break']:n===2?['return']:[]);}
  display(id){
    if(!this.popup || this.popup.id!==id || this.popup.displayed)return false;
    if(!this.episodeId){this.episodeId=this.pendingId;this.started=this.r.time;this.emit('EPISODE_STARTED',{scope:this.scope});this.popup.episodeId=this.episodeId;}
    if(!super.display(id))return false;
    const changed=this.stage!==this.popup.stage;this.stage=this.popup.stage;this.state='ACTIVE';
    if(changed)this.remaining=this.stage===1?600:this.stage===2?795:null;return true;
  }
  command(a){if(a==='return' && this.stage<3 && this.popup?.displayed){this.withdrawn=this.stage;this.intent();return true;}return false;}
  holdBreak(){this.breakHeld=true;this.invalidate();this.hide('study_break');this.emit('BREAK_HELD');}
  releaseBreak(){this.breakHeld=false;this.held=false;this.recovery=null;this.emit('BREAK_RELEASED');}
  cancel(reason){super.cancel(reason);this.scope=null;this.breakHeld=false;}
}
