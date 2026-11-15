// Fixed signed native Reports intake and legacy-writer fence. Original files and
// registers remain untouched. This property is technical authority coordination.
function esmojoReportsRuntimePolicy_(){
 const text=PropertiesService.getScriptProperties().getProperty('ESMOJO_REPORTS_RUNTIME_V1');if(!text)return{version:1,contract:'reports-native-runtime-v1',mode:'legacy',epoch:null,revision:0,drainUntil:null};
 let value;try{value=JSON.parse(text);}catch(_){throw Error('REPORT_CONFLICT');}
 if(value.version!==1||value.contract!=='reports-native-runtime-v1'||!['legacy','freeze','dataverse'].includes(value.mode)||!Number.isSafeInteger(value.revision)||value.revision<0||value.mode!=='legacy'&&(!/^[a-f0-9-]{36}$/i.test(value.epoch||'')||!Number.isFinite(value.drainUntil)))throw Error('REPORT_CONFLICT');return value;
}
function esmojoReportsRuntimeGuard_(operation){
 const policy=esmojoReportsRuntimePolicy_();if(policy.mode==='legacy'||operation==='reports-runtime-policy'||operation.startsWith('reports-inbox-')||operation.startsWith('reports-migration-'))return policy;
 const reads=['web-menu','web-read','web-source','web-scan','web-historical-status','timetable-read','pdf-alerts','email-history','download','email-context','historical-import-read','historical-import-verify'];
 if(policy.mode==='freeze'&&reads.includes(operation))return policy;
 if(policy.mode==='freeze'&&Date.now()<policy.drainUntil&&['commit','fail','delivery-commit','delivery-fail','online-commit','online-fail','web-commit','timetable-save','historical-import-commit'].includes(operation))return policy;
 throw Error('REPORT_CONFLICT');
}
function esmojoReportsRuntime_(request,profiles){
 if(request.contract!=='reports-native-runtime-v1')throw Error('FORBIDDEN');
 if(request.operation==='reports-runtime-policy'){
  const keys=Object.keys(request).sort().join(','),writing=request.next!==undefined;
  if(keys!==(writing?'actor,contract,expectedRevision,nativeReportsAllowed,next,operation':'actor,contract,nativeReportsAllowed,operation')||request.nativeReportsAllowed!==true||typeof request.actor!=='string'||!profiles.some(p=>p.id===request.actor&&isAdministrator(p)))throw Error('FORBIDDEN');
  const current=esmojoReportsRuntimePolicy_();if(!writing)return current;
  const next=request.next;
  if(request.expectedRevision!==current.revision||!next||Object.keys(next).sort().join(',')!=='drainUntil,epoch,mode'||!['legacy','freeze','dataverse'].includes(next.mode)||!/^[a-f0-9-]{36}$/i.test(next.epoch||'')||!Number.isFinite(next.drainUntil)||current.mode==='dataverse'&&(next.mode!=='dataverse'||next.epoch!==current.epoch)||current.mode!=='legacy'&&next.epoch!==current.epoch||next.mode==='dataverse'&&current.mode!=='freeze'&&current.mode!=='dataverse'||next.mode==='freeze'&&current.mode==='legacy'&&(next.drainUntil<Date.now()+11*60000||next.drainUntil>Date.now()+12*60000))throw Error('REPORT_CONFLICT');
  if(current.mode===next.mode&&current.epoch===next.epoch&&current.drainUntil===next.drainUntil)return current;
  const value={version:1,contract:current.contract,mode:next.mode,epoch:next.epoch,revision:current.revision+1,drainUntil:next.drainUntil},text=JSON.stringify(value),properties=PropertiesService.getScriptProperties();properties.setProperty('ESMOJO_REPORTS_RUNTIME_V1',text);
  if(properties.getProperty('ESMOJO_REPORTS_RUNTIME_V1')!==text)throw Error('REPORT_UNAVAILABLE');return value;
 }
 const op=request.operation;
 if(op.startsWith('reports-inbox-timetable-')){
  const action=op.slice('reports-inbox-'.length),keys=Object.keys(request).sort().join(',');
  if(action==='timetable-candidates'&&keys==='contract,operation')return esmojoShowTimetables_({operation:action});
  if(action==='timetable-read'&&keys==='concertId,contract,operation')return esmojoShowTimetables_({operation:action,actor:'reports-intake-worker',concertId:request.concertId});
  if(action==='timetable-save'&&keys==='concertId,contract,operation,snapshot')return esmojoShowTimetables_({operation:action,concertId:request.concertId,snapshot:request.snapshot});
  throw Error('VALIDATION');
 }
 if(op==='reports-inbox-list'){
  if(Object.keys(request).sort().join(',')!=='contract,operation')throw Error('VALIDATION');
  const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(folder.isTrashed())throw Error('SOURCE_MISSING');const files=[],iterator=folder.getFiles(),historical=esmojoHistoricalSources_(),historicalIds=new Set(historical.map(row=>row.id));
  while(iterator.hasNext()){const file=iterator.next();if(file.isTrashed()||historicalIds.has(file.getId())||!/\.csv$/i.test(file.getName()))continue;files.push({id:file.getId(),name:file.getName(),mime:file.getMimeType(),size:file.getSize(),modifiedAt:file.getLastUpdated().toISOString(),receivedAt:file.getDateCreated().toISOString()});if(files.length>10000)throw Error('REPORT_UNAVAILABLE');}
  return{version:1,files,historical};
 }
 if(op!=='reports-inbox-read'||Object.keys(request).sort().join(',')!=='contract,modifiedAt,name,operation,size,sourceId'||!/^[-\w]{1,200}$/.test(request.sourceId||'')||typeof request.name!=='string'||!Number.isSafeInteger(request.size)||request.size<1||request.size>2*1024*1024||!Number.isFinite(Date.parse(request.modifiedAt)))throw Error('VALIDATION');
 const historical=esmojoHistoricalSources_().find(row=>row.id===request.sourceId),file=historical?esmojoHistoricalSourceFile_(historical):esmojoOnTrackSourceFile_(request.sourceId);
 if(file.getName()!==request.name||file.getSize()!==request.size||file.getLastUpdated().toISOString()!==request.modifiedAt||!/\.csv$/i.test(file.getName())||!['text/csv','application/csv','text/plain','application/vnd.ms-excel'].includes(file.getMimeType()))throw Error('SOURCE_CHANGED');
 const bytes=file.getBlob().getBytes();if(bytes.length!==request.size)throw Error('SOURCE_CHANGED');return{version:1,sourceId:request.sourceId,sha256:esmojoOnTrackHash_(bytes),csvBase64:Utilities.base64Encode(bytes)};
}
// Other modules keep their own preparation/daily-state authority. Once Reports
// is native they must not load a second Reports runtime inventory from Drive.
function esmojoReportsRelatedInventory_(folder,catalogue,names,registered){
 if(esmojoReportsRuntimePolicy_().mode==='dataverse')return{sources:[],available:[],reports:[],pending:0,unlinked:0};
 return esmojoWebInventory_(folder,catalogue,names,registered);
}

function esmojoReportsNativeActive_(){return esmojoReportsRuntimePolicy_().mode==='dataverse';}
