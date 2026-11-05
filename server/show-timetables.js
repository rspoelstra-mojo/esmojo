import {createOnTrackReportStore} from './ontrack-report/service.js';
import {fetchMojoTimetable} from './mojo-timetable.js';
import {timetableClock} from '../shared/show-timetable.js';
export function createTimetableCapture({store=createOnTrackReportStore(),fetchTimetable=fetchMojoTimetable,now=()=>new Date()}={}){
 return async()=>{
  if(timetableClock(now()).hour!==12)return{ok:true,skipped:true};
  const candidates=await store('timetable-candidates',null);if(candidates.skipped)return{ok:true,skipped:true};
  const shows=candidates.shows;if(!Array.isArray(shows))throw Error('TIMETABLE_UNAVAILABLE');let captured=0,missing=0,failed=Number.isSafeInteger(candidates.unavailableSources)?candidates.unavailableSources:0,next=0;
  const work=async()=>{while(next<shows.length){const show=shows[next++];try{const snapshot=await fetchTimetable(show,{now});const result=await store('timetable-save',null,{concertId:show.concertId,snapshot});if(result.state==='captured')captured++;else if(result.state==='missing')missing++;}catch{failed++;}}};
  await Promise.all(Array.from({length:Math.min(3,shows.length)},work));return{ok:failed===0,captured,missing,failed};
 };
}
