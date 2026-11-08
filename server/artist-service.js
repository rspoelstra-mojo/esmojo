import {createHash} from 'node:crypto';
import {createReadableArtistDirectory,resolveReadableArtist,foldArtistViews,validArtistReference} from '../shared/artist-names.js';
import {artistTopFive,validArtistId} from '../shared/artist-catalogue.js';
import {createArtistViews,validArtistViewEvent} from './artist-views.js';
export function createArtistService({env=process.env,shows,views=createArtistViews({env}),now=Date.now}={}){
 let value=null,checked=0;const pending=new Map();
 async function catalogue(actor,force=false){
  if(!force&&value&&now()-checked<30000)return value;
  if(pending.has(actor))return pending.get(actor);
  const task=Promise.resolve().then(()=>shows('artist-catalogue',{actor})).then(data=>{const fresh=createReadableArtistDirectory(data.artists,name=>createHash('sha256').update(name).digest('hex'));value=fresh;checked=now();return fresh;}).finally(()=>pending.delete(actor));pending.set(actor,task);return task;
 }
 async function artist(actor,id){if(!validArtistReference(id))throw Error('VALIDATION');let directory=await catalogue(actor),row=resolveReadableArtist(directory,id);if(!row){directory=await catalogue(actor,true);row=resolveReadableArtist(directory,id);}if(!row)throw Error('NOT_FOUND');return row;}
 const top=(directory,counts)=>artistTopFive(directory.artists,foldArtistViews(directory,counts));
 function input(body,click=false){if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!==(click?'artistId,eventId':'artistId')||!(click?validArtistId(body.artistId):validArtistReference(body.artistId))||click&&!validArtistViewEvent(body.eventId))throw Error('VALIDATION');return body;}
 return{
  async menu(actor){return{artists:(await catalogue(actor)).artists};},
  async ranking(actor){const [directory,counts]=await Promise.all([catalogue(actor),views.counts()]);return{mostViewed:top(directory,counts)};},
  async detail(actor,body){input(body);const row=await artist(actor,body.artistId),directory=await catalogue(actor);return{artist:{...row,id:validArtistId(body.artistId)?body.artistId:row.id},requestedReference:body.artistId,canonicalArtistId:row.id,canonicalArtistSlug:directory.routes.get(row.id)};},
  async record(actor,body){input(body,true);await artist(actor,body.artistId);const result=await views.record(body.artistId,body.eventId);try{return{...result,mostViewed:top(await catalogue(actor),await views.counts())};}catch{return result;}},
 };
}
