// Use the existing Reports catalogue authority. allVenues/includeSeries widen
// that scope and can turn otherwise identical retained rows into conflicts.
// Attach series provenance only after an exact identity match; never pick a
// winner between genuinely different concert identities.
function esmojoReportsMigrationCatalogue_(){
 const catalogue=esmojoTimetableCatalogue_(),root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;if(folders.hasNext())throw Error('REPORT_CATALOG');
 const same=(a,b)=>['artist','venue','city','date'].every(key=>a[key]===b[key]);
 if(production){const file=esmojoOnTrackFile_(production,'_esmojo_shows_v1.json');if(file){const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(data.version!==1||data.managedBy!=='ESMOJO/MOJO-v1'||!Array.isArray(data.concerts))throw Error('REPORT_CATALOG');
  for(const source of data.concerts){const known=catalogue.get(source.concertId);if(!known||source.venue!=='Gashouder'||source.city!=='Amsterdam')continue;if(!same(source,known))throw Error('REPORT_CATALOG');if(source.generalConcertId)known.seriesId=source.generalConcertId;}
 }}
 for(const source of esmojoHistoricalRegister_().entries){const known=catalogue.get(source.concertId);if(!known||!known.historical)continue;if(!same(source,known)||known.seriesId&&known.seriesId!==source.seriesId)throw Error('REPORT_CATALOG');known.historicalSeriesId=source.seriesId;}
 return catalogue;
}
// Fixed metadata-only diagnostic. Counts and known codes only; no CSV bytes,
// source/account identifiers, names, raw errors or receipt tokens in output.
function esmojoReportsMigrationProbe_(actor){
 const counts={};let stage='mail';
 try{
  const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),file=esmojoOnTrackFile_(folder,'_esmojo_ontrack_v1.json'),raw=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{},groups=[...(Array.isArray(raw.reports)?raw.reports:[]),...(Array.isArray(raw.onlineReports)?raw.onlineReports:[])];
  counts.groups=groups.length;counts.multiDateGroups=groups.filter(r=>Array.isArray(r.show&&r.show.dates)&&r.show.dates.length!==1).length;counts.missingShow=groups.filter(r=>!r.show||!Array.isArray(r.show.dates)||!r.show.key).length;counts.badGroupId=groups.filter(r=>!/^[a-f0-9]{64}$/.test(r.id||'')).length;counts.badSourceHash=groups.filter(r=>!/^[a-f0-9]{64}$/.test(r.sourceHash||'')).length;
  esmojoReportsMigrationState_(folder);
  stage='catalogue';counts.catalogue=esmojoReportsMigrationCatalogue_().size;
  stage='historical';counts.historical=esmojoHistoricalSources_().length;
  stage='validation';counts.validations=Object.keys(esmojoWebIndex_(folder).document.entries).length;
  stage='inventory';const inventory=esmojoWebInventory_(folder);counts.sources=inventory.sources.length;counts.available=inventory.available.length;counts.unlinked=inventory.unlinked;
  stage='export';const result=esmojoReportsMigration_({operation:'reports-migration-catalogue',actor});counts.entries=result.entries.length;
  return{stage:'complete',code:null,counts};
 }catch(error){return{stage,code:['FORBIDDEN','REGISTER_INVALID','REPORT_CATALOG','REPORT_UNAVAILABLE','REPORT_CONFLICT','SOURCE_MISSING','NOT_FOUND'].includes(error.message)?error.message:'UNCONFIRMED',counts};}
}
// Fixed read-only export. Called only behind ontrack-reports HMAC and current
// server-side admin/Reports/MFA delegation. Never scans arbitrary Drive folders.
function esmojoReportsMigrationMail_(row,channel){
 const copy=(source,keys)=>Object.fromEntries(keys.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
 const result=copy(row,['id','sourceId','sourceHash','name','show','version','layoutVersion','exportGeneratedAt','convertedAt','pageCount','warnings','emailStatus','mailChannel','publishedAt','legacyReportId','historical','mailRequestedBy','mailRequestedAt','pdfId','fileName','sha256','timeZone']);result.channel=channel;
 result.deliveries=(row.deliveries||[]).map(delivery=>{
  const value=copy(delivery,['recipientId','status','attempts','target','mail','providerId','firstAttemptAt','lastAttemptAt','sentAt','openedAt','errorCode','job']);
  if(delivery.receiptToken){if(!/^[a-f0-9]{64}$/.test(delivery.receiptToken))throw Error('REPORT_UNAVAILABLE');value.receiptHash=esmojoOnTrackHash_(delivery.receiptToken);}
  return value;
 });return result;
}
function esmojoReportsMigrationState_(folder){
 const file=esmojoOnTrackFile_(folder,'_esmojo_ontrack_v1.json'),state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{version:1,revision:0,recipientIds:[],sources:[],reports:[]};
 if(state.version!==1||!Number.isSafeInteger(state.revision)||!Array.isArray(state.sources)||!Array.isArray(state.reports)||!Array.isArray(state.recipientIds)||state.onlineReports!==undefined&&!Array.isArray(state.onlineReports))throw Error('REGISTER_INVALID');
 const groups=[...state.reports.map(row=>esmojoReportsMigrationMail_(row,'pdf')),...(state.onlineReports||[]).map(row=>esmojoReportsMigrationMail_(row,'online'))];
 if(groups.some(group=>!group.show||!Array.isArray(group.show.dates)||group.show.dates.length!==1||!group.show.key||!group.sourceHash||!/^[a-f0-9]{64}$/.test(group.id)))throw Error('REPORT_CATALOG');
 // Ephemeral source jobs/leases must settle before an immutable copy is made.
 if(state.sources.some(row=>row.job&&Date.parse(row.job.expiresAt)>Date.now())||groups.some(row=>row.deliveries.some(d=>d.job&&Date.parse(d.job.expiresAt)>Date.now())))throw Error('REPORT_CONFLICT');
 return{state,groups};
}
function esmojoReportsMigrationSource_(file,context){
 const historical=context.historical.find(row=>row.id===file.getId());
 if(historical){const verified=esmojoHistoricalSourceFile_(historical);if(verified.getId()!==file.getId())throw Error('SOURCE_MISSING');return historical;}
 esmojoOnTrackSourceFile_(file.getId());
 const linked=context.state.sources.find(row=>row.id===file.getId()),today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd'),choices=[...context.catalogue.values()].filter(show=>show.date<=today).map(show=>({key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]}));
 const automatic=linked&&linked.showKey?null:reportConcertMatch(file.getName(),choices,ESMOJO_WEB_REPORT_VENUES,today),choice=linked&&linked.showKey?choices.find(show=>show.key===linked.showKey):automatic.show;
 let show=null;
 if(choice){const canonical=context.catalogue.get(choice.key);show={key:choice.key,name:choice.name,venue:choice.venue,date:canonical.date,sourceUrl:canonical.sourceUrl||null,origin:'catalogue'};}
 else if(!(linked&&linked.showKey)&&automatic.state!=='ambiguous')show=reportFilenameShow(file.getName(),ESMOJO_WEB_REPORT_VENUES,today,[...context.catalogue.values()].map(show=>show.artist));
 if(!show)throw Error('REPORT_CATALOG');
 return{id:file.getId(),name:file.getName(),modifiedAt:file.getLastUpdated().toISOString(),mime:file.getMimeType(),size:file.getSize(),show,validationVersion:'csv-web-v2'};
}
function esmojoReportsMigrationContext_(folder){
 const mail=esmojoReportsMigrationState_(folder);
 return{...mail,folder,catalogue:esmojoReportsMigrationCatalogue_(),historical:esmojoHistoricalSources_(),index:esmojoWebIndex_(folder)};
}
function esmojoReportsMigrationGeneral_(show,canonical){
 const empty={contacts:{productionManager:null,eventSafetyManager:null,tscProjectLead:null},tickets:{sales:null,origins:null,shows:[{date:show.date}]}};
 if(!canonical)return empty;
 if(canonical.historical){const value=esmojoHistoricalPreparation_(canonical);return{contacts:value.contacts,tickets:value.tickets};}
 if(!canonical.seriesId)return empty;
 const target=esmojoResearchTarget_(canonical.concertId),tickets=esmojoReadTicketData_(esmojoShowFile_(target.folder,'bezoekersdata.json'),target.primary.concertId),fields=JSON.parse(tickets.workflow_json).visitors.fields;
 return{contacts:{productionManager:null,eventSafetyManager:esmojoOnTrackManager_({key:show.key},esmojoOnTrackProfiles_()),tscProjectLead:null},tickets:{sales:fields.ticket_sales&&fields.ticket_sales.completed_at?fields.ticket_sales.content:null,origins:fields.visitor_origins&&fields.visitor_origins.completed_at?fields.visitor_origins.content:null,shows:target.seriesShows.map(row=>({date:row.date,time:row.time||'Niet vermeld'}))}};
}
function esmojoReportsMigration_(request){
 const op=request.operation,keys=Object.keys(request).sort().join(','),catalogueOp=op==='reports-migration-catalogue';
 if(op==='reports-migration-probe'){if(keys!=='actor,operation'||typeof request.actor!=='string'||!esmojoOnTrackProfiles_().some(p=>p.id===request.actor&&isAdministrator(p)&&p.activated&&!p.disabled&&hasModule(p,'reports')))throw Error('FORBIDDEN');return esmojoReportsMigrationProbe_(request.actor);}
 if(!['reports-migration-catalogue','reports-migration-bundle','reports-migration-csv','reports-migration-file'].includes(op)||keys!==(catalogueOp?'actor,operation':op==='reports-migration-bundle'?'actor,entry,operation':op==='reports-migration-csv'?'actor,entry,operation,sourceId':'actor,entry,fileId,offset,operation'))throw Error('VALIDATION');
 if(typeof request.actor!=='string'||!esmojoOnTrackProfiles_().some(p=>p.id===request.actor&&isAdministrator(p)&&p.activated&&!p.disabled&&hasModule(p,'reports')))throw Error('FORBIDDEN');
 const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(folder.isTrashed())throw Error('SOURCE_MISSING');
 const context=esmojoReportsMigrationContext_(folder);
 if(catalogueOp){
  const inventory=esmojoWebInventory_(folder,context.catalogue),entries=new Map();
  const add=show=>{if(typeof show.key!=='string'||typeof show.name!=='string'||!show.name||!validTimetableDate(show.date)||show.key.length>240||/[\x00-\x1f/\\]/.test(show.key))throw Error('REPORT_CATALOG');if(!entries.has(show.key)){const known=context.catalogue.get(show.key),venue=ESMOJO_WEB_REPORT_VENUES.find(row=>row.name===show.venue||reportVenueName(row)===show.venue);if(!venue)throw Error('REPORT_CATALOG');entries.set(show.key,{show:{...show,city:known?known.city:venue.city,seriesId:known&&(known.seriesId||known.historicalSeriesId)||null},sources:[]});}return entries.get(show.key);};
  for(const source of inventory.sources){const row=add(source.show);row.sources.push({id:source.id,name:source.name,modifiedAt:source.modifiedAt,size:source.size});}
  for(const group of context.groups)add({key:group.show.key,name:group.show.name,venue:group.show.venue,date:group.show.dates[0],origin:'mail-history'});
  const visible=new Set(inventory.reports.flatMap(report=>report.shows.map(show=>show.concertId)));for(const entry of entries.values())entry.show.available=visible.has(entry.show.key);
  const rows=[...entries.values()].sort((a,b)=>a.show.key.localeCompare(b.show.key));for(const row of rows)row.sources.sort((a,b)=>a.id.localeCompare(b.id));
  if(rows.length>10000||rows.some(row=>row.sources.length>50))throw Error('REPORT_UNAVAILABLE');
  const selection={revision:context.state.revision,recipientIds:context.state.recipientIds.slice().sort(),settings:Object.fromEntries(['version','revision','onlineMailStartedAt','pipeline','reportVersions','generations'].filter(key=>context.state[key]!==undefined).map(key=>[key,context.state[key]]))};
  const sourceFields=['id','name','receivedAt','modifiedAt','linkRevision','status','showKey','linkHistory','autoLinkedAt','attempts','errorCode','errorRow','processedModifiedAt','processedLayout','latestReportId','duplicateOf','generation'];
  selection.settings.webIndex=context.index.document;selection.settings.historicalRegister=esmojoHistoricalRegister_().entries;
  selection.settings.sources=context.state.sources.map(row=>{if(Object.keys(row).some(key=>key!=='job'&&!sourceFields.includes(key)))throw Error('REGISTER_INVALID');return Object.fromEntries(sourceFields.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]));});
  const fingerprint=esmojoOnTrackHash_(JSON.stringify({rows,selection,groups:context.groups,index:context.index.document,historical:context.historical}));
  return{version:1,entries:rows,selection,unlinked:inventory.unlinked,fingerprint};
 }
 const entry=request.entry;
 if(!entry||typeof entry!=='object'||Object.keys(entry).sort().join(',')!=='show,sources'||!entry.show||typeof entry.show.key!=='string'||entry.show.key.length>240||!Array.isArray(entry.sources)||entry.sources.length>50||new Set(entry.sources.map(row=>row.id)).size!==entry.sources.length)throw Error('VALIDATION');
 const sources=entry.sources.map(saved=>{
  if(!/^[-\w]{1,200}$/.test(saved.id||''))throw Error('VALIDATION');const file=DriveApp.getFileById(saved.id),source=esmojoReportsMigrationSource_(file,context);
  if(file.isTrashed()||source.show.key!==entry.show.key||source.name!==saved.name||source.modifiedAt!==saved.modifiedAt||source.size!==saved.size)throw Error('SOURCE_CHANGED');
  const data=esmojoWebSource_(source),contextHash=esmojoOnTrackHash_(JSON.stringify(source)),validation=context.index.document.entries[source.id]||null;
  if(validation&&validation.context===contextHash&&validation.state==='valid'&&validation.sourceHash!==data.hash)throw Error('SOURCE_CHANGED');
  return{source:{...source,context:contextHash},sha256:data.hash,validation:validation&&validation.context===contextHash?validation:null,previousValidation:validation};
 });
 const groups=context.groups.filter(row=>row.show.key===entry.show.key);
 if(!sources.length&&!groups.length)throw Error('NOT_FOUND');
 const show=sources.length?sources[0].source.show:{key:groups[0].show.key,name:groups[0].show.name,venue:groups[0].show.venue,date:groups[0].show.dates[0],origin:'mail-history'};
 if(show.name!==entry.show.name||show.venue!==entry.show.venue||show.date!==entry.show.date)throw Error('SOURCE_CHANGED');
 const files=sources.map(row=>({fileId:row.source.id,name:row.source.name,mime:row.source.mime,size:row.source.size,sha256:row.sha256,modifiedAt:row.source.modifiedAt,kind:'csv'}));
 for(const group of groups)if(group.pdfId&&!files.some(row=>row.fileId===group.pdfId)){
  const file=esmojoOnTrackSourceFile_(group.pdfId);if(file.getMimeType()!=='application/pdf'||file.getSize()<1||file.getSize()>3*1024*1024||!/^[a-f0-9]{64}$/.test(group.sha256||'')||file.getName()!==group.fileName)throw Error('REPORT_UNAVAILABLE');
  files.push({fileId:group.pdfId,name:group.fileName,mime:'application/pdf',size:file.getSize(),sha256:group.sha256,modifiedAt:file.getLastUpdated().toISOString(),kind:'pdf'});
 }
 if(op==='reports-migration-csv'){
  const row=sources.find(row=>row.source.id===request.sourceId);if(!row)throw Error('VALIDATION');const data=esmojoWebSource_(row.source);return{version:1,sourceId:request.sourceId,sha256:data.hash,csvBase64:Utilities.base64Encode(data.bytes)};
 }
 if(op==='reports-migration-file'){
  if(!Number.isSafeInteger(request.offset)||request.offset<0||request.offset%1048576)throw Error('VALIDATION');const metadata=files.find(row=>row.fileId===request.fileId);if(!metadata||request.offset>=metadata.size)throw Error('VALIDATION');
  const file=metadata.kind==='csv'?sources.find(row=>row.source.id===metadata.fileId).source:null,bytes=file?esmojoWebSource_(file).bytes:esmojoOnTrackSourceFile_(metadata.fileId).getBlob().getBytes(),sha256=esmojoOnTrackHash_(bytes);
  if(bytes.length!==metadata.size||sha256!==metadata.sha256)throw Error('SOURCE_CHANGED');return{size:bytes.length,sha256,offset:request.offset,base64:Utilities.base64Encode(bytes.slice(request.offset,request.offset+1048576))};
 }
 let timetable=null;try{timetable=esmojoWebTimetable_(show);}catch{throw Error('REPORT_UNAVAILABLE');}
 const canonical=context.catalogue.get(show.key),general=esmojoReportsMigrationGeneral_(show,canonical);let provenance=null;
 if(canonical&&canonical.historical){
  const historical=esmojoHistoricalRegister_().entries.find(row=>row.concertId===show.key);if(!historical)throw Error('REPORT_CATALOG');
  const concert=esmojoHistoricalConcertFolder_(historical.concertFolderId||historical.source.folderId,show.key);provenance={historicalEntry:historical};
  for(const [name,owner]of [['importcontrole.json','ESMOJO/HistoricalImportAudit-v1'],['showgegevens-tsc.json','ESMOJO/TscHistoricalShow-v1']]){const file=esmojoOnTrackFile_(concert,name);if(!file)continue;if(file.getSize()>2*1024*1024)throw Error('REPORT_UNAVAILABLE');const value=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(value.managedBy!==owner||value.classification!=='vertrouwelijk'||value.concertId!==show.key)throw Error('REPORT_CONFLICT');provenance[name]=value;}
 }
 return{version:1,show:{...entry.show,...show},sources,groups,files,timetable,general,provenance};
}
