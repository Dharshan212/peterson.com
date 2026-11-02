import {Organ} from './shared.js';
export class Sine extends Organ {
  constructor(r){super(r,'SINE');this.dwell=0;this.remaining=null;}
  tick(dt,o){
    if(this.state==='CLOSED'){if(o.kind!=='SOCIAL'){this.dwell=0;return;}this.state='IDLE';this.episodeId=null;this.stage=0;this.remaining=null;}
    if(!this.episodeId){
      this.dwell=this.r.available && o.kind==='SOCIAL'?this.dwell+dt:0;
      if(this.dwell>=300){this.begin();this.state='WAITING_FOR_DISPLAY';this.requestStage(1);this.displayDeadline=this.r.time+45;}
      return;
    }
    if(this.state==='WAITING_FOR_DISPLAY' && this.r.time>=this.displayDeadline){this.close('DISPLAY_FAILED');return;}
    if(this.r.normalBreak.holds || this.r.mirl.recovery?.phase==='CONFIRMING')return;
    if(this.popup?.displayed && this.r.time-this.popup.displayedAt >= ({1:45,2:60,3:600}[this.stage]))this.hide('visible_interval_expired');
    if(this.remaining!==null){this.remaining-=dt;if(this.remaining<=0 && this.stage<3){this.remaining=null;this.requestStage(this.stage+1);}}
  }
  requestStage(n){this.request(n,n===1?['return','normal-break']:n===2?['return']:[]);}
  display(id){
    if(!super.display(id))return false;
    const changed=this.stage!==this.popup.stage;
    this.stage=this.popup.stage;this.state=this.stage===3?'PROTECTED_RED':'ACTIVE';
    if(changed)this.remaining=this.stage===1?600:this.stage===2?795:null;
    if(this.stage===1&&changed)this.r.mirl.admit(this);return true;
  }
  command(action){
    if(action==='return' && this.stage<3 && this.popup?.displayed){this.intent();this.r.mirl.emit('RETURN_INTENT');return true;}
    return false;
  }
}
