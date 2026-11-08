import {timetableClock} from '../../shared/show-timetable.js';
import {artistTimeline} from './artist-timeline.js';

// Alleen de huidige artiestpagina. Geen browseropslag of gedeelde privé-cache.
export function createArtistShowMemory({request,artistId,concerts=[],now=Date.now}){
 const values=new Map(),events=artistTimeline(concerts).flatMap(group=>group.events);
 const key=event=>JSON.stringify([event.date,event.venue,event.performance||null]);
 let disposed=false;
 const active=()=>{if(disposed)throw Error('ARTIST_SHOW_CANCELLED');};
 const ready=(async()=>{
  // Controleer na iedere golf opnieuw: ook een tijdens laden verstreken middernacht.
  for(;;){
   active();const today=timetableClock(now()).date,pending=events.filter(event=>event.date<today&&!values.has(key(event)));
   if(!pending.length)return;
   let next=0,failure=null;
   async function worker(){
    while(!disposed&&!failure&&next<pending.length){
     const event=pending[next++];
     try{
      const data=await request('artist-show',{method:'POST',body:{artistId,...event}});active();
      if(data?.show?.date!==event.date||data.show.venue!==event.venue)throw Error('ARTIST_SHOW_MISMATCH');
      values.set(key(event),data);
     }catch(error){failure ||= error;}
    }
   }
   await Promise.all(Array.from({length:Math.min(3,pending.length)},worker));
   active();if(failure)throw failure;
  }
 })();
 return{ready,get(event){active();const data=values.get(key(event));if(!data)throw Error('ARTIST_SHOW_NOT_LOADED');return data;},dispose(){disposed=true;values.clear();}};
}
