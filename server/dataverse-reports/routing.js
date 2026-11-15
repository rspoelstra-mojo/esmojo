import {createReportsAuthority,managedReportsRouting} from './authority.js';
export function createReportsRouting({env=process.env,authority=createReportsAuthority({env}),nativeFactory=async()=>{const {createNativeReportsService}=await import('./service.js');return createNativeReportsService({env});}}={}){
 let native=null;
 return async({legacy,run})=>{
  if(env.REPORTS_STORAGE_PROVIDER&&!['legacy','dataverse'].includes(env.REPORTS_STORAGE_PROVIDER))throw Error('REPORT_CONFIG');
  if(!managedReportsRouting(env)){if(env.VERCEL_ENV==='production')throw Error('REPORTS_AUTHORITY_INVALID');return legacy();}
  const observed=await authority.read();if(observed.value.mode==='freeze')throw Error('REPORTS_FROZEN');
  if(observed.value.mode==='dataverse'||env.REPORTS_STORAGE_PROVIDER==='dataverse'){
   await authority.assert(observed);if(!native)native=await nativeFactory();return run(native);
  }
  if(env.VERCEL_ENV==='production'||observed.value.mode!=='legacy')throw Error('REPORTS_AUTHORITY_INVALID');return legacy();
 };
}
