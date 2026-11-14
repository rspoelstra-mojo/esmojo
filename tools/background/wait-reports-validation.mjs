import {pathToFileURL} from 'node:url';
// Public protocol marker only. No user session, OIDC token or business data is
// requested until the production route understands this workflow identity.
export async function waitForReportsValidation({fetcher=fetch,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),budgetMs=180000}={}){
 const deadline=now()+Math.min(budgetMs,180000);
 for(let round=0;round<18&&now()<deadline;round++){
  try{
   const r=await fetcher('https://esmojo.nl/api/reports-validation-sync',{method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(r.status===405&&r.headers.get('x-esmojo-reports-validation')==='4')return;
  }catch{/* A failed public readiness read never starts or mutates a task. */}
  if(now()+10000>=deadline)break;await wait(10000);
 }
 throw Error('REPORTS_VALIDATION_DEPLOYMENT_NOT_READY');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await waitForReportsValidation();console.log('Reports read-only validation protocol ready.');}catch{console.error('Reports validation deployment not ready; no task started.');process.exitCode=1;}
}
