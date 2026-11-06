import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createDeliverabilityService} from '../server/email-deliverability.js';
export const config={maxDuration:60};
export function makeEmailDeliverability({service=createDeliverabilityService(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/email-deliverability',workflow:'email-deliverability.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  try{return res.status(200).json(await service.run(req.body));}
  catch(error){return res.status(error.message==='CLOSED'?410:['VALIDATION','FORBIDDEN'].includes(error.message)?400:503).json({ok:false,error:'Bezorgproef niet bevestigd of gesloten.'});}
 };
}
export default isolateFluidApi(makeEmailDeliverability());
