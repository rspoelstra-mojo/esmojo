import {createConcertCatalogue} from '../concert-catalogue.js';
import {timetableClock} from '../../shared/show-timetable.js';
import {createReportsBridge} from '../ontrack-report/service.js';
import {digest} from '../show-migration-writer.js';
export const reportsRuntimeContract='reports-native-runtime-v1';
export function createReportsIntake({env=process.env,bridge=createReportsBridge({env})}={}){
 const disabled=async()=>{throw Error('CSV_INTAKE_DISABLED');};
 const list=disabled,read=disabled;
 async function policy(actor,next,expectedRevision){return bridge('reports-runtime-policy',actor,{contract:reportsRuntimeContract,nativeReportsAllowed:true,...next?{next,expectedRevision}:{}});}
 let nativeStore;async function nativeTimetable(operation,payload){if(!nativeStore){const {createShowsStore}=await import('../shows-store.js');nativeStore=createShowsStore({env:{...env,SHOWS_STORAGE_PROVIDER:'dataverse'}});}return nativeStore(operation,payload);}
 return{list,read,policy,timetable:async concertId=>(await nativeTimetable('native-timetable-read',{concertId})).timetable,timetableCandidates:async()=>{const clock=timetableClock();if(clock.hour!==12)return{skipped:true};const candidates=(await createConcertCatalogue({env}).all()).concerts.filter(row=>row.date===clock.date&&row.active),shows=[];let unavailableSources=0;for(const show of candidates){try{const existing=(await nativeTimetable('native-timetable-read',{concertId:show.concertId})).timetable;if(!existing||existing.date!==clock.date)shows.push(show);}catch{unavailableSources++;}}return{shows,unavailableSources};},saveTimetable:(concertId,snapshot)=>nativeTimetable('native-timetable-save',{concertId,snapshot})};
}
