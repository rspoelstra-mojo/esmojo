import {timetableClock} from '../shared/show-timetable.js';
import {getMojoArtistPhotoResult} from './mojo-photo.js';
import {fetchMojoTimetable} from './mojo-timetable.js';
import {createShowManagementService} from './show-management.js';
import { verifyImportIdentity } from './github-identity.js';
import {MOJO_VENUES} from './mojo-venues.js';
import { scrapeMojo } from './mojo-agenda.js';
import { createShowsStore } from './shows-store.js';

export async function scrapeConcertCatalogue({scrape=scrapeMojo,now=new Date()}={}){
 const results=[];for(let index=0;index<MOJO_VENUES.length;index+=2)results.push(...await Promise.all(MOJO_VENUES.slice(index,index+2).map(async venue=>{try{return await scrape({venue:venue.id,now,days:45});}catch(error){error.venue=venue.id;throw error;}})));
 const first=results[0];if(results.some(row=>row.from!==first.from||row.until!==first.until))throw Error('MOJO_DATE');return{from:first.from,until:first.until,checkedAt:now.toISOString(),pages:results.reduce((sum,row)=>sum+row.pages,0),concerts:results.flatMap(row=>row.concerts)};
}
export function makeShowsSyncHandler({ identify = verifyImportIdentity, scrape = scrapeConcertCatalogue, store = createShowsStore({env:{...process.env,SHOWS_STORAGE_PROVIDER:'dataverse'}}), photo=getMojoArtistPhotoResult,timetable=fetchMojoTimetable,management=null,now=()=>new Date() } = {}) {
  let defaultManagement=null;
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');res.setHeader('X-ESMOJO-Agenda-Import','3');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Niet toegestaan.' }); }
    let identity;try { identity=await identify(/^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1]); }
    catch(error) { return res.status(403).json({ error: 'Geen toegang.',code:'FORBIDDEN',stage:['token','claims','issuer','audience','subject','repository','ref','workflow','jwks','signature'].includes(error.identityStage)?error.identityStage:'identity' }); }
    // Een handmatige run buiten het venster vereist een bevestigde workflow_dispatch-claim op main én manualRun in de aanvraag.
    const manual=req.body?.manualRun===true&&identity?.event==='workflow_dispatch';
    if(req.body?.verifyOnly!==true&&!manual&&timetableClock(now()).hour!==5)return res.status(req.body?.operation?409:200).json({ok:!req.body?.operation,skipped:true,code:'IMPORT_WINDOW_CLOSED'});
    let stage='fetch';try {
      if(req.body?.verifyOnly===true){if(Object.keys(req.body).join(',')!=='verifyOnly')throw Error('VALIDATION');stage='verify-core';const existing=await store('concert-catalogue');stage='fetch';const snapshot=await scrape();stage='photo-candidates';const photoCandidates=(await store('artist-photo-candidates')).artists.length;stage='timetable-candidates';const timetableCandidates=(await store('advance-timetable-candidates')).shows.length;stage='management-candidates';const managementCandidates=(await store('management-candidates')).shows.length;return res.status(200).json({ok:true,verified:true,venues:MOJO_VENUES.length,concerts:snapshot.concerts.length,existingConcerts:existing.concerts.length,photoCandidates,timetableCandidates,managementCandidates,days:45});}
      // Dagelijkse controle vooraf van het MOJO-tijdschema voor alle shows in de komende 45 dagen. De meest recente versie wint;
      // een tijdelijke of structurele fout bij één concert (alleen veilige foutcodes geteld) stopt de overige concerten niet.
      if(req.body?.operation==='timetables'){
        const after=req.body?.timetablesAfter;if(after!==undefined&&(typeof after!=='string'||!after||after.length>240||/[\x00-\x1f/\\]/.test(after)))throw Error('VALIDATION');
        stage='timetable-candidates';const shows=(await store('advance-timetable-candidates',after?{after}:{})).shows,batch=shows.slice(0,12);
        let next=0;const counts={saved:0,unchanged:0,missing:0,failed:0},codes={};
        const work=async()=>{while(next<batch.length){const show=batch[next++];try{stage='timetable-source';const snapshot=await timetable(show,{now,advance:true});stage='timetable-save';const saved=await store('advance-timetable-save',{concertId:show.concertId,snapshot});counts[['saved','missing'].includes(saved.state)?saved.state:'unchanged']++;}catch(error){counts.failed++;const code=/^[A-Z][A-Z0-9_]{2,59}$/.test(error?.message||'')?error.message:'UNKNOWN';codes[code]=(codes[code]||0)+1;}}};
        await Promise.all(Array.from({length:Math.min(3,batch.length)},work));
        return res.status(200).json({ok:true,timetables:counts,...Object.keys(codes).length?{timetableErrors:codes}:{},timetablesCursor:batch.at(-1)?.concertId||null,timetablesPending:shows.length>batch.length});
      }
      // Showbeheer wordt automatisch aangemaakt zodra een Gashouder-show in het showmenu komt (komende 45 dagen). Create-only:
      // bestaande toegang blijft ongemoeid. Per concert een fout (alleen veilige codes geteld) stopt de overige concerten niet.
      if(req.body?.operation==='showbeheer'){
        const after=req.body?.managementAfter;if(after!==undefined&&(typeof after!=='string'||!after||after.length>240||/[\x00-\x1f/\\]/.test(after)))throw Error('VALIDATION');
        stage='management-candidates';const shows=(await store('management-candidates',after?{after}:{})).shows,batch=shows.slice(0,12);
        const service=management||(defaultManagement||=createShowManagementService({env:{...process.env,SHOWS_STORAGE_PROVIDER:'dataverse'}}));
        let next=0;const counts={created:0,existing:0,failed:0},codes={};
        const work=async()=>{while(next<batch.length){const show=batch[next++];try{stage='management-create';const state=await service.ensure(show.concertId);counts[state==='created'?'created':'existing']++;}catch(error){counts.failed++;const code=/^[A-Z][A-Z0-9_]{2,59}$/.test(error?.message||'')?error.message:'UNKNOWN';codes[code]=(codes[code]||0)+1;}}};
        await Promise.all(Array.from({length:Math.min(3,batch.length)},work));
        return res.status(200).json({ok:true,management:counts,...Object.keys(codes).length?{managementErrors:codes}:{},managementCursor:batch.at(-1)?.concertId||null,managementPending:shows.length>batch.length});
      }
      // Alleen de fotocursor van de lopende run is toegestaan; geen vrije velden naar de opslag.
      const after=req.body?.photoAfter;if(after!==undefined&&!/^a_[a-f0-9]{64}$/.test(after))throw Error('VALIDATION');
      let result={},snapshot=null;if(req.body?.operation!=='photos'){snapshot=await scrape();stage='native-sync';result=await store('sync',{snapshot});}
      // Alle artiesten zonder foto en zonder eerdere definitieve poging, in begrensde batches. Een tijdelijke MOJO-fout
      // wordt niet vastgelegd: die artiest blijft kandidaat voor de volgende run (binnen een run slaat de cursor hem over).
      stage='photo-candidates';const candidates=(await store('artist-photo-candidates',after?{after}:{})).artists,batch=candidates.slice(0,24);let next=0,photos=0,photosRetry=0;
      const capture=async()=>{while(next<batch.length){const artist=batch[next++];stage='photo-source';const found=await photo(artist.name);if(found.final!==true){photosRetry++;continue;}stage='photo-save';const saved=await store('artist-photo-save',{artistId:artist.artistId,photo:found.photo?{imageUrl:found.photo.imageUrl,sourceUrl:found.photo.sourceUrl}:null});photos+=Number(saved.saved);}};await Promise.all(Array.from({length:Math.min(3,batch.length)},capture));
      return res.status(200).json({ok:true,...result,photos,photosRetry,photosCursor:batch.at(-1)?.artistId||null,photosPending:candidates.length>batch.length,...snapshot?{checkedAt:snapshot.checkedAt,pages:snapshot.pages}: {}});
    } catch(error) {const code=['DATAVERSE_SHOWS_NOT_ACTIVE','DATAVERSE_SHOWS_UNAVAILABLE','DATAVERSE_SHOWS_RESPONSE','DATAVERSE_SHOWS_SCHEMA','CONCERT_CATALOGUE_CONFLICT','MOJO_UNAVAILABLE','MOJO_FORMAT','MOJO_DATE','MOJO_PAGINATION','MOJO_ID_COLLISION','VALIDATION','DATAVERSE_SHOWS_CONFLICT','CONCERT_CATALOGUE_CONFLICT','CONCERT_LOCATION_CONFLICT','ARTIST_PHOTO_UNCONFIRMED'].includes(error.message)?error.message:'IMPORT_UNCONFIRMED';
      // Alleen bij een onbekende fout: foutklasse en een code-achtige foutcode (hoofdletters/underscores), nooit berichttekst of gegevens.
      const diagnosis=code==='IMPORT_UNCONFIRMED'?{...(/^[A-Z][A-Z0-9_]{2,59}$/.test(error?.message||'')?{detail:error.message}:{}),...(/^[A-Za-z]{1,30}$/.test(error?.name||'')?{kind:error.name}:{})}:{};
      return res.status(503).json({error:'Concertimport mislukt. Bestaande documenten blijven behouden.',code,stage,...diagnosis,...MOJO_VENUES.some(venue=>venue.id===error.venue)?{venue:error.venue}:{},...Number.isInteger(error.status)?{status:error.status}:{}}); }
  };
}
