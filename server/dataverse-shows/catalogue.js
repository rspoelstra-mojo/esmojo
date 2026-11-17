import {validateTimetable,validTimetableSource} from '../../shared/show-timetable.js';
import {createConcertCatalogue} from '../concert-catalogue.js';
import {record,reference,recordKey,digest,canonical,choice,migrationDifferences} from '../show-migration-writer.js';
import {mapShow} from '../show-migration-map.js';
import {recordOperations} from './mutations.js';
import {MOJO_VENUES,canonicalVenueName} from '../mojo-venues.js';
import {calendarDate,addDays,concertId as makeConcertId} from '../mojo-agenda.js';
import {validTimetableDate} from '../../shared/show-timetable.js';
import {homeCatalogue} from '../../shared/home-catalogue.js';
import {researchKeyForConcert,researchKeyForId,parseResearchKey,researchSlug} from '../../shared/dataverse-shows.js';
import {normalizeArtistName} from '../../shared/artist-catalogue.js';
import {showPlanning} from './planning.js';
import {createStaffPlanning} from './staff-planning.js';
const day=value=>typeof value==='string'?value.slice(0,10):'';
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const photoValid=p=>sameKeys(p,['imageUrl','sourceUrl'])&&/^https:\/\/www\.mojo\.nl\/media\/[\w/.-]+\.(?:jpe?g|png|webp)(?:\?[^#\s]*)?$/i.test(p.imageUrl)&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(p.sourceUrl);
const biographyUrl=value=>typeof value==='string'&&/^https:\/\/(?:www\.)?mojo\.nl\/(?:[a-z0-9-]+\/?|concerten\/[\w%/-]+)$/.test(value);
const internalRows=plan=>plan.records.filter(row=>!['esmojo_historie','esmojo_integratiestatus'].includes(row.table));
function validSourceIdentity(show){
 const source=parseResearchKey(show.sourceKey),venue=MOJO_VENUES.find(v=>v.name===show.venue);
 return source&&source.date===show.dates[0]&&researchSlug(source.artistToken)===researchSlug(show.name)&&venue&&[venue.name,venue.id,...venue.aliases].some(name=>researchSlug(name)===researchSlug(source.venueToken));
}
export function createNativeCatalogue({env=process.env,state,now=()=>new Date()}={}){
 const repo=state.repo,metaKey=recordKey('esmojo_integratiestatus','native-catalogue/v1'),staff=createStaffPlanning({env,repo,now});
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
   return{concertId:row.esmojo_oudconcertid,artist:artist.esmojo_naam,venue:canonicalVenueName(location.esmojo_naam),city:location.esmojo_stad||'',date:day(row.esmojo_datum),time:row.esmojo_tijdlabel||'Niet vermeld',sourceUrl:row.esmojo_bronurl||null,generalConcertId:group.esmojo_oudalgemeenconcertid,folderId:row.esmojo_oudconcertid===group.esmojo_oudalgemeenconcertid?group[sm.PrimaryIdAttribute]:row[cm.PrimaryIdAttribute],generalFolderId:group[sm.PrimaryIdAttribute],active:row.esmojo_tooninshows,native:row};
  });
  const assignments=teams.map(row=>{const employee=employees.find(e=>e[em.PrimaryIdAttribute]===row._esmojo_medewerker_value),concert=concerts.find(c=>c[cm.PrimaryIdAttribute]===row._esmojo_concert_value);if(!employee||!concert)throw Error('DATAVERSE_SHOWS_CONFLICT');return{concertId:concert.esmojo_oudconcertid,userId:employee.esmojo_authuserid,role:row.esmojo_functiecode};});
  const metadata=await repo.byKey('esmojo_integratiestatus',metaKey),clock=metadata?JSON.parse(metadata.esmojo_configuratie_json).checkedAt:null;
  return{rows,series,artists,locations,assignments,projection,clock};
 }
 async function persistClock(checkedAt){if(!Number.isFinite(Date.parse(checkedAt)))throw Error('VALIDATION');await writeRows([record('integratiestatus','native-catalogue/v1','Native Shows-catalogus',{integratiecode:'shows-native-catalogue-v1',scopecode:'global',configuratie_json:canonical({version:1,checkedAt})})]);}
 async function create(source,people={profiles:[],assignments:[]}){
  const first=source.shows[0],artistId=source.artistId||'a_'+digest(normalizeArtistName(first.artist)),artist=await repo.byKey('esmojo_artiest',recordKey('esmojo_artiest','artist/'+artistId)),venue=MOJO_VENUES.find(row=>row.name===canonicalVenueName(first.venue)),location=venue&&await repo.byKey('esmojo_locatie',recordKey('esmojo_locatie','venue/'+venue.id));
  source={...source,artistId,shows:source.shows.map(row=>({...row,artist:artist?.esmojo_naam||row.artist,venue:location?.esmojo_naam||canonicalVenueName(row.venue),city:location?.esmojo_stad||row.city}))};
  const plan=mapShow(source,people),rows=[];if(plan.deferredLinks.length)throw Error('NEW_CONCERT_CONTRACT');
  for(const row of internalRows(plan)){
   if(['esmojo_artiest','esmojo_locatie'].includes(row.table)&&await repo.byKey(row.table,row.key))continue;
   if(await repo.byKey(row.table,row.key))throw Error('DATAVERSE_SHOWS_CONFLICT');rows.push(row);
  }
  // Lost batch acknowledgement never means failure: prove every field/lookup first.
  try{await writeRows(rows);}catch(error){await state.verifyPlan({records:rows,deferredLinks:[]},0);return;}
  await state.verifyPlan({records:rows,deferredLinks:[]},0);
 }
 async function ensure(show){
  if(show)show={...show,venue:canonicalVenueName(show.venue)};
  if(!show||typeof show.key!=='string'||typeof show.name!=='string'||!show.name||show.name.length>160||!Array.isArray(show.dates)||show.dates.length!==1||!validTimetableDate(show.dates[0])||!MOJO_VENUES.some(v=>v.name===show.venue&&v.city===show.city)||researchKeyForId(show.key)!==show.sourceKey||!validSourceIdentity(show))throw Error('VALIDATION');
  const existing=await repo.byKey('esmojo_routealias',recordKey('esmojo_routealias','route/show/'+show.key));
  if(existing){const scope=await state.resolve(show.key);return{concertId:scope.concert.esmojo_oudconcertid};}
  const data=await all(),matches=data.rows.filter(row=>researchKeyForConcert(row)===show.sourceKey||researchSlug(row.artist)===researchSlug(show.name)&&canonicalVenueName(row.venue)===show.venue&&row.date===show.dates[0]);
  if(matches.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');
  if(matches.length){const matched=matches[0],scope=await state.resolve(matched.concertId);await writeRows([record('routealias','route/show/'+show.key,show.key,{aliassoort:'show',aliaswaarde:show.key,omleidentoegestaan:true},{concertreeks:reference('concertreeks','drive-series/'+scope.series.esmojo_oudalgemeenconcertid),concert:reference('concert','concert/'+matched.concertId)})]);return{concertId:matched.concertId};}
  throw Error('NOT_FOUND'); // Unlinked research never invents a concert; the agenda import owns creation.
 }
 async function normalizeLocations(){
  const data=await all(),location=data.locations.find(row=>row.esmojo_locatiecode==='rotterdam-ahoy');if(!location||location.esmojo_naam==='Rotterdam AHOY')return;
  if(!['Rotterdam Ahoy','AHOY Rotterdam','Ahoy Rotterdam','Rotterdam AHOY'].includes(location.esmojo_naam))throw Error('CONCERT_LOCATION_CONFLICT');
  const [lm,sm,am]=await Promise.all(['esmojo_locatie','esmojo_concertreeks','esmojo_artiest'].map(repo.meta)),id=location[lm.PrimaryIdAttribute],operations=[{table:'esmojo_locatie',id,method:'PATCH',etag:location['@odata.etag'],payload:{esmojo_naam:'Rotterdam AHOY'}}];
  for(const series of data.series.filter(row=>row._esmojo_locatie_value===id)){
   const artist=data.artists.find(row=>row[am.PrimaryIdAttribute]===series._esmojo_artiest_value);if(!artist||series.esmojo_naam!==artist.esmojo_naam+' · '+location.esmojo_naam)throw Error('CONCERT_LOCATION_CONFLICT');
   operations.push({table:'esmojo_concertreeks',id:series[sm.PrimaryIdAttribute],method:'PATCH',etag:series['@odata.etag'],payload:{esmojo_naam:artist.esmojo_naam+' · Rotterdam AHOY'}});
  }await repo.atomic(operations);
 }
 async function sync(snapshot){
  const today=calendarDate(now());
  if(!sameKeys(snapshot,['concerts','from','until','checkedAt','pages'])||snapshot.from!==today||snapshot.until!==addDays(today,45)||!Array.isArray(snapshot.concerts)||snapshot.concerts.length>1500||!Number.isInteger(snapshot.pages)||snapshot.pages<1||snapshot.pages>700||!Number.isFinite(Date.parse(snapshot.checkedAt))||Math.abs(now().getTime()-Date.parse(snapshot.checkedAt))>600000)throw Error('VALIDATION');
  const seen=new Set();
  for(const row of snapshot.concerts){if(!row||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||!MOJO_VENUES.some(venue=>venue.name===row.venue&&venue.city===row.city)||!validTimetableDate(row.date)||row.date<snapshot.from||row.date>=snapshot.until||makeConcertId(row.artist,row.date,row.venue)!==row.concertId||seen.has(row.concertId)||!/^https:\/\/www\.mojo\.nl\/(agenda|concerten\/[\w%/-]+)(\?[^#\s]*)?$/.test(row.sourceUrl||''))throw Error('VALIDATION');seen.add(row.concertId);}
  await normalizeLocations();
  const current=await all();snapshot={...snapshot,concerts:snapshot.concerts.map(row=>{const direct=current.rows.find(old=>old.concertId===row.concertId),same=old=>normalizeArtistName(old.artist)===normalizeArtistName(row.artist)&&old.venue===row.venue&&old.date===row.date;if(direct&&!same(direct))throw Error('DATAVERSE_SHOWS_CONFLICT');if(current.rows.some(old=>old.venue===row.venue&&old.date===row.date&&old.sourceUrl===row.sourceUrl&&!same(old)))throw Error('DATAVERSE_SHOWS_CONFLICT');const matches=current.rows.filter(same);if(matches.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');const artists=current.artists.filter(artist=>normalizeArtistName(artist.esmojo_naam)===normalizeArtistName(row.artist));if(artists.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');return{...row,...artists.length?{artist:artists[0].esmojo_naam}:{},...matches.length?{concertId:matches[0].concertId}:{}};})};seen.clear();for(const row of snapshot.concerts)seen.add(row.concertId);
  const people=await state.employeeSource(),pinned=await repo.query('esmojo_historie',{filter:"esmojo_entiteitsoort eq 'account-role'"});
  const admins=pinned.map(row=>{const value=JSON.parse(row.esmojo_snapshot_json);if(digest(value)!==row.esmojo_fingerprint||value.policy!=='existing-pinned-super-administrator')throw Error('DATAVERSE_SHOWS_CONFLICT');return value.authUserId;});
  if(admins.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');
  const administrator=people.profiles.find(p=>p.id===admins[0]&&!p.disabled&&p.activated&&p.modules.includes('shows'));
  const combined=new Map(current.rows.map(row=>[row.concertId,row]));for(const row of snapshot.concerts)combined.set(row.concertId,{...combined.get(row.concertId),...row});
  const groups=[];
  for(const row of [...combined.values()].filter(row=>MOJO_VENUES.some(venue=>venue.name===row.venue)).sort((a,b)=>a.venue.localeCompare(b.venue)||normalizeArtistName(a.artist).localeCompare(normalizeArtistName(b.artist))||a.date.localeCompare(b.date))){const previous=groups.at(-1);if(previous&&previous[0].venue===row.venue&&normalizeArtistName(previous[0].artist)===normalizeArtistName(row.artist)&&(previous.at(-1).date===row.date||addDays(previous.at(-1).date,1)===row.date))previous.push(row);else groups.push([row]);}
  let created=0,batches=0,concertsPending=false;
  for(const group of groups){const additions=group.filter(row=>seen.has(row.concertId)&&!current.rows.some(old=>old.concertId===row.concertId));if(!additions.length)continue;if(batches>=25){concertsPending=true;continue;}batches++;
   const existing=[...new Set(group.filter(row=>current.rows.some(old=>old.concertId===row.concertId)).map(row=>row.generalConcertId))];if(existing.length>1)throw Error('DATAVERSE_SHOWS_CONFLICT');
   const assignments=administrator?additions.map(row=>({concertId:row.concertId,userId:administrator.id,role:'event-safety-manager',createdAt:now().toISOString()})):[];
   if(existing.length){const loaded=await state.load(existing[0]),next={...loaded.source,shows:[...loaded.source.shows,...additions.map(row=>({...row,time:row.time||'Niet vermeld',active:true}))]};loaded.people.assignments.push(...assignments);await state.commit(loaded,next,{created:additions.length},digest('native-sync/'+snapshot.checkedAt+'/'+existing[0]));}
   else{const first=additions[0];await create({version:1,concertId:first.concertId,shows:additions.map(row=>({...row,time:row.time||'Niet vermeld',active:true})),documents:{},files:[],timetables:[]},{...people,assignments});}created+=additions.length;
  }
  if(concertsPending)return{createdConcerts:created,createdArtists:new Set((await all()).artists.map(row=>row.esmojo_bronartiestid).filter(id=>!current.artists.some(a=>a.esmojo_bronartiestid===id))).size,concertsPending:true};
  // Refresh only technical catalogue fields. Each patch compares its real ETag.
  const latest=await all(),cm=await repo.meta('esmojo_concert');
  const updates=latest.rows.filter(row=>MOJO_VENUES.some(venue=>venue.name===row.venue)).flatMap(row=>{const fresh=snapshot.concerts.find(v=>v.concertId===row.concertId),active=Boolean(fresh);if(active===row.active&&(!fresh||fresh.sourceUrl===row.sourceUrl))return[];return[{table:'esmojo_concert',id:row.native[cm.PrimaryIdAttribute],method:'PATCH',etag:row.native['@odata.etag'],payload:{esmojo_tooninshows:active,...(fresh?{esmojo_bronurl:fresh.sourceUrl}:{})}}];});
  for(let n=0;n<updates.length;n+=200)await repo.atomic(updates.slice(n,n+200));await persistClock(snapshot.checkedAt);return{createdConcerts:created,createdArtists:new Set((await all()).artists.map(row=>row.esmojo_bronartiestid).filter(id=>!current.artists.some(a=>a.esmojo_bronartiestid===id))).size};
 }

 // De laatst bekende beschikbare voorlopige versie als snapshot (zelfde vorm als een showdagopname), of null.
 async function advanceSnapshot(concertId){
  const stored=await repo.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus',advanceKey(concertId)));if(!stored)return null;
  const config=advanceConfig(stored);
  if(stored.esmojo_integratiecode!==advanceCode||stored.esmojo_scopecode!==digest(concertId)||!config||config.concertId!==concertId||config.status!=='available'||!Array.isArray(config.entries))return null;
  const {version,...snapshot}=config;return snapshot;
 }
 // Voor rapportages en de show: de meest recente versie wint. De dag na het concert verdwijnt het schema van MOJO; de
 // laatst opgeslagen versie (tot en met de showdag, 05:00) blijft daarom de waarheid voor die show.
 async function readTimetable(concertId){
  const loaded=await state.load(concertId),showday=loaded.source.timetables.find(row=>row.concertId===concertId)?.snapshot||null,advance=await advanceSnapshot(concertId);
  if(!advance)return showday;if(!showday)return advance;
  return Date.parse(advance.capturedAt)>Date.parse(showday.capturedAt)?advance:showday;
 }
 async function saveTimetable(payload){
  if(!sameKeys(payload,['concertId','snapshot']))throw Error('VALIDATION');const loaded=await state.load(payload.concertId),show=loaded.source.shows.find(row=>row.concertId===payload.concertId);if(!show)throw Error('NOT_FOUND');validateTimetable(payload.snapshot,{...show,key:show.concertId},{now:now()});
  await state.verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);const existing=loaded.source.timetables.find(row=>row.concertId===payload.concertId);const result={state:payload.snapshot.status==='available'?'captured':'missing'};if(existing&&canonical(existing.snapshot)===canonical(payload.snapshot))return result;
  const next={...loaded.source,timetables:[...loaded.source.timetables.filter(row=>row.concertId!==payload.concertId),{concertId:payload.concertId,snapshot:payload.snapshot}]};await state.commit(loaded,next,result,digest('native-timetable/'+payload.concertId+'/'+canonical(payload.snapshot)));return result;
 }
 // Alle artiesten zonder vastgelegde foto en zonder eerdere definitieve poging, oplopend op ID; `after` is de cursor van de lopende run.
 async function photoCandidates(after){
  if(after!==undefined&&!/^a_[a-f0-9]{64}$/.test(after))throw Error('VALIDATION');
  const data=await all(),saved=await repo.query('esmojo_integratiestatus',{filter:"esmojo_integratiecode eq 'artist-photo-import-v1'"}),done=new Set(saved.map(row=>row.esmojo_scopecode));
  return data.artists.filter(row=>!row.esmojo_fotobronurl&&!done.has(row.esmojo_bronartiestid)&&(after===undefined||row.esmojo_bronartiestid>after)).map(row=>({artistId:row.esmojo_bronartiestid,name:row.esmojo_naam})).sort((a,b)=>a.artistId.localeCompare(b.artistId));
 }
 // Voorlopig tijdschema: dagelijks vernieuwd vóór de showdag; de meest recente beschikbare versie geldt. Openbare MOJO-gegevens,
 // bewaard in de bestaande Integratiestatus (geen nieuw schema); een later verdwenen bron wist een eerder beschikbare versie niet.
 const advanceCode='show-timetable-advance-v1',advanceKey=concertId=>'show-timetable-advance/'+concertId;
 const validConcertId=value=>typeof value==='string'&&value.length>0&&value.length<=240&&!/[\x00-\x1f/\\]/.test(value);
 const byCodepoint=(a,b)=>a<b?-1:a>b?1:0;
 async function advanceCandidates(after){
  if(after!==undefined&&!validConcertId(after))throw Error('VALIDATION');
  const data=await all(),today=calendarDate(now()),until=addDays(today,45);
  return data.rows.filter(row=>row.active&&row.date>=today&&row.date<until&&validTimetableSource(row.sourceUrl)&&(after===undefined||row.concertId>after)).map(row=>({concertId:row.concertId,date:row.date,sourceUrl:row.sourceUrl,artist:row.artist,venue:row.venue,city:row.city})).sort((a,b)=>byCodepoint(a.concertId,b.concertId));
 }
 // Gashouder-concerten die in het showmenu staan (komende 45 dagen): daarvoor wordt Showbeheer automatisch aangemaakt.
 async function managementCandidates(after){
  if(after!==undefined&&!validConcertId(after))throw Error('VALIDATION');
  const data=await all(),today=calendarDate(now()),until=addDays(today,45);
  return data.rows.filter(row=>row.active&&row.venue==='Gashouder'&&row.date>=today&&row.date<until&&(after===undefined||row.concertId>after)).map(row=>({concertId:row.concertId,date:row.date})).sort((a,b)=>byCodepoint(a.concertId,b.concertId));
 }
 function advanceConfig(row){try{const value=JSON.parse(row.esmojo_configuratie_json);return value&&value.version===1?value:null;}catch{return null;}}
 async function advanceSave(payload){
  if(!sameKeys(payload,['concertId','snapshot'])||!validConcertId(payload.concertId))throw Error('VALIDATION');
  const data=await all(),row=data.rows.find(candidate=>candidate.concertId===payload.concertId&&candidate.active);if(!row||!row.sourceUrl)throw Error('NOT_FOUND');
  let snapshot;try{snapshot=validateTimetable(payload.snapshot,{concertId:row.concertId,date:row.date,sourceUrl:row.sourceUrl},{advance:true});}catch{throw Error('VALIDATION');}
  if(snapshot.sourceUrl!==row.sourceUrl||Date.parse(snapshot.capturedAt)>now().getTime()+600000)throw Error('VALIDATION');
  if(snapshot.status!=='available')return{state:'missing'};
  const key=recordKey('esmojo_integratiestatus',advanceKey(row.concertId)),previous=await repo.byKey('esmojo_integratiestatus',key),old=previous?advanceConfig(previous):null;
  if(old&&typeof old.capturedAt==='string'&&old.capturedAt>=snapshot.capturedAt)return{state:'unchanged'};
  const model=record('integratiestatus',advanceKey(row.concertId),'Voorlopig tijdschema',{integratiecode:advanceCode,scopecode:digest(row.concertId),configuratie_json:canonical({version:1,...snapshot})});
  const operations=await recordOperations(repo,[model]);try{await repo.atomic(operations);}catch{/* Independent readback below decides whether the write committed. */}
  const read=await repo.byKey('esmojo_integratiestatus',key);if(!read||migrationDifferences(model,read,model.fields).length)throw Error('TIMETABLE_UNCONFIRMED');
  return{state:'saved'};
 }
 async function advanceRead(concertId){
  if(!validConcertId(concertId))throw Error('VALIDATION');
  const data=await all(),rows=data.rows.filter(row=>row.active&&(row.concertId===concertId||row.generalConcertId===concertId)).sort((a,b)=>byCodepoint(a.date+a.concertId,b.date+b.concertId));
  if(!rows.length)throw Error('NOT_FOUND');
  const days=[];
  for(const row of rows){
   const stored=await repo.byKey('esmojo_integratiestatus',recordKey('esmojo_integratiestatus',advanceKey(row.concertId)));if(!stored)continue;
   const config=advanceConfig(stored);
   if(stored.esmojo_integratiecode!==advanceCode||stored.esmojo_scopecode!==digest(row.concertId)||!config||config.concertId!==row.concertId||config.date!==row.date||config.status!=='available'||!Array.isArray(config.entries)||typeof config.capturedAt!=='string')throw Error('TIMETABLE_UNCONFIRMED');
   days.push({date:row.date,capturedAt:config.capturedAt,entries:config.entries.map(entry=>({kind:entry.kind,label:entry.publishedLabel,time:entry.time,localDate:entry.localDate}))});
  }
  return{days,checkedAt:days.map(day=>day.capturedAt).sort().at(-1)||null};
 }
 async function savePhoto(payload){
  if(!sameKeys(payload,['artistId','photo'])||!/^a_[a-f0-9]{64}$/.test(payload.artistId))throw Error('VALIDATION');
  const key=recordKey('esmojo_integratiestatus','artist-photo-import/'+payload.artistId),previous=await repo.byKey('esmojo_integratiestatus',key);if(previous)return{saved:false};
  const data=await all(),artist=data.artists.find(row=>row.esmojo_bronartiestid===payload.artistId);if(!artist)throw Error('NOT_FOUND');if(artist.esmojo_fotobronurl)return{saved:false};
  const photo=payload.photo;if(photo!==null&&(!sameKeys(photo,['imageUrl','sourceUrl'])||!/^https:\/\/www\.mojo\.nl\/media\/[\w/.-]+\.(?:jpe?g|png|webp)(?:\?[^#\s]*)?$/i.test(photo.imageUrl)||!/^https:\/\/(?:www\.)?mojo\.nl\/(?:[a-z0-9-]+\/?|concerten\/[\w%/-]+)$/.test(photo.sourceUrl)))throw Error('VALIDATION');
  const marker=record('integratiestatus','artist-photo-import/'+payload.artistId,'Eenmalige artiestfoto',{integratiecode:'artist-photo-import-v1',scopecode:payload.artistId,configuratie_json:canonical({version:1,status:photo?'selected':'missing',capturedAt:now().toISOString(),sourceUrl:photo?.sourceUrl||null})});
  const operations=await recordOperations(repo,[marker]);if(photo){const meta=await repo.meta('esmojo_artiest');operations.push({table:'esmojo_artiest',id:artist[meta.PrimaryIdAttribute],method:'PATCH',etag:artist['@odata.etag'],payload:{esmojo_fotobronurl:photo.imageUrl}});}try{await repo.atomic(operations);}catch{/* Independent readback below decides whether the batch committed. */}
  const read=await repo.byKey('esmojo_integratiestatus',key),actual=await repo.byKey('esmojo_artiest',artist.esmojo_sleutel);if(!read||migrationDifferences(marker,read,marker.fields).length||photo&&actual?.esmojo_fotobronurl!==photo.imageUrl)throw Error('ARTIST_PHOTO_UNCONFIRMED');return{saved:!!photo};
 }
 const globals=new Set(['list','sync','dataverse-ensure','research-identities','home-dashboard','home-metadata','home-rebuild','home-photo-cache','biography-candidates','biography-save','biography-initial-list','biography-initial-save','biography-initial-batch','concert-catalogue','artist-photo-candidates','artist-photo-save','staff-planning-store','staff-planning-read','staff-planning-save','staff-planning-team','management-candidates','advance-timetable-candidates','advance-timetable-save','advance-timetable-read','native-timetable-read','native-timetable-save']);
 async function request(operation,payload={}){
  if(staff.handles(operation))return staff.handle(operation,payload);
  if(operation==='concert-catalogue')return createConcertCatalogue({env,repository:repo}).all();
  if(operation==='management-candidates'){if(Object.keys(payload).some(key=>key!=='after'))throw Error('VALIDATION');return{shows:await managementCandidates(payload.after)};}
  if(operation==='advance-timetable-candidates'){if(Object.keys(payload).some(key=>key!=='after'))throw Error('VALIDATION');return{shows:await advanceCandidates(payload.after)};}
  if(operation==='advance-timetable-save')return advanceSave(payload);
  if(operation==='advance-timetable-read')return advanceRead(payload.concertId);
  if(operation==='artist-photo-candidates'){if(Object.keys(payload).some(key=>key!=='after'))throw Error('VALIDATION');return{artists:await photoCandidates(payload.after)};}
  if(operation==='artist-photo-save')return savePhoto(payload);
  if(operation==='native-timetable-read')return{timetable:await readTimetable(payload.concertId)};
  if(operation==='native-timetable-save')return saveTimetable(payload);
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
  if(operation.startsWith('biography-'))throw Error('INTEGRATION_RETIRED');
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
