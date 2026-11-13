import {reportRecord as row,reportChoice as choice,reference as ref,parserContract,calculationContract} from './contract.js';
import {digest,canonical} from '../show-migration-writer.js';
import {ONTRACK_HEADERS,parseCsv,calculateReport} from '../ontrack-report/data.js';
import {validateReportDay} from '../web-report-catalogue.js';
import {webReportKpis,webReportTypes} from '../report-web.js';
import {webReportTimeline} from '../../shared/report-timeline.js';
import {reportSourceType,validTscShowData} from '../../shared/report-source.js';
import {artistPreparation} from '../artist-preparation.js';
export const reportIdentity=show=>'drive-report/'+show.key;
export const headerRef=show=>ref('rapportage',reportIdentity(show));
export const fileIdentity=file=>'reports-drive-file/'+file.fileId+'/'+file.sha256;
export const filePlan=bundle=>bundle.files.map(file=>({...file,identity:fileIdentity(file)}));
export const sourceIdentity=(bundle,item)=>reportIdentity(bundle.show)+'/source/'+item.source.id+'/'+item.sha256+'/'+item.source.context;
export const sourceRef=(bundle,item)=>ref('rapportbron',sourceIdentity(bundle,item));
const valid=item=>item.validation?.state==='valid'&&item.validation.sourceHash===item.sha256;
export const sortedSources=bundle=>[...bundle.sources].sort((a,b)=>b.source.modifiedAt.localeCompare(a.source.modifiedAt)||a.source.id.localeCompare(b.source.id));
export function contextFor(bundle,item){
 const show=item?.source.show||bundle.show;if(reportSourceType(show)==='tsc-historical'&&!validTscShowData(show.showData))throw Error('MIGRATION_SOURCE');
 const general=artistPreparation(bundle.general,show)?.general||{productionManager:null,eventSafetyManager:null,tscProjectLead:null,soldTickets:null,foreignPercentage:null};
 return{show:{key:show.key,name:show.name,venue:show.venue,date:show.date,performance:show.performance||null,sourceType:reportSourceType(show),showData:show.showData||null},general,timetable:bundle.timetable,photo:item?.validation?.mojo?.photo||null,sourceUrl:item?.validation?.mojo?.sourceUrl||show.sourceUrl||null};
}
export const datasetFingerprint=(bundle,item)=>digest({concert:bundle.show.key,sha256:item.sha256,context:contextFor(bundle,item),parserContract,calculationContract});
export const datasetIdentity=(bundle,item)=>reportIdentity(bundle.show)+'/dataset/'+datasetFingerprint(bundle,item);
export const datasetRef=(bundle,item)=>ref('rapportversie',datasetIdentity(bundle,item));
export const canonicalSources=bundle=>sortedSources(bundle).filter((item,index,all)=>valid(item)&&all.findIndex(other=>valid(other)&&datasetFingerprint(bundle,other)===datasetFingerprint(bundle,item))===index);
export const mailVersionIdentity=(bundle,group)=>reportIdentity(bundle.show)+'/mail-version/'+group.channel+'/'+group.id;
export const mailGroupIdentity=(bundle,group)=>reportIdentity(bundle.show)+'/mail/'+group.channel+'/'+group.id;
export function documentRows(bundle){return filePlan(bundle).map(file=>row('document',file.identity,file.name,{bestandsnaam:file.name,mimetype:file.mime,bestandsgrootte:file.size,sha256:file.sha256,documentsoort:choice('documentsoort','other-show-document'),documentgroep:digest('reports/'+file.fileId),versienummer:1,documentstatus:choice('bronstatus','pending'),bronfingerprint:file.sha256}));}
export function sourceRows(bundle){return sortedSources(bundle).map(item=>{
 const file=bundle.files.find(f=>f.fileId===item.source.id&&f.sha256===item.sha256);if(!file)throw Error('MIGRATION_SOURCE');
 return row('rapportbron',sourceIdentity(bundle,item),item.source.name,{brontype:choice('rapportbron',reportSourceType(item.source.show)),bronnamespace:'google-drive/ontrack-v1',externebronid:item.source.id,inhoudsha256:item.sha256,contexthash:item.source.context,brongewijzigdop:item.source.modifiedAt,validatiestatus:choice('bronstatus',valid(item)?'verified':item.validation?.state==='invalid'?'invalidated':'pending'),validatiecode:item.validation?.errorCode||null,gevalideerdop:item.validation?.validatedAt||null,validatiecontract:item.source.validationVersion,herkomst_json:canonical({source:item.source,validation:item.validation,previousValidation:item.previousValidation})},{rapportage:headerRef(bundle.show),document:ref('document',fileIdentity(file))});
 });}
