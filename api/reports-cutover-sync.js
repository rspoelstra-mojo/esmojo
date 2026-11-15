import {createReportsAuthority} from '../server/dataverse-reports/authority.js';
import {createReportsIntake} from '../server/dataverse-reports/bridge.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createProfiles} from '../server/account-profiles.js';
import {hasModule,isAdministrator} from '../shared/account-modules.js';
import {createTaskStore} from '../server/background-tasks/store.js';
import {createBackgroundTasks} from '../server/background-tasks/engine.js';
import {createReportsCutover,ensureReportsCutover,reportsCutoverType} from '../server/dataverse-reports/cutover.js';
export const config={maxDuration:300};
export function createReportsCutoverRunner({env=process.env,now=Date.now,store=createTaskStore({env}),profiles=createProfiles({env}),cutover=createReportsCutover({env,now,store,activationMode:'confirmed-copy-v1'}),authority=createReportsAuthority({env}),intake=createReportsIntake({env})}={}){
 const tasks=createBackgroundTasks({store,now,registry:{[reportsCutoverType]:cutover},authorize:async actor=>{const profile=await profiles('self',actor);return profile.id===actor&&profile.activated===true&&!profile.disabled&&isAdministrator(profile)&&hasModule(profile,'reports');}});
 return{...tasks,ensure:({resumeTechnical=false}={})=>ensureReportsCutover({store,tasks,now,resumeTechnical,authority,intake})};
}
export function makeReportsCutoverSync({tasks=createReportsCutoverRunner(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/reports-cutover-sync',workflow:'reports-cutover.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store, private');res.setHeader('X-ESMOJO-Reports-Cutover','8');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false,code:'OIDC_FORBIDDEN'});}
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||!(Object.keys(req.body).length===0||Object.keys(req.body).join(',')==='operation'&&req.body.operation==='resume-technical'))return res.status(400).json({ok:false});
  try{
   const current=await tasks.ensure({resumeTechnical:req.body.operation==='resume-technical'});if(current.task?.status==='blocked')return res.status(409).json({ok:false,code:'REPORTS_CUTOVER_BLOCKED'});
   const result=current.task?.status==='complete'?{steps:0,completed:1,blocked:0,waiting:0,failed:0}:await tasks.run({budgetMs:210000,types:[reportsCutoverType]}),stats=Object.fromEntries(['steps','completed','blocked','waiting','failed'].map(key=>[key,Number.isSafeInteger(result[key])&&result[key]>=0?result[key]:0]));
   return res.status(stats.failed?503:200).json({ok:!stats.failed,stats,continuation:await tasks.inspect()});
  }catch(error){const allowed=['VALIDATION_APPROVAL_REQUIRED','TASK_EXPIRED','TASK_BUSY','TASK_CORRUPT','FORBIDDEN','REPORT_CONFLICT','REPORT_WRITE_UNCONFIRMED'];return res.status(503).json({ok:false,code:allowed.includes(error.message)?error.message:'REPORTS_CUTOVER_UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeReportsCutoverSync());
