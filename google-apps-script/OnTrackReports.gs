// Vertrouwelijke OnTrack-rapportworkflow. Bron/PDF uitsluitend in de vaste map.
const ESMOJO_ONTRACK_REPORT_LAYOUT='ontrack-showreport-v1';
function esmojoOnTrackHash_(value){const bytes=typeof value==='string'?Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8):Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value);return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function esmojoOnTrackFile_(folder,name){const files=folder.getFilesByName(name),file=files.hasNext()?files.next():null;if(files.hasNext())throw Error('REGISTER_DUPLICATE');return file;}
function esmojoOnTrackProfiles_(){const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),file=esmojoOnTrackFile_(root,'_esmojo_accounts_v1.json');if(!file)throw Error('FORBIDDEN');const state=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(!Array.isArray(state.profiles))throw Error('FORBIDDEN');return state.profiles;}
// Uitsluitend een bestaande exacte showrelatie; geen account afleiden uit ontvanger of beheerder.
function esmojoOnTrackManager_(show,profiles){
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;if(folders.hasNext())throw Error('REPORT_CATALOG');if(!production)return null;
 const file=esmojoOnTrackFile_(production,'_esmojo_show_assignments_v1.json');if(!file)return null;
 const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
 if(data.managedBy!=='ESMOJO/ShowAssignments-v1'||data.classification!=='vertrouwelijk'||data.version!==1||!Number.isSafeInteger(data.revision)||!Array.isArray(data.assignments))throw Error('REPORT_CATALOG');
 if(data.assignments.some(link=>!link||typeof link.concertId!=='string'||typeof link.userId!=='string'||!link.userId||typeof link.role!=='string'))throw Error('REPORT_CATALOG');
 const ids=[...new Set(data.assignments.filter(link=>link?.concertId===show.key&&link.role==='event-safety-manager').map(link=>link.userId))];
 if(ids.length!==1)return null;
 const matches=profiles.filter(profile=>profile.id===ids[0]&&profile.activated&&!profile.disabled);if(matches.length!==1)return null;
 const profile=matches[0],parts=[profile.firstName,profile.lastName];
 if(parts.some(part=>typeof part!=='string'||!part.trim()||part.length>120||/[\x00-\x1f\x7f@]/.test(part)))return null;
 return parts.map(part=>part.trim()).join(' ');
}
function esmojoOnTrackSourceFile_(id){if(typeof id!=='string'||!/^[A-Za-z0-9_-]+$/.test(id))throw Error('SOURCE_MISSING');const file=DriveApp.getFileById(id),parents=file.getParents();let allowed=false;while(parents.hasNext())if(parents.next().getId()===ESMOJO_ONTRACK_FOLDER_ID)allowed=true;if(!allowed||file.isTrashed())throw Error('SOURCE_MISSING');return file;}
function esmojoOnTrackScan_(folder,state){
 const files=folder.getFiles(),known=new Map(state.sources.map(source=>[source.id,source]));let changed=false;
 while(files.hasNext()){const file=files.next();if(file.isTrashed()||!/\.csv$/i.test(file.getName()))continue;const modifiedAt=file.getLastUpdated().toISOString();let source=known.get(file.getId());
  if(!source){source={id:file.getId(),name:file.getName(),receivedAt:file.getDateCreated().toISOString(),modifiedAt,linkRevision:0,status:'unlinked'};state.sources.push(source);known.set(source.id,source);changed=true;}
  if(source.modifiedAt!==modifiedAt||source.name!==file.getName()){source.modifiedAt=modifiedAt;source.name=file.getName();source.status=source.showKey?'pending':'unlinked';source.attempts=0;source.errorCode=null;changed=true;}
 }
 return changed;
}
function esmojoOnTrackReportChoices_(folder){
 let rows=[];const extra=esmojoOnTrackFile_(folder,'_esmojo_ontrack_concerts_v1.json');if(extra){const data=JSON.parse(extra.getBlob().getDataAsString('UTF-8'));if(data.version!==1||!Array.isArray(data.concerts)||!Array.isArray(data.active))throw Error('REPORT_CATALOG');const active=new Set(data.active),today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd');rows=rows.concat(data.concerts.filter(row=>row.date<today||active.has(row.concertId)));}
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;if(folders.hasNext())throw Error('REPORT_CATALOG');
 if(production){const file=esmojoOnTrackFile_(production,'_esmojo_shows_v1.json');if(file){const data=JSON.parse(file.getBlob().getDataAsString('UTF-8'));if(data.version!==1||!Array.isArray(data.concerts))throw Error('REPORT_CATALOG');rows=rows.concat(data.concerts.filter(row=>row.venue==='Gashouder'&&row.city==='Amsterdam'));}}
 const choices=new Map();for(const row of rows){if(typeof row.concertId!=='string'||typeof row.artist!=='string'||typeof row.venue!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))throw Error('REPORT_CATALOG');choices.set(row.concertId,{key:row.concertId,name:row.artist,venue:row.venue,dates:[row.date]});}
 return Array.from(choices.values()).sort((a,b)=>b.dates[0].localeCompare(a.dates[0])||a.name.localeCompare(b.name));
}
function esmojoOnTrackAutoShow_(name,choices){
 const match=typeof name==='string'&&/^incidents_(.+)\.csv$/i.exec(name);
 if(!match)return null;const concertId=match[1];
 // De opgeslagen sleutel is leidend, ook als zichtbare naam/locatie later wijzigt.
 const exact=choices.filter(show=>show.key===concertId);if(exact.length)return exact.length===1?exact[0]:null;
 // Alleen schrijfwijze: casing en scheidingstekens; geen fuzzy namen of ID-substrings.
 const normalize=value=>value.normalize('NFC').toUpperCase().replace(/[\s_-]+/g,'_');
 const matches=choices.filter(show=>normalize(show.key)===normalize(concertId));
 return matches.length===1?matches[0]:null;
}
function esmojoOnTrackQueue_(state){return state.sources.map(source=>({id:source.id,name:source.name,showKey:source.showKey||null,linkRevision:source.linkRevision||0,status:source.job&&Date.parse(source.job.expiresAt)<=Date.now()?'failed':source.status||'unlinked',reused:Boolean(source.duplicateOf),errorCode:source.errorCode||null,errorRow:source.errorRow||null}));}
function esmojoOnTrackReports_(input){
 const secret=PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET'),reply=(ok,data,code)=>esmojoReply_({ok,data,code});
 if(!secret||secret.length<32||typeof input.body!=='string'||input.body.length>4500000||!Number.isSafeInteger(input.timestamp)||Math.abs(Date.now()-input.timestamp)>120000||!/^[a-f0-9]{32}$/.test(input.nonce||'')||!/^[a-f0-9]{64}$/.test(input.signature||''))return reply(false,null,'FORBIDDEN');
 const hex=bytes=>bytes.map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join(''),digest=esmojoOnTrackHash_(input.body),expected=hex(Utilities.computeHmacSha256Signature('ontrack-reports\n'+input.timestamp+'\n'+input.nonce+'\n'+digest,secret,Utilities.Charset.UTF_8));let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^input.signature.charCodeAt(i);if(difference)return reply(false,null,'FORBIDDEN');
 let parsedRequest;try{parsedRequest=JSON.parse(input.body);if(!parsedRequest||typeof parsedRequest!=='object'||Array.isArray(parsedRequest))throw Error('VALIDATION');}catch{return reply(false,null,'VALIDATION');}
 const web=typeof parsedRequest.operation==='string'&&parsedRequest.operation.startsWith('web-'),lock=web?(parsedRequest.operation==='web-commit'?LockService.getUserLock():null):LockService.getScriptLock();if(lock&&!lock.tryLock(20000))return reply(false,null,'BUSY');
 try{
  const request=parsedRequest,operation=request.operation,adminOps=['link','retry','download','send','email-context'],workerOps=['scan','pipeline','reserve','commit','fail','delivery-reserve','delivery-commit','delivery-fail','timetable-candidates','timetable-save','web-scan','web-source','web-commit','web-historical-status','online-sync','online-reserve','online-commit','online-fail'];
  if(!adminOps.includes(operation)&&!workerOps.includes(operation)&&operation!=='web-preview'&&operation!=='web-menu'&&operation!=='web-read'&&operation!=='timetable-read'&&operation!=='pdf-alerts'&&operation!=='email-history'&&operation!=='email-open')throw Error('VALIDATION');
  const profiles=esmojoOnTrackProfiles_();if(adminOps.includes(operation)&&!profiles.some(p=>p.id===request.actor&&isAdministrator(p)&&p.activated&&!p.disabled&&hasModule(p,'reports')))throw Error('FORBIDDEN');
  const cache=CacheService.getScriptCache(),nonceKey='ontrack-reports:'+input.nonce;if(cache.get(nonceKey))throw Error('FORBIDDEN');cache.put(nonceKey,'1',180);
  if(operation.startsWith('timetable-')){
   if(operation==='timetable-read'&&!profiles.some(p=>p.id===request.actor&&p.activated&&!p.disabled&&hasModule(p,'reports')))throw Error('FORBIDDEN');
   return reply(true,esmojoShowTimetables_(request));
  }
  if(operation.startsWith('web-')){
   if(operation==='web-preview')throw Error('VALIDATION');
   if((['web-menu','web-read'].includes(operation)||request.actor!==undefined)&&!profiles.some(p=>p.id===request.actor&&p.activated&&!p.disabled&&hasModule(p,'reports')))throw Error('FORBIDDEN');
   return reply(true,esmojoWebReports_(request));
  }
  const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(folder.isTrashed())throw Error('SOURCE_MISSING');if(operation==='email-context'){
   if(Object.keys(request).sort().join(',')!=='actor,concertId,operation'||typeof request.concertId!=='string')throw Error('VALIDATION');
   const show=esmojoOnTrackReportChoices_(folder).find(show=>show.key===request.concertId);if(!show)throw Error('REPORT_CATALOG');return reply(true,{managerName:esmojoOnTrackManager_(show,profiles)});
  }const file=esmojoOnTrackFile_(folder,'_esmojo_ontrack_v1.json');
  const state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{version:1,revision:0,recipientIds:[],sources:[],reports:[],nonces:{}};
  if(state.version!==1||!Array.isArray(state.sources)||!Array.isArray(state.reports)||!Array.isArray(state.recipientIds))throw Error('REGISTER_INVALID');
  const save=()=>{const text=JSON.stringify(state);if(file)file.setContent(text);else folder.createFile(Utilities.newBlob(text,'application/json','_esmojo_ontrack_v1.json'));};
  if(['email-history','email-open'].includes(operation))return reply(true,esmojoMailEngagement_(request,state,profiles,save));
  if(operation.startsWith('online-')||operation==='pdf-alerts')return reply(true,esmojoOnlineReportMail_(request,folder,state,profiles,save));
  if(operation==='scan'){if(esmojoOnTrackScan_(folder,state))save();return reply(true,{sources:esmojoOnTrackQueue_(state)});}
  if(operation==='pipeline'){if(!['idle','running','assets-missing'].includes(request.status))throw Error('VALIDATION');state.pipeline={status:request.status,updatedAt:new Date().toISOString()};save();return reply(true,{ok:true,...(typeof esmojoMailReceiptToken_==='function'?{tracking:'mail-open-v1'}:{})});}
  const source=state.sources.find(source=>source.id===request.sourceId);
  if(['link','retry'].includes(operation)){
   if(!source)throw Error('SOURCE_MISSING');if(source.job&&Date.parse(source.job.expiresAt)>Date.now())throw Error('REPORT_CONFLICT');
   if(request.revision!==(source.linkRevision||0))throw Error('REPORT_CONFLICT');
   if(operation==='link'){const show=esmojoOnTrackReportChoices_(folder).find(show=>show.key===request.concertId);if(!show)throw Error('REPORT_CATALOG');source.showKey=show.key;source.linkHistory=source.linkHistory||[];source.linkHistory.push({key:show.key,actor:request.actor,at:new Date().toISOString()});}
   source.linkRevision=(source.linkRevision||0)+1;source.status=source.showKey?'pending':'unlinked';source.attempts=0;source.errorCode=null;source.errorRow=null;source.job=null;save();return reply(true,{ok:true});
  }
  if(operation==='reserve'){
   if(request.layoutVersion!==ESMOJO_ONTRACK_REPORT_LAYOUT||typeof request.jobId!=='string'||!/^[0-9a-f-]{36}$/i.test(request.jobId))throw Error('VALIDATION');
   const choices=esmojoOnTrackReportChoices_(folder);let changed=false;
   for(const candidate of state.sources){
    if(candidate.status==='ready'&&candidate.processedModifiedAt===candidate.modifiedAt&&candidate.processedLayout===request.layoutVersion)continue;
    if(candidate.status==='invalid'||(candidate.status==='failed'&&(candidate.attempts||0)>=3)||candidate.job&&Date.parse(candidate.job.expiresAt)>Date.now())continue;
    let show=choices.find(show=>show.key===candidate.showKey);if(!show&&!candidate.showKey){show=esmojoOnTrackAutoShow_(candidate.name,choices);if(show){candidate.showKey=show.key;candidate.linkRevision=(candidate.linkRevision||0)+1;candidate.autoLinkedAt=new Date().toISOString();changed=true;}}
    if(!show){candidate.status='unlinked';changed=true;continue;}
    let csvFile;try{csvFile=esmojoOnTrackSourceFile_(candidate.id);}catch(_){candidate.status='failed';candidate.attempts=3;candidate.errorCode='SOURCE_MISSING';changed=true;continue;}
    if(!/\.csv$/i.test(csvFile.getName())||csvFile.getSize()>2*1024*1024){candidate.status='invalid';candidate.errorCode='CSV_TOO_LARGE';changed=true;continue;}
    const bytes=csvFile.getBlob().getBytes(),sha256=esmojoOnTrackHash_(bytes),key=esmojoOnTrackHash_(sha256+'\n'+JSON.stringify(show)+'\n'+request.layoutVersion),prior=state.reports.find(report=>report.id===key);
    if(prior){candidate.duplicateOf=prior.sourceId===candidate.id?null:prior.sourceId;candidate.latestReportId=prior.id;candidate.status='ready';candidate.processedModifiedAt=csvFile.getLastUpdated().toISOString();candidate.processedLayout=request.layoutVersion;changed=true;continue;}
    state.generations=state.generations||{};state.reportVersions=state.reportVersions||{};
    let generation=state.generations[key]||(candidate.generation&&candidate.generation.key===key?candidate.generation:null);
    if(!generation){const previous=Math.max(0,...state.reports.filter(report=>report.show&&report.show.key===show.key).map(report=>parseInt(report.version,10)||0)),version=Math.max(previous+1,state.reportVersions[show.key]||1);generation={key,generatedAt:new Date().toISOString(),version};state.reportVersions[show.key]=version+1;}
    state.generations[key]=generation;candidate.generation=generation;
    const job={id:request.jobId,key,sourceHash:sha256,show,version:generation.version,generatedAt:generation.generatedAt,expiresAt:new Date(Date.now()+300000).toISOString(),modifiedAt:csvFile.getLastUpdated().toISOString()};candidate.job=job;candidate.status='processing';candidate.attempts=(candidate.attempts||0)+1;save();
    return reply(true,{state:'reserved',sourceId:candidate.id,jobId:job.id,reportId:key,sourceHash:sha256,csvBase64:Utilities.base64Encode(bytes),show,version:job.version,generatedAt:job.generatedAt});
   }
   if(changed)save();return reply(true,{state:'idle'});
  }
  if(operation==='send'){
   const report=state.reports.find(report=>report.id===request.reportId),linked=report&&state.sources.find(source=>source.id===report.sourceId);
   if(!report||!linked||linked.status!=='ready'||linked.latestReportId!==report.id||linked.modifiedAt!==linked.processedModifiedAt)throw Error('REPORT_CONFLICT');
   const targets=Array.from(new Set(state.recipientIds)).filter(id=>profiles.some(p=>p.id===id&&p.activated&&!p.disabled&&hasModule(p,'reports')));if(!targets.length)throw Error('VALIDATION');
   const online=state.onlineReports?.find(row=>row.sourceHash===report.sourceHash&&row.show?.key===report.show?.key);if(!online&&report.mailChannel==='online')throw Error('REPORT_CONFLICT');if(online){const target=online.legacyReportId?state.reports.find(row=>row.id===online.legacyReportId):online;if(!target)throw Error('REPORT_CONFLICT');if(!online.legacyReportId)online.historical=false;target.deliveries=target.deliveries||[];for(const id of targets)if(!target.deliveries.some(delivery=>delivery.recipientId===id))target.deliveries.push({recipientId:id,status:'pending',attempts:0});esmojoOnlineEmailStatus_(target);save();return reply(true,{ok:true});}
   report.deliveries=report.deliveries||[];for(const id of targets)if(!report.deliveries.some(delivery=>delivery.recipientId===id))report.deliveries.push({recipientId:id,status:'pending',attempts:0});
   report.emailStatus=report.deliveries.every(delivery=>delivery.status==='sent')?'sent':'pending';report.mailRequestedBy=request.actor;report.mailRequestedAt=new Date().toISOString();save();return reply(true,{ok:true});
  }
  if(operation==='download'){
   const report=state.reports.find(report=>report.id===request.reportId);if(!report)throw Error('REPORT_UNAVAILABLE');const pdf=esmojoOnTrackSourceFile_(report.pdfId),bytes=pdf.getBlob().getBytes();if(pdf.getMimeType()!=='application/pdf'||bytes.length>3*1024*1024||esmojoOnTrackHash_(bytes)!==report.sha256)throw Error('REPORT_UNAVAILABLE');return reply(true,{fileName:report.fileName,pdfBase64:Utilities.base64Encode(bytes),sha256:report.sha256});
  }
  if(operation==='commit'){
   const prior=state.reports.find(report=>report.id===request.reportId);if(prior){if(prior.sha256!==request.sha256)throw Error('REPORT_CONFLICT');if(source&&source.job&&source.job.id===request.jobId&&source.job.key===prior.id){source.processedModifiedAt=source.job.modifiedAt;source.processedLayout=ESMOJO_ONTRACK_REPORT_LAYOUT;source.latestReportId=prior.id;source.duplicateOf=prior.sourceId===source.id?null:prior.sourceId;source.status='ready';source.job=null;save();}return reply(true,{state:'ready',reportId:prior.id});}
   const job=source&&source.job;if(!job||job.id!==request.jobId||job.key!==request.reportId)throw Error('REPORT_CONFLICT');
   if(esmojoOnTrackHash_(esmojoOnTrackSourceFile_(source.id).getBlob().getBytes())!==job.sourceHash)throw Error('SOURCE_CHANGED');
   if(typeof request.pdfBase64!=='string'||request.pdfBase64.length>4194304||!/^[A-Za-z0-9+/]+={0,2}$/.test(request.pdfBase64)||!/^[a-f0-9]{64}$/.test(request.sha256||'')||!Number.isSafeInteger(request.pageCount)||request.pageCount<2)throw Error('VALIDATION');
   const bytes=Utilities.base64Decode(request.pdfBase64);if(bytes.length>3*1024*1024||bytes.length<100||[37,80,68,70,45].some((byte,index)=>bytes[index]!==byte)||esmojoOnTrackHash_(bytes)!==request.sha256)throw Error('VALIDATION');
   const part=value=>value.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/\s+/g,'_'),fileName='SR_'+part(job.show.name).slice(0,60)+'_'+part(job.show.venue).slice(0,45)+'_'+job.show.dates[0].split('-').reverse().join('')+'_v'+job.version+'.0_'+job.key.slice(0,12)+'.pdf';
   const candidates=folder.getFilesByName(fileName);let pdf=null;while(candidates.hasNext()){const candidate=candidates.next();if(!candidate.isTrashed()&&candidate.getMimeType()==='application/pdf'&&candidate.getSize()<=3*1024*1024&&esmojoOnTrackHash_(candidate.getBlob().getBytes())===request.sha256){pdf=candidate;break;}}
   if(!pdf)pdf=folder.createFile(Utilities.newBlob(bytes,'application/pdf',fileName));if(esmojoOnTrackHash_(pdf.getBlob().getBytes())!==request.sha256)throw Error('REPORT_UNAVAILABLE');
   const active=new Set(profiles.filter(p=>p.activated&&!p.disabled&&hasModule(p,'reports')).map(p=>p.id)),recipients=state.onlineMailStartedAt?[]:Array.from(new Set(state.recipientIds)).filter(id=>active.has(id));
   state.reports.push({id:job.key,mailChannel:state.onlineMailStartedAt?'online':'legacy',sourceId:source.id,sourceHash:job.sourceHash,name:source.name,pdfId:pdf.getId(),fileName,sha256:request.sha256,show:job.show,version:job.version+'.0',layoutVersion:ESMOJO_ONTRACK_REPORT_LAYOUT,exportGeneratedAt:job.generatedAt,timeZone:'Europe/Amsterdam',convertedAt:new Date().toISOString(),pageCount:request.pageCount,warnings:Array.isArray(request.warnings)?request.warnings.filter(w=>w&&['DST_AMBIGUOUS_EARLIEST','GRAPH_DATES_AFTER_SECOND'].includes(w.code)).map(w=>({code:w.code,row:Number.isSafeInteger(w.row)?w.row:null,count:Number.isSafeInteger(w.count)?w.count:null})):[],emailStatus:recipients.length?'pending':'no-recipients',deliveries:recipients.map(id=>({recipientId:id,status:'pending',attempts:0}))});
   source.duplicateOf=null;source.latestReportId=job.key;source.status='ready';source.job=null;source.errorCode=null;source.processedModifiedAt=job.modifiedAt;source.processedLayout=ESMOJO_ONTRACK_REPORT_LAYOUT;save();return reply(true,{state:'ready',reportId:job.key});
  }
  if(operation==='fail'){
   if(!source||!source.job||source.job.id!==request.jobId)throw Error('REPORT_CONFLICT');
   const codes=['CSV_ENCODING','CSV_TOO_LARGE','CSV_QUOTES','CSV_HEADERS','CSV_COLUMNS','CSV_EMPTY','CSV_TIME','CSV_TIME_NONEXISTENT','CSV_AFFECTED_PERSON','CSV_ID','CSV_SHOW_MISMATCH','SOURCE_CHANGED','ONTRACK_ICON_MISSING','REPORT_HEADER_LAYOUT','REPORT_DASHBOARD_LAYOUT','REPORT_TYPE_LEGEND_LAYOUT','REPORT_LOCATION_LAYOUT','REPORT_INCIDENT_LAYOUT','REPORT_METADATA_LAYOUT','REPORT_GLYPH','PDF_TOO_LARGE','GENERATION_FAILED'];
   source.errorCode=codes.includes(request.errorCode)?request.errorCode:'GENERATION_FAILED';source.errorRow=Number.isSafeInteger(request.errorRow)?request.errorRow:null;source.status=/^CSV_|^REPORT_/.test(source.errorCode)?'invalid':'failed';source.job=null;save();return reply(true,{ok:true});
  }
  if(operation==='delivery-reserve'){
   if(typeof request.jobId!=='string'||!/^[0-9a-f-]{36}$/i.test(request.jobId))throw Error('VALIDATION');let changed=false;
   for(const report of state.reports){if(report.mailChannel==='online'||!report.id||!Array.isArray(report.deliveries)||!report.show)continue;const linked=state.sources.find(source=>source.id===report.sourceId);if(!linked)continue;
    for(const delivery of report.deliveries){const online=Boolean(state.onlineMailStartedAt)&&(!delivery.mail||['online-report-v3','online-report-v4'].includes(delivery.mail.version));
     if(online){if(!esmojoOnlineVisible_(folder).some(source=>source.show.key===report.show.key&&source.entry.sourceHash===report.sourceHash))continue;}else if(linked.status!=='ready'||linked.processedModifiedAt!==linked.modifiedAt||linked.showKey!==report.show.key||linked.latestReportId!==report.id)continue;
     if(delivery.status==='sent'||delivery.status==='review'||delivery.status==='skipped'||delivery.attempts>=3||delivery.job&&Date.parse(delivery.job.expiresAt)>Date.now()||delivery.lastAttemptAt&&Date.now()-Date.parse(delivery.lastAttemptAt)<300000)continue;
     const profile=profiles.find(p=>p.id===delivery.recipientId&&p.activated&&!p.disabled&&hasModule(p,'reports'));if(!profile){delivery.status='skipped';report.emailStatus='failed';changed=true;continue;}
     if(delivery.firstAttemptAt&&Date.now()-Date.parse(delivery.firstAttemptAt)>23*3600000){delivery.status='review';report.emailStatus='failed';changed=true;continue;}
     // Een oude onzekere verzending nooit met gewijzigde inhoud op dezelfde Resend-sleutel herhalen.
     if((delivery.attempts>0||delivery.firstAttemptAt)&&!['online-report-v1','online-report-v2','online-report-v3','online-report-v4'].includes(delivery.mail?.version)){delivery.status='review';delivery.errorCode='MAIL_TEMPLATE_CHANGED';report.emailStatus='failed';changed=true;continue;}
     let bytes=null;if(!online){const pdf=esmojoOnTrackSourceFile_(report.pdfId);bytes=pdf.getBlob().getBytes();if(pdf.getMimeType()!=='application/pdf'||bytes.length>3*1024*1024||esmojoOnTrackHash_(bytes)!==report.sha256)throw Error('REPORT_UNAVAILABLE');}
     if(delivery.mail?.version==='online-report-v4'&&request.trackingVersion!=='mail-open-v1')continue;
     if(!delivery.mail)delivery.mail={version:request.trackingVersion==='mail-open-v1'&&!delivery.attempts&&!delivery.firstAttemptAt?'online-report-v4':'online-report-v3',senderId:'show-report',managerName:esmojoOnTrackManager_(report.show,profiles)};
     if(delivery.mail.version==='online-report-v4'&&!delivery.receiptToken)delivery.receiptToken=esmojoMailReceiptToken_(report.id,delivery.recipientId);
     if(!delivery.target)delivery.target={email:profile.email,firstName:profile.firstName};const now=new Date().toISOString();delivery.firstAttemptAt=delivery.firstAttemptAt||now;delivery.lastAttemptAt=now;delivery.attempts=(delivery.attempts||0)+1;delivery.status='processing';delivery.job={id:request.jobId,expiresAt:new Date(Date.now()+300000).toISOString()};save();
     return reply(true,{state:'reserved',reportId:report.id,recipientId:delivery.recipientId,jobId:request.jobId,recipient:delivery.target,mailVersion:delivery.mail.version,...(delivery.mail.version==='online-report-v4'?{receiptToken:delivery.receiptToken}:{}),senderId:delivery.mail.senderId||'default',managerName:delivery.mail.managerName,show:report.show,...(bytes?{fileName:report.fileName,pdfBase64:Utilities.base64Encode(bytes),sha256:report.sha256}:{}),idempotencyKey:'esmojo-showreport-'+report.id+'-'+esmojoOnTrackHash_(delivery.recipientId).slice(0,16)});
    }
   }
   if(changed)save();return reply(true,{state:'idle'});
  }
  const report=state.reports.find(report=>report.id===request.reportId),delivery=report&&Array.isArray(report.deliveries)&&report.deliveries.find(delivery=>delivery.recipientId===request.recipientId);
  if(!delivery||!delivery.job||delivery.job.id!==request.jobId)throw Error('REPORT_CONFLICT');
  if(operation==='delivery-commit'){if(typeof request.providerId!=='string'||request.providerId.length>120||!/^[A-Za-z0-9_-]+$/.test(request.providerId))throw Error('VALIDATION');delivery.status='sent';delivery.providerId=request.providerId;delivery.sentAt=new Date().toISOString();}
  else{delivery.status=delivery.attempts>=3?'review':'pending';delivery.errorCode='DELIVERY_UNCONFIRMED';}
  delivery.job=null;report.emailStatus=report.deliveries.length&&report.deliveries.every(delivery=>delivery.status==='sent')?'sent':report.deliveries.some(delivery=>delivery.status==='review'||delivery.status==='skipped')?'failed':'pending';save();return reply(true,{ok:true});
 }catch(error){const codes=['FORBIDDEN','VALIDATION','REPORT_CONFLICT','REPORT_CATALOG','SOURCE_MISSING','SOURCE_CHANGED','REPORT_UNAVAILABLE','REGISTER_INVALID','NOT_FOUND'];return reply(false,null,codes.includes(error.message)?error.message:'ONTRACK_REPORT_UNAVAILABLE');}finally{if(lock)lock.releaseLock();}
}
