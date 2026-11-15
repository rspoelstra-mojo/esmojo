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
  const current=esmojoReportsRuntimePolicy_();if(!writing)return{...current,activationProtocols:['full-v1','confirmed-copy-v1']};
  const next=request.next,fast=next?.switchMode==='confirmed-copy-v1';
  if(request.expectedRevision!==current.revision||!next||Object.keys(next).sort().join(',')!==(fast?'drainUntil,epoch,inventoryFingerprint,mode,pipelineBaseline,switchMode':'drainUntil,epoch,mode')||!['legacy','freeze','dataverse'].includes(next.mode)||!/^[-a-f0-9]{36}$/i.test(next.epoch||'')||!Number.isFinite(next.drainUntil)||current.mode==='dataverse'&&(next.mode!=='dataverse'||next.epoch!==current.epoch)||current.mode!=='legacy'&&next.epoch!==current.epoch||next.mode==='dataverse'&&current.mode!=='freeze'&&current.mode!=='dataverse'&&!fast||next.mode==='freeze'&&current.mode==='legacy'&&(next.drainUntil<Date.now()+11*60000||next.drainUntil>Date.now()+12*60000)||fast&&(next.mode!=='dataverse'||!/^[a-f0-9]{64}$/.test(next.inventoryFingerprint||'')))throw Error('REPORT_CONFLICT');
  if(fast&&current.mode==='legacy'){
   const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID),file=esmojoOnTrackFile_(folder,'_esmojo_ontrack_v1.json'),state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{sources:[],reports:[]},groups=[...(state.reports||[]),...(state.onlineReports||[])];
   if((state.sources||[]).some(row=>row.job&&Date.parse(row.job.expiresAt)>Date.now())||groups.some(row=>(row.deliveries||[]).some(d=>d.job&&Date.parse(d.job.expiresAt)>Date.now())))throw Error('BUSY');
   const currentProof=esmojoReportsMigration_({operation:'reports-migration-freshness',actor:request.actor,fingerprint:next.inventoryFingerprint,baseline:next.pipelineBaseline});if(currentProof.matches!==true)throw Error('REPORT_CONFLICT');
  }
  if(current.mode===next.mode&&current.epoch===next.epoch&&current.drainUntil===next.drainUntil)return current;
  const value={version:1,contract:current.contract,mode:next.mode,epoch:next.epoch,revision:current.revision+1,drainUntil:next.drainUntil,...(fast?{switchMode:next.switchMode,inventoryFingerprint:next.inventoryFingerprint}:{})},text=JSON.stringify(value),properties=PropertiesService.getScriptProperties();properties.setProperty('ESMOJO_REPORTS_RUNTIME_V1',text);
  if(properties.getProperty('ESMOJO_REPORTS_RUNTIME_V1')!==text)throw Error('REPORT_UNAVAILABLE');return value;
 }
 const op=request.operation;
 if(op.startsWith('reports-inbox-timetable-'))throw Error('INTEGRATION_RETIRED');
 if(['reports-inbox-list','reports-inbox-read'].includes(op))throw Error('CSV_INTAKE_DISABLED');
 throw Error('VALIDATION');
}
// Other modules keep their own preparation/daily-state authority. Once Reports
// is native they must not load a second Reports runtime inventory from Drive.
function esmojoReportsRelatedInventory_(folder,catalogue,names,registered){
 if(esmojoReportsRuntimePolicy_().mode==='dataverse')return{sources:[],available:[],reports:[],pending:0,unlinked:0};
 return esmojoWebInventory_(folder,catalogue,names,registered);
}

function esmojoReportsNativeActive_(){return esmojoReportsRuntimePolicy_().mode==='dataverse';}
