// Vertrouwelijk; uitsluitend signed serverbrug en actuele actorcontrole.
function esmojoIncidentActor_(actor,admin){
 if(typeof actor!=='string'||!actor||actor.length>100)throw Error('VALIDATION');
 const rows=esmojoOnTrackProfiles_().filter(row=>row.id===actor&&row.activated&&!row.disabled);
 if(rows.length!==1||!(admin?isAdministrator(rows[0]):isAdministrator(rows[0])||hasModule(rows[0],'artists')))throw Error('FORBIDDEN');
}
function esmojoIncidentRegister_(){
 const folder=DriveApp.getFolderById(ESMOJO_FOLDER_ID),file=esmojoShowFile_(folder,'_esmojo_incident_metrics_v1.json');
 const document=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/IncidentMetrics-v1',classification:'vertrouwelijk',version:1,revision:0,updatedAt:null,confirmations:{},counts:{}};
 if(document.managedBy!=='ESMOJO/IncidentMetrics-v1'||document.classification!=='vertrouwelijk'||document.version!==1||!Number.isSafeInteger(document.revision)||document.revision<0||!document.confirmations||Array.isArray(document.confirmations)||!document.counts||Array.isArray(document.counts))throw Error('CONFLICT');
 return{folder,file,document};
}
function esmojoIncidentSave_(storage){
 const text=JSON.stringify(storage.document);if(text.length>6000000)throw Error('VALIDATION');
 const saved=storage.file?(storage.file.setContent(text),storage.file):storage.folder.createFile(Utilities.newBlob(text,'application/json','_esmojo_incident_metrics_v1.json'));
 if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('VERIFY');
}
function esmojoIncidentInventory_(){
 const catalogue=esmojoTimetableCatalogue_({allVenues:true,includeSeries:true}),inventory=esmojoWebInventory_(DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),catalogue),today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd'),shows=new Map();
 for(const show of catalogue.values())if(show.date<today)shows.set(show.concertId,{concertId:show.concertId,name:show.artist,date:show.date,venue:show.venue,...(show.performance?{performance:show.performance}:{})});
 for(const source of inventory.sources)if(source.show.date<today)shows.set(source.show.key,{concertId:source.show.key,name:source.show.name,date:source.show.date,venue:source.show.venue,...(source.show.performance?{performance:source.show.performance}:{})});
 return{catalogue,inventory,shows};
}
function esmojoIncidentAnalysis_(show){
 if(!show||show.historical||!show.seriesId)return{};
 const target=esmojoResearchTarget_(show.concertId),marker=esmojoActiveMarker_(target).document;
 if(marker&&!marker.archived)return{activeConcertId:target.primary.concertId};
 const finalFile=esmojoShowFile_(target.folder,'analyseafronding.json');if(!finalFile)return{};
 const profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId),state=esmojoAnalysisFinalState_(target,profile),final=esmojoReadAnalysisFinal_(finalFile,target.primary.concertId),risks=esmojoShowProfileRisks_({operation:'risk-view',concertId:show.concertId},target);
 return{visitorsFinal:Boolean(state.categories.visitors.completedAt),artistFinal:Boolean(state.categories.artist.completedAt),visitorsRating:final.categories.visitors?.score||null,artistRating:final.categories.artist?.score||null,operationalLevels:operationalComplete({risks})?risks.risks.map(row=>risks.operational.assessments[row.id].riskLevel):null};
}
function esmojoIncidentMetrics_(request){
 const op=request.operation,allowed={'incident-read':['actor','artistIds','operation'],'incident-confirm':['actor','concertId','revision','visitors','securityComplete','medicalComplete','zeroIncidents','operation'],'incident-source':['actor','concertId','operation'],'incident-counts':['actor','concertId','sourceHash','kpis','operation']}[op];
 if(!allowed||Object.keys(request).some(key=>!allowed.includes(key)))throw Error('VALIDATION');
 esmojoIncidentActor_(request.actor,op==='incident-confirm'||op==='incident-read'&&!request.artistIds);
 if(request.artistIds!==undefined&&(!Array.isArray(request.artistIds)||!request.artistIds.length||request.artistIds.length>1000||!request.artistIds.every(validArtistId)))throw Error('VALIDATION');
 const storage=esmojoIncidentRegister_(),{inventory,catalogue,shows}=esmojoIncidentInventory_(),document=storage.document;
 const available=new Map(inventory.available.filter(source=>!inventory.sources.some(other=>other.show.key===source.show.key&&other.modifiedAt>source.modifiedAt)).map(source=>[source.show.key,source]));
 if(op==='incident-read'){
  const ids=request.artistIds?new Set(request.artistIds):null,rows=[],jobs=[];
  for(const show of [...shows.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId))){
   const saved=document.confirmations[show.concertId],source=available.get(show.concertId),hasSource=inventory.sources.some(row=>row.show.key===show.concertId),cache=document.counts[show.concertId];
   const kpis=source&&cache?.definitionVersion===1&&cache.sourceHash===source.entry.sourceHash?cache.kpis:!hasSource&&saved?.zeroIncidents?{security:{total:0,verbal:0,physical:0,mischief:0,evictions:0,arrests:0},medical:{total:0,treatments:0,selfcare:0,unwell:0,contusion:0,ambulance:0}}:null;
   const row=Object.assign({},show,{revision:saved?.revision||0,visitors:saved?.visitors??null,securityComplete:saved?.securityComplete===true,medicalComplete:saved?.medicalComplete===true,zeroIncidents:saved?.zeroIncidents===true,kpis,hasSource,sourceReady:Boolean(source),updatedAt:saved?.updatedAt||null});
   const suitable=row.visitors>0&&row.securityComplete&&row.medicalComplete;
   if(suitable&&source&&!kpis)jobs.push(show.concertId);
   if(ids&&suitable&&kpis&&ids.has('a_'+esmojoOnTrackHash_(normalizeArtistName(show.name))))Object.assign(row,esmojoIncidentAnalysis_(catalogue.get(show.concertId)));
   rows.push(row);
  }
  return{rows,jobs,updatedAt:document.updatedAt};
 }
 if(typeof request.concertId!=='string'||!shows.has(request.concertId))throw Error('NOT_FOUND');
 const source=available.get(request.concertId);
 if(op==='incident-source'){
  if(!source)throw Error('REPORT_UNAVAILABLE');
  const result=esmojoWebSource_(source);if(result.hash!==source.entry.sourceHash)throw Error('SOURCE_CHANGED');
  return{csvBase64:Utilities.base64Encode(result.bytes),sourceHash:result.hash,modifiedAt:source.modifiedAt,date:source.show.date};
 }
 if(op==='incident-counts'){
  if(!source||source.entry.sourceHash!==request.sourceHash)throw Error('SOURCE_CHANGED');
  for(const [group,keys]of Object.entries({security:['total','verbal','physical','mischief','evictions','arrests'],medical:['total','treatments','selfcare','unwell','contusion','ambulance']}))if(!request.kpis||!request.kpis[group]||Object.keys(request.kpis[group]).sort().join()!==keys.sort().join()||keys.some(key=>!Number.isSafeInteger(request.kpis[group][key])||request.kpis[group][key]<0))throw Error('VALIDATION');
  if(Object.keys(request.kpis).sort().join()!=='medical,security')throw Error('VALIDATION');
  // De server heeft de bron geverifieerd en dezelfde webrapportagerekenlaag gebruikt.
  const previous=document.counts[request.concertId];if(previous?.definitionVersion===1&&previous.sourceHash===request.sourceHash)return{ok:true};
  document.counts[request.concertId]={definitionVersion:1,sourceHash:request.sourceHash,kpis:request.kpis};
 }else{
  if(!Number.isSafeInteger(request.revision)||request.revision<0||request.visitors!==null&&(!Number.isSafeInteger(request.visitors)||request.visitors<0||request.visitors>10000000)||['securityComplete','medicalComplete','zeroIncidents'].some(key=>typeof request[key]!=='boolean')||request.zeroIncidents&&inventory.sources.some(row=>row.show.key===request.concertId))throw Error('VALIDATION');
  const previous=document.confirmations[request.concertId],current=previous?.revision||0;
  const fields={visitors:request.visitors,securityComplete:request.securityComplete,medicalComplete:request.medicalComplete,zeroIncidents:request.zeroIncidents};
  if(current!==request.revision){if(current===request.revision+1&&Object.keys(fields).every(key=>previous[key]===fields[key]))return{ok:true,revision:current};throw Error('CONFLICT');}
  document.confirmations[request.concertId]={...fields,revision:current+1,updatedAt:new Date().toISOString(),updatedBy:request.actor};
 }
 document.revision++;document.updatedAt=new Date().toISOString();esmojoIncidentSave_(storage);return{ok:true};
}
