// Interne worker; uitsluitend bereikbaar via de bestaande ondertekende brug en
// main/web-reports.yml OIDC-identiteit. Geen browseractie of vrije Drive-bestemming.
function esmojoHistoricalBatch_(name){
 if(typeof name!=='string'||!/^historical-[a-z0-9-]{1,70}\.json$/.test(name))throw Error('VALIDATION');
 const root=DriveApp.getFolderById(ESMOJO_FOLDER_ID),folders=root.getFoldersByName('Productie'),production=folders.hasNext()?folders.next():null;
 if(!production||folders.hasNext())throw Error('REPORT_CATALOG');
 const file=esmojoOnTrackFile_(production,name);if(!file||file.getSize()>20*1024*1024)throw Error('IMPORT_MISSING');
 const content=file.getBlob().getDataAsString('UTF-8'),data=JSON.parse(content);
 if(data.managedBy!=='ESMOJO/HistoricalImport-v1'||data.classification!=='vertrouwelijk'||data.version!==1||!Array.isArray(data.entries)||!data.entries.length||data.entries.length>1000)throw Error('VALIDATION');
 const ids=new Set();for(const row of data.entries){
  const identity=row.identityArtist||row.artist;
  if(!row||typeof identity!=='string'||!identity.trim()||identity.length>160||/[\x00-\x1f/\\]/.test(identity)||typeof row.artist!=='string'||!row.artist.trim()||row.artist.length>160||/[\x00-\x1f/\\]/.test(row.artist)||!ESMOJO_WEB_REPORT_VENUES.some(venue=>typeof row.venue==='string'&&reportVenueName(venue).toLocaleLowerCase('nl-NL')===row.venue.toLocaleLowerCase('nl-NL'))||typeof row.city!=='string'||!row.city||!validTimetableDate(row.date)||row.date>=Utilities.formatDate(new Date(),'Europe/Amsterdam','yyyy-MM-dd')||!['','middag','avond'].includes(row.performance||'')||typeof row.seriesId!=='string'||!row.seriesId||!(row.sourceType==='tsc-historical'?row.ticket_sales===null&&esmojoTscShowDataValid_(row.showData):typeof row.ticket_sales==='string'&&/^\d{1,9}$/.test(row.ticket_sales))||typeof row.sample!=='boolean'||!Number.isSafeInteger(row.incidentCount)||row.incidentCount<1||typeof row.csvBase64!=='string'||row.csvBase64.length>2800000||!/^[a-f0-9]{64}$/.test(row.sha256||'')||row.previousHash!==null&&!/^[a-f0-9]{64}$/.test(row.previousHash||'')||!row.audit||row.audit.classification!=='vertrouwelijk')throw Error('VALIDATION');
  const expected=identity.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.venue.normalize('NFC').trim().replace(/[\s_/\\]+/g,'-')+'_'+row.date.slice(8,10)+row.date.slice(5,7)+row.date.slice(0,4)+(row.performance==='middag'?'_S1':row.performance==='avond'?'_S2':'');
  if(row.concertId!==expected||ids.has(row.concertId))throw Error('VALIDATION');ids.add(row.concertId);
 }
 return{data,hash:esmojoOnTrackHash_(content),production};
}
function esmojoHistoricalImportDone_(saved,row,batchHash){return Boolean(saved&&saved.importState==='complete'&&saved.importBatch===batchHash&&saved.artist===row.artist&&saved.ticket_sales===row.ticket_sales&&saved.source.sha256===row.sha256&&saved.source.folderId===ESMOJO_ONTRACK_FOLDER_ID&&(row.sourceType!=='tsc-historical'||saved.sourceType===row.sourceType&&JSON.stringify(saved.showData)===JSON.stringify(row.showData)));}
function esmojoHistoricalImport_(request){
 const op=request.operation,allowed=op==='historical-import-read'?['operation','batch','phase']:op==='historical-import-verify'?['operation','batch','phase','offset']:['operation','batch','phase','batchHash','concertId','sourceHash'];
 if(Object.keys(request).some(key=>!allowed.includes(key))||!['historical-import-read','historical-import-commit','historical-import-verify'].includes(op)||!['sample','all'].includes(request.phase))throw Error('VALIDATION');
 const batch=esmojoHistoricalBatch_(request.batch),register=esmojoHistoricalRegister_(),rows=batch.data.entries.filter(row=>request.phase==='all'||row.sample),byId=new Map(register.entries.map(row=>[row.concertId,row]));
 if(op==='historical-import-verify'){
  if(!Number.isSafeInteger(request.offset)||request.offset<0||request.offset>rows.length)throw Error('VALIDATION');
  const entries=rows.slice(request.offset,request.offset+5).map(row=>{
   const saved=byId.get(row.concertId);if(!esmojoHistoricalImportDone_(saved,row,batch.hash))throw Error('IMPORT_UNCONFIRMED');
   if(row.sourceType==='tsc-historical'){const folder=esmojoHistoricalConcertFolder_(saved.concertFolderId,saved.concertId),metadata=esmojoOnTrackFile_(folder,'showgegevens-tsc.json');if(!metadata||JSON.stringify(JSON.parse(metadata.getBlob().getDataAsString('UTF-8')).showData)!==JSON.stringify(row.showData))throw Error('IMPORT_UNCONFIRMED');}
   const file=esmojoHistoricalSourceFile_({id:saved.source.id,concertFolderId:saved.concertFolderId,sourceFolderId:saved.source.folderId,show:{key:saved.concertId}});
   if(file.getName()!==saved.source.name||file.getSize()!==saved.source.size||file.getLastUpdated().toISOString()!==saved.source.modifiedAt)throw Error('SOURCE_CHANGED');
   const bytes=file.getBlob().getBytes();if(esmojoOnTrackHash_(bytes)!==row.sha256)throw Error('SOURCE_CHANGED');
   return Object.assign({},row,{csvBase64:Utilities.base64Encode(bytes),preparation:esmojoHistoricalPreparation_({concertId:row.concertId})});
  });return{entries,total:rows.length,nextOffset:request.offset+entries.length};
 }
 if(op==='historical-import-read'){
  const pending=rows.filter(row=>!esmojoHistoricalImportDone_(byId.get(row.concertId),row,batch.hash));
  return{batchHash:batch.hash,total:rows.length,complete:rows.length-pending.length,pending:pending.length,entries:pending.slice(0,2)};
 }
 if(request.batchHash!==batch.hash)throw Error('SOURCE_CHANGED');
 const row=rows.find(row=>row.concertId===request.concertId);if(!row||request.sourceHash!==row.sha256)throw Error('VALIDATION');
 const old=byId.get(row.concertId);if(esmojoHistoricalImportDone_(old,row,batch.hash))return{ok:true};
 const bytes=Utilities.base64Decode(row.csvBase64);if(bytes.length>2*1024*1024||esmojoOnTrackHash_(bytes)!==row.sha256)throw Error('SOURCE_CHANGED');
 // A repeated invocation may resume this exact batch. Never overwrite an unrelated source.
 if(old&&old.source.sha256!==row.previousHash&&old.source.sha256!==row.sha256)throw Error('SOURCE_CHANGED');
 const uniqueFolder=(parent,name)=>{const found=parent.getFoldersByName(name),folder=found.hasNext()?found.next():parent.createFolder(name);if(found.hasNext()||folder.isTrashed())throw Error('REPORT_CONFLICT');return folder;};
 const concert=old?esmojoHistoricalConcertFolder_(old.concertFolderId||old.source.folderId,row.concertId):uniqueFolder(uniqueFolder(batch.production,row.artist),row.concertId);
 const ticketFile=esmojoOnTrackFile_(concert,'bezoekersdata.json'),tickets=esmojoReadTicketData_(ticketFile,row.concertId),workflow=JSON.parse(tickets.workflow_json),sales=workflow.visitors.fields.ticket_sales;
 if(row.sourceType!=='tsc-historical'&&sales&&sales.content!==row.ticket_sales)throw Error('TICKET_CONFLICT');
 if(row.sourceType!=='tsc-historical'&&!sales)workflow.visitors.fields.ticket_sales={content:row.ticket_sales,version:1,completed_at:new Date().toISOString()};
 tickets.workflow_json=JSON.stringify(workflow);
 const write=(folder,name,data)=>{const text=JSON.stringify(data),file=esmojoOnTrackFile_(folder,name),saved=file?(file.setContent(text),file):folder.createFile(Utilities.newBlob(text,'application/json',name));if(saved.getBlob().getDataAsString('UTF-8')!==text)throw Error('IMPORT_UNCONFIRMED');return saved;};
 const auditFile=esmojoOnTrackFile_(concert,'importcontrole.json');
 if(auditFile){const audit=JSON.parse(auditFile.getBlob().getDataAsString('UTF-8'));if(audit.managedBy!=='ESMOJO/HistoricalImportAudit-v1'||audit.classification!=='vertrouwelijk'||audit.concertId!==row.concertId)throw Error('REPORT_CONFLICT');}
 if(row.sourceType==='tsc-historical'){const previous=esmojoOnTrackFile_(concert,'showgegevens-tsc.json');if(previous){const saved=JSON.parse(previous.getBlob().getDataAsString('UTF-8'));if(saved.managedBy!=='ESMOJO/TscHistoricalShow-v1'||saved.classification!=='vertrouwelijk'||saved.concertId!==row.concertId||JSON.stringify(saved.showData)!==JSON.stringify(row.showData))throw Error('REPORT_CONFLICT');}write(concert,'showgegevens-tsc.json',{managedBy:'ESMOJO/TscHistoricalShow-v1',classification:'vertrouwelijk',version:1,concertId:row.concertId,showData:row.showData});}
 write(concert,'bezoekersdata.json',tickets);write(concert,'importcontrole.json',row.audit);
 const ontrack=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),name='incidents_'+row.concertId+'.csv',pendingName=name+'.historical-pending';
 let csv;
 if(old?.importState==='pending'&&old.importBatch===batch.hash){
  csv=DriveApp.getFileById(old.source.id);const parents=csv.getParents(),parent=parents.hasNext()?parents.next():null;
  if(!parent||parents.hasNext()||![concert.getId(),ESMOJO_ONTRACK_FOLDER_ID].includes(parent.getId())||csv.isTrashed())throw Error('SOURCE_MISSING');
 }else csv=old?esmojoHistoricalSourceFile_({id:old.source.id,concertFolderId:old.concertFolderId||old.source.folderId,sourceFolderId:old.source.folderId,show:{key:old.concertId}}):esmojoOnTrackFile_(ontrack,pendingName);
 if(!csv){if(esmojoOnTrackFile_(ontrack,name))throw Error('REPORT_CONFLICT');csv=ontrack.createFile(Utilities.newBlob(bytes,'text/csv',pendingName));}
 else{const actual=esmojoOnTrackHash_(csv.getBlob().getBytes());if(actual!==row.previousHash&&actual!==row.sha256)throw Error('SOURCE_CHANGED');}
 // Register BEFORE moving/renaming into the watched folder: both normal workers
 // skip every registered source ID, including pending imports. No mail/PDF race.
 const entry={concertId:row.concertId,artist:row.artist,...(row.identityArtist?{identityArtist:row.identityArtist}:{}),venue:row.venue,city:row.city,date:row.date,performance:row.performance||null,seriesId:row.seriesId,ticket_sales:row.ticket_sales,...(row.sourceType==='tsc-historical'?{sourceType:row.sourceType,showData:row.showData}:{}),concertFolderId:concert.getId(),importBatch:batch.hash,importState:'pending',source:{id:csv.getId(),folderId:old?.source.folderId||ESMOJO_ONTRACK_FOLDER_ID,name,size:bytes.length,modifiedAt:csv.getLastUpdated().toISOString(),sha256:row.sha256}};
 const save=()=>write(batch.production,'_esmojo_historical_reports_v1.json',{version:1,managedBy:'ESMOJO/HistoricalReports-v1',classification:'vertrouwelijk',entries:register.entries});
 const index=register.entries.findIndex(item=>item.concertId===row.concertId);if(index>=0)register.entries[index]=entry;else register.entries.push(entry);save();
 csv.setContent(Utilities.newBlob(bytes).getDataAsString('UTF-8'));csv.moveTo(ontrack);csv.setName(name);
 if(esmojoOnTrackHash_(csv.getBlob().getBytes())!==row.sha256)throw Error('IMPORT_UNCONFIRMED');
 entry.source.folderId=ESMOJO_ONTRACK_FOLDER_ID;entry.source.modifiedAt=csv.getLastUpdated().toISOString();entry.source.size=csv.getSize();entry.importState='complete';save();
 CacheService.getScriptCache().remove('artist-catalogue-v2');
 return{ok:true};
}
