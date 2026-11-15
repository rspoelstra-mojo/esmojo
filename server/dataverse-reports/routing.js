import {createNativeShowsRepository} from '../dataverse-shows/repository.js';
import {createReportsAuthority,managedReportsRouting} from './authority.js';
export function createReportsRouting({env=process.env,authority=createReportsAuthority({env}),nativeFactory=async()=>{const {createNativeReportsService}=await import('./service.js');return createNativeReportsService({env});}}={}){
 let native=null,pending=null;
 const getNative=async()=>{if(native)return native;if(!pending)pending=Promise.resolve().then(nativeFactory).then(value=>native=value).finally(()=>pending=null);return pending;};
 const route=async({legacy,run,opening=false})=>{
  if(env.REPORTS_STORAGE_PROVIDER&&!['legacy','dataverse'].includes(env.REPORTS_STORAGE_PROVIDER))throw Error('REPORT_CONFIG');
  if(!managedReportsRouting(env)){if(env.VERCEL_ENV==='production')throw Error('REPORTS_AUTHORITY_INVALID');return legacy();}
  const fast=opening&&typeof authority.openingRead==='function',observed=await(fast?authority.openingRead():authority.read());if(observed.value.mode==='freeze')throw Error('REPORTS_FROZEN');
  if(observed.value.mode==='dataverse'||env.REPORTS_STORAGE_PROVIDER==='dataverse'){
   if(!fast)await authority.assert(observed);return run(await getNative());
  }
  if(env.VERCEL_ENV==='production'||observed.value.mode!=='legacy')throw Error('REPORTS_AUTHORITY_INVALID');return legacy();
 };
 route.prepareRead=async()=>{if(!managedReportsRouting(env))return;const meta=createNativeShowsRepository({env}).meta;await Promise.all([getNative(),...['esmojo_integratiestatus','esmojo_opdracht','esmojo_medewerker','esmojo_modulerecht'].map(meta)]);};return route;
}
