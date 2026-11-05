// Afzonderlijke webinventaris: geen mutatie van PDF-/mailregister of afleveringen.
function esmojoWebMojoValid_(mojo){
 return Boolean(mojo&&Object.keys(mojo).sort().join(',')==='checked,photo,sourceUrl'&&typeof mojo.checked==='boolean'&&(mojo.sourceUrl===null||typeof mojo.sourceUrl==='string'&&/^https:\/\/www\.mojo\.nl\/concerten\/[\w%/-]+$/.test(mojo.sourceUrl))&&(mojo.photo===null||mojo.photo&&Object.keys(mojo.photo).sort().join(',')==='imageUrl,sourceUrl'&&mojo.photo.sourceUrl===mojo.sourceUrl&&typeof mojo.photo.imageUrl==='string'&&/^https:\/\/www\.mojo\.nl\/media\/[\w/.-]+\.(?:jpe?g|png|webp)(?:\?[^#\s]*)?$/i.test(mojo.photo.imageUrl)));
}
function esmojoWebIndex_(folder){
 const file=esmojoOnTrackFile_(folder,'_esmojo_web_reports_v1.json'),document=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{managedBy:'ESMOJO/WebReports-v1',classification:'vertrouwelijk',version:1,entries:{}};
 if(Object.keys(document).sort().join(',')!=='classification,entries,managedBy,version'||document.managedBy!=='ESMOJO/WebReports-v1'||document.classification!=='vertrouwelijk'||document.version!==1||!document.entries||Array.isArray(document.entries))throw Error('REPORT_UNAVAILABLE');
 for(const [id,row]of Object.entries(document.entries))if(!/^[A-Za-z0-9_-]{1,200}$/.test(id)||!row||Object.keys(row).sort().join(',')!=='context,errorCode,mojo,sourceHash,state,validatedAt'||!/^[a-f0-9]{64}$/.test(row.context||'')||!esmojoWebMojoValid_(row.mojo)||!['valid','invalid'].includes(row.state)||typeof row.validatedAt!=='string'||!Number.isFinite(Date.parse(row.validatedAt))||row.state==='valid'&&(row.errorCode!==null||!/^[a-f0-9]{64}$/.test(row.sourceHash||''))||row.state==='invalid'&&(!/^CSV_[A-Z_]+$/.test(row.errorCode||'')||row.sourceHash!==null&&!/^[a-f0-9]{64}$/.test(row.sourceHash||'')))throw Error('REPORT_UNAVAILABLE');return{file,document};
}
function esmojoWebInventory_(folder){
 const index=esmojoWebIndex_(folder),mailFile=esmojoOnTrackFile_(folder,'_esmojo_ontrack_v1.json'),mail=mailFile?JSON.parse(mailFile.getBlob().getDataAsString('UTF-8')):{version:1,sources:[]};if(mail.version!==1||!Array.isArray(mail.sources))throw Error('REPORT_UNAVAILABLE');
 const today=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd'),catalogue=esmojoTimetableCatalogue_(),choices=[...catalogue.values()].filter(show=>show.date<=today).map(show=>({key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]})),files=folder.getFiles(),sources=[];let unlinked=0;
 while(files.hasNext()){
  const file=files.next();if(file.isTrashed()||!/\.csv$/i.test(file.getName()))continue;
  const linked=mail.sources.find(source=>source.id===file.getId());let choice=linked?.showKey?choices.find(show=>show.key===linked.showKey):esmojoOnTrackAutoShow_(file.getName(),choices),show;
  if(choice){const canonical=catalogue.get(choice.key);show={key:choice.key,name:choice.name,venue:choice.venue,date:canonical.date,sourceUrl:canonical.sourceUrl||null,origin:'catalogue'};}
  else if(!linked?.showKey){
   const match=/^incidents_(.+)\.csv$/i.exec(file.getName()),normalize=value=>value.normalize('NFC').toUpperCase().replace(/[\s_-]+/g,'_');
   const ambiguous=match&&choices.filter(item=>normalize(item.key)===normalize(match[1])).length>1;
   if(!ambiguous)show=reportFilenameShow(file.getName(),ESMOJO_WEB_REPORT_VENUES,today,[...catalogue.values()].map(show=>show.artist));
  }
  if(!show){unlinked++;continue;}
  const source={id:file.getId(),name:file.getName(),modifiedAt:file.getLastUpdated().toISOString(),mime:file.getMimeType(),size:file.getSize(),show,validationVersion:'csv-web-v2'};
  source.context=esmojoOnTrackHash_(JSON.stringify(source));const entry=index.document.entries[source.id];source.entry=entry?.context===source.context?entry:null;sources.push(source);
 }
 const valid=sources.filter(source=>source.entry?.state==='valid'),latest=new Map();
 for(const source of valid.sort((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt)||a.id.localeCompare(b.id)))if(!latest.has(source.show.key))latest.set(source.show.key,source);
 const available=[...latest.values()],reports=reportCatalogue(available.map(source=>({concertId:source.show.key,name:source.show.name,date:source.show.date,venue:source.show.venue,revision:esmojoOnTrackHash_(source.entry.context+'\n'+source.entry.sourceHash+'\n'+JSON.stringify(source.entry.mojo))})),today);
 return{index,catalogue,sources,available,reports,unlinked,pending:sources.some(source=>!source.entry)};
}
function esmojoWebSource_(source){
 const file=esmojoOnTrackSourceFile_(source.id);if(file.getName()!==source.name||file.getLastUpdated().toISOString()!==source.modifiedAt)throw Error('SOURCE_CHANGED');
 if(!['text/csv','application/csv','text/plain','application/vnd.ms-excel'].includes(file.getMimeType())||file.getSize()>2*1024*1024)throw Error('REPORT_UNAVAILABLE');
 const bytes=file.getBlob().getBytes();if(bytes.length>2*1024*1024)throw Error('REPORT_UNAVAILABLE');return{bytes,hash:esmojoOnTrackHash_(bytes)};
}
function esmojoWebReports_(request){
 const operation=request.operation,allowed={ 'web-menu':['operation','actor'],'web-scan':['operation','actor'],'web-source':['operation','actor','sourceId','context'],'web-commit':['operation','actor','sourceId','context','sourceHash','state','errorCode','mojo'],'web-read':['operation','actor','concertId']}[operation];
 if(!allowed||Object.keys(request).some(key=>!allowed.includes(key))||['web-menu','web-read'].includes(operation)&&typeof request.actor!=='string')throw Error('VALIDATION');
 if(operation==='web-read'&&(typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId)))throw Error('VALIDATION');
 const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(folder.isTrashed())throw Error('SOURCE_MISSING');const inventory=esmojoWebInventory_(folder);
 if(operation==='web-menu')return{reports:inventory.reports,pending:inventory.pending};
 if(operation==='web-scan')return{jobs:inventory.sources.filter(source=>!source.entry||request.actor===undefined&&source.entry.state==='valid'&&!source.entry.mojo?.checked).sort((a,b)=>Number(Boolean(a.entry))-Number(Boolean(b.entry))||(a.entry?.validatedAt||'').localeCompare(b.entry?.validatedAt||'')).slice(0,5).map(source=>({sourceId:source.id,context:source.context})),unlinked:inventory.unlinked};
 const source=operation==='web-read'?inventory.available.find(source=>source.show.key===request.concertId):inventory.sources.find(source=>source.id===request.sourceId&&source.context===request.context);
 if(!source)throw Error('NOT_FOUND');
 if(operation==='web-source'){
  // Niet-CSV/te grote exports worden veilig afgekeurd zonder bytes uit te sturen.
  if(!['text/csv','application/csv','text/plain','application/vnd.ms-excel'].includes(source.mime)||source.size>2*1024*1024)return{state:'invalid',errorCode:source.size>2*1024*1024?'CSV_TOO_LARGE':'CSV_MIME',context:source.context};
  const data=esmojoWebSource_(source);return{csvBase64:Utilities.base64Encode(data.bytes),sourceHash:data.hash,modifiedAt:source.modifiedAt,show:source.show,context:source.context};
 }
 if(operation==='web-commit'){
  if(!['valid','invalid'].includes(request.state)||request.state==='valid'&&request.errorCode!==null||request.state==='invalid'&&!/^CSV_(ENCODING|TOO_LARGE|QUOTES|HEADERS|COLUMNS|EMPTY|TIME|TIME_NONEXISTENT|AFFECTED_PERSON|ID|SHOW_MISMATCH|MIME)$/.test(request.errorCode||''))throw Error('VALIDATION');
  const metadataInvalid=!['text/csv','application/csv','text/plain','application/vnd.ms-excel'].includes(source.mime)||source.size>2*1024*1024;
  if(metadataInvalid){if(request.state!=='invalid'||request.sourceHash!==null)throw Error('VALIDATION');}
  else if(!/^[a-f0-9]{64}$/.test(request.sourceHash||'')||esmojoWebSource_(source).hash!==request.sourceHash)throw Error('SOURCE_CHANGED');
  const mojo=request.mojo;
  if(!esmojoWebMojoValid_(mojo))throw Error('VALIDATION');
  const row={context:source.context,state:request.state,sourceHash:request.sourceHash,errorCode:request.errorCode,validatedAt:new Date().toISOString(),mojo};inventory.index.document.entries[source.id]=row;
  const text=JSON.stringify(inventory.index.document),file=inventory.index.file,saved=file?(file.setContent(text),file):folder.createFile(Utilities.newBlob(text,'application/json','_esmojo_web_reports_v1.json'));if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('REPORT_UNAVAILABLE');return{ok:true};
 }
 const series=inventory.reports.find(report=>report.shows.some(show=>show.concertId===request.concertId));if(!series)throw Error('NOT_FOUND');
 const data=esmojoWebSource_(source);if(data.hash!==source.entry.sourceHash)throw Error('SOURCE_CHANGED');let timetable=null;
 try{const show=inventory.catalogue.get(source.show.key);if(show)timetable=esmojoTimetableRead_(esmojoTimetableFolder_(),show)?.snapshot||null;}catch{/* Een onleesbaar schema verzint geen geplande tijden. */}
 return{show:{...source.show,...(source.entry.mojo.sourceUrl?{sourceUrl:source.entry.mojo.sourceUrl}:{})},photo:source.entry.mojo.photo,series,csvBase64:Utilities.base64Encode(data.bytes),sourceHash:data.hash,modifiedAt:source.modifiedAt,timetable};
}
