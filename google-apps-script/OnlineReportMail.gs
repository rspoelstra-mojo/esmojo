// Zelfstandige online-afleveringen binnen het bestaande vertrouwelijke register.
// Alleen gevalideerde, momenteel zichtbare CSV-versies mogen een mail activeren.
function esmojoOnlineReportId_(source){return esmojoOnTrackHash_('online-showreport-v1\n'+source.show.key+'\n'+source.entry.sourceHash);}
function esmojoOnlineVisible_(folder){const inventory=esmojoWebInventory_(folder),ids=new Set(inventory.reports.flatMap(report=>report.shows.map(show=>show.concertId)));return inventory.available.filter(source=>ids.has(source.show.key));}
function esmojoOnlineEmailStatus_(report){report.emailStatus=!report.deliveries.length?'no-recipients':report.deliveries.every(row=>row.status==='sent')?'sent':report.deliveries.some(row=>['failed','review','skipped'].includes(row.status))?'failed':'pending';}
function esmojoOnlineReportMail_(request,folder,state,profiles,save){
 const op=request.operation,allowed={
  'online-sync':['operation'],'online-reserve':request.trackingVersion===undefined?['operation','jobId']:['operation','jobId','trackingVersion'],
  'online-commit':['operation','reportId','recipientId','jobId','providerId'],
  'online-fail':['operation','reportId','recipientId','jobId'],
  'pdf-alerts':['operation','actor'],
 }[op];
 if(request.trackingVersion!==undefined&&request.trackingVersion!=='mail-open-v1')throw Error('VALIDATION');
 if(!allowed||Object.keys(request).sort().join(',')!==allowed.sort().join(','))throw Error('VALIDATION');
 if(op==='pdf-alerts'){
  const actor=profiles.find(row=>row.id===request.actor&&row.activated&&!row.disabled&&hasModule(row,'reports'));if(!actor)throw Error('FORBIDDEN');
  if(!isAdministrator(actor)&&!state.recipientIds.includes(actor.id))return{alerts:[]};
  const visible=esmojoOnlineVisible_(folder),alerts=[];
  for(const source of state.sources){const shown=visible.find(row=>row.id===source.id);if(!shown)continue;const failed=['invalid','failed'].includes(source.status)&&/^REPORT_|^PDF_|^GENERATION_FAILED$|^ONTRACK_ICON_MISSING$/.test(source.errorCode||''),missingAssets=state.pipeline?.status==='assets-missing'&&!state.reports.some(row=>row.sourceHash===shown.entry.sourceHash&&row.show?.key===shown.show.key&&row.pdfId);if(!failed&&!missingAssets)continue;
   alerts.push({id:esmojoOnTrackHash_(source.id+'\n'+source.modifiedAt+'\n'+(source.errorCode||'ONTRACK_ICON_MISSING')),concertId:shown.show.key,artist:shown.show.name,date:shown.show.date});
  }
  return{alerts:alerts.slice(0,50)};
 }
 if(state.onlineReports!==undefined&&!Array.isArray(state.onlineReports))throw Error('REGISTER_INVALID');
 const reports=state.onlineReports||(state.onlineReports=[]);
 if(op==='online-sync'){
  const bootstrap=!state.onlineMailStartedAt,visible=esmojoOnlineVisible_(folder),active=new Set(profiles.filter(row=>row.activated&&!row.disabled&&hasModule(row,'reports')).map(row=>row.id));let queued=0;
  for(const source of visible){const id=esmojoOnlineReportId_(source);if(reports.some(row=>row.id===id))continue;
   const legacy=state.reports.find(row=>row.mailChannel!=='online'&&row.sourceHash===source.entry.sourceHash&&row.show?.key===source.show.key);
   // Bestaande afleveringen behouden hun sleutel, bytes en onzekere status.
   // Bij omschakeling geen oude, nooit voor mail gekoppelde archieven terugmailen.
   const historical=bootstrap&&!legacy&&source.show.origin==='filename',recipients=legacy||historical?[]:[...new Set(state.recipientIds)].filter(id=>active.has(id));
   const report={id,sourceId:source.id,sourceHash:source.entry.sourceHash,show:{key:source.show.key,name:source.show.name,venue:source.show.venue,dates:[source.show.date]},publishedAt:source.entry.validatedAt,legacyReportId:legacy?.id||null,historical,deliveries:recipients.map(recipientId=>({recipientId,status:'pending',attempts:0}))};
   esmojoOnlineEmailStatus_(report);reports.push(report);queued+=recipients.length;
  }
  if(bootstrap)state.onlineMailStartedAt=new Date().toISOString();save();return{queued,tracking:'mail-open-v1'};
 }
 if(typeof request.jobId!=='string'||!/^[0-9a-f-]{36}$/i.test(request.jobId))throw Error('VALIDATION');
 if(op==='online-reserve'){
  const visible=esmojoOnlineVisible_(folder);let changed=false;
  for(const report of reports){if(report.legacyReportId||report.historical)continue;
   const source=visible.find(source=>esmojoOnlineReportId_(source)===report.id);if(!source)continue;
   for(const delivery of report.deliveries){
    if(['sent','review','skipped'].includes(delivery.status)||delivery.attempts>=3||delivery.job&&Date.parse(delivery.job.expiresAt)>Date.now()||delivery.lastAttemptAt&&Date.now()-Date.parse(delivery.lastAttemptAt)<300000)continue;
    const profile=profiles.find(row=>row.id===delivery.recipientId&&row.activated&&!row.disabled&&hasModule(row,'reports'));
    if(!profile){delivery.status='skipped';changed=true;esmojoOnlineEmailStatus_(report);continue;}
    if(delivery.firstAttemptAt&&Date.now()-Date.parse(delivery.firstAttemptAt)>23*3600000){delivery.status='review';changed=true;esmojoOnlineEmailStatus_(report);continue;}
    if(esmojoOnTrackHash_(esmojoOnTrackSourceFile_(source.id).getBlob().getBytes())!==report.sourceHash)continue;
    if(delivery.mail?.version==='online-report-v4'&&request.trackingVersion!=='mail-open-v1')continue;
    if(!delivery.mail)delivery.mail={version:request.trackingVersion==='mail-open-v1'&&!delivery.attempts&&!delivery.firstAttemptAt?'online-report-v4':'online-report-v3',senderId:'show-report',managerName:esmojoOnTrackManager_(report.show,profiles)};
    if(!['online-report-v3','online-report-v4'].includes(delivery.mail.version))throw Error('REPORT_UNAVAILABLE');
    if(delivery.mail.version==='online-report-v4'&&!delivery.receiptToken)delivery.receiptToken=esmojoMailReceiptToken_(report.id,delivery.recipientId);
    if(!delivery.target)delivery.target={email:profile.email,firstName:profile.firstName};
    const now=new Date().toISOString();delivery.firstAttemptAt=delivery.firstAttemptAt||now;delivery.lastAttemptAt=now;delivery.attempts=(delivery.attempts||0)+1;delivery.status='processing';delivery.job={id:request.jobId,expiresAt:new Date(Date.now()+300000).toISOString()};save();
    return{state:'reserved',reportId:report.id,recipientId:delivery.recipientId,jobId:request.jobId,recipient:delivery.target,...(delivery.mail.version==='online-report-v4'?{receiptToken:delivery.receiptToken}:{}),show:report.show,managerName:delivery.mail.managerName,senderId:delivery.mail.senderId,idempotencyKey:'esmojo-webreport-'+report.id+'-'+esmojoOnTrackHash_(delivery.recipientId).slice(0,16)};
   }
  }
  if(changed)save();return{state:'idle'};
 }
 if(!/^[a-f0-9]{64}$/.test(request.reportId||'')||typeof request.recipientId!=='string'||request.recipientId.length>100)throw Error('VALIDATION');
 const report=reports.find(row=>row.id===request.reportId),delivery=report?.deliveries.find(row=>row.recipientId===request.recipientId);if(!delivery)throw Error('REPORT_CONFLICT');
 if(op==='online-commit'&&delivery.status==='sent'&&delivery.providerId===request.providerId)return{ok:true};
 if(op==='online-fail'&&delivery.status==='sent')return{ok:true};
 if(delivery.job?.id!==request.jobId)throw Error('REPORT_CONFLICT');
 if(op==='online-commit'){
  if(typeof request.providerId!=='string'||!request.providerId||request.providerId.length>100||/[\x00-\x1f]/.test(request.providerId))throw Error('VALIDATION');delivery.status='sent';delivery.providerId=request.providerId;delivery.sentAt=new Date().toISOString();
 }else delivery.status='failed';
 delivery.job=null;esmojoOnlineEmailStatus_(report);save();return{ok:true};
}

