import {Organ,recover} from './shared.js';
import {minutes} from '../events.js';
export class Cosine extends Organ {
  constructor(r){super(r,'COSINE');this.dwell=0;this.platform=null;this.remaining=null;this.final=false;}
  tick(dt,o){
    const ott=this.r.available && o.kind==='STREAMING';
    if(this.state==='CLOSED'){if(!ott)return;this.state='IDLE';this.episodeId=null;this.dwell=0;this.final=false;}
    if(ott){if(this.episodeId && this.platform && this.platform!==o.platform)this.emit('PLATFORM_CHANGED',{from:this.platform,to:o.platform});this.platform=o.platform;}
    if(!this.episodeId){this.dwell=ott?this.dwell+dt:0;if(this.dwell>=300){this.begin();this.state='INTENT_GATE_PENDING';this.request('INTENT_GATE',['return-intention','intentional-break']);}return;}
    const recovering=!!this.recovery;
    if(recover(this,dt,this.r.available && o.kind==='TASK',{hideAt:this.final?3:0}))return;
    if(recovering && !this.recovery && this.final)this.request('FINAL_CALLBACK',[]);
    if(this.state==='RETURN_INTENT_OBSERVING' && ott){this.remaining-=dt;if(this.remaining<=0)this.duration();}
    if(this.state==='BREAK_ACTIVE' && this.r.time>=this.deadline){this.state='FINAL_CALLBACK_ACTIVE';this.final=true;this.emit('BREAK_COMPLETED');this.request('FINAL_CALLBACK',[]);}
  }
  display(id){if(!super.display(id))return false;if(this.state==='INTENT_GATE_PENDING')this.state='INTENT_GATE_ACTIVE';return true;}
  duration(){this.state='DURATION_ENTRY';this.request('DURATION',['duration'],{min:10,max:200});}
  command(a,value){
    if(this.state==='INTENT_GATE_ACTIVE' && a==='return-intention'){this.state='RETURN_INTENT_OBSERVING';this.remaining=300;this.emit('INTENT_CHOSEN',{choice:'RETURN'});this.intent();return true;}
    if(this.state==='INTENT_GATE_ACTIVE' && a==='intentional-break'){this.emit('INTENT_CHOSEN',{choice:'BREAK'});this.duration();return true;}
    if(this.state==='DURATION_ENTRY' && a==='duration'){const seconds=minutes(value,10,200);this.deadline=this.r.time+seconds;this.state='BREAK_ACTIVE';this.emit('BREAK_COMMITTED',{seconds,deadline:this.deadline});this.request('BREAK_ACK',['ack']);return true;}
    if(this.state==='BREAK_ACTIVE' && a==='ack'){this.emit('BREAK_ACKNOWLEDGED',{deadline:this.deadline});this.hide('acknowledged');return true;}
    return false;
  }
}
