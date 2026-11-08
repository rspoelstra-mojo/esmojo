import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createShowsStore} from '../server/shows-store.js';
import {createBiographyCapture} from '../server/artist-biographies.js';
export const config={maxDuration:300};
export function makeArtistBiographiesHandler({identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/artist-biographies-sync',workflow:'artist-biographies.yml'}),capture=createBiographyCapture({store:createShowsStore({active:false})})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  const body=req.body||{};
  if(body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).join(',')==='checkOnly'&&body.checkOnly===true)return res.status(200).json({ok:true,workerVersion:2});
  if(typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>key!=='after')||body.after!==undefined&&body.after!==null&&!/^a_[a-f0-9]{64}$/.test(body.after))return res.status(400).json({error:'Ongeldig verzoek.'});
  try{return res.status(200).json(await capture(body.after||null));}catch{return res.status(503).json({ok:false,code:'BIOGRAPHY_NOT_READY'});}
 };
}
export default isolateFluidApi(makeArtistBiographiesHandler());
