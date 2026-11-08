// Alleen namen/IDs: geen rapportinhoud, bronbestandsnamen, Drive-IDs of accountrelaties.
function esmojoArtistCatalogue_(request){
 if(Object.keys(request).sort().join(',')!=='actor,operation'||request.operation!=='artist-catalogue'||typeof request.actor!=='string'||!request.actor||request.actor.length>100)throw Error('VALIDATION');
 esmojoArtistActor_(request.actor);
 const cache=CacheService.getScriptCache(),cached=cache.get('artist-catalogue-v2');
 if(cached){try{return{artists:cleanArtistMenu(JSON.parse(cached)),profileSupported:true};}catch{/* Een ongeldige cache mag de catalogus niet blokkeren. */}}
 const catalogue=esmojoTimetableCatalogue_({allVenues:true}),names=[...catalogue.values()].flatMap(show=>[show.artist,...(show.identityArtist?[show.identityArtist]:[])]);
 const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),inventory=esmojoWebInventory_(folder,catalogue,names);
 names.push(...inventory.sources.map(source=>source.show.name));
 const artists=buildArtistCatalogue(names,esmojoOnTrackHash_),body=JSON.stringify(artists);
 if(Utilities.newBlob(body).getBytes().length<90000)cache.put('artist-catalogue-v2',body,30);
 return{artists,profileSupported:true};
}

function esmojoArtistActor_(actor){
 if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');
 if(esmojoOnTrackProfiles_().filter(profile=>profile.id===actor&&profile.activated&&!profile.disabled&&hasModule(profile,'artists')).length!==1)throw Error('FORBIDDEN');
}

function esmojoArtistProfile_(request){
 if(Object.keys(request).sort().join(',')!=='actor,artistIds,operation'||!Array.isArray(request.artistIds)||!request.artistIds.length||request.artistIds.length>1000||!request.artistIds.every(validArtistId))throw Error('VALIDATION');
 esmojoArtistActor_(request.actor);
 const ids=new Set(request.artistIds),matches=name=>ids.has('a_'+esmojoOnTrackHash_(normalizeArtistName(name)));
 const catalogue=esmojoTimetableCatalogue_({allVenues:true,includeSeries:true});
 const registeredShows=[];
 const inventory=esmojoWebInventory_(DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),catalogue,null,registeredShows);
 const today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd');
 const groups=new Map(),knownDates=new Set(),photos=new Map();
 const identity=(venue,date)=>venue.normalize('NFKC').toLowerCase()+'|'+date;
 const add=(key,venue,date,performance)=>{
  if(!groups.has(key))groups.set(key,{venue,dates:new Set()});
  groups.get(key).dates.add(date);if(performance){const group=groups.get(key);if(!group.performances)group.performances=[];if(!group.performances.some(row=>row.date===date&&row.performance===performance))group.performances.push({date,performance});}
 };
 const shows=[...catalogue.values()].filter(show=>matches(show.artist)).sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId));
 const production=DriveApp.getFolderById(ESMOJO_FOLDER_ID).getFoldersByName('Productie');
 if(production.hasNext()){
  const folder=production.next();
  for(const photo of Object.values(esmojoHomePhotosRead_(folder).data.photos))photos.set(photo.sourceUrl,photo.imageUrl);
 }
 let recent=null;
 for(const show of shows){
  if(show.date<=today&&!recent)recent=show;
  knownDates.add(identity(show.venue,show.date));
  add(show.seriesId||show.historicalSeriesId||show.concertId,show.venue,show.date,show.performance);
 }
 for(const show of registeredShows){
  if(!matches(show.name)||typeof show.venue!=='string'||!Array.isArray(show.dates))continue;
  const dates=show.dates.filter(validTimetableDate).sort();
  if(!dates.length)continue;
  const seriesKey='report:'+identity(show.venue,dates[0]);
  for(const date of dates){
   const key=identity(show.venue,date);
   if(!knownDates.has(key)){add(seriesKey,show.venue,date);knownDates.add(key);}
   if(date<=today&&(!recent||date>recent.date))recent={date};
  }
 }
 for(const {show,entry} of inventory.sources){
  if(!matches(show.name)||show.date>today)continue;
  const key=identity(show.venue,show.date);
  if(!knownDates.has(key)){add('report:'+key,show.venue,show.date);knownDates.add(key);}
  if(!recent||show.date>recent.date)recent={date:show.date};
  const photo=entry?.mojo?.photo;
  if(photo&&esmojoHomeValidPhoto_(photo))photos.set(photo.sourceUrl,photo.imageUrl);
 }
 const concerts=[...groups.values()].map(group=>({venue:group.venue,dates:[...group.dates].sort(),...(group.performances?{performances:group.performances}:{})}))
  .sort((a,b)=>b.dates.at(-1).localeCompare(a.dates.at(-1))||a.venue.localeCompare(b.venue));
 const photo=shows.map(show=>photos.get(show.sourceUrl)).find(Boolean)
  ||inventory.sources.find(source=>matches(source.show.name)&&esmojoHomeValidPhoto_(source.entry?.mojo?.photo))?.entry.mojo.photo.imageUrl||null;
 const target=recent?.seriesId?esmojoResearchTarget_(recent.concertId):null;
 return {concerts,photo,biography:esmojoArtistBiography_(request.artistIds),latestDate:recent?.date||null,profileConcertId:target?.primary.concertId||null,audience:target?esmojoArtistAudience_(target):{}};
}

