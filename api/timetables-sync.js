import {createManagedShowsRouting,managedShowsRouting} from '../server/dataverse-shows/routing.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createTimetableCapture} from '../server/show-timetables.js';
export const config={maxDuration:300};
export function makeTimetablesSyncHandler({identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/timetables-sync'}),capture=createTimetableCapture(),env=process.env,guard=managedShowsRouting(env)?createManagedShowsRouting({env}):null}={}){
 return async(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  try{if(guard)await guard({legacy:()=>true,native:()=>true});const result=await capture();return res.status(result.ok?200:503).json(result);}catch{return res.status(503).json({error:'De tijdschema-opname kon niet worden bevestigd.'});}
 };
}
export default isolateFluidApi(makeTimetablesSyncHandler());
