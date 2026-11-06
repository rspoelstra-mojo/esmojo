import {backgroundSaves} from './background-saves.js';
// Alleen tijdelijk geheugen. Geen opslag van samenvattingen/tokens in de browser.
export function createProfileSaveQueue(request){
 let server=null,running=false,alive=true,reload=false;const jobs=[],pending=new Set(),errors=new Map(),failedJobs=new Map(),drafts=new Map(),listeners=new Set();
 const emit=()=>{backgroundSaves.changed();if(alive)for(const callback of listeners){try{callback();}catch{/* Een weergavefout mag een bevestigde opslag niet ongedaan maken. */}}};
 function sync(data){
  const oldFinal=server?.finalization?.basis?.finalRevision??-1,newFinal=data.finalization?.basis?.finalRevision??-1;
  if(!server||data.revision>server.revision||(data.revision===server.revision&&newFinal>=oldFinal))server={analyses:data.analyses,revision:data.revision,finalization:data.finalization};
  emit();
 }
 async function pump(){
  if(running||!alive)return;running=true;
  while(jobs.length&&alive){const job=jobs[0];
   try{
    if(reload){const data=await request({operation:'read'});if(!alive)break;sync(data);reload=false;}
    const data=await request({operation:'save',questionNumber:job.number,status:job.status,summary:job.summary,revision:server.revision});if(!alive)break;
    jobs.shift();pending.delete(job.number);if(drafts.get(job.number)===job.summary)drafts.delete(job.number);errors.delete(job.number);sync(data);
   }catch(error){if(!alive)break;reload=true;for(const waiting of jobs){pending.delete(waiting.number);failedJobs.set(waiting.number,waiting);errors.set(waiting.number,waiting===job?(error.message||'Opslaan is niet gelukt.'):'Opslaan is niet uitgevoerd omdat een eerdere opslag niet bevestigd kon worden.');}jobs.length=0;emit();break;}
  }
  running=false;
 }
 const queueSubscribe=callback=>{listeners.add(callback);return()=>listeners.delete(callback);};
 const unwatch=backgroundSaves.watch(()=>alive&&pending.size>0);
 return{drafts,errors,pending,retry(number){const job=failedJobs.get(number);if(!job||!alive||pending.has(number))return Promise.resolve(false);const done=new Promise(resolve=>{const off=queueSubscribe(()=>{if(!pending.has(number)){off();resolve(!errors.has(number));}});});this.enqueue(number,job.status,job.summary);return done;},setRequest(next){request=next;},get server(){return server;},sync,
  enqueue(number,status,summary){if(!alive||!server||pending.has(number))return false;drafts.set(number,summary);errors.delete(number);failedJobs.delete(number);jobs.push({number,status,summary});pending.add(number);emit();void pump();return true;},
  subscribe(callback){listeners.add(callback);return()=>listeners.delete(callback);},
  cancel(){alive=false;unwatch();jobs.length=0;pending.clear();errors.clear();failedJobs.clear();drafts.clear();listeners.clear();},
 };
}
const queues=new Map();
export function profileSaves(key,request){if(!queues.has(key))queues.set(key,createProfileSaveQueue(request));else queues.get(key).setRequest(request);return queues.get(key);}
export function clearProfileSaves(){for(const queue of queues.values())queue.cancel();queues.clear();}
