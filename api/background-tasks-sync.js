import {createRedisMaintenance} from '../server/redis-native/maintenance.js';
import {managedRedis} from '../server/redis-native/policy.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createApplicationTasks} from '../server/background-tasks/registry.js';
export const config={maxDuration:300};
export function makeBackgroundTasksSync({env=process.env,maintenance=managedRedis(env)?createRedisMaintenance({env}):async()=>({skipped:true}),tasks=createApplicationTasks({env}),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/background-tasks-sync',workflow:'background-tasks.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-ESMOJO-Background-Worker','3');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false,code:'OIDC_FORBIDDEN',error:'Geen toegang.'});}
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||!(Object.keys(req.body).length===0||Object.keys(req.body).join(',')==='operation'&&['status','reports-check','reports-resume','redis-resume'].includes(req.body.operation)))return res.status(400).json({ok:false,error:'Geen vrije taakparameters toegestaan.'});
  try{if(req.body.operation==='redis-resume'){await tasks.resumeRedisCopy();return res.status(200).json({ok:true,continuation:await tasks.inspect()});}if(req.body.operation==='reports-resume'){await tasks.resumeReportsInventory();return res.status(200).json({ok:true,continuation:await tasks.inspect()});}if(req.body.operation==='reports-check')return res.status(200).json({ok:true,diagnostic:await tasks.diagnoseReports()});if(req.body.operation==='status')return res.status(200).json({ok:true,continuation:await tasks.inspect()});const result=await tasks.run({budgetMs:210000}),maintenanceResult=await maintenance(),stats=Object.fromEntries(['steps','completed','blocked','waiting','failed'].map(key=>[key,Number.isSafeInteger(result[key])&&result[key]>=0?result[key]:0]));return res.status(stats.failed?503:200).json({ok:!stats.failed,stats,...maintenanceResult?.skipped===true?{}:{maintenance:maintenanceResult},continuation:await tasks.inspect()});}catch(error){const codes=['TASK_EXPIRED','TASK_BUSY','TASK_STALE','TASK_VERSION','FORBIDDEN','CONTROL_REQUIRED','REDIS_AUTHORITY_INVALID','REDIS_SOURCE_CONFLICT','ARTIST_VIEWS_UNAVAILABLE','MFA_CACHE_UNAVAILABLE'];return res.status(503).json({ok:false,code:codes.includes(error.message)?error.message:'BACKGROUND_UNCONFIRMED',error:'De achtergrondronde is niet bevestigd. Opgeslagen voortgang blijft behouden.'});}
 };
}
export default isolateFluidApi(makeBackgroundTasksSync());
