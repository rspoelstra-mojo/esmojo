import {createNativeReportsRepository} from './repository.js';
import {reportChoice,parserContract,calculationContract} from '../reports-migration/contract.js';
import {reportIdentity} from '../reports-migration/map.js';
import {canonical,digest,recordKey} from '../show-migration-writer.js';
import {ONTRACK_HEADERS,parseCsv,calculateReport} from '../ontrack-report/data.js';
import {validateReportDay} from '../web-report-catalogue.js';
import {validateWebReportRequest,webReportKpis,webReportTypes} from '../report-web.js';
import {webReportTimeline} from '../../shared/report-timeline.js';
import {reportCatalogue} from '../../shared/report-catalogue.js';
import {reportSourceType,validTscShowData} from '../../shared/report-source.js';

const csvFields=['id','datumtijd','discipline','meldafdeling','type','zone','prioriteit','dispatch','status','afloopstatus','afhandeling','bron','omschrijving','eenheden','personen','opmerkingen','bijlagen'];
const fail=()=>{throw Error('REPORT_CONFLICT');};
const parse=value=>{try{const result=JSON.parse(value);if(!result||typeof result!=='object'||Array.isArray(result))fail();return result;}catch{fail();}};
const normalized=value=>value===undefined||value===null||value===''?null:value;
const same=(a,b)=>{if(canonical(a)!==canonical(b))fail();};
const day=value=>typeof value==='string'?value.slice(0,10):null;
const verified=reportChoice('bronstatus','verified');

