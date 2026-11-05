import {getMojoPhoto} from '../server/mojo-photo.js';
import {isolateFluidApi} from '../server/fluid-preview.js';
import {verifyImportIdentity} from '../server/github-identity.js';
import {createShowsStore} from '../server/shows-store.js';
export const config={maxDuration:300};
export function makeHomePlanningSync({identify=token=>verifyImportIdentity(token,{audience:'https://esmojo.nl/api/home-planning-sync'}),store=createShowsStore(),photo=getMojoPhoto}={}){
 return async(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Niet toegestaan.'});}try{await identify(/^Bearer (\S+)$/.exec(req.headers.authorization||'')?.[1]);}catch{return res.status(403).json({error:'Geen toegang.'});}try{const result=await store('home-rebuild'),sources=result.photoSources||[],photos=[];let next=0;const collect=async()=>{while(next<sources.length){const show=sources[next++];const image=await photo(show.sourceUrl).catch(()=>null);if(image)photos.push({key:show.key,photo:image});}};await Promise.all(Array.from({length:Math.min(4,sources.length)},collect));if(photos.length)await store('home-photo-cache',{photos});return res.status(200).json({ok:result.ok,ready:result.ready,unavailable:result.unavailable,photos:photos.length});}catch{return res.status(503).json({error:'Planning bijwerken kon niet worden bevestigd.'});}};
}
export default isolateFluidApi(makeHomePlanningSync());