// Vertrouwelijke klikregistratie: alleen Drive-opslag, nooit tokens naar het beheer-UI.
function esmojoMailReceiptToken_(reportId,recipientId){
 const secret=PropertiesService.getScriptProperties().getProperty('ESMOJO_SHARED_SECRET');
 return Utilities.computeHmacSha256Signature('mail-open-v1\n'+reportId+'\n'+recipientId,secret,Utilities.Charset.UTF_8).map(byte=>('0'+((byte+256)%256).toString(16)).slice(-2)).join('');
}
function esmojoMailEngagement_(request,state,profiles,save){
 const history=request.operation==='email-history',allowed=history?['actor','operation']:['actor','concertId','operation','token'];
 if(Object.keys(request).sort().join(',')!==allowed.sort().join(','))throw Error('VALIDATION');
 const actor=profiles.find(row=>row.id===request.actor&&row.activated&&!row.disabled&&hasModule(row,'reports'));
 if(!actor||history&&!isAdministrator(actor))throw Error('FORBIDDEN');
 const reports=[...(state.onlineReports||[]),...state.reports.filter(row=>row.mailChannel!=='online')];
 if(!history){
  if(typeof request.concertId!=='string'||!request.concertId||request.concertId.length>240||/[\x00-\x1f/\\]/.test(request.concertId)||typeof request.token!=='string'||!/^[a-f0-9]{64}$/.test(request.token))throw Error('VALIDATION');
  for(const report of reports){if(report.show?.key!==request.concertId)continue;
   const delivery=report.deliveries?.find(row=>row.recipientId===actor.id&&Number.isFinite(Date.parse(row.firstAttemptAt))&&row.mail?.version==='online-report-v4');
   if(!delivery||!/^[a-f0-9]{64}$/.test(delivery.receiptToken||''))continue;
   let difference=0;for(let i=0;i<64;i++)difference|=delivery.receiptToken.charCodeAt(i)^request.token.charCodeAt(i);
   if(difference)continue;
   // De ontvanger bewijst bezit van zijn verstuurde link. Bewaar dit ook als
   // de Resend-bevestiging nog onderweg is; wijzig nooit de verzendstatus.
   if(!delivery.openedAt){delivery.openedAt=new Date().toISOString();save();}
   return{ok:true,recorded:true};
  }
  // Geen informatie over andere ontvangers of bestaande tokens teruggeven.
  return{ok:true,recorded:false};
 }
 const result=[];
 for(const report of reports){
  const sent=(report.deliveries||[]).filter(row=>row.status==='sent');if(!sent.length)continue;
  const recipients=sent.map(delivery=>{
   const profile=profiles.find(row=>row.id===delivery.recipientId),email=delivery.target?.email||profile?.email||null;
   const name=[profile?.firstName,profile?.lastName].filter(part=>typeof part==='string'&&part.trim()).join(' ')||delivery.target?.firstName||email||'Onbekende ontvanger';
   const tracked=delivery.mail?.version==='online-report-v4'&&/^[a-f0-9]{64}$/.test(delivery.receiptToken||'');
   return{id:delivery.recipientId,name,email,tracked,openedAt:tracked&&Number.isFinite(Date.parse(delivery.openedAt))?delivery.openedAt:null};
  });
  const times=sent.map(row=>row.sentAt).filter(value=>Number.isFinite(Date.parse(value))).sort();
  result.push({id:report.id,artist:report.show?.name||'Showrapportage',venue:report.show?.venue||null,dates:(report.show?.dates||[]).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)),sentAt:times.at(-1)||null,recipients});
 }
 result.sort((a,b)=>(b.sentAt||'').localeCompare(a.sentAt||'')||a.id.localeCompare(b.id));
 return{reports:result.slice(0,10),profiles:[],profilesReady:false};
}
