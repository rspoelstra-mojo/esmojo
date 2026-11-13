import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createAccessController} from '../server/account-access/controller.js';
export const config={maxDuration:300};
export function makeAccessSync({env=process.env,control=createAccessController({env}),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/account-access-sync',workflow:'account-access.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(env.VERCEL_ENV!=='production')return res.status(403).json({ok:false});if(req.method!=='POST')return res.status(405).json({ok:false});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  try{return res.status(200).json(await control(req.body));}catch(error){return res.status(503).json({ok:false,code:['VALIDATION','TASK_EXPIRED','FORBIDDEN','ACCESS_UNCONFIRMED','ACCESS_CORRUPT','SOURCE_CHANGED','TASK_BUSY'].includes(error.message)?error.message:'ACCESS_UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeAccessSync());
