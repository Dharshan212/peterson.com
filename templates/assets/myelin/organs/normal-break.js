import {Organ} from './shared.js';
import {minutes} from '../events.js';
export class NormalBreak extends Organ {
  constructor(r){super(r,'NORMAL_BREAK');}
  get holds(){return ['ACTIVE','RESUME_GATE'].includes(this.state);}
  requestBreak(){if(this.r.sine.stage!==1 || !this.r.sine.popup?.displayed || this.r.study.state==='ACTIVE')throw new Error('Normal Break requires a displayed normal SINE-1.');this.sourceEpisode=this.r.sine.episodeId;this.state='DURATION_ENTRY';this.r.sine.hide('duration_requested');this.request('DURATION',['duration','cancel'],{min:5,max:30});}
  command(a,value){
    if(this.state==='DURATION_ENTRY' && a==='cancel'){this.hide('cancelled');this.state='IDLE';if(this.r.sine.stage===1&&this.r.sine.state!=='CLOSED')this.r.sine.requestStage(1);return true;}
    if(this.state==='DURATION_ENTRY' && a==='duration'){const seconds=minutes(value,5,30);if(this.r.sine.episodeId!==this.sourceEpisode||this.r.sine.stage!==1||this.r.sine.state==='CLOSED'){this.hide('stale_admission');this.state='IDLE';throw new Error('The original SINE-1 is no longer eligible for this break.');}this.begin();this.state='ACTIVE';this.duration=seconds;this.deadline=this.r.time+seconds;this.emit('BREAK_STARTED',{seconds,sineEpisodeId:this.r.sine.episodeId});this.hide('committed');this.r.sine.hide('normal_break');this.r.mirl.recovery=null;return true;}
    if(this.state==='ACTIVE' && a==='stop'){this.finish('STOPPED_EARLY');return true;}
    if(this.state==='RESUME_GATE' && a==='resume'){this.emit('RESUME_ACKNOWLEDGED');this.hide('resumed');this.close(this.outcome);this.r.sine.requestStage(2);return true;}return false;
  }
  finish(outcome){this.outcome=outcome;this.emit(outcome==='COMPLETED'?'BREAK_COMPLETED':'BREAK_STOPPED',{outcome});this.state='RESUME_GATE';this.request('RESUME_GATE',['resume']);}
  tick(){if(this.state==='ACTIVE' && this.r.time>=this.deadline)this.finish('COMPLETED');}
}
