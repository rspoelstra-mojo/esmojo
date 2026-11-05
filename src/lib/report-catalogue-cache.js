import {hasModule,moduleFingerprint} from '../../shared/account-modules.js';
// Confidential report availability stays only in authenticated session memory.
export function createReportCatalogueCache({now=Date.now}={}){
 let scope=null,value=null,pending=null,checked=0,generation=0;const listeners=new Set();
 const notify=()=>{for(const listener of listeners)listener(value);};
 function bind(profile){const next=profile?.activated&&hasModule(profile,'reports')?profile.id+':'+profile.role+':'+moduleFingerprint(profile):null;if(next!==scope){scope=next;value=null;pending=null;checked=0;generation++;notify();}}
 async function refresh(request){
  if(!scope)return false;if(pending)return pending;if(value&&now()-checked<60000)return false;const ticket=generation;checked=now();
  const task=Promise.resolve().then(()=>request('report-menu')).then(data=>{if(ticket!==generation)return false;if(!Array.isArray(data.reports))throw Error('REPORT_MENU');const changed=JSON.stringify(value)!==JSON.stringify(data.reports);value=data.reports;if(changed)notify();return changed;}).finally(()=>{if(ticket===generation)pending=null;});pending=task;return task;
 }
 return{bind,refresh,current:()=>value,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},clear(){bind(null);},retry(){checked=0;}};
}
export const reportCatalogueCache=createReportCatalogueCache();
