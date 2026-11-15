import {timetableClock} from '../shared/show-timetable.js';
import {getMojoArtistPhoto} from './mojo-photo.js';
import { verifyImportIdentity } from './github-identity.js';
import {MOJO_VENUES} from './mojo-venues.js';
import { scrapeMojo } from './mojo-agenda.js';
import { createShowsStore } from './shows-store.js';

export async function scrapeConcertCatalogue({scrape=scrapeMojo,now=new Date()}={}){
 const results=[];for(let index=0;index<MOJO_VENUES.length;index+=2)results.push(...await Promise.all(MOJO_VENUES.slice(index,index+2).map(async venue=>{try{return await scrape({venue:venue.id,now,days:45});}catch(error){error.venue=venue.id;throw error;}})));
 const first=results[0];if(results.some(row=>row.from!==first.from||row.until!==first.until))throw Error('MOJO_DATE');return{from:first.from,until:first.until,checkedAt:now.toISOString(),pages:results.reduce((sum,row)=>sum+row.pages,0),concerts:results.flatMap(row=>row.concerts)};
}
export function makeShowsSyncHandler({ identify = verifyImportIdentity, scrape = scrapeConcertCatalogue, store = createShowsStore({env:{...process.env,SHOWS_STORAGE_PROVIDER:'dataverse'}}), photo=getMojoArtistPhoto,now=()=>new Date() } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');res.setHeader('X-ESMOJO-Agenda-Import','2');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Niet toegestaan.' }); }
    try { await identify(/^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1]); }
    catch { return res.status(403).json({ error: 'Geen toegang.' }); }
    if(req.body?.verifyOnly!==true&&timetableClock(now()).hour!==5)return res.status(req.body?.operation?409:200).json({ok:!req.body?.operation,skipped:true,code:'IMPORT_WINDOW_CLOSED'});
    let stage='fetch';try {
      if(req.body?.verifyOnly===true){if(Object.keys(req.body).join(',')!=='verifyOnly')throw Error('VALIDATION');stage='verify-core';const existing=await store('concert-catalogue');stage='fetch';const snapshot=await scrape();return res.status(200).json({ok:true,verified:true,venues:MOJO_VENUES.length,concerts:snapshot.concerts.length,existingConcerts:existing.concerts.length,days:45});}
      let result={},snapshot=null;if(req.body?.operation!=='photos'){snapshot=await scrape();stage='native-sync';result=await store('sync',{snapshot});}
      stage='photo-candidates';const candidates=(await store('artist-photo-candidates')).artists,batch=candidates.slice(0,24);let next=0,photos=0;
      const capture=async()=>{while(next<batch.length){const artist=batch[next++];stage='photo-source';const selected=await photo(artist.name);stage='photo-save';const saved=await store('artist-photo-save',{artistId:artist.artistId,photo:selected?{imageUrl:selected.imageUrl,sourceUrl:selected.sourceUrl}:null});photos+=Number(saved.saved);}};await Promise.all(Array.from({length:Math.min(3,batch.length)},capture));
      return res.status(200).json({ok:true,...result,photos,photosPending:candidates.length>batch.length,...snapshot?{checkedAt:snapshot.checkedAt,pages:snapshot.pages}: {}});
    } catch(error) {const code=['MOJO_UNAVAILABLE','MOJO_FORMAT','MOJO_DATE','MOJO_PAGINATION','MOJO_ID_COLLISION','VALIDATION','DATAVERSE_SHOWS_CONFLICT','CONCERT_CATALOGUE_CONFLICT','CONCERT_LOCATION_CONFLICT','ARTIST_PHOTO_UNCONFIRMED'].includes(error.message)?error.message:'IMPORT_UNCONFIRMED';return res.status(503).json({error:'Concertimport mislukt. Bestaande documenten blijven behouden.',code,stage,...MOJO_VENUES.some(venue=>venue.id===error.venue)?{venue:error.venue}:{},...Number.isInteger(error.status)?{status:error.status}:{}}); }
  };
}
