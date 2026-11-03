// OnTrack is geïsoleerd van showbestanden. Alleen de expliciet aangewezen map.
const ESMOJO_ONTRACK_FOLDER_ID = '1V5lw-IicMW_bkphtjD4HIEejCpsOapps';
function esmojoOnTrack_(input) {
  const denied = code => esmojoReply_({ok:false,code:code || 'FORBIDDEN'});
  const secret=PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
  if(!secret || secret.length<32 || typeof input.body!=='string' || input.body.length>110000 || !Number.isSafeInteger(input.timestamp) || Math.abs(Date.now()-input.timestamp)>120000 || !/^[a-f0-9]{32}$/.test(input.nonce || '') || !/^[a-f0-9]{64}$/.test(input.signature || '')) return denied();
  const hex=bytes=>bytes.map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');
  const digest=hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,input.body,Utilities.Charset.UTF_8));
  const expected=hex(Utilities.computeHmacSha256Signature('ontrack\n'+input.timestamp+'\n'+input.nonce+'\n'+digest,secret,Utilities.Charset.UTF_8));
  let difference=0;for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^input.signature.charCodeAt(i);
  if(difference)return denied();
  const lock=LockService.getScriptLock();if(!lock.tryLock(20000))return denied('BUSY');
  try {
    const request=JSON.parse(input.body);
    if(!['status','recipients'].includes(request.operation)||Object.keys(request).some(key=>!['operation','actor','revision','recipientIds'].includes(key)))return denied('VALIDATION');
    const accountFiles=DriveApp.getFolderById(ESMOJO_FOLDER_ID).getFilesByName('_esmojo_accounts_v1.json');
    if(!accountFiles.hasNext())return denied();
    const profiles=JSON.parse(accountFiles.next().getBlob().getDataAsString('UTF-8')).profiles;
    if(accountFiles.hasNext()||!Array.isArray(profiles))return denied();
    const actor=profiles.find(p=>p.id===request.actor&&p.activated&&!p.disabled&&p.role==='beheerder');
    if(!actor)return denied();
    const folder=DriveApp.getFolderById(ESMOJO_ONTRACK_FOLDER_ID);if(folder.isTrashed())throw Error();
    const registers=folder.getFilesByName('_esmojo_ontrack_v1.json'),file=registers.hasNext()?registers.next():null;
    if(registers.hasNext())throw Error();
    const state=file?JSON.parse(file.getBlob().getDataAsString('UTF-8')):{version:1,revision:0,recipientIds:[],sources:[],reports:[],nonces:{}};
    if(state.version!==1||!Number.isSafeInteger(state.revision)||state.revision<0||!Array.isArray(state.recipientIds)||!Array.isArray(state.sources)||!Array.isArray(state.reports)||!state.nonces)throw Error();
    const accounts=profiles.filter(p=>p.activated&&!p.disabled).map(p=>({id:p.id,firstName:p.firstName,lastName:p.lastName,email:p.email}));
    let changed=false;
    if(request.operation==='recipients'){
      if(!Number.isSafeInteger(request.revision)||request.revision<0||!Array.isArray(request.recipientIds)||new Set(request.recipientIds).size!==request.recipientIds.length||request.recipientIds.some(id=>typeof id!=='string'||!accounts.some(p=>p.id===id)))return denied('VALIDATION');
      // Verlies geen wijzigingen door gelijktijdige beheerders of een oude pagina.
      if(request.revision!==state.revision)return denied('CONFLICT');
      if(state.nonces[input.nonce])return denied();
      Object.keys(state.nonces).forEach(nonce=>{if(state.nonces[nonce]<Date.now()-120000)delete state.nonces[nonce];});
      state.nonces[input.nonce]=input.timestamp;state.recipientIds=request.recipientIds.slice();state.revision++;state.updatedAt=new Date().toISOString();state.updatedBy=actor.id;changed=true;
    }
    // Inventariseer alleen metadata; CSV-inhoud en PDF-verwerking wachten op de prompt.
    const files=folder.getFiles(),known=new Set(state.sources.map(source=>source.id));
    while(files.hasNext()){
      const source=files.next();
      if(!source.isTrashed()&&/\.csv$/i.test(source.getName())&&!known.has(source.getId())){
        state.sources.push({id:source.getId(),name:source.getName(),receivedAt:source.getDateCreated().toISOString()});known.add(source.getId());changed=true;
      }
    }
    if(changed){const serialized=JSON.stringify(state);if(file)file.setContent(serialized);else folder.createFile(Utilities.newBlob(serialized,'application/json','_esmojo_ontrack_v1.json'));}
    const reports=state.reports.filter(report=>typeof report.sourceId==='string'&&typeof report.pdfId==='string'&&Number.isFinite(Date.parse(report.convertedAt)));
    return esmojoReply_({ok:true,data:{revision:state.revision,received:state.sources.length,converted:new Set(reports.map(report=>report.sourceId)).size,latest:reports.slice().sort((a,b)=>Date.parse(b.convertedAt)-Date.parse(a.convertedAt)).slice(0,5).map(report=>({name:report.name,convertedAt:report.convertedAt,emailStatus:report.emailStatus==='sent'?'sent':report.emailStatus==='failed'?'failed':'pending'})),recipientIds:state.recipientIds,accounts,processingStatus:'awaiting_report_specification'}});
  } catch (_) {return denied('ONTRACK_UNAVAILABLE');} finally {lock.releaseLock();}
}
