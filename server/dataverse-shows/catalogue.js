import {record,reference,recordKey,digest,canonical,choice} from '../show-migration-writer.js';
import {mapShow} from '../show-migration-map.js';
import {recordOperations} from './mutations.js';
import {MOJO_VENUES} from '../mojo-venues.js';
import {calendarDate,addDays,concertId as makeConcertId} from '../mojo-agenda.js';
import {validTimetableDate} from '../../shared/show-timetable.js';
import {homeCatalogue} from '../../shared/home-catalogue.js';
import {researchKeyForConcert,researchKeyForId,parseResearchKey,researchSlug} from '../../shared/dataverse-shows.js';
import {normalizeArtistName} from '../../shared/artist-catalogue.js';
import {biographyCandidates} from '../artist-biographies.js';
import {showPlanning} from './planning.js';
const day=value=>typeof value==='string'?value.slice(0,10):'';
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const photoValid=p=>sameKeys(p,['imageUrl','sourceUrl'])&&/^https:\/\/www\.mojo\.nl\/media\/[\w/.-]+\.(?:jpe?g|png|webp)(?:\?[^#\s]*)?$/i.test(p.imageUrl)&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(p.sourceUrl);
const biographyUrl=value=>typeof value==='string'&&/^https:\/\/(?:www\.)?mojo\.nl\/(?:[a-z0-9-]+\/?|concerten\/[\w%/-]+)$/.test(value);
const internalRows=plan=>plan.records.filter(row=>!['esmojo_historie','esmojo_integratiestatus'].includes(row.table));
function validSourceIdentity(show){
 const source=parseResearchKey(show.sourceKey),venue=MOJO_VENUES.find(v=>v.name===show.venue);
 return source&&source.date===show.dates[0]&&researchSlug(source.artistToken)===researchSlug(show.name)&&venue&&[venue.name,venue.id,...venue.aliases].some(name=>researchSlug(name)===researchSlug(source.venueToken));
}
export function createNativeCatalogue({state,now=()=>new Date()}={}){
 const repo=state.repo,metaKey=recordKey('esmojo_integratiestatus','native-catalogue/v1');
 async function writeRows(rows){const ops=await recordOperations(repo,rows);if(ops.length)await repo.atomic(ops);}
 async function all(){
  let [series,concerts,artists,locations,teams,employees,projection]=await Promise.all(['esmojo_concertreeks','esmojo_concert','esmojo_artiest','esmojo_locatie','esmojo_projectteam','esmojo_medewerker','esmojo_integratiestatus'].map(table=>repo.query(table,{filter:table==='esmojo_integratiestatus'?"esmojo_integratiecode eq 'shows-native-v1'":'statecode eq 0'})));
  // Report-only historical identities share Core but have no Shows preparation.
  // Keep them out of the active Shows catalogue and its background writers.
  const reportsOnly=new Set(series.filter(s=>s.esmojo_bronidentiteit?.startsWith('reports-series/')).map(s=>s.esmojo_sleutel));
  const seriesMeta=await repo.meta('esmojo_concertreeks'),excludedIds=new Set(series.filter(s=>reportsOnly.has(s.esmojo_sleutel)).map(s=>s[seriesMeta.PrimaryIdAttribute]));
  series=series.filter(s=>!excludedIds.has(s[seriesMeta.PrimaryIdAttribute]));concerts=concerts.filter(c=>!excludedIds.has(c._esmojo_concertreeks_value));
  const [sm,am,lm,cm,em]=await Promise.all(['esmojo_concertreeks','esmojo_artiest','esmojo_locatie','esmojo_concert','esmojo_medewerker'].map(repo.meta));
  const rows=concerts.map(row=>{
   const group=series.find(s=>s[sm.PrimaryIdAttribute]===row._esmojo_concertreeks_value),artist=artists.find(a=>a[am.PrimaryIdAttribute]===group?._esmojo_artiest_value),location=locations.find(l=>l[lm.PrimaryIdAttribute]===group?._esmojo_locatie_value);
   if(!group||!artist||!location||!validTimetableDate(day(row.esmojo_datum)))throw Error('DATAVERSE_SHOWS_CONFLICT');
   return{concertId:row.esmojo_oudconcertid,artist:artist.esmojo_naam,venue:location.esmojo_naam,city:location.esmojo_stad||'',date:day(row.esmojo_datum),time:row.esmojo_tijdlabel||'Niet vermeld',sourceUrl:row.esmojo_bronurl||null,generalConcertId:group.esmojo_oudalgemeenconcertid,folderId:row.esmojo_oudconcertid===group.esmojo_oudalgemeenconcertid?group[sm.PrimaryIdAttribute]:row[cm.PrimaryIdAttribute],generalFolderId:group[sm.PrimaryIdAttribute],active:row.esmojo_tooninshows,native:row};
  });
  const assignments=teams.map(row=>{const employee=employees.find(e=>e[em.PrimaryIdAttribute]===row._esmojo_medewerker_value),concert=concerts.find(c=>c[cm.PrimaryIdAttribute]===row._esmojo_concert_value);if(!employee||!concert)throw Error('DATAVERSE_SHOWS_CONFLICT');return{concertId:concert.esmojo_oudconcertid,userId:employee.esmojo_authuserid,role:row.esmojo_functiecode};});
  const metadata=await repo.byKey('esmojo_integratiestatus',metaKey),clock=metadata?JSON.parse(metadata.esmojo_configuratie_json).checkedAt:null;
  return{rows,series,artists,locations,assignments,projection,clock};
 }
 async function persistClock(checkedAt){if(!Number.isFinite(Date.parse(checkedAt)))throw Error('VALIDATION');await writeRows([record('integratiestatus','native-catalogue/v1','Native Shows-catalogus',{integratiecode:'shows-native-catalogue-v1',scopecode:'global',configuratie_json:canonical({version:1,checkedAt})})]);}
 async function create(source,people={profiles:[],assignments:[]}){
  const rows=[];
  for(const row of internalRows(mapShow(source,people))){
   // Never erase a shared artist's biography or photo when adding a show.
   if(['esmojo_artiest','esmojo_locatie'].includes(row.table)&&await repo.byKey(row.table,row.key))continue;
   if(await repo.byKey(row.table,row.key))throw Error('DATAVERSE_SHOWS_CONFLICT');rows.push(row);
  }
  await writeRows(rows);
 }
 async function ensure(show){
  if(!show||typeof show.key!=='string'||typeof show.name!=='string'||!show.name||show.name.length>160||!Array.isArray(show.dates)||show.dates.length!==1||!validTimetableDate(show.dates[0])||!MOJO_VENUES.some(v=>v.name===show.venue&&v.city===show.city)||researchKeyForId(show.key)!==show.sourceKey||!validSourceIdentity(show))throw Error('VALIDATION');
  const existing=await repo.byKey('esmojo_routealias',recordKey('esmojo_routealias','route/show/'+show.key));
  if(existing){const scope=await state.resolve(show.key);return{concertId:scope.concert.esmojo_oudconcertid};}
  const data=await all(),matches=data.rows.filter(row=>researchKeyForConcert(row)===show.sourceKey);
  if(matches.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');
  if(matches.length){const matched=matches[0],scope=await state.resolve(matched.concertId);await writeRows([record('routealias','route/show/'+show.key,show.key,{aliassoort:'show',aliaswaarde:show.key,omleidentoegestaan:true},{concertreeks:reference('concertreeks','drive-series/'+scope.series.esmojo_oudalgemeenconcertid),concert:reference('concert','concert/'+matched.concertId)})]);return{concertId:matched.concertId};}
  await create({version:1,concertId:show.key,shows:[{concertId:show.key,artist:show.name,venue:show.venue,city:show.city,date:show.dates[0],time:'Niet vermeld',sourceUrl:show.sourceUrl||null,active:false}],documents:{},files:[],timetables:[]});
  return{concertId:show.key};
 }
 async function sync(snapshot){
  const today=calendarDate(now());
  if(!sameKeys(snapshot,['concerts','from','until','checkedAt','pages'])||snapshot.from!==today||snapshot.until!==addDays(today,365)||!Array.isArray(snapshot.concerts)||snapshot.concerts.length>400||!Number.isInteger(snapshot.pages)||snapshot.pages<1||snapshot.pages>100||!Number.isFinite(Date.parse(snapshot.checkedAt))||Math.abs(now().getTime()-Date.parse(snapshot.checkedAt))>600000)throw Error('VALIDATION');
  const seen=new Set();
  for(const row of snapshot.concerts){if(!row||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||row.venue!=='Gashouder'||row.city!=='Amsterdam'||!validTimetableDate(row.date)||row.date<snapshot.from||row.date>=snapshot.until||makeConcertId(row.artist,row.date)!==row.concertId||seen.has(row.concertId)||!/^https:\/\/www\.mojo\.nl\/(agenda|concerten\/[\w%/-]+)(\?[^#\s]*)?$/.test(row.sourceUrl||''))throw Error('VALIDATION');seen.add(row.concertId);}
  const current=await all(),people=await state.employeeSource(),pinned=await repo.query('esmojo_historie',{filter:"esmojo_entiteitsoort eq 'account-role'"});
  const admins=pinned.map(row=>{const value=JSON.parse(row.esmojo_snapshot_json);if(digest(value)!==row.esmojo_fingerprint||value.policy!=='existing-pinned-super-administrator')throw Error('DATAVERSE_SHOWS_CONFLICT');return value.authUserId;});
  if(admins.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');
  const administrator=people.profiles.find(p=>p.id===admins[0]&&!p.disabled&&p.activated&&p.modules.includes('shows'));
  const combined=new Map(current.rows.map(row=>[row.concertId,row]));for(const row of snapshot.concerts)combined.set(row.concertId,{...combined.get(row.concertId),...row});
  const groups=[];
  for(const row of [...combined.values()].filter(row=>row.venue==='Gashouder').sort((a,b)=>normalizeArtistName(a.artist).localeCompare(normalizeArtistName(b.artist))||a.date.localeCompare(b.date))){const previous=groups.at(-1);if(previous&&normalizeArtistName(previous[0].artist)===normalizeArtistName(row.artist)&&(previous.at(-1).date===row.date||addDays(previous.at(-1).date,1)===row.date))previous.push(row);else groups.push([row]);}
  let created=0;
  for(const group of groups){const additions=group.filter(row=>seen.has(row.concertId)&&!current.rows.some(old=>old.concertId===row.concertId));if(!additions.length)continue;
   const existing=[...new Set(group.filter(row=>current.rows.some(old=>old.concertId===row.concertId)).map(row=>row.generalConcertId))];if(existing.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');
   const assignments=administrator?additions.map(row=>({concertId:row.concertId,userId:administrator.id,role:'event-safety-manager',createdAt:now().toISOString()})):[];
   if(existing.length){const loaded=await state.load(existing[0]),next={...loaded.source,shows:[...loaded.source.shows,...additions.map(row=>({...row,time:row.time||'Niet vermeld',active:true}))]};loaded.people.assignments.push(...assignments);await state.commit(loaded,next,{created:additions.length},digest('native-sync/'+snapshot.checkedAt+'/'+existing[0]));}
   else{const first=additions[0];await create({version:1,concertId:first.concertId,shows:additions.map(row=>({...row,time:row.time||'Niet vermeld',active:true})),documents:{},files:[],timetables:[]},{...people,assignments});}created+=additions.length;
  }
  // Refresh only technical catalogue fields. Each patch compares its real ETag.
  const latest=await all(),cm=await repo.meta('esmojo_concert');
  const updates=latest.rows.filter(row=>row.venue==='Gashouder').flatMap(row=>{const fresh=snapshot.concerts.find(v=>v.concertId===row.concertId),active=Boolean(fresh);if(active===row.active&&(!fresh||fresh.sourceUrl===row.sourceUrl))return[];return[{table:'esmojo_concert',id:row.native[cm.PrimaryIdAttribute],method:'PATCH',etag:row.native['@odata.etag'],payload:{esmojo_tooninshows:active,...(fresh?{esmojo_bronurl:fresh.sourceUrl}:{})}}];});
  for(let n=0;n<updates.length;n+=200)await repo.atomic(updates.slice(n,n+200));await persistClock(snapshot.checkedAt);return{createdConcerts:created,createdArtists:new Set((await all()).artists.map(row=>row.esmojo_bronartiestid).filter(id=>!current.artists.some(a=>a.esmojo_bronartiestid===id))).size};
 }
 async function savedBiographies(data){
  const saved={},history=await repo.query('esmojo_historie',{filter:"esmojo_entiteitsoort eq 'artist-source'"});
  for(const artist of data.artists){
   const marker=await repo.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus','native-biography/'+artist.esmojo_bronartiestid));
   if(marker){const value=JSON.parse(marker.esmojo_configuratie_json);if(value.firstDate)saved[artist.esmojo_bronartiestid]={firstDate:value.firstDate};continue;}
   for(const row of history){const source=JSON.parse(row.esmojo_snapshot_json);if(digest(source)!==row.esmojo_fingerprint)throw Error('VERIFY');if(source.artistId===artist.esmojo_bronartiestid&&source.biography?.firstDate&&(!saved[source.artistId]||saved[source.artistId].firstDate<source.biography.firstDate))saved[source.artistId]={firstDate:source.biography.firstDate};}
  }return saved;
 }
 const globals=new Set(['list','sync','dataverse-ensure','research-identities','home-dashboard','home-metadata','home-rebuild','home-photo-cache','biography-candidates','biography-save','biography-initial-list','biography-initial-save','biography-initial-batch']);
 async function request(operation,payload={}){
  if(operation==='dataverse-ensure')return ensure(payload.show);
  if(operation==='sync')return sync(payload.snapshot);
  const data=await all();
  if(operation==='list'){if(!data.clock)throw Error('DATAVERSE_SHOWS_NOT_INITIALIZED');return{concerts:data.rows.filter(row=>row.active).map(({native,...row})=>{const artist=data.artists.find(a=>a.esmojo_naam===row.artist);return{...row,...(artist?.esmojo_fotobronurl&&row.sourceUrl?{photo:{imageUrl:artist.esmojo_fotobronurl,sourceUrl:row.sourceUrl}}:{})};}),checkedAt:data.clock};}
  if(operation==='research-identities')return{concerts:data.rows.filter(row=>payload.sourceKeys?.includes(researchKeyForConcert(row))).map(({native,...row})=>row)};
  if(operation==='home-dashboard'||operation==='home-metadata'){
   if(typeof payload.actor!=='string'||!data.clock)throw Error('VALIDATION');
   const rows=homeCatalogue({managedBy:'ESMOJO/MOJO-v1',version:1,concerts:data.rows,active:data.rows.filter(row=>row.active).map(row=>row.concertId),checkedAt:data.clock},payload.actor,data.assignments,{includeHistory:true});
   if(operation==='home-metadata'){const scope=await state.resolve(payload.concertId),show=rows.find(row=>row.key===scope.series.esmojo_oudalgemeenconcertid);if(!show)throw Error('NOT_FOUND');return{show:{key:show.key,name:show.name,dates:show.dates,venue:show.venue,city:show.city,sourceUrl:show.sourceUrl}};}
   for(const row of rows){const p=data.projection.find(p=>p.esmojo_scopecode===digest(row.key)),planning=p?JSON.parse(p.esmojo_configuratie_json).planning:null;if(planning?.completion)Object.assign(row,{snapshot:{completion:planning.completion},planningUpdatedAt:planning.updatedAt});else row.planningUnavailable=true;const artist=data.artists.find(a=>a.esmojo_naam===row.name);if(artist?.esmojo_fotobronurl)row.photo={imageUrl:artist.esmojo_fotobronurl,sourceUrl:row.sourceUrl};}return{shows:rows,checkedAt:data.clock};
  }
  if(operation==='home-photo-cache'){
   if(!sameKeys(payload,['photos'])||!Array.isArray(payload.photos)||payload.photos.length>400)throw Error('VALIDATION');const seen=new Set(),updates=[];
   for(const entry of payload.photos){const show=data.rows.find(row=>row.generalConcertId===entry.key),artist=data.artists.find(a=>a.esmojo_naam===show?.artist);if(!sameKeys(entry,['key','photo'])||seen.has(entry.key)||!artist||!photoValid(entry.photo)||show.sourceUrl!==entry.photo.sourceUrl)throw Error('VALIDATION');seen.add(entry.key);const m=await repo.meta('esmojo_artiest');const previous=updates.find(row=>row.id===artist[m.PrimaryIdAttribute]);if(previous&&previous.payload.esmojo_fotobronurl!==entry.photo.imageUrl)throw Error('DATAVERSE_SHOWS_CONFLICT');if(!previous&&artist.esmojo_fotobronurl!==entry.photo.imageUrl)updates.push({table:'esmojo_artiest',id:artist[m.PrimaryIdAttribute],method:'PATCH',etag:artist['@odata.etag'],payload:{esmojo_fotobronurl:entry.photo.imageUrl}});}
   if(updates.length)await repo.atomic(updates);return{cached:payload.photos.length};
  }
  if(operation==='biography-candidates')return{concerts:data.rows.map(({artist,date,venue,sourceUrl})=>({artist,date,venue,sourceUrl})),saved:await savedBiographies(data)};
  if(operation==='biography-initial-list')return{artists:data.artists.filter(a=>!a.esmojo_biografie).map(a=>({id:a.esmojo_bronartiestid,name:a.esmojo_naam}))};
  if(operation==='biography-save'||operation==='biography-initial-save'||operation==='biography-initial-batch'){
   const entries=operation==='biography-initial-batch'?payload.entries:operation==='biography-initial-save'?[payload]:[{artistId:payload.series?.artistId,name:payload.series?.name,...payload.biography}];if(!Array.isArray(entries)||!entries.length||entries.length>25||new Set(entries.map(e=>e.artistId)).size!==entries.length)throw Error('VALIDATION');let saved=0;
   const previous=await savedBiographies(data);
   for(const entry of entries){const artist=data.artists.find(a=>a.esmojo_bronartiestid===entry.artistId&&a.esmojo_naam===entry.name);if(!artist||typeof entry.text!=='string'||entry.text!==entry.text.trim()||entry.text.length>20000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(entry.text))throw Error('VALIDATION');
    if(operation==='biography-save'){
     const s=payload.series,b=payload.biography,candidates=biographyCandidates(data.rows,{},now()),match=candidates.find(c=>c.seriesKey===s?.seriesKey&&c.artistId===entry.artistId);
     if(!sameKeys(payload,['series','biography'])||!sameKeys(s,['artistId','artistIds','firstDate','lastDate','name','seriesKey','venue'])||!sameKeys(b,['text','sourceUrl','capturedAt'])||!match||s.firstDate!==match.firstDate||s.lastDate!==match.lastDate||s.venue!==match.venue||!Array.isArray(s.artistIds)||!s.artistIds.includes(s.artistId)||s.artistIds.some(id=>!/^a_[a-f0-9]{64}$/.test(id))||entry.text.length<120||!biographyUrl(entry.sourceUrl)||!Number.isFinite(Date.parse(entry.capturedAt))||Math.abs(now().getTime()-Date.parse(entry.capturedAt))>600000)throw Error('VALIDATION');
     if(previous[s.artistId]?.firstDate>=s.firstDate)continue;
    }else if(!sameKeys(entry,['artistId','name','text'])||entry.text.split(/\s+/).length<60||entry.text.split(/\s+/).length>70||/[<>]/.test(entry.text))throw Error('VALIDATION');
    if(operation!=='biography-save'&&artist.esmojo_biografie)continue;
    const m=await repo.meta('esmojo_artiest'),rows=operation==='biography-save'?[record('integratiestatus','native-biography/'+entry.artistId,'Biografie vastlegging',{integratiecode:'shows-native-biography-v1',scopecode:digest(entry.artistId),configuratie_json:canonical({firstDate:payload.series.firstDate,lastDate:payload.series.lastDate,seriesKey:payload.series.seriesKey})})]:[],ops=await recordOperations(repo,rows);
    ops.push({table:'esmojo_artiest',id:artist[m.PrimaryIdAttribute],method:'PATCH',etag:artist['@odata.etag'],payload:{esmojo_biografie:entry.text,esmojo_biografiebron:entry.sourceUrl||null,esmojo_biografieopgehaaldop:entry.capturedAt||now().toISOString()}});await repo.atomic(ops);saved++;
   }return operation==='biography-initial-batch'?{saved,unchanged:entries.length-saved}:saved?{saved:true}:{unchanged:true};
  }
  if(operation==='home-rebuild'){
   let ready=0,unavailable=0;
   for(const id of [...new Set(data.rows.filter(row=>row.venue==='Gashouder').map(row=>row.generalConcertId))]){
    try{const loaded=await state.load(id),planning=showPlanning(loaded.source);await state.refreshPlanning(loaded,planning);if(planning.completion)ready++;else unavailable++;}catch(error){if(error.message==='DATAVERSE_SHOWS_CONFLICT')throw error;unavailable++;}
   }
   return{ok:true,ready,unavailable,photoSources:data.rows.filter(row=>row.concertId===row.generalConcertId&&row.active&&row.date>=calendarDate(now())&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(row.sourceUrl||'')).map(row=>({key:row.generalConcertId,sourceUrl:row.sourceUrl}))};
  }
  throw Error('VALIDATION');
 }
 return{handles:operation=>globals.has(operation),request,all,persistClock,primaryShows:async()=>{const data=await all();return data.rows.filter(row=>row.concertId===row.generalConcertId).map(row=>({key:row.concertId})).sort((a,b)=>a.key.localeCompare(b.key));}};
}
