import {verifyImportIdentity} from '../server/github-identity.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {createShowsCutover} from '../server/dataverse-shows/cutover.js';
export const config={maxDuration:300};
export function makeShowsCutoverSync({cutover=createShowsCutover(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/shows-cutover-sync',workflow:'shows-cutover.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({ok:false});
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({ok:false});}
  try{return res.status(200).json(await cutover(req.body));}catch(error){return res.status(503).json({ok:false,code:/^[A-Z_]{1,60}$/.test(error.message||'')?error.message:'CUTOVER_UNCONFIRMED'});}
 };
}
export default isolateFluidApi(makeShowsCutoverSync());
