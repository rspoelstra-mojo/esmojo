import {gzipSync,gunzipSync} from 'node:zlib';
import {createNativeShowsRepository} from './dataverse-shows/repository.js';
import {createNativeReportsRepository} from './dataverse-reports/repository.js';
import {createDataverseReadBatch} from './dataverse-read-batch.js';
import {runtimeSchema} from './dataverse-shows/authority.js';
import {reportsSchemaHash} from './reports-schema.js';
import {nativeConnection} from './dataverse-shows/connection.js';
import {tableByName} from './dataverse-table-schema.js';
import {createConcertCatalogue} from './concert-catalogue.js';
import {taskCipher} from './background-tasks/store.js';
import {record,recordKey,digest,canonical,choice,migrationDifferences} from './show-migration-writer.js';
import {nativeId} from './dataverse-shows/mutations.js';
import {validArtistId} from '../shared/artist-catalogue.js';
import {validArtistReference} from '../shared/artist-names.js';
import {timetableClock} from '../shared/show-timetable.js';
const contract='artist-opening-v1',table='esmojo_integratiestatus';
const scopeTables=[...tableByName.values()].filter(t=>t.columns.some(c=>c.target==='esmojo_concertreeks')&&!['esmojo_concert','esmojo_onderzoeksresultaat','esmojo_opdracht','esmojo_paginaweergave','esmojo_technischestatus'].includes(t.logical_name)).map(t=>t.logical_name);
const extraTables=['esmojo_ticketverkoop','esmojo_publieksvak','esmojo_operationeelrisico','esmojo_zaalbijdrage','esmojo_tijdschemaregel','esmojo_medewerker','esmojo_modulerecht'];
const reportTables=['esmojo_rapportage','esmojo_rapportversie','esmojo_rapportbron','esmojo_rapportcontext'];
const publicColumns={esmojo_artiest:['esmojo_bronartiestid','esmojo_naam','esmojo_fotobronurl'],esmojo_concert:['esmojo_oudconcertid','_esmojo_concertreeks_value','esmojo_datum','esmojo_uitvoeringscode','esmojo_tooninshows','esmojo_bronurl'],esmojo_concertreeks:['esmojo_oudalgemeenconcertid','_esmojo_artiest_value','_esmojo_locatie_value','esmojo_bronidentiteit'],esmojo_locatie:['esmojo_naam','esmojo_stad']};
const allowed=new Set([...Object.keys(publicColumns),...scopeTables,...extraTables,...reportTables,table,'esmojo_opdracht','esmojo_document','esmojo_onderzoeksresultaat']);
const guid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const identity=reference=>{if(!validArtistReference(reference))throw Error('VALIDATION');return contract+'/'+reference;};
const groups=(values,size=40)=>Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,(i+1)*size));
// Private derived model. Every read checks fresh complete source row sets, not a TTL.
export function createArtistOpening({env=process.env,repo=createNativeShowsRepository({env}),reports=createNativeReportsRepository({env}),catalogue=createConcertCatalogue({env}),batch=null,now=()=>new Date()}={}){
 const cipher=taskCipher({env}),metadata=name=>tableByName.has(name)?repo.meta(name):reports.meta(name),transport=batch||createDataverseReadBatch({env,connection:nativeConnection(env),meta:metadata,allowedTables:allowed});
 const day=()=>timetableClock(now()).date;
 function queries(scope){
  if(!scope||!Array.isArray(scope.artists)||scope.artists.some(id=>!validArtistId(id))||!Array.isArray(scope.series)||!Array.isArray(scope.documents)||!Array.isArray(scope.controls)||scope.series.length>1000||scope.documents.length>2000||scope.series.some(id=>!guid(id))||scope.documents.some(id=>!guid(id))||scope.controls.some(key=>!/^[a-f0-9]{64}$/.test(key)))throw Error('ARTIST_OPENING_INVALID');
  const result=Object.entries(publicColumns).map(([name,select])=>({table:name,filter:'statecode eq 0',select,values:true}));
  for(const name of [...reportTables,...extraTables,'esmojo_onderzoeksresultaat'])result.push({table:name,filter:'',select:[]});
  const roots=['native-authority/v1','reports-native-authority/v1','native-incident-daily/v1'].map(name=>recordKey(table,name));
  for(const keys of groups([...roots,...scope.controls]))result.push({table,filter:keys.map(key=>"esmojo_sleutel eq '"+key+"'").join(' or '),select:[]});
  result.push({table:'esmojo_opdracht',filter:['shows-validation-v1','reports-validation-v1','reports-final-validation-v1','reports-cutover-v1'].map(type=>"esmojo_resourcecode eq '"+type+"'").join(' or '),select:[]});
  for(const ids of groups(scope.series)){
   result.push({table:'esmojo_concertreeks',filter:ids.map(id=>'esmojo_concertreeksid eq '+id).join(' or '),select:[]});
   for(const name of scopeTables)result.push({table:name,filter:ids.map(id=>'_esmojo_concertreeks_value eq '+id).join(' or '),select:name==='esmojo_documentkoppeling'?['_esmojo_document_value']:[]});
  }
  for(const ids of groups(scope.documents))result.push({table:'esmojo_document',filter:ids.map(id=>'esmojo_documentid eq '+id).join(' or '),select:[]});
  if(result.length>200)throw Error('ARTIST_OPENING_LIMIT');return result;
 }
 async function snapshot(scope,nativeMetadata=null,maintenance=false){
  const plan=queries(scope);if(maintenance)plan.push({table:'esmojo_concertreeks',filter:'',select:[]});if(nativeMetadata&&canonical(Object.keys(nativeMetadata).sort())!==canonical([...new Set(plan.map(q=>q.table))].sort()))throw Error('ARTIST_OPENING_INVALID');
  const metas=nativeMetadata||Object.fromEntries(await Promise.all([...new Set(plan.map(q=>q.table))].map(async name=>{const m=await metadata(name);return[name,{LogicalName:m.LogicalName,EntitySetName:m.EntitySetName,PrimaryIdAttribute:m.PrimaryIdAttribute}];})));
  const requests=plan.map(q=>({...q,nativeMetadata:metas[q.table]})),sets=(await Promise.all(groups(requests,8).map(part=>transport(part)))).flat();
  const rowsFor=name=>sets.filter((_,i)=>plan[i].table===name&&plan[i].values).flat(),artistRows=new Map(rowsFor('esmojo_artiest').map(row=>[row[metas.esmojo_artiest.PrimaryIdAttribute],row.esmojo_bronartiestid])),seriesRows=new Map(rowsFor('esmojo_concertreeks').map(row=>[row[metas.esmojo_concertreeks.PrimaryIdAttribute],row]));
  const ownSeries=[...new Set(rowsFor('esmojo_concert').filter(row=>scope.artists.includes(artistRows.get(seriesRows.get(row._esmojo_concertreeks_value)?._esmojo_artiest_value))).map(row=>row._esmojo_concertreeks_value))].sort(),actualDocuments=[...new Set(sets.filter((_,i)=>plan[i].table==='esmojo_documentkoppeling').flat().map(row=>row._esmojo_document_value))].sort(),actualControls=[...new Set(ownSeries.map(id=>recordKey(table,'native-state/'+seriesRows.get(id).esmojo_oudalgemeenconcertid)))].sort();
  if(canonical(ownSeries)!==canonical(scope.series)||canonical(actualDocuments)!==canonical(scope.documents)||canonical(actualControls)!==canonical(scope.controls))throw Error('SOURCE_CHANGED');
  const fingerprints=sets.map((rows,index)=>{const q=plan[index],primary=metas[q.table].PrimaryIdAttribute;return rows.map(row=>q.values?Object.fromEntries([primary,...q.select].map(field=>[field,row[field]??null])):[row[primary],row['@odata.etag']]).sort((a,b)=>canonical(a).localeCompare(canonical(b)));});
  return{fingerprint:digest({contract,schemas:[runtimeSchema,reportsSchemaHash],day:day(),plan,rows:fingerprints}),metadata:metas};
 }
 function open(reference,row){if(!row)return null;try{if(row.esmojo_bronidentiteit!==identity(reference)||row.esmojo_classificatie!==choice('classificatie','vertrouwelijk')||row.esmojo_integratiecode!==contract||row.esmojo_scopecode!==digest(reference)||row.esmojo_sleutel!==recordKey(table,identity(reference))||row.esmojo_integratiestatus!==choice('integratiestatus','succeeded'))throw Error();const sealed=cipher.open(identity(reference),row.esmojo_configuratie_json),value=JSON.parse(gunzipSync(Buffer.from(sealed.gzip,'base64'),{maxOutputLength:2000000}));if(value.contract!==contract||value.reference!==reference||!value.data?.profile||!Object.hasOwn(value.data,'risk')||!/^[a-f0-9]{64}$/.test(value.fingerprint))throw Error();return value;}catch{throw Error('ARTIST_OPENING_INVALID');}}
 async function read(reference){const row=await repo.byKey(table,recordKey(table,identity(reference))),value=open(reference,row);if(!value||value.day!==day())return null;const actual=await snapshot(value.scope,value.metadata);return actual.fingerprint===value.fingerprint?structuredClone(value.data):null;}
 async function scope(artistIds){
  const all=await catalogue.all(),own=all.concerts.filter(row=>artistIds.includes(row.artistId)),series=[...new Set(own.map(row=>row.seriesId))].sort(),controls=[...new Set(own.map(row=>recordKey(table,'native-state/'+row.generalConcertId)))].sort(),documents=[];
  for(const ids of groups(series)){const links=await repo.query('esmojo_documentkoppeling',{filter:ids.map(id=>'_esmojo_concertreeks_value eq '+id).join(' or ')});for(const row of links)if(!documents.includes(row._esmojo_document_value))documents.push(row._esmojo_document_value);}
  return{artists:[...new Set(artistIds)].sort(),series,controls,documents:documents.sort()};
 }
 async function prepare(reference,artistIds,build,beforePublish=async()=>{}){
  identity(reference);const own=await scope(artistIds),before=await snapshot(own),data=await build(),after=await snapshot(own,before.metadata);if(before.fingerprint!==after.fingerprint)throw Error('SOURCE_CHANGED');
  const value={contract,reference,day:day(),scope:own,metadata:before.metadata,fingerprint:before.fingerprint,data},raw=Buffer.from(JSON.stringify(value));if(raw.length>2000000)throw Error('ARTIST_OPENING_LIMIT');
  const references=[...new Set([reference,data.canonicalArtistId,data.canonicalArtistSlug].filter(validArtistReference))],m=await repo.meta(table),models=[];
  for(const ref of references){const copy={...value,reference:ref,data:{...data,requestedReference:ref,artist:{...data.artist,id:validArtistId(ref)?ref:data.canonicalArtistId}}},previous=await repo.byKey(table,recordKey(table,identity(ref))),text=cipher.seal(identity(ref),{gzip:gzipSync(Buffer.from(JSON.stringify(copy)),{level:3}).toString('base64')});if(text.length>95000)throw Error('ARTIST_OPENING_LIMIT');const model=record('integratiestatus',identity(ref),'Artiest · profiel en risicoscore',{integratiecode:contract,scopecode:digest(ref),integratiestatus:choice('integratiestatus','succeeded'),revisie:(previous?.esmojo_revisie||0)+1,configuratie_json:text});models.push({ref,copy,model,operation:{table,id:previous?.[m.PrimaryIdAttribute]||nativeId(model.key),method:'PATCH',payload:model.fields,...previous?{etag:previous['@odata.etag']}:{create:true}}});}
  await beforePublish();let uncertain;try{await repo.atomic(models.map(row=>row.operation));}catch(error){uncertain=error;}
  for(const {ref,copy,model}of models){const actual=await repo.byKey(table,model.key);if(!actual||migrationDifferences(model,actual,{...model.fields,esmojo_configuratie_json:actual.esmojo_configuratie_json}).length||canonical(open(ref,actual))!==canonical(copy))throw uncertain||Error('ARTIST_OPENING_UNCONFIRMED');}return structuredClone(models.find(row=>row.ref===reference).copy.data);
 }
 return{read,prepare,snapshot,warm:()=>nativeConnection(env).connect().then(()=>undefined),maintenanceFingerprint:async()=>(await snapshot({artists:[],series:[],documents:[],controls:[]},null,true)).fingerprint,version:contract};
}
