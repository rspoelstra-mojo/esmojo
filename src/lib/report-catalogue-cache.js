import {hasModule,moduleFingerprint} from '../../shared/account-modules.js';
const STORAGE_KEY='esmojo-report-menu-v1';
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\x00-\x1f]/.test(value);
const id=value=>text(value,240)&&!/[\/\\]/.test(value);
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
// Expliciet toegestaan: alleen artiest/ID/zaal/datums en beschikbaarheid lokaal.
// Revisiehashes blijven in sessiegeheugen; overige velden worden nooit overgenomen.
export function cleanReportMenu(reports,{revisions=false}={}){
 if(!Array.isArray(reports)||reports.length>10000)throw Error('REPORT_MENU');
 const seen=new Set();return reports.map(report=>{
  if(!report||!id(report.concertId)||seen.has(report.concertId)||!text(report.label,160)||!Array.isArray(report.shows)||!report.shows.length||report.shows.length>1000)throw Error('REPORT_MENU');seen.add(report.concertId);
  const ids=new Set(),dates=new Map(),shows=report.shows.map(show=>{
   if(!show||!id(show.concertId)||ids.has(show.concertId)||!date(show.date)||!text(show.venue,160))throw Error('REPORT_MENU');ids.add(show.concertId);
   const slot=show.concertId.endsWith('_S1')?'middag':show.concertId.endsWith('_S2')?'avond':null;
   if(show.performance!==undefined&&show.performance!==slot)throw Error('REPORT_MENU');
   if(!dates.has(show.date))dates.set(show.date,[]);dates.get(show.date).push(show);
   const row={concertId:show.concertId,date:show.date,venue:show.venue};
   if(revisions&&show.revision!==undefined){if(typeof show.revision!=='string'||!(/^[a-f0-9]{64}$/).test(show.revision))throw Error('REPORT_MENU');row.revision=show.revision;}
   return row;
  });
  for(const sameDay of dates.values())if(sameDay.length>1&&(sameDay.length!==2||sameDay[0].venue!==sameDay[1].venue||!sameDay.some(show=>show.concertId.endsWith('_S1'))||!sameDay.some(show=>show.concertId.endsWith('_S2'))))throw Error('REPORT_MENU');
  if(!ids.has(report.concertId))throw Error('REPORT_MENU');
  return{concertId:report.concertId,label:report.label,dates:[...dates.keys()],shows};
 });
}
export function createReportCatalogueCache({now=Date.now,storage=null}={}){
 let scope=null,value=null,saved=null,pending=null,checked=null,generation=0;const listeners=new Set();
 try{const raw=storage?.getItem(STORAGE_KEY);if(raw&&raw.length<=4*1024*1024){const data=JSON.parse(raw);if(data?.version===1)saved=cleanReportMenu(data.reports);}}catch{/* Geblokkeerde/corrupte opslag blokkeert de beveiligde laadroute niet. */}
 const notify=()=>{for(const listener of listeners){try{listener(value===null?null:structuredClone(value));}catch{/* Een weergavefout mag de bevestigde lijst niet ongeldig maken. */}}};
 function bind(profile){const next=profile?.activated&&hasModule(profile,'reports')?profile.id+':'+profile.role+':'+moduleFingerprint(profile):null;if(next!==scope){scope=next;value=scope&&saved!==null?structuredClone(saved):null;pending=null;checked=null;generation++;notify();}}
 async function refresh(request,{force=false}={}){
  if(!scope)return false;if(pending)return pending;if(!force&&value&&checked!==null&&now()-checked<30000)return false;const ticket=generation,started=now();
  const task=Promise.resolve().then(()=>request('report-menu')).then(data=>{
   if(ticket!==generation)return false;const fresh=cleanReportMenu(data.reports,{revisions:true}),changed=JSON.stringify(value)!==JSON.stringify(fresh);
   value=fresh;checked=started;saved=cleanReportMenu(fresh);
   try{storage?.setItem(STORAGE_KEY,JSON.stringify({version:1,reports:saved}));}catch{/* Alleen een optimalisatie; sessiegeheugen blijft beschikbaar. */}
   if(changed)notify();return changed;
  }).finally(()=>{if(ticket===generation)pending=null;});pending=task;return task;
 }
 return{bind,refresh,current:()=>value===null?null:structuredClone(value),subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},clear(){bind(null);},retry(){checked=null;}};
}
let storage;try{storage=globalThis.localStorage;}catch{}
export const reportCatalogueCache=createReportCatalogueCache({storage});