function esmojoArtistAudience_(target){
 const analyses=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId).analyses;
 const audience={};
 for(let number=1;number<=4;number++){
  const saved=analyses[number];
  const file=esmojoShowFile_(target.folder,esmojoResearchName_(number));
  const answer=file?esmojoReadResearch_(file,target.primary.concertId,number).answer:null;
  const summary=saved?.status==='completed'?saved.summary:null;
  audience[number]={summary,answer:typeof answer==='string'?answer:null,
   storedAt:summary?saved.updatedAt:answer&&file?file.getDateCreated().toISOString():null};
 }
 return audience;
}

// Alleen de gekozen historische show van deze artiest. CSV blijft serverzijdig;
// Node projecteert uitsluitend totalen en het opgeslagen tijdschema naar de UI.
function esmojoArtistShow_(request){
 if(Object.keys(request).sort().join(',')!==(request.performance===undefined?'actor,artistIds,date,operation,venue':'actor,artistIds,date,operation,performance,venue')||request.performance!==undefined&&!['middag','avond'].includes(request.performance)||!Array.isArray(request.artistIds)||!request.artistIds.length||request.artistIds.length>1000||!request.artistIds.every(validArtistId)||!validTimetableDate(request.date)||typeof request.venue!=='string'||!request.venue||request.venue.length>200)throw Error('VALIDATION');
 esmojoArtistActor_(request.actor);
 if(request.date>=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd'))throw Error('VALIDATION');
 const ids=new Set(request.artistIds),matches=name=>typeof name==='string'&&ids.has('a_'+esmojoOnTrackHash_(normalizeArtistName(name)));
 const catalogue=esmojoTimetableCatalogue_({allVenues:true,includeSeries:true}),registered=[];
 const inventory=esmojoWebInventory_(DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),catalogue,null,registered);
 const sources=inventory.available.filter(source=>matches(source.show.name)&&source.show.date===request.date&&source.show.venue===request.venue&&(!request.performance||source.show.performance===request.performance));
 if(sources.length>1)throw Error('REPORT_CONFLICT');
 const canonical=[...catalogue.values()].find(show=>matches(show.artist)&&show.date===request.date&&show.venue===request.venue&&(!request.performance||show.performance===request.performance));
 const historical=registered.find(show=>matches(show.name)&&show.venue===request.venue&&Array.isArray(show.dates)&&show.dates.includes(request.date));
 if(!sources.length&&!canonical&&!historical)throw Error('NOT_FOUND');
 const source=sources[0],show={name:source?source.show.name:canonical?canonical.artist:historical.name,venue:request.venue,date:request.date,...(request.performance?{performance:request.performance}:{})};
 let timetable=null;
 const preparation=canonical?.historical?esmojoHistoricalPreparation_(canonical):canonical?.seriesId?esmojoArtistPreparation_(canonical):null;
 if(source){const report=esmojoWebReports_({operation:'web-read',actor:request.actor,concertId:source.show.key},inventory);return{show,report,preparation};}
 if(canonical){try{timetable=esmojoWebTimetable_({key:canonical.concertId,date:canonical.date,venue:canonical.venue});}catch{/* Geen tijden verzinnen. */}}
 return{show,report:null,timetable,preparation};
}

function esmojoArtistPreparation_(show){
 const target=esmojoResearchTarget_(show.concertId);
 if(target.selected.date!==show.date||target.selected.venue!==show.venue||target.primary.concertId!==show.seriesId)throw Error('CONFLICT');
 const profile=esmojoShowFile_(target.folder,'showprofiel.json'),storage=esmojoReadProductionRisks_(target),document=storage.document;
 const tickets=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),fields=JSON.parse(tickets.workflow_json).visitors.fields;
 const riskView=esmojoShowProfileRisks_({operation:'risk-view',concertId:show.concertId},target);
 return{concertId:target.primary.concertId,hasProfile:Boolean(profile||storage.file),
  contacts:{productionManager:null,eventSafetyManager:esmojoOnTrackManager_({key:show.concertId},esmojoOnTrackProfiles_()),tscProjectLead:null},
  tickets:{sales:fields.ticket_sales?.completed_at?fields.ticket_sales.content:null,origins:fields.visitor_origins?.completed_at?fields.visitor_origins.content:null,shows:target.seriesShows},
  production:{entrance:null,barrierType:document.barrier?.barrierType||null,floor:document.floorPressure||null,choices:document.choices},risks:riskView};
}