const csvFields=['id','datumtijd','discipline','meldafdeling','type','zone','prioriteit','dispatch','status','afloopstatus','afhandeling','bron','omschrijving','eenheden','personen','opmerkingen','bijlagen'];
// A field exceeding Memo is stored losslessly in ordered, hashed chunks. Empty
// optional text may become native null; the exact CSV remains in Document File.
function longText(value,{version,incident,group,field,identity,records,manifest,limit=1048576}){
 if(value.length<=limit)return value;
 const chunks=[];for(let i=0;i<value.length;){let end=Math.min(value.length,i+262144);if(end<value.length&&/[\uD800-\uDBFF]/.test(value[end-1]))end--;chunks.push(value.slice(i,end));i=end;}
 const blockGroup=digest(group+'/'+field);manifest[field]={length:value.length,sha256:digest(value),blocks:chunks.length,group:blockGroup};
 for(const [index,chunk]of chunks.entries())records.push(row('rapporttekstblok',identity+'/text/'+field+'/'+index,field+' · '+index,{veldgroep:blockGroup,veldcode:field,bloknummer:index,inhoud:chunk,inhoudsha256:digest(chunk)},{rapportversie:version,...(incident?{rapportincident:incident}:{})}));return null;
}
export function mapDataset(bundle,item,bytes){
 if(!valid(item)||digest(bytes)!==item.sha256)throw Error('MIGRATION_SOURCE_CHANGED');
 const canonicalItem=canonicalSources(bundle).find(source=>datasetFingerprint(bundle,source)===datasetFingerprint(bundle,item));if(!canonicalItem||canonicalItem.source.id!==item.source.id)throw Error('MIGRATION_SOURCE');
 const id=datasetIdentity(bundle,item),version=datasetRef(bundle,item),contextId=id+'/context',context=contextFor(bundle,item),report=validateReportDay(calculateReport(bytes,{generatedAt:item.source.modifiedAt}),bundle.show.date),raw=parseCsv(bytes),kpis=webReportKpis(report,item.source.show),textBlocks=[],incidents=[],versionManifest={};
 const statistics={kpis,types:{medical:webReportTypes(report.incidents,'medisch'),security:webReportTypes(report.incidents,'beveiliging')},timeline:webReportTimeline(report,bundle.timetable,bundle.show.date),locations:report.locations,warnings:report.warnings};
 const stats=canonical(statistics),statsValue=longText(stats,{version,group:'statistics',field:'statistiek_json',identity:id,records:textBlocks,manifest:versionManifest});
 const fields={versienummer:canonicalSources(bundle).findIndex(source=>source.source.id===item.source.id)+1,versiefingerprint:datasetFingerprint(bundle,item),inhoudsha256:item.sha256,contexthash:digest(context),parsercontract:parserContract,rekencontract:calculationContract,versiestatus:choice('bronstatus','pending'),incidentenaantal:raw.length,gegenereerdop:item.source.modifiedAt,statistiek_json:statsValue,statistiekhash:digest(stats),tekstmanifest_json:canonical(versionManifest)};
 for(const [prefix,group,names]of [['medisch','medical',{totaal:'total',behandelingen:'treatments',zelfzorg:'selfcare',onwel:'unwell',contusie:'contusion',ambulance:'ambulance'}],['beveiliging','security',{totaal:'total',verbaal:'verbal',fysiek:'physical',baldadigheid:'mischief',uitzettingen:'evictions',aanhoudingen:'arrests'}]])for(const [name,key]of Object.entries(names))fields[prefix+'_'+name]=kpis[group][key]??null;
 const rows=[row('rapportversie',id,'Dataset · '+bundle.show.date,fields,{rapportage:headerRef(bundle.show),gekozenbron:sourceRef(bundle,item)})];
 const showData=item.source.show.showData||{},general=context.general;
 rows.push(row('rapportcontext',contextId,'Rapportcontext · '+bundle.show.date,{verkochtekaarten:general.soldTickets,aanwezigebezoekers:showData.visitors??null,percentagebuitenlands:general.foreignPercentage,productiemanager:general.productionManager,eventsafetymanager:general.eventSafetyManager,projectleidertsc:general.tscProjectLead,tsc_uitzettingen:showData.evictions??null,tsc_aanhoudingen:showData.arrests??null,bronurl:context.sourceUrl,foto_url:context.photo?.imageUrl||null,contextfingerprint:digest(context),snapshot_json:canonical(context)},{rapportversie:version}));
 for(const [index,point]of (bundle.timetable?.entries||[]).entries())rows.push(row('rapporttijdpunt',contextId+'/time/'+index,point.label,{volgorde:index,puntsoort:point.kind,label:point.label,gepubliceerdlabel:point.publishedLabel||null,lokaledatum:point.localDate||null,tijd:point.time||null,tijdtekst:point.timeText||null,tijdsoort:point.timeType?choice('tijdsoort',point.timeType):null,brontype:point.sourceType||bundle.timetable.sourceType||null},{rapportcontext:ref('rapportcontext',contextId)}));
 const byPosition=new Map(report.incidents.map(incident=>[incident.position,incident]));
 for(const [position,values]of raw.entries()){
  const incident=byPosition.get(position),identity=id+'/incident/'+position,manifest={},incidentRef=ref('rapportincident',identity),fields={bronpositie:position,incidentidhash:digest(incident.id),tijdstip:new Date(incident.timestamp).toISOString(),lokaledatum:incident.localDate,lokaletijd:incident.time,tijdzone:report.timeZone,aantalpersonen:incident.affectedPerson,tijdambigu:incident.ambiguous};
  for(const [index,header]of ONTRACK_HEADERS.entries())fields['csv_'+csvFields[index]]=longText(values[header],{version,incident:incidentRef,group:digest(identity),field:'csv_'+csvFields[index],identity,records:textBlocks,manifest});
  // Bound the serialized row too: several individually valid Memo cells may
  // otherwise exceed a changeset budget after JSON escaping. Move the largest
  // cells to the same lossless chunk contract instead of rejecting/truncating.
  while(Buffer.byteLength(canonical(fields))>1500000){const field=Object.keys(fields).filter(key=>key.startsWith('csv_')&&typeof fields[key]==='string').sort((a,b)=>Buffer.byteLength(JSON.stringify(fields[b]))-Buffer.byteLength(JSON.stringify(fields[a])))[0];if(!field)throw Error('MIGRATION_MAPPING');fields[field]=longText(fields[field],{version,incident:incidentRef,group:digest(identity),field,identity,records:textBlocks,manifest,limit:0});}
  fields.tekstmanifest_json=canonical(manifest);incidents.push(row('rapportincident',identity,'Incident · '+(position+1),fields,{rapportversie:version}));
 }
 // Parents precede incidents, and all incidents precede any referencing chunks.
 rows.push(...incidents,...textBlocks);
 return{records:rows,version,incidentCount:raw.length,statistics};
}
export function mailRows(bundle){
 const rows=[],verified=[];
 for(const [index,group]of bundle.groups.entries()){
  if(!/^[a-f0-9]{64}$/.test(group.sourceHash||''))throw Error('MIGRATION_SOURCE');
  const versionId=mailVersionIdentity(bundle,group),version=ref('rapportversie',versionId),fingerprint=digest({concert:bundle.show.key,archiveChannel:group.channel,archiveId:group.id,sha256:group.sourceHash});
  rows.push(row('rapportversie',versionId,'Bestaande '+group.channel+'-historie',{versienummer:canonicalSources(bundle).length+index+1,versiefingerprint:fingerprint,inhoudsha256:group.sourceHash,versiestatus:choice('bronstatus','pending'),gegenereerdop:group.exportGeneratedAt||group.publishedAt||null},{rapportage:headerRef(bundle.show)}));
  let pdfRef;
  if(group.pdfId){const file=bundle.files.find(f=>f.fileId===group.pdfId&&f.sha256===group.sha256);if(!file)throw Error('MIGRATION_SOURCE');const id=versionId+'/pdf';pdfRef=ref('rapportpdf',id);rows.push(row('rapportpdf',id,'Bestaande PDF',{oudrapportid:group.id,layoutversie:group.layoutVersion||null,layoutfingerprint:digest({id:group.id,layout:group.layoutVersion||null,pdfHash:group.sha256}),pdfstatus:choice('bronstatus','pending'),gegenereerdop:group.convertedAt||null},{rapportversie:version,document:ref('document',fileIdentity(file))}));verified.push({ref:pdfRef,field:'esmojo_pdfstatus'});}
  const identity=mailGroupIdentity(bundle,group),groupRef=ref('rapportverzending',identity),{deliveries,...metadata}=group;
  rows.push(row('rapportverzending',identity,'Bestaande verzendregistratie',{mailkanaal:choice('rapportmailkanaal',group.channel),oudrapportid:group.id,verzendfingerprint:digest({channel:group.channel,id:group.id}),verzendstatus:choice('rapportafleverstatus',group.emailStatus||'no-recipients'),historisch:group.historical===true,gepubliceerdop:group.publishedAt||group.convertedAt||null,mailparameters_json:canonical(metadata)},{rapportversie:version,...(pdfRef?{rapportpdf:pdfRef}:{})}));
  const seen=new Set();for(const delivery of deliveries){
   if(typeof delivery.recipientId!=='string'||!delivery.recipientId||seen.has(delivery.recipientId))throw Error('MIGRATION_SOURCE');seen.add(delivery.recipientId);
   const legacy=group.channel==='pdf',idempotency=(legacy?'esmojo-showreport-':'esmojo-webreport-')+group.id+'-'+digest(delivery.recipientId).slice(0,16);
   rows.push(row('rapportaflevering',identity+'/recipient/'+delivery.recipientId,'Bestaande aflevering',{authgebruikersid:delivery.recipientId,ontvangerhash:digest(delivery.recipientId),email_snapshot:delivery.target?.email||null,voornaam_snapshot:delivery.target?.firstName||null,afleverstatus:choice('rapportafleverstatus',delivery.status),pogingen:delivery.attempts??0,idempotentiesleutel:idempotency,providerid:delivery.providerId||null,eerstgeprobeerdop:delivery.firstAttemptAt||null,laatstgeprobeerdop:delivery.lastAttemptAt||null,verzondenop:delivery.sentAt||null,leaseid:delivery.job?.id||null,leasetot:delivery.job?.expiresAt||null,trackingversie:delivery.mail?.version==='online-report-v4'&&delivery.receiptHash?'mail-open-v1':null,ontvangstbewijshash:delivery.receiptHash||null,eerstgeopendop:delivery.openedAt||null,mailparameters_json:canonical({mail:delivery.mail||null,errorCode:delivery.errorCode||null})},{rapportverzending:groupRef}));
  }
 }
 return{records:rows,verified};
}
export function recipientRows(selection){
 if(!selection||!Number.isSafeInteger(selection.revision)||selection.revision<0||!Array.isArray(selection.recipientIds)||new Set(selection.recipientIds).size!==selection.recipientIds.length)throw Error('MIGRATION_SOURCE');
 return selection.recipientIds.map(id=>row('rapportontvanger','ontrack-recipient/'+id,'Bestaande ontvangerselectie',{scope:'ontrack-reports-v1',authgebruikersid:id,ontvangerhash:digest(id),geselecteerd:true,selectierevisie:selection.revision}));
}

export function sourceHistoryRows(bundle){
 if(!bundle.provenance)return[];const text=canonical(bundle.provenance),hash=digest(text),parts=[];for(let start=0;start<text.length;){let end=Math.min(text.length,start+25000);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;parts.push(text.slice(start,end));start=end;}
 return parts.map((part,index)=>row('historie','reports-provenance/'+bundle.show.key+'/'+hash+'/'+index,'Rapportages · historische importherkomst',{entiteitsoort:'reports-historical-provenance-v1',mutatiesoort:choice('mutatiesoort','import'),snapshot_json:canonical({version:1,concertId:bundle.show.key,hash,index,total:parts.length,text:part}),fingerprint:digest(part),schemaversie:1}));
}
