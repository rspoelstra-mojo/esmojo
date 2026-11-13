import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createApplicationTasks} from '../server/background-tasks/registry.js';
export const config={maxDuration:300};
export function makeShowsValidationSync({tasks=createApplicationTasks(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/shows-validation-sync',workflow:'shows-validation.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({ok:false});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  if(!req.body||Array.isArray(req.body)||Object.keys(req.body).length)return res.status(400).json({ok:false});
  try{
   const started=await tasks.ensureValidation();
   if(started.task?.status==='blocked')return res.status(409).json({ok:false,code:'VALIDATION_BLOCKED'});
   const verification=task=>({shows:task.total,records:task.progress.verifiedRecords,files:task.progress.verifiedFiles});
   if(started.task?.status==='complete')return res.status(200).json({ok:true,stats:{steps:0,completed:1,blocked:0,waiting:0,failed:0},verification:verification(started.task)});
   const result=await tasks.run({budgetMs:210000,types:['shows-validation-v1']}),stats=Object.fromEntries(['steps','completed','blocked','waiting','failed'].map(key=>[key,Number.isSafeInteger(result[key])&&result[key]>=0?result[key]:0]));
   const checked=stats.completed?(await tasks.ensureValidation()).task:null;
   return res.status(stats.failed?503:200).json({ok:!stats.failed,stats,...(checked?.status==='complete'?{verification:verification(checked)}:{})});
  }catch{return res.status(503).json({ok:false,code:'VALIDATION_UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeShowsValidationSync());
