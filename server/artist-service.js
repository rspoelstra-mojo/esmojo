import {cleanArtistMenu,artistTopFive,validArtistId} from '../shared/artist-catalogue.js';
import {createArtistViews,validArtistViewEvent} from './artist-views.js';
export function createArtistService({env=process.env,shows,views=createArtistViews({env}),now=Date.now}={}){
 let value=null,checked=0;const pending=new Map();
 async function catalogue(actor,force=false){
  if(!force&&value&&now()-checked<30000)return value;
  if(pending.has(actor))return pending.get(actor);
  const task=Promise.resolve().then(()=>shows('artist-catalogue',{actor})).then(data=>{const fresh=cleanArtistMenu(data.artists);value=fresh;checked=now();return fresh;}).finally(()=>pending.delete(actor));pending.set(actor,task);return task;
 }
 async function artist(actor,id){if(!validArtistId(id))throw Error('VALIDATION');let rows=await catalogue(actor),row=rows.find(row=>row.id===id);if(!row){rows=await catalogue(actor,true);row=rows.find(row=>row.id===id);}if(!row)throw Error('NOT_FOUND');return row;}
 function input(body,click=false){if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!==(click?'artistId,eventId':'artistId')||!validArtistId(body.artistId)||click&&!validArtistViewEvent(body.eventId))throw Error('VALIDATION');return body;}
 return{
  async menu(actor){return{artists:await catalogue(actor)};},
  async ranking(actor){const [artists,counts]=await Promise.all([catalogue(actor),views.counts()]);return{mostViewed:artistTopFive(artists,counts)};},
  async detail(actor,body){input(body);return{artist:await artist(actor,body.artistId)};},
  async record(actor,body){input(body,true);await artist(actor,body.artistId);const result=await views.record(body.artistId,body.eventId);try{return{...result,mostViewed:artistTopFive(await catalogue(actor),await views.counts())};}catch{return result;}},
 };
}
