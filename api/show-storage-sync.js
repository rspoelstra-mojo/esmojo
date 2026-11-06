import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createShowsStore} from '../server/shows-store.js';
export const config={maxDuration:300};
export function makeShowStorageSync({store=createShowsStore(),identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/show-storage-sync',workflow:'show-storage.yml'})}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}
  try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}
  try{if(req.body?.checkOnly===true){if(!store.activeStorage)throw Error('UNAVAILABLE');return res.status(200).json({ok:true,...await store.activeStorage.verify()});}const result=store.activeStorage?await store.activeStorage.run({limit:3}):{enabled:false,mirrored:0,archived:0,failed:0};return res.status(result.failed?503:200).json({ok:!result.failed,...result});}
  catch{return res.status(503).json({ok:false,error:'Showarchivering kon niet worden bevestigd. Gegevens zijn behouden.'});}
 };
}
export default isolateFluidApi(makeShowStorageSync());
