import {Organ,recover} from './shared.js';
import {minutes} from '../events.js';
export class Mine extends Organ {
  constructor(r){super(r,'MINE');this.dwell=0;this.segment=0;this.platform=null;this.branch=null;this.remaining=null;this.final=false;}
  flush(){if(this.segment>0 && this.episodeId)this.emit('MESSAGING_DWELL_SEGMENT_COMPLETED',{platform:this.platform,dwellSeconds:this.segment});this.segment=0;}
  tick(dt,o){
    const messaging=this.r.available && o.kind==='MESSAGING',focus=this.r.available && o.kind==='TASK';
    if(this.state==='CLOSED'){if(messaging){this.state='IDLE';this.episodeId=null;this.dwell=0;this.final=false;this.branch=null;}else return;}
    if(messaging){
      if(this.platform && this.platform!==o.platform){this.flush();if(this.episodeId)this.emit('PLATFORM_CHANGED',{from:this.platform,to:o.platform});}
      this.platform=o.platform;this.segment+=dt;
    }else this.flush();
    if(!this.episodeId){this.dwell=messaging?this.dwell+dt:0;if(this.dwell>=600){this.begin();this.state='MINE1_PENDING';this.request('MINE-1',['come-back','important']);}return;}
    const hadRecovery=!!this.recovery;
    if(recover(this,dt,focus,{visual:this.final?3:0}))return;
    if(hadRecovery && !this.recovery && this.final)this.request(this.branch==='A'?'MINE-2A':'MINE-2B',[]);
    if(this.state==='RETURN_INTENT_ACTIVE' && messaging){this.remaining-=dt;if(this.remaining<=0)this.callback();}
    if(this.state==='IMPORTANT_ALLOWANCE_ACTIVE' && this.r.time>=this.deadline)this.callback();
  }
  display(id){if(!super.display(id))return false;if(this.state==='MINE1_PENDING')this.state='MINE1_ACTIVE';return true;}
  callback(){this.final=true;this.remaining=0;this.state=this.branch==='A'?'MINE2A_ACTIVE':'MINE2B_ACTIVE';this.request(this.branch==='A'?'MINE-2A':'MINE-2B',[]);}
  command(a,value){
    if(this.state==='MINE1_ACTIVE' && a==='come-back'){this.branch='A';this.state='RETURN_INTENT_ACTIVE';this.remaining=795;this.emit('BRANCH_CHOSEN',{branch:'A'});this.intent();return true;}
    if(this.state==='MINE1_ACTIVE' && a==='important'){this.branch='B';this.state='IMPORTANT_DURATION_ENTRY';this.emit('BRANCH_CHOSEN',{branch:'B'});this.request('DURATION',['duration'],{min:5,max:30});return true;}
    if(this.state==='IMPORTANT_DURATION_ENTRY' && a==='duration'){const seconds=minutes(value,5,30);this.deadline=this.r.time+seconds;this.remaining=seconds;this.state='IMPORTANT_ALLOWANCE_ACTIVE';this.emit('ALLOWANCE_COMMITTED',{seconds,deadline:this.deadline});this.hide('committed');return true;}
    return false;
  }
  close(reason){this.flush();super.close(reason);}
}
