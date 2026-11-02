import {uid,copy,SCHEMA_VERSION,POLICY_VERSION} from './events.js';
const stores=['sessions','events','episodes','studyBlocks','breaks','reports','experiments','notes','planner'];
export class LocalStore {
  constructor({indexedDB=globalThis.indexedDB,name='myelin-web-lite-v1'}={}){this.factory=indexedDB;this.name=name;this.db=null;this.durable=false;this.error=null;this.memory=new Map();this.queue=Promise.resolve();this.committedEventCounts=new Map();}
  async open(){try{if(!this.factory)throw new Error('IndexedDB unavailable');this.db=await new Promise((resolve,reject)=>{const req=this.factory.open(this.name,1);req.onupgradeneeded=()=>{for(const s of stores)if(!req.result.objectStoreNames.contains(s))req.result.createObjectStore(s,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Close another old-version tab to upgrade local storage.'));});this.durable=true;this.db.onversionchange=()=>{this.db.close();this.durable=false;this.error='Database version changed; reload this tab.';};}catch(e){this.error=e.message;this.durable=false;}return this;}
  async all(name='sessions'){const local=[...this.memory.values()].filter(x=>x.store===name).map(x=>copy(x.value));if(!this.db)return local;try{const {disk,facts}=await new Promise((resolve,reject)=>{const names=name==='sessions'?['sessions','events']:[name],tx=this.db.transaction(names),sessions=tx.objectStore(name).getAll();let events=[];sessions.onerror=()=>reject(sessions.error);sessions.onsuccess=()=>{if(names.includes('events')){const req=tx.objectStore('events').getAll();req.onerror=()=>reject(req.error);req.onsuccess=()=>{events=req.result;};}};tx.oncomplete=()=>resolve({disk:sessions.result,facts:events});tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Local read aborted'));});if(name==='sessions'&&disk.some(s=>s.eventsStoredSeparately)){const bySession=new Map();for(const e of facts){const list=bySession.get(e.sessionId)||[];list.push(e);bySession.set(e.sessionId,list);}for(const s of disk)if(s.eventsStoredSeparately)s.events=(bySession.get(s.id)||[]).sort((a,b)=>a.sequence-b.sequence);}return [...new Map([...disk,...local].map(v=>[v.id,v])).values()];}catch(e){this.durable=false;this.error=e.message;return local;}}
  save(snapshot){
    // Runtime.snapshot() and all() already return detached values; avoid cloning the event ledger a second time.
    if(!snapshot.session || snapshot.session.namespace!=='user')return Promise.resolve();const snap=snapshot;
    this.queue=this.queue.then(()=>this.commit(snap)).catch(e=>{this.durable=false;this.error=e.message;this.memory.set(snap.session.id,{store:'sessions',value:{id:snap.session.id,...snap}});});return this.queue;
  }
  async commit(snap){
    const id=snap.session.id;if(!this.db){this.memory.set(id,{store:'sessions',value:{id,...snap}});return;}
    // Keep new session rows compact and append facts once; all() hydrates these beside legacy full-snapshot rows.
    const previousCount=this.committedEventCounts.get(id)||0,newEvents=snap.events.slice(previousCount);await new Promise((resolve,reject)=>{
      const tx=this.db.transaction(stores,'readwrite');tx.objectStore('sessions').put({id,...snap,events:[],eventsStoredSeparately:true});
      for(const e of newEvents)tx.objectStore('events').put(e);
      for(const e of newEvents.filter(e=>e.type==='EPISODE_CLOSED'))tx.objectStore('episodes').put({id:e.episodeId,organ:e.organ,sessionId:id,outcome:e.payload.outcome});
      if(snap.study)tx.objectStore('studyBlocks').put({id:snap.study.blockId,sessionId:id,...snap.study});
      for(const e of newEvents.filter(e=>['BREAK_COMPLETED','BREAK_STOPPED','RETURN_CONFIRMED'].includes(e.type)))tx.objectStore('breaks').put({...e});
      for(const e of snap.experiments)tx.objectStore('experiments').put(e);
      tx.oncomplete=()=>{this.committedEventCounts.set(id,snap.events.length);this.memory.delete(id);resolve();};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Local transaction aborted'));
    });
  }
  async recoverInterrupted(){
    const sessions=await this.all();for(const s of sessions)if(['ACTIVE','PAUSED'].includes(s.session.state)){
      s.session.state='INTERRUPTED';s.session.endedAt=new Date().toISOString();
      const previous=s.events.at(-1);s.events.push({schemaVersion:SCHEMA_VERSION,policyVersion:POLICY_VERSION,id:uid('evt'),sequence:(previous?.sequence||0)+1,sessionId:s.id,organ:'SESSION',type:'SESSION_ENDED',generation:previous?.generation||1,source:'BROWSER_OBSERVED',namespace:'user',utc:s.session.endedAt,effectiveSeconds:s.session.activeSeconds,elapsedSeconds:s.session.elapsedSeconds,resourceId:null,contextId:null,evidenceQuality:'UNAVAILABLE',payload:{outcome:'INTERRUPTED',reason:'unfinished_on_reload'}});
      if(s.activeExperiment){s.experiments.push({...s.activeExperiment,status:'INTERRUPTED',end:s.session.activeSeconds,endSequence:previous?.sequence||0,events:s.events.filter(e=>e.sequence>=s.activeExperiment.startSequence && e.type!=='SESSION_ENDED')});s.activeExperiment=null;}
      await this.save(s);
    }return sessions;
  }
  async put(name,value){if(!['notes','planner','reports'].includes(name))throw new Error('Unsupported collection');this.memory.set(`${name}:${value.id}`,{store:name,value:copy(value)});if(!this.db)return;try{await new Promise((resolve,reject)=>{const tx=this.db.transaction(name,'readwrite');tx.objectStore(name).put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){this.durable=false;this.error=e.message;}}
  async clear(){await this.queue;if(this.db)await new Promise((resolve,reject)=>{const tx=this.db.transaction(stores,'readwrite');for(const s of stores)tx.objectStore(s).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});this.memory.clear();}
}
export function setting(key,fallback){try{return JSON.parse(localStorage.getItem(`myelin.web.${key}`))??fallback;}catch{return fallback;}}
export function setSetting(key,value){try{localStorage.setItem(`myelin.web.${key}`,JSON.stringify(value));return true;}catch{return false;}}
// Web Locks provides atomic ownership. Unsupported browsers use an explicit
// read-only fallback, never a racy localStorage pseudo-lock.
export class SessionLock {
  constructor(){this.release=null;this.owned=false;}
  async acquire(){if(this.owned)return true;if(!globalThis.navigator?.locks)return false;return new Promise(resolve=>{navigator.locks.request('myelin-web-lite-session',{ifAvailable:true},async lock=>{if(!lock){resolve(false);return;}this.owned=true;resolve(true);await new Promise(done=>this.release=done);this.owned=false;});});}
  free(){this.release?.();this.release=null;this.owned=false;}
}
