import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createNativeRuntimeCheck} from '../server/dataverse-shows/check.js';
import {createNativeRuntimeVerification} from '../server/native-runtime-verification.js';
import {migrationConflictDetails} from '../server/show-migration-writer.js';
export const config={maxDuration:300};
export function makeShowsRuntimeSync({check=createNativeRuntimeCheck(),audit=createNativeRuntimeVerification(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/shows-runtime-sync',workflow:'shows-runtime.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-ESMOJO-Native-Rules','1');if(req.method!=='POST')return res.status(405).json({ok:false});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  try{if(req.body&&Object.hasOwn(req.body,'stage')){if(Object.keys(req.body).join(',')!=='stage'||!['authority','accounts','shows','reports','files'].includes(req.body.stage))throw Error('VALIDATION');return res.status(200).json(await audit(req.body.stage));}return res.status(200).json(await check(req.body));}catch(error){return res.status(error.message==='VALIDATION'?400:503).json({ok:false,code:['SOURCE_CHANGED','DATAVERSE_SHOWS_CONFLICT','DATAVERSE_SHOWS_UNCONFIRMED','SETUP_THROTTLED','SETUP_TEMPORARY','NOT_FOUND','VERIFY'].includes(error.message)?error.message:'RUNTIME_UNCONFIRMED',...(migrationConflictDetails(error)?{conflict:migrationConflictDetails(error)}:{})});}
 };
}
export default isolateFluidApi(makeShowsRuntimeSync());
