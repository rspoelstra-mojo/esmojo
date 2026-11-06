import {backgroundSaves} from './background-saves.js';
// Tijdelijk showgeheugen: invoer/fouten blijven beschikbaar bij SPA-navigatie.
export function createOperationalReviewMemory(){
 let alive=true,pending=0,tail=Promise.resolve();const listeners=new Set();
 const unwatch=backgroundSaves.watch(()=>alive&&pending>0);
 const memory={get active(){return alive;},drafts:new Map(),source:null,
  get busy(){return pending>0;},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  notify(){backgroundSaves.changed();if(alive)for(const listener of listeners){try{listener();}catch{/* Opslag loopt door. */}}},
  run(task){
   if(!alive)return Promise.reject(Error('Showgeheugen gewist.'));pending++;backgroundSaves.changed();
   const result=tail.then(()=>{if(!alive)throw Error('Showgeheugen gewist.');return task();});
   tail=result.catch(()=>{});const finish=()=>{pending--;memory.notify();};result.then(finish,finish);return result;
  },
  async whenSettled(){while(pending)await tail;},
  clear(){alive=false;unwatch();memory.drafts.clear();memory.source=null;listeners.clear();},
 };return memory;
}
