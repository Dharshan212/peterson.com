import {Organ,recover} from './shared.js';
export class Mirl extends Organ {
  constructor(r){super(r,'MIRL');}
  admit(sine){this.episodeId=sine.episodeId;this.started=this.r.time;this.state='WAITING_FOR_RETURN';this.recovery=null;this.emit('EPISODE_STARTED',{linkedOrgan:'SINE'});}
  tick(dt,o){
    if(!this.episodeId || this.state==='CLOSED' || this.r.normalBreak.holds)return;
    const done=recover(this,dt,this.r.available && o.kind==='TASK');
    if(done)this.r.sine.close('RETURNED');
    else this.state=this.recovery?.phase || 'WAITING_FOR_RETURN';
  }
}
