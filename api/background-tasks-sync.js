import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createApplicationTasks} from '../server/background-tasks/registry.js';
export const config={maxDuration:300};
export function makeBackgroundTasksSync({tasks=createApplicationTasks(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/background-tasks-sync',workflow:'background-tasks.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false,error:'Geen toegang.'});}
  if(!req.body||Array.isArray(req.body)||Object.keys(req.body).length)return res.status(400).json({ok:false,error:'Geen vrije taakparameters toegestaan.'});
  try{const result=await tasks.run({budgetMs:210000}),stats=Object.fromEntries(['steps','completed','blocked','waiting','failed'].map(key=>[key,Number.isSafeInteger(result[key])&&result[key]>=0?result[key]:0]));return res.status(stats.failed?503:200).json({ok:!stats.failed,stats});}catch{return res.status(503).json({ok:false,error:'De achtergrondronde is niet bevestigd. Opgeslagen voortgang blijft behouden.'});}
 };
}
export default isolateFluidApi(makeBackgroundTasksSync());
