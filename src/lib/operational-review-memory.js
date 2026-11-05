// Tijdelijk showgeheugen: invoer/fouten blijven beschikbaar bij SPA-navigatie.
export function createOperationalReviewMemory(){
 let alive=true,pending=0,tail=Promise.resolve();const listeners=new Set();
 const memory={drafts:new Map(),source:null,
  get busy(){return pending>0;},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  notify(){if(alive)for(const listener of listeners){try{listener();}catch{/* Opslag loopt door. */}}},
  run(task){
   if(!alive)return Promise.reject(Error('Showgeheugen gewist.'));pending++;
   const result=tail.then(()=>{if(!alive)throw Error('Showgeheugen gewist.');return task();});
   tail=result.catch(()=>{});const finish=()=>{pending--;memory.notify();};result.then(finish,finish);return result;
  },
  async whenSettled(){while(pending)await tail;},
  clear(){alive=false;memory.drafts.clear();memory.source=null;listeners.clear();},
 };return memory;
}
