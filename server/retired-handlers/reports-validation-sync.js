import {retiredIntegration} from '../retired-integrations.js';
import {verifyImportIdentity} from '../github-identity.js';
import {isolateFluidApi} from '../fluid-preview.js';
import {createProfiles} from '../account-profiles.js';
import {isAdministrator,hasModule} from '../../shared/account-modules.js';
import {createTaskStore} from '../background-tasks/store.js';
import {createBackgroundTasks} from '../background-tasks/engine.js';
import {createReportsValidation,ensureReportsValidation,reportsValidationType} from '../dataverse-reports/validation.js';

export const config={maxDuration:300};
export function createReportsValidationRunner({env=process.env,now=Date.now,store=createTaskStore({env}),profiles=createProfiles({env}),validation=createReportsValidation({env,now,store})}={}){
 const tasks=createBackgroundTasks({store,now,registry:{[reportsValidationType]:validation},authorize:async actor=>{
  const p=await profiles('self',actor);return p.id===actor&&p.activated===true&&!p.disabled&&isAdministrator(p)&&hasModule(p,'reports');
 }});
 return{...tasks,ensure:({resumeTechnical=false}={})=>ensureReportsValidation({store,tasks,now,resumeTechnical})};
}
export function makeReportsValidationSync({tasks=createReportsValidationRunner(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/reports-validation-sync',workflow:'reports-validation.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-ESMOJO-Reports-Validation','4');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch(error){return res.status(403).json({ok:false,code:'OIDC_FORBIDDEN',stage:['token','claims','issuer','audience','subject','repository','ref','workflow','jwks','signature'].includes(error.identityStage)?error.identityStage:'identity'});}
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||!(Object.keys(req.body).length===0||Object.keys(req.body).join(',')==='operation'&&req.body.operation==='resume-technical'))return res.status(400).json({ok:false});
  let stage='approval';
  try{
   let current=await tasks.ensure({resumeTechnical:req.body.operation==='resume-technical'});
   if(current.task?.status==='blocked')return res.status(409).json({ok:false,code:'REPORTS_VALIDATION_BLOCKED'});
   let stats={steps:0,completed:1,blocked:0,waiting:0,failed:0};
   if(current.task?.status!=='complete'){
    stage='running';
    const result=await tasks.run({budgetMs:210000,types:['reports-validation-v1']});
    stats=Object.fromEntries(Object.keys(stats).map(k=>[k,Number.isSafeInteger(result[k])&&result[k]>=0?result[k]:0]));
    current=await tasks.ensure();
   }
   stage='status';
   return res.status(stats.failed?503:200).json({ok:!stats.failed,stats,continuation:await tasks.inspect(),...(current.task?.status==='complete'?{verification:{reports:current.task.total,records:current.task.progress.verifiedRecords,files:current.task.progress.verifiedFiles}}:{})});
  }catch(error){const allowed=['VALIDATION_APPROVAL_REQUIRED','TASK_EXPIRED','TASK_CORRUPT','TASK_BUSY','FORBIDDEN','CHOICE_AUTH','CHOICE_FORBIDDEN','SETUP_TEMPORARY','SETUP_THROTTLED'];return res.status(503).json({ok:false,stage,code:allowed.includes(error.message)?error.message:'REPORTS_VALIDATION_UNCONFIRMED'});}
 };
}
export default retiredIntegration;
