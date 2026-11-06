// Server-HMAC only. Geen publieke route, vrije bestandsnaam of Supabase-sleutel.
// Ticket-/vloerinhoud en bestanden worden nooit geëxporteerd naar de database.
function esmojoActiveSafeProduction_(document){
 const keys=['managedBy','classification','concertId','revision','choices','barrier','barrierUploads','operationalReviews','measureImplementations','measureUploads'];
 const clean={};for(const key of keys)if(document[key]!==undefined)clean[key]=document[key];
 clean.history=(document.history||[]).filter(row=>row.field!=='floor_pressure'&&!(row.field==='measure_text'&&row.measureId==='production:floor_pressure'));
 return JSON.parse(JSON.stringify(clean));
}
function esmojoActiveSnapshot_(target,loaded){
 const id=target.primary.concertId,profile=esmojoReadShowProfile_(esmojoShowFile_(target.folder,'showprofiel.json'),id),final=esmojoReadAnalysisFinal_(esmojoShowFile_(target.folder,'analyseafronding.json'),id),production=esmojoReadProductionRisks_(target).document;
 const status=loaded?.profile?.finalization||esmojoAnalysisFinalState_(target,profile),view=loaded?.risks||esmojoShowProfileRisks_({operation:'risk-view',concertId:id},target),dates=target.seriesDates;
 const snapshot={version:1,concertId:id,aliases:dates.map(date=>esmojoConcertId_(target.primary.artist,date)),dates,venue:target.primary.venue,profile,final,production:esmojoActiveSafeProduction_(production),floor:esmojoFloorSummary_(production),ticketBasis:{ready:status.ticketsReady,versions:['ticket_sales','visitor_origins','domestic_origins'].map(key=>status.basis.ticketVersions[key])},risk:{state:view.state,risks:view.risks,...(view.operational?.source?{source:view.operational.source}:{})},riskBasis:null,completion:{profile:false,production:false,operational:false,measures:false}};
 snapshot.riskBasis=preparationBasis(snapshot);const basis={risks:view};snapshot.completion={profile:Boolean(status.categories.visitors.completedAt&&status.categories.artist.completedAt&&view.state!=='not-ready'),production:productionComplete({venue:target.primary.venue},basis),operational:operationalComplete(basis),measures:showMeasures({venue:target.primary.venue},basis).complete};validateActiveSnapshot(snapshot);return snapshot;
}
function esmojoActiveMarker_(target){const file=esmojoShowFile_(target.folder,'_esmojo_active_storage_v1.json'),document=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):null;if(document&&(document.managedBy!=='ESMOJO/ActiveStorage-v1'||document.version!==1||document.classification!=='vertrouwelijk'))throw Error('CONFLICT');return{file,document};}
function esmojoActiveWriteJson_(target,name,document){
 const body=JSON.stringify(document,null,2),file=esmojoShowFile_(target.folder,name);if(file&&JSON.parse(file.getBlob().getDataAsString('UTF-8')).managedBy!==document.managedBy)throw Error('CONFLICT');const saved=file?(file.setContent(body),file):target.folder.createFile(Utilities.newBlob(body,'application/json',name));
 if(saved.getBlob().getDataAsString('UTF-8')!==body)throw Error('VERIFY');
}
function esmojoActiveApply_(target,snapshot){
 validateActiveSnapshot(snapshot);if(snapshot.concertId!==target.primary.concertId||snapshot.venue!==target.primary.venue||snapshot.dates.some(date=>!target.seriesDates.includes(date)))throw Error('CONFLICT');
 const storage=esmojoReadProductionRisks_(target),old=storage.document,document=JSON.parse(JSON.stringify(snapshot.production));
 // Alleen de vloerbron en haar historie blijven in Drive. Geen terugkopie naar DB.
 document.floorPressure=old.floorPressure||null;
 const floorHistory=(old.history||[]).filter(row=>row.field==='floor_pressure'||row.field==='measure_text'&&row.measureId==='production:floor_pressure');
 document.history=document.history.concat(floorHistory).sort((a,b)=>(a.at||'').localeCompare(b.at||''));
 esmojoSyncFloor_(document,document.barrier||emptyBarrier(),document.barrier?.completedBy||'active-storage');
 esmojoActiveWriteJson_(target,'showprofiel.json',snapshot.profile);
 esmojoActiveWriteJson_(target,'analyseafronding.json',snapshot.final);
 esmojoActiveWriteJson_(target,'productionele-risicos.json',document);
}
// Alleen een tijdelijke lees-overlay: geen oude DB-snapshot terugschrijven bij
// status/PDF/leesverzoeken terwijl een andere gebruiker verderwerkt.
function esmojoActiveVirtual_(target,snapshot,request){
 validateActiveSnapshot(snapshot);
 const rawLookup=esmojoShowFile_,old=esmojoReadProductionRisks_(target).document,production=JSON.parse(JSON.stringify(snapshot.production));
 production.floorPressure=old.floorPressure||null;
 esmojoSyncFloor_(production,production.barrier||emptyBarrier(),production.barrier?.completedBy||'active-storage');
 const docs={'showprofiel.json':snapshot.profile,'analyseafronding.json':snapshot.final,'productionele-risicos.json':production},files={};
 for(const name of Object.keys(docs)){
  let text=JSON.stringify(docs[name]);files[name]={getBlob:()=>({getDataAsString:()=>text}),setContent:value=>{text=value;}};
 }
 esmojoShowFile_=function(folder,name){return folder.getId()===target.folder.getId()&&files[name]?files[name]:rawLookup(folder,name);};
 try{
  let result=null,errorCode=null;
  try{result=esmojoActiveExecute_(request,target);}catch(error){errorCode=error.message;}
  return{verified:true,snapshot:esmojoActiveSnapshot_(target,request.operation==='show-open'&&!errorCode?result:null),result,errorCode};
 }finally{esmojoShowFile_=rawLookup;}
}
function esmojoActiveExecute_(request,target){
 const op=request.operation;
 if(op==='show-open')return esmojoOpenShow_(request,target);
 if(op==='profile-read'||op==='profile-save')return esmojoShowProfile_(request,target);
 if(op.startsWith('final-'))return esmojoAnalysisFinal_(request);
 if(op.startsWith('ticket-'))return esmojoTicketData_(request,target);
 if(op.startsWith('barrier-'))return esmojoBarrierLayout_(request,target);
 if(op.startsWith('floor-'))return esmojoFloorPressure_(request,target);
 if(op.startsWith('measure-'))return esmojoMeasureImplementation_(request);
 if(op.startsWith('risk-'))return esmojoShowProfileRisks_(request,target);
 if(op.startsWith('report-'))return esmojoShowProfilePdf_(request,target);
 throw Error('VALIDATION');
}
function esmojoActiveFinish_(target,header,result,errorCode){
 const receipt=header.mode==='archive'?{archived:true,verified:true}:{snapshot:esmojoActiveSnapshot_(target),result,errorCode,verified:true};
 esmojoActiveWriteJson_(target,'_esmojo_active_storage_v1.json',{managedBy:'ESMOJO/ActiveStorage-v1',classification:'vertrouwelijk',version:1,revision:header.revision,command:header.command,mode:header.mode,archived:header.mode==='archive',at:new Date().toISOString(),...(header.mode==='run'?{receipt}:{})});
 if(typeof esmojoHomeRefresh_==='function')try{esmojoHomeRefresh_(target.primary.concertId);}catch{/* Inhoud is bevestigd; openbare projectie kan apart worden hersteld. */}
 return receipt;
}
function esmojoActiveAttempt_(request,target){
 try{return{result:esmojoActiveExecute_(request,target),errorCode:null};}
 catch(error){return{result:null,errorCode:['VALIDATION','FORBIDDEN','CONFLICT','PROFILE_CONFLICT','FINAL_CONFLICT','FINAL_NOT_READY','REPORT_NOT_READY','REPORT_CONFLICT','SOURCE_CHANGED','ASSESSMENT_CONFLICT','ASSESSMENT_COMPLETED','TICKET_CONFLICT','ATTACHMENT_INVALID'].includes(error.message)?error.message:'SHOWS_UNAVAILABLE'};}
}
function esmojoActiveLegacyWriteAllowed_(concertId){
 const target=esmojoResearchTarget_(concertId),marker=esmojoActiveMarker_(target).document;
 if(marker&&!marker.archived)throw Error('STORAGE_ACTIVE');
}
function esmojoActiveStorageUncached_(request){
 const {operation,concertId,...rest}=request;assessmentConcert(concertId);
 const target=esmojoResearchTarget_(concertId);if(target.primary.venue!=='Gashouder')throw Error('VALIDATION');
 const marker=esmojoActiveMarker_(target);
 if(operation==='active-open'){
  assessmentKeys(rest,['actor']);
  const bundle=esmojoOpenShow_({operation:'show-open',concertId,actor:rest.actor},target);
  const last=[...target.seriesDates].sort().pop(),threshold=new Date(Date.parse(last+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
  if(marker.document?.archived||Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd')>=threshold)return{archived:true,bundle};
  const snapshot=esmojoActiveSnapshot_(target,bundle);
  if(!marker.document)esmojoActiveWriteJson_(target,'_esmojo_active_storage_v1.json',{managedBy:'ESMOJO/ActiveStorage-v1',classification:'vertrouwelijk',version:1,revision:-1,command:'0'.repeat(64),mode:'seed',archived:false,at:new Date().toISOString()});
  return{archived:false,snapshot,bundle};
 }
 if(operation==='active-recover'){
  assessmentKeys(rest,['command','leaseUntil','snapshot']);validateActiveSnapshot(rest.snapshot);
  if(!/^[a-f0-9]{64}$/.test(rest.command||'')||Date.parse(rest.leaseUntil)-Date.now()<7*60000)throw Error('STORAGE_BUSY');
  if(marker.document?.archived)return{archived:true,verified:true};
  if(marker.document?.command===rest.command){
   if(marker.document.receipt)return{verified:true,snapshot:marker.document.receipt.snapshot};
   if(marker.document.pending&&['run','archive'].includes(marker.document.mode)){
    const journal=marker.document,digest=esmojoPdfHash_(JSON.stringify({mode:journal.mode,id:target.primary.concertId,revision:journal.revision,snapshot:journal.snapshot,request:journal.request}));
    if(digest!==rest.command)throw Error('CONFLICT');
    if(journal.stage==='executing'&&journal.mode==='run'){
     // De volledige baseline is al geverifieerd. Laat de domeinactie haar
     // idempotentie op de werkelijke stand controleren; niets terugdraaien.
     const attempt=esmojoActiveAttempt_(journal.request,target),receipt=esmojoActiveFinish_(target,journal,attempt.result,attempt.errorCode);
     return{verified:true,snapshot:receipt.snapshot};
    }
    const resumed=esmojoActiveStorage_({operation:'active-bridge',concertId,snapshot:marker.document.snapshot,revision:marker.document.revision,leaseUntil:rest.leaseUntil,mode:marker.document.mode,command:rest.command,request:marker.document.request});
    return resumed.archived?resumed:{verified:true,snapshot:resumed.snapshot};
   }
  }
  // Zonder ons vooraf geverifieerde journal is de actie nooit gestart. Gebruik
  // de primaire DB-stand, nooit een mogelijk half bijgewerkte Drive-kopie.
  if(marker.document?.pending&&marker.document.mode==='run')throw Error('STORAGE_BUSY');
  return{verified:true,snapshot:rest.snapshot};
 }
 if(operation==='active-export'){
  if(Object.keys(rest).some(key=>key!=='activate')||rest.activate!==undefined&&typeof rest.activate!=='boolean')throw Error('VALIDATION');
  const last=[...target.seriesDates].sort().pop(),threshold=new Date(Date.parse(last+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
  if(marker.document?.archived||Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd')>=threshold)return{archived:true,supportsActivation:true};
  const snapshot=esmojoActiveSnapshot_(target);
  // Dezelfde UserLock omvat export én eigenaarschap. Een oudere onderweg zijnde
  // legacy-write kan daardoor na deze export niet alsnog Drive-only schrijven.
  if(rest.activate&&!marker.document)esmojoActiveWriteJson_(target,'_esmojo_active_storage_v1.json',{managedBy:'ESMOJO/ActiveStorage-v1',classification:'vertrouwelijk',version:1,revision:-1,command:'0'.repeat(64),mode:'seed',archived:false,at:new Date().toISOString()});
  return{archived:false,supportsActivation:true,snapshot};
 }
 assessmentKeys(rest,['snapshot','revision','leaseUntil','mode','command','request']);
 if(!['sync','run','archive','virtual'].includes(rest.mode)||!Number.isSafeInteger(rest.revision)||rest.revision<0||!/^[a-f0-9]{64}$/.test(rest.command||''))throw Error('VALIDATION');
 // Een vertraagd oud verzoek mag nooit na het aflopen van zijn lease schrijven.
 // Ruimte voor de volledige maximale Apps Script-uitvoering vóór lease-einde.
 if(!Number.isFinite(Date.parse(rest.leaseUntil))||Date.parse(rest.leaseUntil)-Date.now()<7*60000)throw Error('STORAGE_BUSY');
 if(marker.document?.archived){if(rest.mode==='archive'&&marker.document.command===rest.command)return{archived:true,verified:true};throw Error('STORAGE_ARCHIVED');}
 if(rest.mode==='virtual'){if(!rest.request||!rest.snapshot.aliases.includes(rest.request.concertId)||!['risk-view','show-open','profile-read','ticket-read','ticket-reserve','ticket-renew','ticket-release','barrier-download','measure-download'].includes(rest.request.operation)&&!rest.request.operation?.startsWith('report-'))throw Error('VALIDATION');return esmojoActiveVirtual_(target,rest.snapshot,rest.request);}
 if(marker.document?.revision>rest.revision)throw Error('CONFLICT');
 if(marker.document?.command===rest.command&&marker.document.receipt)return marker.document.receipt;
 // Een oudere mirror van dezelfde DB-revisie mag de nog niet bevestigde
 // Drive-only mutatie en haar herstelbewijs nooit terugdraaien.
 if(rest.mode==='sync'&&marker.document?.revision===rest.revision&&marker.document.mode==='run')return{verified:true};
 if(marker.document?.pending&&marker.document.command!==rest.command&&['run','archive'].includes(marker.document.mode))throw Error('STORAGE_BUSY');
 if(rest.mode==='archive'){
  const last=[...target.seriesDates].sort().pop(),threshold=new Date(Date.parse(last+'T00:00:00Z')+2*86400000).toISOString().slice(0,10);
  if(Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd')<threshold){esmojoActiveApply_(target,rest.snapshot);return{verified:true,deferred:true,snapshot:esmojoActiveSnapshot_(target)};}
 }
 // Schrijf vóór iedere echte overdracht een herstelbaar journal in Drive.
 // Ook een upload-/ticketrequest blijft hierdoor uitsluitend in Drive, niet DB.
 const journal={managedBy:'ESMOJO/ActiveStorage-v1',classification:'vertrouwelijk',version:1,revision:rest.revision,command:rest.command,mode:rest.mode,pending:true,archived:false,at:new Date().toISOString(),snapshot:rest.snapshot,request:rest.request};
 if(['run','archive'].includes(rest.mode))esmojoActiveWriteJson_(target,'_esmojo_active_storage_v1.json',{...journal,stage:'prepared'});
 esmojoActiveApply_(target,rest.snapshot);
 if(['run','archive'].includes(rest.mode))esmojoActiveWriteJson_(target,'_esmojo_active_storage_v1.json',{...journal,stage:'executing'});
 let result=null,errorCode=null;
 if(rest.mode==='run'){
  if(!rest.request||rest.request.concertId!==concertId||rest.request.operation?.startsWith('active-'))throw Error('VALIDATION');
  const attempt=esmojoActiveAttempt_(rest.request,target);result=attempt.result;errorCode=attempt.errorCode;
 }
 return esmojoActiveFinish_(target,rest,result,errorCode);
}

// Deze cache leeft uitsluitend binnen één signed leesaanvraag. Geen CacheService,
// browseropslag of vertrouwen in oude bestandsinhoud na een write.
function esmojoWithShowReadCache_(run){
 const lookup=esmojoShowFile_,files=new Map();
 esmojoShowFile_=function(folder,name){
  const key=folder.getId()+'|'+name;if(files.has(key))return files.get(key);
  const file=lookup(folder,name);if(!file)return null;let blob=null;
  const cached={getBlob:()=>blob||(blob=file.getBlob()),setContent:value=>{blob=null;return file.setContent(value);}};
  for(const method of ['getId','getName','getMimeType','getDescription','getParents','isTrashed','getLastUpdated','setDescription','setTrashed','moveTo'])cached[method]=(...args)=>file[method](...args);
  files.set(key,cached);return cached;
 };
 try{return run();}finally{esmojoShowFile_=lookup;files.clear();}
}
function esmojoActiveStorage_(request){
 const reading=['active-open','active-export'].includes(request.operation)||request.operation==='active-bridge'&&request.mode==='virtual'&&request.request?.operation==='show-open';
 return reading?esmojoWithShowReadCache_(()=>esmojoActiveStorageUncached_(request)):esmojoActiveStorageUncached_(request);
}
