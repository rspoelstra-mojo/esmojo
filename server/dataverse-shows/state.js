import {createHash} from 'node:crypto';
import {record,reference,recordKey,canonical,digest,validateRecord,migrationDifferences,choice} from '../show-migration-writer.js';
import {mapPeople,mapShow as mapRawShow} from '../show-migration-map.js';
const mapShow=(...args)=>{const plan=mapRawShow(...args);for(const link of plan.deferredLinks){const row=plan.records.find(row=>row.key===link.source.key);if(!row)throw Error('MIGRATION_DEPENDENCY');row.links[link.field]=link.target;}return plan;};
import {migrateFileStep} from '../show-migration-files.js';
import {createMigrationWriter} from '../show-migration-writer.js';
import {taskCipher} from '../background-tasks/store.js';
import {recordOperations} from './mutations.js';
import {createNativeShowsRepository} from './repository.js';
import {createDataverseSetupConnection} from '../dataverse-setup-client.js';
const guid=key=>key.slice(0,8)+'-'+key.slice(8,12)+'-4'+key.slice(13,16)+'-8'+key.slice(17,20)+'-'+key.slice(20,32);
const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value))throw Error('DATAVERSE_SHOWS_RESPONSE');return value.slice(0,10);};
const parse=text=>{try{return JSON.parse(text);}catch{throw Error('DATAVERSE_SHOWS_RESPONSE');}};
const boundedId=value=>typeof value==='string'&&value.length>0&&value.length<=240&&!/[\x00-\x1f/\\]/.test(value);
const parallel=async(values,fn)=>{const result=[];for(let n=0;n<values.length;n+=8)result.push(...await Promise.all(values.slice(n,n+8).map(fn)));return result;};
export function createNativeShowState({env=process.env,repository,connection=createDataverseSetupConnection({env})}={}){
 const repo=repository||createNativeShowsRepository({connection}),writer=createMigrationWriter({env,connection}),cipher=taskCipher({env});
 async function syncActor(profile){
  if(!profile||!profile.activated||profile.disabled||!Array.isArray(profile.modules)||!profile.modules.includes('shows'))throw Error('FORBIDDEN');
  const person={};for(const key of ['id','firstName','lastName','email','company','jobTitle','role','activated','modules'])person[key]=profile[key];
  person.disabled=false;if(person.role==='superbeheerder')person.role='beheerder';
  const rows=mapPeople({version:1,profiles:[person],assignments:[]}).records,operations=await recordOperations(repo,rows);
  if(operations.length)await repo.atomic(operations);
 }
 async function employeeSource(){
  const rows=await repo.query('esmojo_medewerker',{filter:'statecode eq 0'}),modules=await repo.query('esmojo_modulerecht',{filter:'statecode eq 0'}),metadata=await repo.meta('esmojo_medewerker');
  return{version:1,assignments:[],profiles:rows.map(row=>({id:row.esmojo_authuserid,firstName:row.esmojo_voornaam,lastName:row.esmojo_achternaam,email:row.esmojo_email,company:row.esmojo_bedrijf,jobTitle:row.esmojo_functie,role:row.esmojo_rol===choice('medewerkerrol','beheerder')?'beheerder':'gebruiker',activated:row.esmojo_geactiveerd,disabled:row.esmojo_geblokkeerd,modules:modules.filter(m=>m._esmojo_medewerker_value===row[metadata.PrimaryIdAttribute]&&m.esmojo_toegestaan).map(m=>['shows','artists','reports'].find(type=>choice('module',type)===m.esmojo_module)).filter(Boolean)}))};
 }
 async function resolve(concertId){
  if(!boundedId(concertId))throw Error('VALIDATION');
  const alias=await repo.byKey('esmojo_routealias',recordKey('esmojo_routealias','route/show/'+concertId));if(!alias||alias.esmojo_aliassoort!=='show'||alias.esmojo_aliaswaarde!==concertId)throw Error('NOT_FOUND');
  const series=await repo.byId('esmojo_concertreeks',alias._esmojo_concertreeks_value),concert=await repo.byId('esmojo_concert',alias._esmojo_concert_value),m=await repo.meta('esmojo_concertreeks');
  if(concert._esmojo_concertreeks_value!==series[m.PrimaryIdAttribute])throw Error('DATAVERSE_SHOWS_CONFLICT');return{series,seriesId:series[m.PrimaryIdAttribute],concert};
 }
 async function fileMetadata(documents,seriesId){
  const refs=new Map(),add=(row,kind,owner=null,revision=null)=>{if(!row?.fileId)return;const old=refs.get(row.fileId);if(old&&(old.kind!==kind||old.owner!==owner))throw Error('DATAVERSE_SHOWS_CONFLICT');refs.set(row.fileId,{...row,kind,owner,revision});};
  const production=documents['productionele-risicos.json']||{};
  for(const row of Object.values(production.barrierUploads||{}))add(row,'barrier-attachment');if(production.barrier?.attachment)add(production.barrier.attachment,'barrier-attachment');
  for(const row of Object.values(production.measureUploads||{}))add(row,'measure-attachment',row.measureId);
  for(const [revision,row]of Object.entries(documents['showprofiel-pdf.json']?.reports||{}))add(row,'showprofile-pdf',null,revision);
  return parallel([...refs.values()],async ref=>{
   const identity='drive-file/'+ref.fileId,key=recordKey('esmojo_document',identity),row=await repo.byKey('esmojo_document',key);if(!row||row.esmojo_sha256!==ref.sha256||row.esmojo_documentstatus!==choice('bronstatus','verified'))throw Error('ATTACHMENT_INVALID');
   return{fileId:ref.fileId,identity,key,name:row.esmojo_bestandsnaam,mime:row.esmojo_mimetype,size:row.esmojo_bestandsgrootte,sha256:row.esmojo_sha256,kind:ref.kind,owner:ref.owner,revision:ref.revision,version:row.esmojo_versienummer,uploadId:ref.uploadId||null};
  });
 }
 async function load(concertId){
  const scope=await resolve(concertId),{series,seriesId}=scope,primaryId=series.esmojo_oudalgemeenconcertid;
  const controlKey=recordKey('esmojo_integratiestatus','native-state/'+primaryId),control=await repo.byKey('esmojo_integratiestatus',controlKey),documents={},pointers={};let sourceExtras={};
  if(control){
   const manifest=parse(control.esmojo_configuratie_json);if(manifest.version!==1||manifest.seriesId!==seriesId||manifest.generation!==series.esmojo_revisie)throw Error('DATAVERSE_SHOWS_CONFLICT');sourceExtras=manifest.extras||{};
   await parallel(Object.entries(manifest.documents),async([name,key])=>{const row=await repo.byKey('esmojo_historie',key);if(!row||row._esmojo_concertreeks_value!==seriesId)throw Error('DATAVERSE_SHOWS_CONFLICT');const value=parse(row.esmojo_snapshot_json);if(value.fileName!==name||digest(value)!==row.esmojo_fingerprint)throw Error('VERIFY');documents[name]=value.document;pointers[name]=key;});
  }else{
   if(series.esmojo_revisie!==0)throw Error('DATAVERSE_SHOWS_CONFLICT');
   const rows=await repo.inSeries('esmojo_historie',seriesId);
   for(const row of rows){const value=parse(row.esmojo_snapshot_json);if(digest(value)!==row.esmojo_fingerprint)throw Error('VERIFY');if(typeof value.fileName==='string'&&value.document){if(documents[value.fileName])throw Error('DATAVERSE_SHOWS_CONFLICT');documents[value.fileName]=value.document;pointers[value.fileName]=row.esmojo_sleutel;}if(row.esmojo_entiteitsoort==='active-show-migration')sourceExtras.activeAudit=value;}
  }
  const [artist,location,concerts,people,files,timetableRows]=await Promise.all([repo.byId('esmojo_artiest',series._esmojo_artiest_value),repo.byId('esmojo_locatie',series._esmojo_locatie_value),repo.inSeries('esmojo_concert',seriesId),employeeSource(),fileMetadata(documents,seriesId),repo.query('esmojo_historie',{filter:"_esmojo_concertreeks_value eq "+seriesId+" and esmojo_entiteitsoort eq 'timetable'"})]);
  // Oude tijdschema-snapshots blijven afzonderlijke brongebonden historie.
  const timetables=timetableRows.filter(row=>row.esmojo_entiteitsoort==='timetable').map(row=>{const snapshot=parse(row.esmojo_snapshot_json);return{concertId:snapshot.concertId,snapshot};});
  const shows=concerts.map(row=>({concertId:row.esmojo_oudconcertid,artist:artist.esmojo_naam,venue:location.esmojo_naam,city:location.esmojo_stad||'',date:date(row.esmojo_datum),time:row.esmojo_tijdlabel||row.esmojo_uitvoeringscode||'Niet vermeld',sourceUrl:row.esmojo_bronurl||null,active:row.esmojo_tooninshows,...(row.esmojo_oudconcertid.startsWith('dataverse_')?{dataverseSourceKey:row.esmojo_showsleutel}:{})}));
  const source={version:1,nativeGeneration:series.esmojo_revisie,concertId:primaryId,artistId:artist.esmojo_bronartiestid,shows,documents,files,unknown:[],timetables,...sourceExtras,activeRevision:series.esmojo_voorbereidingsgeneratie,...(artist.esmojo_biografie?{biography:{text:artist.esmojo_biografie,sourceUrl:artist.esmojo_biografiebron||null,capturedAt:artist.esmojo_biografieopgehaaldop}}:{}),...(artist.esmojo_fotobronurl?{photo:{imageUrl:artist.esmojo_fotobronurl}}:{})};
  const team=await repo.inSeries('esmojo_projectteam',seriesId),employeeMeta=await repo.meta('esmojo_medewerker'),concertMeta=await repo.meta('esmojo_concert');
  for(const row of team){const employee=await repo.byId('esmojo_medewerker',row._esmojo_medewerker_value),concert=concerts.find(c=>c[concertMeta.PrimaryIdAttribute]===row._esmojo_concert_value);if(!concert||!employee[employeeMeta.PrimaryIdAttribute])throw Error('DATAVERSE_SHOWS_CONFLICT');people.assignments.push({concertId:concert.esmojo_oudconcertid,userId:employee.esmojo_authuserid,role:row.esmojo_functiecode,createdAt:row.esmojo_vastgelegdop});}
  const leaseRows=await repo.query('esmojo_opdracht',{filter:"esmojo_opdrachtsoort eq 'shows-native-ticket-lease-v1' and esmojo_resourcecode eq '"+digest(primaryId)+"'"});
  if(source.documents['bezoekersdata.json'])source.documents['bezoekersdata.json'].leases={};
  const leases={};for(const row of leaseRows){const lease=cipher.open('native-ticket-lease/'+primaryId,row.esmojo_payload_json);if(lease.field&&!['ticket_sales','visitor_origins','domestic_origins'].includes(lease.field))throw Error('DATAVERSE_SHOWS_CONFLICT');if(lease.token){const {field,...value}=lease;leases[field]=value;}}
  if(Object.keys(leases).length){source.documents['bezoekersdata.json']||={managedBy:'ESMOJO/TicketData-v1',classification:'vertrouwelijk',concertId:primaryId,workflow_json:JSON.stringify({visitors:{fields:{}}}),leases:{},history:[]};source.documents['bezoekersdata.json'].leases=leases;}
  return{...scope,source,people,control,controlKey,pointers,leaseRows};
 }
 async function materialize(rows,known=new Map()){
  await parallel(rows,async row=>{validateRecord(row);if(!known.has(row.key))known.set(row.key,await repo.byKey(row.table,row.key));});
  const resolveRef=async ref=>{if(!known.has(ref.key))known.set(ref.key,await repo.byKey(ref.table,ref.key));const actual=known.get(ref.key),meta=await repo.meta(ref.table);if(!actual&&!rows.some(row=>row.key===ref.key&&row.table===ref.table))throw Error('MIGRATION_DEPENDENCY');return{id:actual?.[meta.PrimaryIdAttribute]||guid(ref.key),set:meta.EntitySetName};};
  return parallel(rows,async row=>{const metadata=await repo.meta(row.table),actual=known.get(row.key),fields={...row.fields},expected={...row.fields};
   for(const [name,ref]of Object.entries(row.links)){const target=await resolveRef(ref),nav=metadata.ManyToOneRelationships.find(r=>r.ReferencingAttribute===name)?.ReferencingEntityNavigationPropertyName;if(!nav)throw Error('DATAVERSE_SHOWS_SCHEMA');fields[nav+'@odata.bind']='/'+target.set+'('+target.id+')';expected['_'+name+'_value']=target.id;}
   return{row,actual,metadata,fields,expected};
  });
 }
 async function verifyPlan(plan,generation=0){
  for(const link of plan.deferredLinks||[]){const row=plan.records.find(row=>row.key===link.source.key);row.links[link.field]=link.target;}
  const materialized=await materialize(plan.records.filter(row=>!['esmojo_historie','esmojo_integratiestatus'].includes(row.table)));
  for(const entry of materialized){const differences=entry.actual?migrationDifferences(entry.row,entry.actual,{...entry.expected,...(entry.row.table==='esmojo_concertreeks'?{esmojo_revisie:generation}:{})}):[{column:'esmojo_sleutel',reason:'VALUE_DIFFERENCE'}];if(differences.length)throw Object.assign(Error('DATAVERSE_SHOWS_CONFLICT'),{migration:{table:entry.row.table,differences}});}
  return materialized;
 }
 async function uploadFiles(files){
  for(const file of files){if(!Buffer.isBuffer(file.bytes)||file.size!==file.bytes.length||digest(file.bytes)!==file.sha256)throw Error('VALIDATION');const row=record('document',file.identity,file.name,{bestandsnaam:file.name,mimetype:file.mime,bestandsgrootte:file.size,sha256:file.sha256,documentsoort:choice('documentsoort',file.kind),documentgroep:digest(file.kind+'/'+(file.owner||file.identity)),versienummer:file.version||1,documentstatus:choice('bronstatus','pending'),bronfingerprint:file.sha256});
   await writer.ensure(row);let state=null,rounds=0;while(!state?.done&&rounds++<260)state=await migrateFileStep({file,state,writer,read:async offset=>({size:file.size,sha256:file.sha256,offset,base64:file.bytes.subarray(offset,offset+1048576).toString('base64')})});if(!state?.done)throw Error('VERIFY');await writer.markFileVerified(file);
  }
 }
 async function receipt(loaded,command){const row=await repo.byKey('esmojo_opdracht',recordKey('esmojo_opdracht','native-receipt/'+loaded.source.concertId+'/'+command));return row?parse(row.esmojo_resultaat_json):null;}
 async function commit(loaded,next,result,command){
  const {source,people,series,seriesId}=loaded,scope={concertreeks:reference('concertreeks','drive-series/'+source.concertId)},generation=series.esmojo_revisie+1;
  const receiptKey=recordKey('esmojo_opdracht','native-receipt/'+source.concertId+'/'+command),receipt=await repo.byKey('esmojo_opdracht',receiptKey);if(receipt)return parse(receipt.esmojo_resultaat_json);
  const before=mapShow(source,people),after=mapShow(next,people),confirmed=await verifyPlan(before,source.nativeGeneration||0);await uploadFiles(next.files.filter(file=>file.bytes));
  const pointers={...loaded.pointers},snapshots=[];
  for(const [name,document]of Object.entries(next.documents))if(canonical(document)!==canonical(source.documents[name]??null)){
   const stored=structuredClone(document);if(name==='bezoekersdata.json')stored.leases={};const value={fileName:name,document:stored},row=record('historie','native-file/'+source.concertId+'/'+name+'/'+generation+'/'+digest(value),name,{revisie:generation,entiteitsoort:'native-file',versienummer:generation,mutatiesoort:choice('mutatiesoort','update'),snapshot_json:canonical(value),fingerprint:digest(value),schemaversie:1},scope);pointers[name]=row.key;snapshots.push(row);
  }
  const extra={...(source.activeAudit?{activeAudit:source.activeAudit}:{}),...(source.receipts?{receipts:source.receipts}: {})};
  const state=record('integratiestatus','native-state/'+source.concertId,'Native Shows-toestand',{revisie:generation,integratiecode:'shows-native-v1',scopecode:digest(source.concertId),integratiestatus:choice('integratiestatus','succeeded'),configuratie_json:canonical({version:1,seriesId,generation,documents:pointers,extras:extra,planning:next.planning||null})});
  const receiptRow=record('opdracht','native-receipt/'+source.concertId+'/'+command,'Bevestigde Shows-opslag',{commandosleutel:command,opdrachtsoort:'shows-native-receipt-v1',resourcecode:digest(source.concertId),opdrachtstatus:choice('opdrachtstatus','verified'),resultaat_json:JSON.stringify(result),bevestigdop:new Date().toISOString()},scope);
  const previous=new Map(before.records.map(row=>[row.key,row])),rows=[...after.records.filter(row=>!['esmojo_historie','esmojo_integratiestatus'].includes(row.table)),...snapshots,state,receiptRow],entries=await materialize(rows,new Map(confirmed.map(entry=>[entry.row.key,entry.actual]))),operations=[];
  for(const entry of entries){const {row,actual,metadata}=entry,fields={...entry.fields};if(row.table==='esmojo_concertreeks')fields.esmojo_revisie=generation;
   for(const oldName of Object.keys(previous.get(row.key)?.fields||{}))if(!(oldName in fields))fields[oldName]=null;
   if(row.table==='esmojo_document'&&actual?.esmojo_documentstatus===choice('bronstatus','verified'))fields.esmojo_documentstatus=choice('bronstatus','verified');
   const clearedLinks={};
   for(const name of Object.keys(previous.get(row.key)?.links||{}))if(!(name in row.links)){
    const nav=metadata.ManyToOneRelationships.find(r=>r.ReferencingAttribute===name)?.ReferencingEntityNavigationPropertyName;
    if(!nav)throw Error('DATAVERSE_SHOWS_SCHEMA');fields[nav+'@odata.bind']=null;clearedLinks['_'+name+'_value']=null;
   }
   const expected={...entry.expected,...(row.table==='esmojo_concertreeks'?{esmojo_revisie:generation}:{})};
   const cleared=Object.fromEntries(Object.keys(previous.get(row.key)?.fields||{}).filter(name=>!(name in row.fields)).map(name=>[name,null]));
   if(actual&&row.table!=='esmojo_concertreeks'&&!migrationDifferences(row,actual,{...expected,...cleared,...clearedLinks}).length)continue;
   operations.push({table:row.table,id:actual?.[metadata.PrimaryIdAttribute]||guid(row.key),method:'PATCH',payload:fields,...(actual?{etag:row.table==='esmojo_concertreeks'?series['@odata.etag']:actual['@odata.etag']}:{create:true})});
  }
  const kept=new Set(after.records.map(row=>row.key));
  for(const row of before.records.filter(row=>!kept.has(row.key)&&!['esmojo_historie','esmojo_integratiestatus'].includes(row.table)).reverse()){const actual=await repo.byKey(row.table,row.key);if(actual){const m=await repo.meta(row.table);operations.push({table:row.table,id:actual[m.PrimaryIdAttribute],method:'DELETE',etag:actual['@odata.etag']});}}
  operations.push(...await leaseOperations(loaded,next));
  try{await repo.atomic(operations);}catch(error){const committed=await repo.byKey('esmojo_opdracht',receiptKey).catch(()=>null);if(committed)return parse(committed.esmojo_resultaat_json);throw error;}
  const committed=await repo.byKey('esmojo_opdracht',receiptKey);if(!committed||canonical(parse(committed.esmojo_resultaat_json))!==canonical(result))throw Error('VERIFY');await verifyPlan(after,generation);return result;
 }
 async function leaseOperations(loaded,next){
  const before=loaded.source.documents['bezoekersdata.json']?.leases||{},after=next.documents['bezoekersdata.json']?.leases||{},operations=[];
  for(const field of new Set([...Object.keys(before),...Object.keys(after)])){
   if(canonical(before[field]||null)===canonical(after[field]||null))continue;
   const key=recordKey('esmojo_opdracht','native-ticket-lease/'+loaded.source.concertId+'/'+field),actual=loaded.leaseRows.find(row=>row.esmojo_sleutel===key),lease={field,...(after[field]||{})},metadata=await repo.meta('esmojo_opdracht');
   const row=record('opdracht','native-ticket-lease/'+loaded.source.concertId+'/'+field,'Veldreservering',{commandosleutel:key,opdrachtsoort:'shows-native-ticket-lease-v1',resourcecode:digest(loaded.source.concertId),opdrachtstatus:choice('opdrachtstatus',lease.token?'pending':'verified'),payload_json:cipher.seal('native-ticket-lease/'+loaded.source.concertId,lease),leaseid:lease.token?guid(digest(lease.token)):null,leaseverlooptop:lease.expiresAt?new Date(lease.expiresAt).toISOString():null});validateRecord(row);
   operations.push({table:row.table,id:actual?.[metadata.PrimaryIdAttribute]||guid(row.key),method:'PATCH',payload:row.fields,...(actual?{etag:actual['@odata.etag']}:{create:true})});
  }return operations;
 }
 async function commitLease(loaded,next,result){
  const strip=docs=>{const copy=structuredClone(docs);if(copy['bezoekersdata.json']){copy['bezoekersdata.json'].leases={};if(!loaded.source.documents['bezoekersdata.json']&&JSON.parse(copy['bezoekersdata.json'].workflow_json).visitors&&Object.keys(JSON.parse(copy['bezoekersdata.json'].workflow_json).visitors.fields).length===0)delete copy['bezoekersdata.json'];}return copy;};
  if(canonical(strip(next.documents))!==canonical(strip(loaded.source.documents)))throw Error('DATAVERSE_SHOWS_CONFLICT');
  const operations=await leaseOperations(loaded,next);if(!operations.length)return result;
  const m=await repo.meta('esmojo_concertreeks');operations.unshift({table:'esmojo_concertreeks',id:loaded.seriesId,method:'PATCH',etag:loaded.series['@odata.etag'],payload:{esmojo_revisie:loaded.series.esmojo_revisie}});
  await repo.atomic(operations);return result;
 }
 async function refreshPlanning(loaded,planning){
  await verifyPlan(mapShow(loaded.source,loaded.people),loaded.source.nativeGeneration||0);
  const generation=loaded.series.esmojo_revisie,configuration=loaded.control?parse(loaded.control.esmojo_configuratie_json):{version:1,seriesId:loaded.seriesId,generation,documents:loaded.pointers,extras:loaded.source.activeAudit?{activeAudit:loaded.source.activeAudit}:{}};
  const row=record('integratiestatus','native-state/'+loaded.source.concertId,'Native Shows-toestand',{revisie:generation,integratiecode:'shows-native-v1',scopecode:digest(loaded.source.concertId),integratiestatus:choice('integratiestatus','succeeded'),configuratie_json:canonical({...configuration,planning})});
  const m=await repo.meta(row.table),operations=[{table:'esmojo_concertreeks',id:loaded.seriesId,method:'PATCH',etag:loaded.series['@odata.etag'],payload:{esmojo_revisie:generation}},{table:row.table,id:loaded.control?.[m.PrimaryIdAttribute]||guid(row.key),method:'PATCH',payload:row.fields,...(loaded.control?{etag:loaded.control['@odata.etag']}:{create:true})}];
  await repo.atomic(operations);return planning;
 }
 return{repo,load,resolve,verifyPlan,commit,receipt,commitLease,employeeSource,refreshPlanning,syncActor};
}
