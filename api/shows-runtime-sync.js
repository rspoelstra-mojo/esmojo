import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createNativeRuntimeCheck} from '../server/dataverse-shows/check.js';
import {migrationConflictDetails} from '../server/show-migration-writer.js';
export const config={maxDuration:300};
export function makeShowsRuntimeSync({check=createNativeRuntimeCheck(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/shows-runtime-sync',workflow:'shows-runtime.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({ok:false});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  try{return res.status(200).json(await check(req.body));}catch(error){return res.status(error.message==='VALIDATION'?400:503).json({ok:false,code:['SOURCE_CHANGED','DATAVERSE_SHOWS_CONFLICT','DATAVERSE_SHOWS_UNCONFIRMED','SETUP_THROTTLED','SETUP_TEMPORARY','NOT_FOUND','VERIFY'].includes(error.message)?error.message:'RUNTIME_UNCONFIRMED',...(migrationConflictDetails(error)?{conflict:migrationConflictDetails(error)}:{})});}
 };
}
export default isolateFluidApi(makeShowsRuntimeSync());
