import {ORGANS,POLICY_VERSION,copy} from './events.js';
export function mbiBand(seconds){if(seconds<=600)return '10 MIN OR LESS';if(seconds<=1800)return '11–30 MIN';if(seconds<=3600)return '31–60 MIN';if(seconds<=7200)return '61–120 MIN';return 'MORE THAN 120 MIN';}
function studySeconds(snapshot){let total=0,start=snapshot.session.studyInitiallyActive?snapshot.session.windowStart||0:null;
  for(const e of snapshot.events){if(e.organ!=='STUDY')continue;if(['BLOCK_STARTED','BLOCK_RESUMED'].includes(e.type))start=e.effectiveSeconds;
    if(['BLOCK_PAUSED','BLOCK_COMPLETED','BLOCK_INTERRUPTED'].includes(e.type)&&start!==null){total+=Math.max(0,e.effectiveSeconds-start);start=null;}}
  if(start!==null)total+=Math.max(0,(snapshot.session.activeSeconds||0)-start);return total;
}
export function project(snapshots,{organ=null,namespace='user'}={}){
  const data=snapshots.filter(s=>s.session && s.session.namespace===namespace),events=data.flatMap(s=>s.events||[]);
  const byOrgan=Object.fromEntries(ORGANS.map(name=>{
    const es=events.filter(e=>e.organ===name),starts=es.filter(e=>e.type==='EPISODE_STARTED'),closed=es.filter(e=>e.type==='EPISODE_CLOSED');
    const confirmed=es.filter(e=>['RECOVERY_CONFIRMED','RETURN_CONFIRMED'].includes(e.type));
    return [name,{name,episodes:starts.length,stages:new Set(es.filter(e=>e.type==='STAGE_DISPLAYED'&&!['DURATION','RESUME_GATE'].includes(e.payload.stage)).map(e=>`${e.episodeId}:${e.payload.stage}`)).size,intents:es.filter(e=>e.type==='RETURN_INTENT').length,verified:es.filter(e=>e.type==='RETURN_VERIFIED').length,returned:closed.filter(e=>e.payload.outcome==='RETURNED').length,confirmed:confirmed.length,relapses:es.filter(e=>e.type==='RELAPSE').length,cancelled:closed.filter(e=>e.payload.outcome!=='RETURNED').length,latencies:confirmed.map(e=>e.payload.latencySeconds).filter(Number.isFinite),events:es}];
  }));
  const formalMine=events.filter(e=>e.organ==='MINE'&&e.type==='EPISODE_STARTED').slice(-10).map(e=>e.episodeId);
  const mbi=events.filter(e=>e.type==='MESSAGING_DWELL_SEGMENT_COMPLETED' && formalMine.includes(e.episodeId)).map(e=>({...e.payload,episodeId:e.episodeId,band:mbiBand(e.payload.dwellSeconds)}));
  const interventions=['SINE','MINE','COSINE','COSECANT'].reduce((sum,k)=>sum+new Set(byOrgan[k].events.filter(e=>e.type==='STAGE_DISPLAYED'&&!['DURATION','RESUME_GATE'].includes(e.payload.stage)).map(e=>`${e.episodeId}:${e.payload.stage}`)).size,0);
  const selected=organ?events.filter(e=>organ==='STUDY_RECOVERY'?['STUDY','SECANT','COSECANT'].includes(e.organ):e.organ===organ):events;
  return {policyVersion:POLICY_VERSION,scope:'WEB LOCAL DATA',namespace,sessions:data.length,sessionIds:data.map(s=>s.session.id),activeSeconds:data.reduce((n,s)=>n+(s.session.activeSeconds||0),0),elapsedSeconds:data.reduce((n,s)=>n+(s.session.elapsedSeconds||0),0),byOrgan,interventions,secantStages:byOrgan.SECANT.stages,mbi,mbiStatus:mbi.length?'AVAILABLE':'NO_EVIDENCE',events:selected,history:data.map(s=>({id:s.session.id,state:s.session.state,mode:s.session.mode,activeSeconds:s.session.activeSeconds,stages:s.events.filter(e=>e.type==='STAGE_DISPLAYED').length})),studyBlocks:events.filter(e=>e.type==='BLOCK_COMPLETED').length,studySeconds:data.reduce((n,s)=>n+studySeconds(s),0),breakOutcomes:events.filter(e=>['BREAK_COMPLETED','BREAK_STOPPED','RETURN_CONFIRMED'].includes(e.type)),availability:events.length?'AVAILABLE':'NO_EVIDENCE',desktopEvidence:'UNAVAILABLE'};
}
export function experimentProjection(experiment){
  const fake={session:{id:experiment.sessionId,namespace:experiment.namespace,activeSeconds:experiment.end,elapsedSeconds:(experiment.endElapsed??0)-(experiment.startElapsed??0),studyInitiallyActive:experiment.studyInitiallyActive,windowStart:experiment.start},events:experiment.events||[]};
  const p=project([fake],{namespace:experiment.namespace});
  return {...p,activeSeconds:experiment.end-experiment.start,scope:'EXPERIMENT WINDOW',experimentId:experiment.id,start:experiment.start,end:experiment.end,status:experiment.status,windowUnit:'effective seconds; ordered event boundaries',interpretation:'Observed browser-contained events and derived counts. No neurological inference.',events:copy(experiment.events||[])};
}
