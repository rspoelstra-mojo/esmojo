import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createShowsPerformance} from '../server/dataverse-shows/performance.js';
export const config={maxDuration:300};
export function makeShowsPerformanceSync({env=process.env,check=createShowsPerformance(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/shows-performance-sync',workflow:'shows-performance.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(env.VERCEL_ENV!=='production')return res.status(403).json({ok:false});if(req.method!=='POST')return res.status(405).json({ok:false});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  try{return res.status(200).json(await check(req.body));}catch(error){return res.status(503).json({ok:false,code:['VALIDATION','SOURCE_CHANGED','TASK_EXPIRED','FORBIDDEN','DATAVERSE_SHOWS_CONFLICT','SETUP_THROTTLED','SETUP_TEMPORARY','VERIFY','READ_REQUIRES_WRITE'].includes(error.message)?error.message:'PERFORMANCE_UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeShowsPerformanceSync());
