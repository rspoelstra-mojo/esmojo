import {createHmac} from 'node:crypto';
import {reportChoice,reportRecord} from '../reports-migration/contract.js';
import {reportIdentity,mailGroupIdentity} from '../reports-migration/map.js';
import {originalReportSettings} from './settings.js';
import {digest,canonical} from '../show-migration-writer.js';
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const jobId=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value);
const time=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const parse=value=>{try{return JSON.parse(value);}catch{throw Error('REPORT_CONFLICT');}};
const status=value=>reportChoice('rapportafleverstatus',value);
const active=p=>p?.activated===true&&!p.disabled;
// Existing workers keep sending/rendering; this component only reserves and
// confirms typed native delivery state. No mail API is called here.
export function createNativeReportMail({env=process.env,repository:repo,mutations,operational,writer,authorize,accounts,visible,selection,processing,intake,manager=async()=>null,download,now=Date.now}){
 if([authorize,accounts,visible,download].some(fn=>typeof fn!=='function'))throw Error('REPORT_CONFIG');
 function metadata(group){const value=parse(group.esmojo_mailparameters_json);if(!value||!validHash(value.id)||value.id!==group.esmojo_oudrapportid||!['online','pdf'].includes(value.channel)||group.esmojo_mailkanaal!==reportChoice('rapportmailkanaal',value.channel)||group.esmojo_verzendfingerprint!==digest({channel:value.channel,id:value.id}))throw Error('REPORT_CONFLICT');return value;}
 async function deliveries(group){const info=metadata(group),version=await repo.byId('esmojo_rapportversie',group._esmojo_rapportversie_value),header=await repo.byId('esmojo_rapportage',version._esmojo_rapportage_value);if(header.esmojo_bronidentiteit!==reportIdentity(info.show))throw Error('REPORT_CONFLICT');const rows=await repo.children('esmojo_rapportaflevering','esmojo_rapportverzending',await repo.idOf('esmojo_rapportverzending',group)),seen=new Set();for(const row of rows){const id=row.esmojo_authgebruikersid;if(typeof id!=='string'||seen.has(id)||row.esmojo_ontvangerhash!==digest(id)||row.esmojo_idempotentiesleutel!==(info.channel==='pdf'?'esmojo-showreport-':'esmojo-webreport-')+info.id+'-'+digest(id).slice(0,16))throw Error('REPORT_CONFLICT');seen.add(id);}return rows;}
 const patch=(table,row,fields)=>({table,key:row.esmojo_sleutel,etag:row['@odata.etag'],fields});
 function mailState(rows){return!rows.length?'no-recipients':rows.every(row=>row.esmojo_afleverstatus===status('sent'))?'sent':rows.some(row=>['failed','review','skipped'].some(s=>row.esmojo_afleverstatus===status(s)))?'failed':'pending';}
 async function change(group,delivery,fields,markWrite){const rows=await deliveries(group),updated=rows.map(row=>row.esmojo_sleutel===delivery.esmojo_sleutel?{...row,...fields}:row);await markWrite();const result=await mutations.atomic([patch('esmojo_rapportaflevering',delivery,fields),patch('esmojo_rapportverzending',group,{esmojo_verzendstatus:status(mailState(updated))})]);Object.assign(group,result.rows[1]);}
 function receipt(reportId,recipientId){if(typeof env.GOOGLE_DRIVE_SHARED_SECRET!=='string'||env.GOOGLE_DRIVE_SHARED_SECRET.length<32)throw Error('REPORT_CONFIG');return createHmac('sha256',env.GOOGLE_DRIVE_SHARED_SECRET).update('mail-open-v1\n'+reportId+'\n'+recipientId).digest('hex');}
 async function sync(){
  if(typeof selection!=='function')throw Error('REPORT_CONFIG');
  return operational.exclusive(()=>authorize(null,{worker:true}),async(state,{markWrite})=>{
   const [groups,people,current,chosen]=await Promise.all([repo.query('esmojo_rapportverzending'),accounts(),visible(),selection(state)]),known=groups.map(row=>({row,info:metadata(row)}));let queued=0;
   const settings=state.onlineMailStartedAt===undefined?await originalReportSettings(repo):null,bootstrap=!state.onlineMailStartedAt&&!settings?.onlineMailStartedAt;
   for(const source of current){
    const version=await repo.byKey('esmojo_rapportversie',source.versionKey),header=await repo.byKey('esmojo_rapportage',source.reportKey);if(!version||!header||version.esmojo_versiestatus!==reportChoice('bronstatus','verified')||version.esmojo_inhoudsha256!==source.sourceHash||header._esmojo_actueleversie_value!==await repo.idOf('esmojo_rapportversie',version))throw Error('SOURCE_CHANGED');
    const id=digest('online-showreport-v1\n'+source.show.key+'\n'+source.sourceHash);if(known.some(row=>row.info.channel==='online'&&row.info.id===id))continue;
    const legacy=known.find(row=>row.info.channel==='pdf'&&row.info.mailChannel!=='online'&&row.info.sourceHash===source.sourceHash&&row.info.show.key===source.show.key),historical=source.show.origin==='historical'||bootstrap&&!legacy&&source.show.origin==='filename';
    const targets=legacy||historical?[]:chosen.recipientIds.filter(id=>people.some(p=>p.id===id&&active(p)&&p.reports===true)),info={id,channel:'online',sourceId:source.sourceId,sourceHash:source.sourceHash,show:{key:source.show.key,name:source.show.name,venue:source.show.venue,dates:[source.show.date]},publishedAt:source.publishedAt,legacyReportId:legacy?.info.id||null,historical},identity=mailGroupIdentity({show:source.show},info),group=reportRecord('rapportverzending',identity,'Online rapportageverzending',{mailkanaal:reportChoice('rapportmailkanaal','online'),oudrapportid:id,verzendfingerprint:digest({channel:'online',id}),verzendstatus:status(targets.length?'pending':'no-recipients'),historisch:historical,gepubliceerdop:source.publishedAt||null,mailparameters_json:canonical(info)},{rapportversie:{table:'esmojo_rapportversie',key:source.versionKey}});
    await authorize(null,{worker:true});await markWrite();await writer.ensure(group);
    for(const recipientId of targets)await writer.ensure(reportRecord('rapportaflevering',identity+'/recipient/'+recipientId,'Rapportageaflevering',{authgebruikersid:recipientId,ontvangerhash:digest(recipientId),afleverstatus:status('pending'),pogingen:0,idempotentiesleutel:'esmojo-webreport-'+id+'-'+digest(recipientId).slice(0,16),mailparameters_json:canonical({mail:null,errorCode:null})},{rapportverzending:{table:group.table,key:group.key}}));
    queued+=targets.length;
   }
   if(state.onlineMailStartedAt===undefined)state.onlineMailStartedAt=settings?.onlineMailStartedAt||new Date(now()).toISOString();return{queued,tracking:'mail-open-v1'};
  });
 }
 async function send(actor,reportId){
  if(!validHash(reportId)||!processing||!intake||typeof selection!=='function')throw Error('VALIDATION');
  return operational.exclusive(()=>authorize(actor,{admin:true}),async(state,{markWrite})=>{
   const groups=await repo.query('esmojo_rapportverzending'),known=groups.map(row=>({row,info:metadata(row)})),pdf=known.find(row=>row.info.channel==='pdf'&&row.info.id===reportId);if(!pdf)throw Error('REPORT_CONFLICT');
   const source=(await processing.read(pdf.info.sourceId)).value,file=(await intake.list()).files.find(row=>row.id===pdf.info.sourceId);
   if(!source||source.status!=='ready'||source.latestReportId!==reportId||source.modifiedAt!==source.processedModifiedAt||!file||file.modifiedAt!==source.processedModifiedAt||(await intake.read(file)).sha256!==pdf.info.sourceHash)throw Error('REPORT_CONFLICT');
   const [chosen,people]=await Promise.all([selection(state),accounts()]),targets=chosen.recipientIds.filter(id=>people.some(p=>p.id===id&&active(p)&&p.reports===true));if(!targets.length)throw Error('VALIDATION');
   const online=known.find(row=>row.info.channel==='online'&&row.info.sourceHash===pdf.info.sourceHash&&row.info.show.key===pdf.info.show.key);if(!online&&pdf.info.mailChannel==='online')throw Error('REPORT_CONFLICT');
   const target=online?.info.legacyReportId?known.find(row=>row.info.channel==='pdf'&&row.info.id===online.info.legacyReportId):online||pdf;if(!target)throw Error('REPORT_CONFLICT');const current=await deliveries(target.row),identity=target.row.esmojo_bronidentiteit;
   for(const id of targets)if(!current.some(row=>row.esmojo_authgebruikersid===id)){await markWrite();await writer.ensure(reportRecord('rapportaflevering',identity+'/recipient/'+id,'Rapportageaflevering',{authgebruikersid:id,ontvangerhash:digest(id),afleverstatus:status('pending'),pogingen:0,idempotentiesleutel:(target.info.channel==='pdf'?'esmojo-showreport-':'esmojo-webreport-')+target.info.id+'-'+digest(id).slice(0,16),mailparameters_json:canonical({mail:null,errorCode:null})},{rapportverzending:{table:'esmojo_rapportverzending',key:target.row.esmojo_sleutel}}));}
   const fields={esmojo_verzendstatus:status(mailState(await deliveries(target.row)))};
   if(target.info.channel==='online'){fields.esmojo_historisch=false;fields.esmojo_mailparameters_json=canonical({...target.info,historical:false});}else if(!online)fields.esmojo_mailparameters_json=canonical({...target.info,mailRequestedBy:actor,mailRequestedAt:new Date(now()).toISOString()});
   await markWrite();await mutations.atomic([patch('esmojo_rapportverzending',target.row,fields)]);return{ok:true};
  });
 }
 async function reserve(channel,input){
  if(!['online','pdf'].includes(channel)||!jobId(input?.jobId)||input.trackingVersion!==undefined&&input.trackingVersion!=='mail-open-v1')throw Error('VALIDATION');
  return operational.exclusive(()=>authorize(null,{worker:true}),async(state,{markWrite})=>{
   const [groups,people,current]=await Promise.all([repo.query('esmojo_rapportverzending'),accounts(),visible()]);
   for(const group of groups){const info=metadata(group);if(info.channel!==channel||channel==='online'&&(info.legacyReportId||info.historical))continue;
    const source=current.find(source=>source.show.key===info.show?.key&&source.sourceHash===info.sourceHash&&digest('online-showreport-v1\n'+source.show.key+'\n'+source.sourceHash)===info.id);if(channel==='online'&&!source)continue;
    if(channel==='online'){const original=await repo.file({reportKey:source.reportKey,versionKey:source.versionKey});if(original.sha256!==info.sourceHash||original.header._esmojo_actueleversie_value!==original.versionId)throw Error('SOURCE_CHANGED');}
    for(const delivery of await deliveries(group)){
     if(['sent','review','skipped'].some(s=>delivery.esmojo_afleverstatus===status(s))||delivery.esmojo_pogingen>=3||time(delivery.esmojo_leasetot)&&Date.parse(delivery.esmojo_leasetot)>now()||time(delivery.esmojo_laatstgeprobeerdop)&&now()-Date.parse(delivery.esmojo_laatstgeprobeerdop)<300000)continue;
     const profile=people.find(p=>p.id===delivery.esmojo_authgebruikersid&&active(p)&&p.reports===true),first=delivery.esmojo_eerstgeprobeerdop,parameters=parse(delivery.esmojo_mailparameters_json)||{},oldMail=parameters.mail;
     if(!profile||time(first)&&now()-Date.parse(first)>23*3600000){await change(group,delivery,{esmojo_afleverstatus:status(profile?'review':'skipped')},markWrite);continue;}
     if((delivery.esmojo_pogingen>0||first)&&!['online-report-v1','online-report-v2','online-report-v3','online-report-v4'].includes(oldMail?.version)){await change(group,delivery,{esmojo_afleverstatus:status('review'),esmojo_mailparameters_json:canonical({...parameters,errorCode:'MAIL_TEMPLATE_CHANGED'})},markWrite);continue;}
     if(oldMail?.version==='online-report-v4'&&input.trackingVersion!=='mail-open-v1')continue;
     const mail=oldMail||{version:input.trackingVersion==='mail-open-v1'&&!delivery.esmojo_pogingen&&!first?'online-report-v4':'online-report-v3',senderId:'show-report',managerName:await manager(info.show,people)};
     if(channel==='online'&&!['online-report-v3','online-report-v4'].includes(mail.version))throw Error('REPORT_UNAVAILABLE');
     const token=mail.version==='online-report-v4'?receipt(info.id,delivery.esmojo_authgebruikersid):null;
     if(delivery.esmojo_ontvangstbewijshash&&delivery.esmojo_ontvangstbewijshash!==digest(token||''))throw Error('REPORT_CONFLICT');
     const target=delivery.esmojo_email_snapshot?{email:delivery.esmojo_email_snapshot,firstName:delivery.esmojo_voornaam_snapshot||''}:{email:profile.email,firstName:profile.firstName},at=new Date(now()).toISOString(),pdf=channel==='pdf'?await download(info.id):null;
     // Reconfirm ordinary authorization immediately before the lease/write.
     await authorize(null,{worker:true});
     await change(group,delivery,{esmojo_email_snapshot:target.email,esmojo_voornaam_snapshot:target.firstName,esmojo_eerstgeprobeerdop:first||at,esmojo_laatstgeprobeerdop:at,esmojo_pogingen:(delivery.esmojo_pogingen||0)+1,esmojo_afleverstatus:status('processing'),esmojo_leaseid:input.jobId,esmojo_leasetot:new Date(now()+300000).toISOString(),esmojo_trackingversie:token?'mail-open-v1':null,esmojo_ontvangstbewijshash:token?digest(token):null,esmojo_mailparameters_json:canonical({...parameters,mail})},markWrite);
     return{state:'reserved',reportId:info.id,recipientId:delivery.esmojo_authgebruikersid,jobId:input.jobId,recipient:target,...(token?{receiptToken:token}:{}),show:info.show,managerName:mail.managerName,senderId:mail.senderId||'default',...(channel==='pdf'?{mailVersion:mail.version,...pdf}:{}),idempotencyKey:delivery.esmojo_idempotentiesleutel};
    }
   }return{state:'idle'};
  });
 }
 async function confirm(channel,input,{failed=false}={}){
  if(!['online','pdf'].includes(channel)||!jobId(input?.jobId)||!validHash(input.reportId)||typeof input.recipientId!=='string'||input.recipientId.length>100||!failed&&(typeof input.providerId!=='string'||!input.providerId||input.providerId.length>100||/[\x00-\x1f]/.test(input.providerId)))throw Error('VALIDATION');
  return operational.exclusive(()=>authorize(null,{worker:true}),async(state,{markWrite})=>{
   const groups=await repo.query('esmojo_rapportverzending',{filter:"esmojo_oudrapportid eq '"+input.reportId+"'"}),group=groups.find(row=>metadata(row).channel===channel);if(!group)throw Error('REPORT_CONFLICT');
   const delivery=(await deliveries(group)).find(row=>row.esmojo_authgebruikersid===input.recipientId);if(!delivery)throw Error('REPORT_CONFLICT');
   if(delivery.esmojo_afleverstatus===status('sent')){if(failed||delivery.esmojo_providerid===input.providerId)return{ok:true};throw Error('REPORT_CONFLICT');}
   if(delivery.esmojo_leaseid!==input.jobId)throw Error('REPORT_CONFLICT');
   const fields={esmojo_leaseid:null,esmojo_leasetot:null,...failed?{esmojo_afleverstatus:status(channel==='online'?'failed':delivery.esmojo_pogingen>=3?'review':'pending'),esmojo_mailparameters_json:canonical({...parse(delivery.esmojo_mailparameters_json),errorCode:'DELIVERY_UNCONFIRMED'})}:{esmojo_afleverstatus:status('sent'),esmojo_providerid:input.providerId,esmojo_verzondenop:new Date(now()).toISOString()}};
   await change(group,delivery,fields,markWrite);return{ok:true};
  });
 }
 return{sync,send,reserve,confirm};
}
