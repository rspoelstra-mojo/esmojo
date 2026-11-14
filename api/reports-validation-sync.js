import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createProfiles} from '../server/account-profiles.js';
import {isAdministrator,hasModule} from '../shared/account-modules.js';
import {createTaskStore} from '../server/background-tasks/store.js';
import {createBackgroundTasks} from '../server/background-tasks/engine.js';
import {createReportsValidation,ensureReportsValidation,reportsValidationType} from '../server/dataverse-reports/validation.js';

export const config={maxDuration:300};
export function createReportsValidationRunner({env=process.env,now=Date.now,store=createTaskStore({env}),profiles=createProfiles({env}),validation=createReportsValidation({env,now,store})}={}){
 const tasks=createBackgroundTasks({store,now,registry:{[reportsValidationType]:validation},authorize:async actor=>{
  const p=await profiles('self',actor);return p.id===actor&&p.activated===true&&!p.disabled&&isAdministrator(p)&&hasModule(p,'reports');
 }});
 return{...tasks,ensure:()=>ensureReportsValidation({store,tasks,now})};
}
export function makeReportsValidationSync({tasks=createReportsValidationRunner(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/reports-validation-sync',workflow:'reports-validation.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).length)return res.status(400).json({ok:false});
  try{
   let current=await tasks.ensure();
   if(current.task?.status==='blocked')return res.status(409).json({ok:false,code:'REPORTS_VALIDATION_BLOCKED'});
   let stats={steps:0,completed:1,blocked:0,waiting:0,failed:0};
   if(current.task?.status!=='complete'){
    const result=await tasks.run({budgetMs:210000,types:['reports-validation-v1']});
    stats=Object.fromEntries(Object.keys(stats).map(k=>[k,Number.isSafeInteger(result[k])&&result[k]>=0?result[k]:0]));
    current=await tasks.ensure();
   }
   return res.status(stats.failed?503:200).json({ok:!stats.failed,stats,continuation:await tasks.inspect(),...(current.task?.status==='complete'?{verification:{reports:current.task.total,records:current.task.progress.verifiedRecords,files:current.task.progress.verifiedFiles}}:{})});
  }catch{return res.status(503).json({ok:false,code:'REPORTS_VALIDATION_UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeReportsValidationSync());
