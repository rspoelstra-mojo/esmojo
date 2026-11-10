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
function esmojoIncidentAttendance_(show,historical,targets){
 const imported=historical.get(show.concertId);let sold=null;
 if(imported?.sourceType==='tsc-historical'){if(!esmojoTscShowDataValid_(imported.showData))throw Error('REPORT_CATALOG');const visitors=imported.showData.visitors;return{soldTickets:null,visitors,visitorUnits:visitors===null?null:visitors*40,visitorBasis:'tsc-attendance'};}
 if(imported&&validSaleCount(imported.ticket_sales))sold=Number(imported.ticket_sales);
 else if(show.seriesId){
  if(!targets.has(show.seriesId)){
   const target=esmojoResearchTarget_(show.concertId),tickets=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),field=JSON.parse(tickets.workflow_json).visitors.fields.ticket_sales;
   targets.set(show.seriesId,{content:field?.completed_at?field.content:null,shows:target.seriesShows});
  }
  const entry=targets.get(show.seriesId),rows=parseTicketSales(entry.content),selected=rows?.filter(row=>row.date===show.date);
  if(selected?.length){
   // Een voorstelling krijgt nooit automatisch het totaal van twee tijdsloten.
   if(!show.performance||selected.length===1)sold=selected.reduce((sum,row)=>sum+Number(row.count),0);
  }else if(validSaleCount(entry.content)&&entry.shows.length===1&&entry.shows[0].date===show.date)sold=Number(entry.content);
 }
 const historic=Boolean(imported&&show.date<'2026-11-01'),visitorUnits=sold===null?null:sold*(historic?40:39);
 if(visitorUnits!==null&&!Number.isSafeInteger(visitorUnits))throw Error('VALIDATION');
 return{soldTickets:sold,visitorUnits,visitors:visitorUnits===null?null:visitorUnits/40,visitorBasis:historic?'historical-attendance':'ticket-minus-2.5'};
}
function esmojoIncidentAnalysis_(show){
 if(!show||show.historical||!show.seriesId)return{};
 const target=esmojoResearchTarget_(show.concertId),marker=esmojoActiveMarker_(target).document;
 if(marker&&!marker.archived)return{activeConcertId:target.primary.concertId};
 const finalFile=esmojoShowFile_(target.folder,'analyseafronding.json');if(!finalFile)return{};
 const profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),target.primary.concertId),state=esmojoAnalysisFinalState_(target,profile),final=esmojoReadAnalysisFinal_(finalFile,target.primary.concertId),risks=esmojoShowProfileRisks_({operation:'risk-view',concertId:show.concertId},target);
 return{visitorsFinal:Boolean(state.categories.visitors.completedAt),artistFinal:Boolean(state.categories.artist.completedAt),visitorsRating:final.categories.visitors?.score||null,artistRating:final.categories.artist?.score||null,operationalLevels:operationalComplete({risks})?risks.risks.map(row=>risks.operational.assessments[row.id].riskLevel):null};
}
// Historische bestanden hebben al een canoniek, hashgebonden register. Voor een
// afzonderlijke telling is opnieuw doorlopen van alle 200+ CSV-bestanden overbodig.
function esmojoIncidentSource_(concertId,sourceId){
 if(typeof concertId!=='string'||!concertId||concertId.length>240||/[\x00-\x1f/\\]/.test(concertId)||sourceId!==undefined&&(typeof sourceId!=='string'||!/^[-\w]+$/.test(sourceId)))throw Error('VALIDATION');
 if(sourceId){
  const historical=esmojoHistoricalSources_().find(row=>row.show.key===concertId&&row.id===sourceId);
  if(historical){
   const context=esmojoOnTrackHash_(JSON.stringify(historical)),entry=esmojoWebIndex_(DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID)).document.entries[sourceId];
   if(entry?.state!=='valid'||entry.context!==context||entry.sourceHash!==historical.expectedHash)throw Error('SOURCE_CHANGED');
   historical.context=context;historical.entry=entry;
   const file=esmojoHistoricalSourceFile_(historical);
   if(file.getName()!==historical.name||file.getLastUpdated().toISOString()!==historical.modifiedAt)throw Error('SOURCE_CHANGED');
   return historical;
  }
 }
 const {inventory}=esmojoIncidentInventory_(),source=inventory.available.find(row=>row.show.key===concertId&&(!sourceId||row.id===sourceId));
 if(!source||inventory.sources.some(other=>other.show.key===concertId&&other.modifiedAt>source.modifiedAt))throw Error('REPORT_UNAVAILABLE');
 return source;
}
function esmojoIncidentCountsValid_(kpis){
 if(!kpis||Object.keys(kpis).sort().join()!=='medical,security')return false;
 return Object.entries({security:['total','verbal','physical','mischief','evictions','arrests'],medical:['total','treatments','selfcare','unwell','contusion','ambulance']}).every(([group,keys])=>kpis[group]&&Object.keys(kpis[group]).sort().join()===keys.sort().join()&&keys.every(key=>Number.isSafeInteger(kpis[group][key])&&kpis[group][key]>=0));
}
function esmojoIncidentMetrics_(request){
 if(String(request.operation).startsWith('incident-daily-'))return esmojoIncidentDaily_(request);
 const op=request.operation,allowed={'incident-read':['actor','artistIds','worker','operation'],'incident-source':['actor','concertId','sourceId','worker','operation'],'incident-counts':['actor','concertId','sourceId','sourceHash','kpis','worker','operation']}[op];
 if(!allowed||Object.keys(request).some(key=>!allowed.includes(key)))throw Error('VALIDATION');
 if(request.worker!==undefined&&request.worker!==true)throw Error('VALIDATION');
 if(request.worker===true){if(request.actor!==undefined||request.artistIds!==undefined)throw Error('VALIDATION');}else esmojoIncidentActor_(request.actor,op==='incident-read'&&!request.artistIds);
 if(request.artistIds!==undefined&&(!Array.isArray(request.artistIds)||!request.artistIds.length||request.artistIds.length>1000||!request.artistIds.every(validArtistId)))throw Error('VALIDATION');
 if(op!=='incident-read'){
  const source=esmojoIncidentSource_(request.concertId,request.sourceId);
  if(op==='incident-source'){
   const result=esmojoWebSource_(source);if(result.hash!==source.entry.sourceHash)throw Error('SOURCE_CHANGED');
   return{csvBase64:Utilities.base64Encode(result.bytes),sourceHash:result.hash,modifiedAt:source.modifiedAt,date:source.show.date,...(source.show.sourceType==='tsc-historical'?{sourceType:source.show.sourceType,showData:source.show.showData}:{})};
  }
  if(source.entry.sourceHash!==request.sourceHash)throw Error('SOURCE_CHANGED');
  if(source.show.sourceType==='tsc-historical'){if(!esmojoTscShowDataValid_(source.show.showData)||!request.kpis?.security)throw Error('VALIDATION');request.kpis.security.evictions=source.show.showData.evictions;request.kpis.security.arrests=source.show.showData.arrests;}
  if(!esmojoIncidentCountsValid_(request.kpis))throw Error('VALIDATION');
  const storage=esmojoIncidentRegister_(),document=storage.document,previous=document.counts[request.concertId];
  if(previous?.definitionVersion===1&&previous.sourceHash===request.sourceHash&&esmojoIncidentCountsValid_(previous.kpis))return{ok:true};
  document.counts[request.concertId]={definitionVersion:1,sourceHash:request.sourceHash,kpis:request.kpis};document.revision++;document.updatedAt=new Date().toISOString();esmojoIncidentSave_(storage);return{ok:true};
 }
 const storage=esmojoIncidentRegister_(),{inventory,catalogue,shows}=esmojoIncidentInventory_(),document=storage.document;
 const available=new Map(inventory.available.filter(source=>!inventory.sources.some(other=>other.show.key===source.show.key&&other.modifiedAt>source.modifiedAt)).map(source=>[source.show.key,source]));
 const ids=request.artistIds?new Set(request.artistIds):null,rows=[],jobs=[],jobSources={},historical=new Map(esmojoHistoricalRegister_().entries.map(row=>[row.concertId,row])),targets=new Map();
 for(const show of [...shows.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.concertId.localeCompare(b.concertId))){
  const source=available.get(show.concertId),hasSource=inventory.sources.some(row=>row.show.key===show.concertId),cache=document.counts[show.concertId];
  const kpis=source&&cache?.definitionVersion===1&&cache.sourceHash===source.entry.sourceHash&&esmojoIncidentCountsValid_(cache.kpis)?cache.kpis:null;
  const canonical=catalogue.get(show.concertId)||show,attendance=esmojoIncidentAttendance_(canonical,historical,targets);
  const tsc=historical.get(show.concertId);if(kpis&&tsc?.sourceType==='tsc-historical'){kpis.security.evictions=tsc.showData.evictions;kpis.security.arrests=tsc.showData.arrests;}
  const row=Object.assign({},show,attendance,{securityComplete:hasSource&&(tsc?.sourceType!=='tsc-historical'||tsc.showData.evictions!==null&&tsc.showData.arrests!==null),medicalComplete:hasSource,kpis,hasSource,sourceReady:Boolean(source)});
  const suitable=row.visitors>0&&row.securityComplete&&row.medicalComplete;
  if(suitable&&source&&!kpis){jobs.push(show.concertId);jobSources[show.concertId]=source.id;}
  if(ids&&suitable&&kpis&&ids.has('a_'+esmojoOnTrackHash_(normalizeArtistName(show.name))))Object.assign(row,esmojoIncidentAnalysis_(catalogue.get(show.concertId)));
  rows.push(row);
 }
 return{policyVersion:2,workerVersion:2,rows,jobs,jobSources,updatedAt:document.updatedAt};
}
