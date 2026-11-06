import {hasModule,moduleFingerprint} from '../../shared/account-modules.js';
// Confidential report availability stays only in authenticated session memory.
export function createReportCatalogueCache({now=Date.now}={}){
 let scope=null,value=null,pending=null,checked=null,generation=0;const listeners=new Set();
 const notify=()=>{for(const listener of listeners)listener(value);};
 function bind(profile){const next=profile?.activated&&hasModule(profile,'reports')?profile.id+':'+profile.role+':'+moduleFingerprint(profile):null;if(next!==scope){scope=next;value=null;pending=null;checked=null;generation++;notify();}}
 async function refresh(request,{force=false}={}){
  if(!scope)return false;if(pending)return pending;if(!force&&value&&checked!==null&&now()-checked<30000)return false;const ticket=generation,started=now();
  const task=Promise.resolve().then(()=>request('report-menu')).then(data=>{if(ticket!==generation)return false;if(!Array.isArray(data.reports))throw Error('REPORT_MENU');const changed=JSON.stringify(value)!==JSON.stringify(data.reports);value=data.reports;checked=started;if(changed)notify();return changed;}).finally(()=>{if(ticket===generation)pending=null;});pending=task;return task;
 }
 return{bind,refresh,current:()=>value,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},clear(){bind(null);},retry(){checked=null;}};
}
export const reportCatalogueCache=createReportCatalogueCache();