// Pure native reader; authorization belongs to the server provider wrapper.
// The only source bytes are the scoped Dataverse File, never a Drive fallback.
export function createNativeReportReader({repository=createNativeReportsRepository(),now=()=>new Date()}={}){
 const repo=repository;
 function sourceMetadata(source){
  const provenance=parse(source.esmojo_herkomst_json),original=provenance.source,validation=provenance.validation,show=original?.show;
  if(!show||typeof show.key!=='string'||typeof show.name!=='string'||!show.name||typeof show.venue!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(show.date)||original.id!==source.esmojo_externebronid||original.context!==source.esmojo_contexthash||validation?.state!=='valid'||validation.context!==original.context||validation.sourceHash!==source.esmojo_inhoudsha256)fail();
  if(source.esmojo_brontype!==reportChoice('rapportbron',reportSourceType(show))||Date.parse(original.modifiedAt)!==Date.parse(source.esmojo_brongewijzigdop))fail();
  if(reportSourceType(show)==='tsc-historical'&&!validTscShowData(show.showData))fail();
  return{provenance,show};
 }
 async function current(){
  const [headers,versions,sources]=await Promise.all([
   repo.query('esmojo_rapportage',{select:['esmojo_bronidentiteit','esmojo_beschikbaar','_esmojo_actueleversie_value','esmojo_publicatiegeneratie']}),
   repo.query('esmojo_rapportversie',{select:['_esmojo_rapportage_value','_esmojo_gekozenbron_value','esmojo_versiestatus','esmojo_inhoudsha256','esmojo_versiefingerprint','esmojo_parsercontract','esmojo_rekencontract']}),
   repo.query('esmojo_rapportbron',{select:['_esmojo_rapportage_value','esmojo_herkomst_json','esmojo_externebronid','esmojo_contexthash','esmojo_inhoudsha256','esmojo_brontype','esmojo_brongewijzigdop','esmojo_validatiestatus']})
  ]);
  const byId=async(table,rows)=>new Map(await Promise.all(rows.map(async row=>[await repo.idOf(table,row),row]))),[versionMap,sourceMap]=await Promise.all([byId('esmojo_rapportversie',versions),byId('esmojo_rapportbron',sources)]),shows=[];
  for(const header of headers){
   if(header.esmojo_beschikbaar!==true)continue;
   const id=await repo.idOf('esmojo_rapportage',header),version=versionMap.get(header._esmojo_actueleversie_value),source=version&&sourceMap.get(version._esmojo_gekozenbron_value);
   if(!version||!source||version._esmojo_rapportage_value!==id||source._esmojo_rapportage_value!==id||version.esmojo_versiestatus!==verified||source.esmojo_validatiestatus!==verified||version.esmojo_inhoudsha256!==source.esmojo_inhoudsha256||version.esmojo_parsercontract!==parserContract||version.esmojo_rekencontract!==calculationContract)fail();
   const {show,provenance}=sourceMetadata(source);if(header.esmojo_bronidentiteit!==reportIdentity(show))fail();
   shows.push({concertId:show.key,name:show.name,venue:show.venue,date:show.date,...(show.performance?{performance:show.performance}:{}),revision:digest({version:version.esmojo_versiefingerprint,generation:header.esmojo_publicatiegeneratie}),show,sourceId:source.esmojo_externebronid,sourceHash:source.esmojo_inhoudsha256,versionKey:version.esmojo_sleutel,reportKey:header.esmojo_sleutel,publishedAt:provenance.validation.validatedAt});
  }
  return shows;
 }
 async function catalogue(){
  const shows=(await current()).map(({concertId,name,venue,date,performance,revision})=>({concertId,name,venue,date,...performance?{performance}:{},revision}));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(now());
  return reportCatalogue(shows,today);
 }
 function textReader(blocks,versionId){
  const used=new Set();
  return{read(row,field,incidentId=null){
   const manifest=parse(row.esmojo_tekstmanifest_json||'{}'),entry=manifest[field],value=row['esmojo_'+field];
   if(!entry)return value??'';
   if(value!==null&&value!==undefined||!Number.isSafeInteger(entry.length)||entry.length<1||entry.length>32*1024*1024||!Number.isSafeInteger(entry.blocks)||entry.blocks<1||entry.blocks>1024||!/^[a-f0-9]{64}$/.test(entry.sha256||'')||!/^[a-f0-9]{64}$/.test(entry.group||''))fail();
   const parts=blocks.filter(block=>block.esmojo_veldgroep===entry.group&&block.esmojo_veldcode===field).sort((a,b)=>a.esmojo_bloknummer-b.esmojo_bloknummer);
   if(parts.length!==entry.blocks)fail();
   for(const [index,part]of parts.entries()){
    if(used.has(part.esmojo_sleutel)||part._esmojo_rapportversie_value!==versionId||(part._esmojo_rapportincident_value||null)!==incidentId||part.esmojo_bloknummer!==index||typeof part.esmojo_inhoud!=='string'||digest(part.esmojo_inhoud)!==part.esmojo_inhoudsha256)fail();used.add(part.esmojo_sleutel);
   }
   const text=parts.map(part=>part.esmojo_inhoud).join('');if(text.length!==entry.length||digest(text)!==entry.sha256)fail();return text;
  },finish(){if(used.size!==blocks.length)fail();}};
 }
 async function summary(concertId){
  concertId=validateWebReportRequest({concertId});const reportKey=recordKey('esmojo_rapportage',reportIdentity({key:concertId})),header=await repo.byKey('esmojo_rapportage',reportKey);if(!header?.esmojo_beschikbaar)throw Error('NOT_FOUND');
  const version=await repo.byId('esmojo_rapportversie',header._esmojo_actueleversie_value),owner=await repo.versionOwner(reportKey,version.esmojo_sleutel),source=await repo.byId('esmojo_rapportbron',version._esmojo_gekozenbron_value),{show}=sourceMetadata(source);
  if(show.key!==concertId||source._esmojo_rapportage_value!==owner.reportId||source.esmojo_validatiestatus!==verified||version.esmojo_inhoudsha256!==source.esmojo_inhoudsha256||version.esmojo_parsercontract!==parserContract||version.esmojo_rekencontract!==calculationContract)fail();
  const [contexts,allBlocks]=await Promise.all([repo.children('esmojo_rapportcontext','esmojo_rapportversie',owner.versionId),repo.children('esmojo_rapporttekstblok','esmojo_rapportversie',owner.versionId)]);if(contexts.length!==1)fail();
  const context=parse(contexts[0].esmojo_snapshot_json);if(digest(context)!==version.esmojo_contexthash||digest(context)!==contexts[0].esmojo_contextfingerprint)fail();
  const blocks=allBlocks.filter(row=>!row._esmojo_rapportincident_value),text=textReader(blocks,owner.versionId),stats=text.read(version,'statistiek_json');if(digest(stats)!==version.esmojo_statistiekhash)fail();text.finish();const statistics=parse(stats);
  for(const [prefix,group,names]of [['medisch','medical',{totaal:'total',behandelingen:'treatments',zelfzorg:'selfcare',onwel:'unwell',contusie:'contusion',ambulance:'ambulance'}],['beveiliging','security',{totaal:'total',verbaal:'verbal',fysiek:'physical',baldadigheid:'mischief',uitzettingen:'evictions',aanhoudingen:'arrests'}]])for(const [name,field]of Object.entries(names))if((version['esmojo_'+prefix+'_'+name]??null)!==(statistics.kpis?.[group]?.[field]??null))fail();
  if((await repo.byKey('esmojo_rapportage',reportKey))?.['@odata.etag']!==header['@odata.etag']||(await repo.byId('esmojo_rapportversie',owner.versionId))['@odata.etag']!==version['@odata.etag'])throw Error('SOURCE_CHANGED');return{show,context,statistics,sourceId:source.esmojo_externebronid,sourceHash:source.esmojo_inhoudsha256,versionKey:version.esmojo_sleutel,reportKey};
 }
 async function source(concertId){
  concertId=validateWebReportRequest({concertId});
  const reportKey=recordKey('esmojo_rapportage',reportIdentity({key:concertId})),header=await repo.byKey('esmojo_rapportage',reportKey);
  if(!header||!header.esmojo_beschikbaar||!header._esmojo_actueleversie_value)throw Error('NOT_FOUND');
  const version=await repo.byId('esmojo_rapportversie',header._esmojo_actueleversie_value);if(!version)throw Error('REPORT_CONFLICT');
  const file=await repo.file({reportKey,versionKey:version.esmojo_sleutel}),versionId=file.versionId;
  if(!file.header.esmojo_beschikbaar||file.header._esmojo_actueleversie_value!==versionId||file.version.esmojo_parsercontract!==parserContract||file.version.esmojo_rekencontract!==calculationContract)throw Error('SOURCE_CHANGED');
  const {show}=sourceMetadata(file.artifact);if(show.key!==concertId||file.header.esmojo_bronidentiteit!==reportIdentity(show))fail();
  const concert=await repo.byId('esmojo_concert',file.header._esmojo_concert_value);if(concert.esmojo_oudconcertid!==concertId||day(concert.esmojo_datum)!==show.date)fail();
  const [contexts,incidents,blocks,menu]=await Promise.all([repo.children('esmojo_rapportcontext','esmojo_rapportversie',versionId),repo.children('esmojo_rapportincident','esmojo_rapportversie',versionId),repo.children('esmojo_rapporttekstblok','esmojo_rapportversie',versionId),catalogue()]);
  if(contexts.length!==1)fail();const context=contexts[0],snapshot=parse(context.esmojo_snapshot_json),contextId=await repo.idOf('esmojo_rapportcontext',context);
  if(digest(snapshot)!==context.esmojo_contextfingerprint||digest(snapshot)!==file.version.esmojo_contexthash||snapshot.show?.key!==concertId||snapshot.show.date!==show.date||snapshot.show.sourceType!==reportSourceType(show))fail();
  same(snapshot.show,{key:show.key,name:show.name,venue:show.venue,date:show.date,performance:show.performance||null,sourceType:reportSourceType(show),showData:show.showData||null});
  if(file.version.esmojo_versiefingerprint!==digest({concert:concertId,sha256:file.sha256,context:snapshot,parserContract,calculationContract}))fail();
  const fields={verkochtekaarten:snapshot.general?.soldTickets,aanwezigebezoekers:snapshot.show.showData?.visitors,percentagebuitenlands:snapshot.general?.foreignPercentage,productiemanager:snapshot.general?.productionManager,eventsafetymanager:snapshot.general?.eventSafetyManager,projectleidertsc:snapshot.general?.tscProjectLead,tsc_uitzettingen:snapshot.show.showData?.evictions,tsc_aanhoudingen:snapshot.show.showData?.arrests,bronurl:snapshot.sourceUrl,foto_url:snapshot.photo?.imageUrl};
  for(const [name,value]of Object.entries(fields))if(normalized(context['esmojo_'+name])!==normalized(value))fail();
  const points=await repo.children('esmojo_rapporttijdpunt','esmojo_rapportcontext',contextId),expectedPoints=snapshot.timetable?.entries||[];
  if(points.length!==expectedPoints.length||new Set(points.map(point=>point.esmojo_volgorde)).size!==points.length)fail();
  for(const point of points){const expected=expectedPoints[point.esmojo_volgorde];if(!expected)fail();
   for(const [field,value]of Object.entries({puntsoort:expected.kind,label:expected.label,gepubliceerdlabel:expected.publishedLabel,lokaledatum:expected.localDate,tijd:expected.time,tijdtekst:expected.timeText,tijdsoort:expected.timeType?reportChoice('tijdsoort',expected.timeType):null,brontype:expected.sourceType||snapshot.timetable.sourceType}))if(normalized(field==='lokaledatum'?day(point['esmojo_'+field]):point['esmojo_'+field])!==normalized(value))fail();
  }
  const report=validateReportDay(calculateReport(file.bytes,{generatedAt:file.artifact.esmojo_brongewijzigdop}),show.date),raw=parseCsv(file.bytes),byPosition=new Map(incidents.map(row=>[row.esmojo_bronpositie,row])),text=textReader(blocks,versionId);
  if(incidents.length!==raw.length||byPosition.size!==raw.length||file.version.esmojo_incidentenaantal!==raw.length)fail();
  for(const incident of report.incidents){
   const row=byPosition.get(incident.position);if(!row)fail();const id=await repo.idOf('esmojo_rapportincident',row);
   if(row.esmojo_incidentidhash!==digest(incident.id)||Date.parse(row.esmojo_tijdstip)!==incident.timestamp||day(row.esmojo_lokaledatum)!==incident.localDate||row.esmojo_lokaletijd!==incident.time||row.esmojo_tijdzone!==report.timeZone||row.esmojo_aantalpersonen!==incident.affectedPerson||row.esmojo_tijdambigu!==incident.ambiguous)fail();
   const manifest=parse(row.esmojo_tekstmanifest_json||'{}');if(Object.keys(manifest).some(field=>!csvFields.map(name=>'csv_'+name).includes(field)))fail();
   for(const [index,name]of csvFields.entries())if(text.read(row,'csv_'+name,id)!==raw[incident.position][ONTRACK_HEADERS[index]])fail();
  }
  if(Object.keys(parse(file.version.esmojo_tekstmanifest_json||'{}')).some(field=>field!=='statistiek_json'))fail();
  const kpis=webReportKpis(report,show),statistics={kpis,types:{medical:webReportTypes(report.incidents,'medisch'),security:webReportTypes(report.incidents,'beveiliging')},timeline:webReportTimeline(report,snapshot.timetable,show.date),locations:report.locations,warnings:report.warnings},stats=text.read(file.version,'statistiek_json');
  if(digest(stats)!==file.version.esmojo_statistiekhash)fail();same(parse(stats),statistics);text.finish();
  for(const [prefix,group,names]of [['medisch','medical',{totaal:'total',behandelingen:'treatments',zelfzorg:'selfcare',onwel:'unwell',contusie:'contusion',ambulance:'ambulance'}],['beveiliging','security',{totaal:'total',verbaal:'verbal',fysiek:'physical',baldadigheid:'mischief',uitzettingen:'evictions',aanhoudingen:'arrests'}]])for(const [name,field]of Object.entries(names))if((file.version['esmojo_'+prefix+'_'+name]??null)!==(kpis[group][field]??null))fail();
  const series=menu.find(row=>row.shows.some(item=>item.concertId===concertId));if(!series)throw Error('NOT_FOUND');
  const fresh=await repo.byKey('esmojo_rapportage',reportKey);if(fresh?.['@odata.etag']!==file.header['@odata.etag'])throw Error('SOURCE_CHANGED');
  return{show:{...show,...(snapshot.sourceUrl?{sourceUrl:snapshot.sourceUrl}:{})},photo:snapshot.photo||null,series,csvBase64:file.bytes.toString('base64'),sourceHash:file.sha256,modifiedAt:file.artifact.esmojo_brongewijzigdop,timetable:snapshot.timetable||null};
 }
 return{catalogue,source,current,summary};
}
