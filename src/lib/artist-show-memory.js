import {timetableClock} from '../../shared/show-timetable.js';
import {artistTimeline} from './artist-timeline.js';

// Eén gecontroleerde leeswachtrij per geopende artiest; uitsluitend werkgeheugen.
export function createArtistShowMemory({request,artistId,concerts=[],now=Date.now}){
 const values=new Map(),jobs=new Map(),states=new Map(),listeners=new Set(),controller=new AbortController();
 const events=artistTimeline(concerts).flatMap(group=>group.events),queue=[];
 const key=event=>JSON.stringify([event.date,event.venue,event.performance||null]);
 let disposed=false,running=false,started=false,backgroundStarted=false;
 const active=()=>{if(disposed)throw Error('ARTIST_SHOW_CANCELLED');};
 const notify=(event,state)=>{states.set(key(event),state);for(const listener of listeners){try{listener(event,state);}catch{/* Een weergave mag de wachtrij niet stoppen. */}}};
 function enqueue(event,priority=false){
  active();if(event.date>=timetableClock(now()).date)throw Error('ARTIST_SHOW_UNAVAILABLE');
  const id=key(event);if(values.has(id))return values.get(id);
  if(jobs.has(id)){if(priority){const index=queue.findIndex(job=>job.id===id);if(index>0)queue.unshift(...queue.splice(index,1));}return jobs.get(id).promise;}
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  // Achtergrondfouten zijn individueel zichtbaar en mogen geen unhandled rejection zijn.
  promise.catch(()=>{});const job={id,event,promise,resolve,reject};jobs.set(id,job);
  if(priority)queue.unshift(job);else queue.push(job);notify(event,'queued');void pump();return promise;
 }
 async function pump(){
  if(running||disposed||!started)return;running=true;
  while(queue.length&&!disposed){
   const job=queue.shift();notify(job.event,'loading');
   try{const data=await request('artist-show',{method:'POST',body:{artistId,...job.event},signal:controller.signal});active();
    if(data?.show?.date!==job.event.date||data.show.venue!==job.event.venue||(data.show.performance||null)!==(job.event.performance||null))throw Error('ARTIST_SHOW_MISMATCH');
    values.set(job.id,data);notify(job.event,'ready');job.resolve(data);
   }catch(error){if(!disposed)notify(job.event,'error');job.reject(error);}
   finally{jobs.delete(job.id);}
  }
  running=false;
 }
 return{
  start(){active();if(backgroundStarted)return;backgroundStarted=true;started=true;for(const event of events)if(event.date<timetableClock(now()).date)enqueue(event);void pump();},
  get(event){active();started=true;const result=enqueue(event,true);void pump();return result;},
  status(event){return states.get(key(event))||'idle';},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  dispose(){if(disposed)return;disposed=true;controller.abort();listeners.clear();for(const job of jobs.values())job.reject(Error('ARTIST_SHOW_CANCELLED'));jobs.clear();queue.length=0;values.clear();states.clear();},
 };
}
