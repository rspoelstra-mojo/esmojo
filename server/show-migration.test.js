import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPeople,mapShow,documentRecord} from './show-migration-map.js';
import {record,reference,validateRecord,digest,createMigrationWriter,choice,migrationDifferences,migrationConflictDetails} from './show-migration-writer.js';
import {migrationTokens,createShowMigration} from './show-migration.js';
import {migrateFileStep} from './show-migration-files.js';
import {tableSetupSteps,tableByName} from './dataverse-table-schema.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-test-secret-not-production-12345'},actor='test-admin',now=()=>100000;
const people={version:1,profiles:[{id:'person',firstName:'Test',lastName:'User',email:'user@example.invalid',company:'MOJO Concerts',jobTitle:'Event Safety Manager',role:'beheerder',modules:['shows'],activated:true,disabled:false,photo:''}],assignments:[{concertId:'show',userId:'person',role:'event-safety-manager'}]};
const fixture=()=>({version:1,concertId:'show',shows:[{concertId:'show',artist:'Test Artist',venue:'Gashouder',city:'Amsterdam',date:'2026-11-23',time:'Niet vermeld',active:true}],unknown:[],files:[],documents:{'showprofiel.json':{revision:2,analyses:{1:{summary:'Eigen samenvatting',status:'completed',updatedAt:'2026-11-12T10:00:00Z'}}},'analyseafronding.json':{revision:1,categories:{visitors:{score:7,note:'Toelichting',completedAt:'2026-11-12T10:00:00Z'}}},'bezoekersdata.json':{workflow_json:JSON.stringify({visitors:{fields:{ticket_sales:{version:1,completed_at:'2026-11-12T10:00:00Z',content:'0'},visitor_origins:{version:2,completed_at:null,content:'{"netherlands":"80"}'}}}})},'productionele-risicos.json':{revision:3,choices:{fireworks:false},barrier:{revision:2,barrierType:'seated',riskLevel:'none',notes:null,riskNote:'',completed:true,completedAt:'2026-11-12T10:00:00Z'},floorPressure:{revision:1,rows:[],riskLevel:'none',note:'',completed:true},history:[]}},timetables:[]});
test('mapping preserves zero, own analyses, relations, source snapshots, false rights and defaults',()=>{
 const p=mapPeople(people);assert.equal(p.records.filter(r=>r.table==='esmojo_modulerecht'&&!r.fields.esmojo_toegestaan).length,2);
 const result=mapShow(fixture(),people);assert.equal(result.records.find(r=>r.table==='esmojo_ticketverkoop').fields.esmojo_aantal,0);assert.equal(result.records.find(r=>r.table==='esmojo_analyse').fields.esmojo_samenvatting,'Eigen samenvatting');assert.equal(result.records.find(r=>r.table==='esmojo_productiekeuze').fields.esmojo_waarde,158620000);assert.ok(result.records.filter(r=>r.table==='esmojo_historie').length>=4);
 for(const row of [...p.records,...result.records])assert.equal(validateRecord(row),row);
 assert.equal(result.records.find(r=>r.table==='esmojo_artiest').fields.esmojo_classificatie,choice('classificatie','openbaar'));
 const again=mapShow(fixture(),people);assert.deepEqual(result.records.map(r=>r.key),again.records.map(r=>r.key));
});
test('unrecognized files, ambiguous tickets and unrepresentable data fail before writes',()=>{
 let value=fixture();value.unknown=['unknown.pdf'];assert.throws(()=>mapShow(value,people),/MIGRATION_UNKNOWN_FILES/);
 value=fixture();value.documents['showprofiel.json'].analyses[1].summary='x'.repeat(401);assert.throws(()=>mapShow(value,people),/MIGRATION_MAPPING/);
 value=fixture();value.shows.push({...value.shows[0],concertId:'duplicate'});assert.throws(()=>mapShow(value,people),/MIGRATION_MAPPING/);
 assert.throws(()=>mapPeople({...people,profiles:[{...people.profiles[0],modules:undefined}]}),/MIGRATION_SOURCE/);
});
test('encrypted cursors bind actor, contract and expiration; plaintext contains no native continuation data',()=>{
 const codec=migrationTokens({env,now}),state={version:1,actor,expires:now()+1000,file:{continuation:'private-upload-token'}};const token=codec.seal(state);assert.deepEqual(codec.open(token,actor),state);assert.ok(!Buffer.from(token,'base64url').includes(Buffer.from('private-upload-token')));assert.throws(()=>codec.open(token,'other'),/MIGRATION_TOKEN/);assert.throws(()=>codec.open(token.slice(0,-5)+'wrong',actor),/MIGRATION_TOKEN/);assert.throws(()=>migrationTokens({env,now:()=>now()+2000}).open(token,actor),/MIGRATION_TOKEN/);
});
test('pending key index blocks every source read and every write; client cannot skip schema steps',async()=>{
 let writes=0,reads=0;const service=createShowMigration({env,now,verify:async()=>({status:'pending',reason:'KEY_INDEX_PENDING'}),source:{async people(){reads++;},async catalogue(){reads++;}},writerFactory:()=>{writes++;}});
 const result=await service({operation:'start'},actor);assert.equal(result.status,'blocked');assert.equal(reads,0);assert.equal(writes,0);assert.throws(()=>migrationTokens({env,now}).open('forged',actor),/MIGRATION_TOKEN/);await assert.rejects(service({operation:'advance',token:'forged'},actor),/MIGRATION_TOKEN/);
});
test('one-click sequence validates complete schema, copies in batches and rereads on restart without duplicate rows',async()=>{
 const stored=new Map(),catalogue=[{concertId:'show',artist:'Test Artist',source:'drive'}];let checked=0;
 const writer={async ensure(row){validateRecord(row);stored.set(row.key,row);return{verified:true};},async meta(){return{EntitySetName:'native_research',PrimaryIdAttribute:'native_id',ManyToOneRelationships:[{ReferencingAttribute:'esmojo_concertreeks',ReferencingEntityNavigationPropertyName:'native_series'}]};},async resolve(){return{id:'11111111-1111-4111-8111-111111111111',set:'native_series'};},async json(){return{value:[]};}};
 const source={people:async()=>structuredClone(people),catalogue:async()=>catalogue,referenceFiles:()=>[],show:async()=>({bundle:fixture(),management:null})};
 const service=createShowMigration({env,now,source,writerFactory:()=>writer,verify:async()=>{checked++;assert.equal(stored.size,0);return{status:'verified',verified:true};}});
 let result=await service({operation:'start'},actor),calls=0;
 while(result.status==='running'&&calls++<700)result=await service({operation:'advance',token:result.token},actor);
 assert.equal(result.status,'complete');assert.equal(checked,tableSetupSteps.length);assert.ok(stored.size>10);assert.ok(result.progress.verifiedRecords>10);
 const count=stored.size;checked=0;const repeat=createShowMigration({env,now,source,writerFactory:()=>writer,verify:async()=>({status:'verified',verified:true})});result=await repeat({operation:'start'},actor);calls=0;while(result.status==='running'&&calls++<700)result=await repeat({operation:'advance',token:result.token},actor);assert.equal(result.status,'complete');assert.equal(stored.size,count);
});
test('file upload is verified block for block, existing file is never uploaded again, corruption stops',async()=>{
 const bytes=Buffer.from('%PDF-1.7 synthetic'),file={identity:'file/test',name:'test.pdf',mime:'application/pdf',size:bytes.length,sha256:digest(bytes)},actions=[];let uploaded=false;
 const writer={resolve:async()=>({id:'11111111-1111-4111-8111-111111111111',set:'native_docs'}),meta:async()=>({PrimaryIdAttribute:'native_docid'}),json:async()=>({esmojo_bestand:uploaded?'file-id':null}),call:async(name,{body})=>{actions.push({name,body});if(name==='InitializeFileBlocksUpload')return Response.json({FileContinuationToken:'upload'});if(name==='UploadBlock')return new Response(null,{status:204});if(name==='CommitFileBlocksUpload'){uploaded=true;return Response.json({});}if(name==='InitializeFileBlocksDownload')return Response.json({FileContinuationToken:'download',FileSizeInBytes:bytes.length});if(name==='DownloadBlock')return Response.json({Data:bytes.toString('base64')});throw Error(name);}};
 const read=async offset=>({offset,size:bytes.length,sha256:file.sha256,base64:bytes.toString('base64')});
 let state;for(let n=0;n<8&&!state?.done;n++)state=await migrateFileStep({file,state,writer,read});assert.equal(state.done,true);assert.equal(actions.filter(a=>a.name==='UploadBlock').length,1);
 state=null;for(let n=0;n<8&&!state?.done;n++)state=await migrateFileStep({file,state,writer,read});assert.equal(actions.filter(a=>a.name==='UploadBlock').length,1);
 state={phase:'verify',offset:0,continuation:'download',sessionStartedAt:Date.now()};await assert.rejects(migrateFileStep({file,state,writer,read:async()=>({offset:0,size:bytes.length,sha256:file.sha256,base64:Buffer.alloc(bytes.length).toString('base64')})}),/MIGRATION_CONFLICT/);
});

test('native writer uses actual metadata collections/navigation and create-only requests; lost replies and conflicts are safe',async()=>{
 const rows=new Map(),calls=[],nativeNames=new Map([['esmojo_artiest','artists_native'],['esmojo_locatie','venues_native'],['esmojo_concertreeks','series_native']]);let loseReply=false;
 const connection={connect:async()=>({headers:{Authorization:'server-only'}}),json:response=>response.json(),call:async(path,headers,options={})=>{
  const method=options.method||'GET';calls.push({path,headers,options});
  if(path.startsWith('EntityDefinitions(')){const name=/LogicalName='([^']+)'/.exec(path)[1];return Response.json({LogicalName:name,EntitySetName:nativeNames.get(name),PrimaryIdAttribute:name+'_native_id',ManyToOneRelationships:tableByName.get(name).columns.filter(c=>c.target).map(c=>({ReferencingAttribute:c.logical_name,ReferencingEntityNavigationPropertyName:'nav_'+c.logical_name}))});}
  const [base,query]=path.split('?'),set=base.split('(')[0],table=[...nativeNames].find(([,value])=>value===set)?.[0];assert.ok(table);
  if(method==='GET'&&!base.includes('(')){const filter=new URLSearchParams(query).get('$filter'),key=/eq '([^']+)'/.exec(filter)[1];return Response.json({value:[...rows.values()].filter(row=>row.set===set&&row.esmojo_sleutel===key)});}
  if(method==='PATCH'){
   assert.equal(headers['If-None-Match'],'*');const id=/\(([^)]+)\)/.exec(base)[1],body=options.body,row={...body,set,[table+'_native_id']:id,'@odata.etag':'W/"1"'};
   for(const [key,value]of Object.entries(body))if(key.endsWith('@odata.bind'))row['_'+key.slice(4,-11)+'_value']=/\(([^)]+)\)/.exec(value)[1];
   for(const column of tableByName.get(table).columns.filter(c=>c.type==='Datum en tijd'))if(row[column.logical_name])row[column.logical_name]=column.settings.startsWith('Gedrag Alleen datum;')?row[column.logical_name]+'T00:00:00Z':row[column.logical_name].replace(/\.\d{3}Z$/,'Z');for(const column of tableByName.get(table).columns.filter(c=>['Eén tekstregel','Meerdere tekstregels'].includes(c.type)&&c.required!=='Ja'))if(row[column.logical_name]==='')row[column.logical_name]=null;rows.set(id,row);if(loseReply){loseReply=false;throw Error('MIGRATION_UNCONFIRMED');}return new Response(null,{status:204});
  }
  throw Error('unsupported request');
 }};
 const writer=createMigrationWriter({connection}),artist=record('artiest','artist','Artist',{biografie:'',biografieopgehaaldop:'2026-11-12T10:20:30.789Z'}),venue=record('locatie','venue','Venue',{locatiecode:'venue'});
 await writer.ensure(artist);await writer.ensure(venue);
 const series=record('concertreeks','series','Series',{eerstedatum:'2026-11-23',laatstedatum:'2026-11-23'},{artiest:reference('artiest','artist'),locatie:reference('locatie','venue')});
 const result=await writer.ensure(series);assert.equal(result.verified,true);const creates=calls.filter(c=>c.options.method==='PATCH').length;await writer.ensure(series);assert.equal(calls.filter(c=>c.options.method==='PATCH').length,creates);
 const changed=structuredClone(series);changed.fields.esmojo_naam='Changed';await assert.rejects(writer.ensure(changed),/MIGRATION_CONFLICT/);assert.equal(calls.filter(c=>c.options.method==='PATCH').length,creates);
 loseReply=true;const next=record('artiest','second','Second');await assert.rejects(writer.ensure(next),/MIGRATION_UNCONFIRMED/);assert.equal((await writer.ensure(next)).created,false);
 const forbidden=record('artiest','forbidden','Forbidden',{arbitraryfield:'private'});await assert.rejects(writer.ensure(forbidden),/MIGRATION_MAPPING/);
});

test('risk/PDF relationships, measures and management cryptographic binding are preserved',()=>{
 const source=fixture(),revision='a'.repeat(64),sha='b'.repeat(64),measureId='operational:'+revision+':R01';
 source.files=[{fileId:'pdf-id',name:'profile.pdf',mime:'application/pdf',size:10,sha256:sha,kind:'showprofile-pdf',version:1,revision}];
 source.documents['showprofiel_risicos_v1_'+revision+'.json']={source:{revision,sha256:sha},pdfVersion:1,createdAt:'2026-11-12T10:00:00Z',result:{promptVersion:1,limitations:[],risks:[{id:'R01',title:'Risk',description:'Description',consequence:'Consequence',basis:'explicit',evidence:[{page:1,quote:'Evidence'}]}]}};
 source.documents['productionele-risicos.json'].operationalReviews={[revision]:{source:{revision,sha256:sha},assessments:{R01:{revision:1,riskLevel:'high',riskNote:'Mitigation',completedAt:'2026-11-12T10:00:00Z'}}}};
 source.documents['productionele-risicos.json'].measureImplementations={[measureId]:{revision:1,basis:JSON.stringify([measureId,'high','Mitigation']),originalRiskLevel:'high',riskLevelAfter:'low',briefing:false,briefingChosen:true,completedAt:'2026-11-12T10:00:00Z',completedBy:'person',lastMutation:'c'.repeat(64),attachments:[]}};
 const management={id:'legacy-aad-id',concert_id:'show',access_hash:'d'.repeat(64),pin_hash:'e'.repeat(64),sealed_credentials:'sealed-data',enabled:true,progress:{staff:'empty',environment:'draft',policy:'completed',reports:'empty'},attempt_count:3,attempt_until:'2026-11-12T11:00:00Z'};
 const result=mapShow(source,people,management);assert.equal(result.records.find(r=>r.table==='esmojo_showbeheer').fields.esmojo_cryptoaadid,'legacy-aad-id');assert.equal(result.records.filter(r=>r.table==='esmojo_zaalbijdrage').length,4);assert.equal(result.records.find(r=>r.table==='esmojo_beheersmaatregel').fields.esmojo_briefing,choice('janee',false));assert.equal(result.records.find(r=>r.table==='esmojo_document').fields.esmojo_documentstatus,choice('bronstatus','pending'));assert.equal(result.records.find(r=>r.table==='esmojo_risicoanalysebron').links.esmojo_brondocument.table,'esmojo_document');
 source.documents['productionele-risicos.json'].measureImplementations[measureId].basis='stale';assert.equal(mapShow(source,people).records.find(r=>r.table==='esmojo_beheersmaatregel').fields.esmojo_implementatiestatus,choice('beoordelingsstatus','invalidated'));
});

test('a changed source after a partial batch stops before further target writes',async()=>{
 let writes=0;const source={people:async()=>people,catalogue:async()=>[],referenceFiles:()=>[]},tokens=migrationTokens({env,now});
 const service=createShowMigration({env,now,source,tokens,writerFactory:()=>({ensure:async()=>{writes++;}})});
 const token=tokens.seal({version:1,actor,expires:now()+10000,stage:'people',index:0,verifiedRecords:0,verifiedFiles:0,peopleHash:'f'.repeat(64)});
 await assert.rejects(service({operation:'advance',token},actor),/MIGRATION_SOURCE_CHANGED/);assert.equal(writes,0);
});

test('lost file commit reply recovers through existing bytes rather than repeating an expired upload',async()=>{
 const bytes=Buffer.from('file'),file={identity:'file',name:'f.pdf',mime:'application/pdf',size:4,sha256:digest(bytes)};let uploaded=false,uploadCalls=0;
 const writer={resolve:async()=>({id:'11111111-1111-4111-8111-111111111111',set:'docs'}),meta:async()=>({PrimaryIdAttribute:'native_id'}),json:async()=>({esmojo_bestand:uploaded?'file-id':null}),call:async name=>{if(name==='UploadBlock'){uploadCalls++;return new Response(null,{status:204});}if(name==='CommitFileBlocksUpload'){uploaded=true;throw Error('lost reply');}if(name==='InitializeFileBlocksDownload')return Response.json({FileContinuationToken:'download',FileSizeInBytes:4});throw Error(name);}};
 const state={phase:'upload',offset:0,continuation:'upload',sessionStartedAt:Date.now()},read=async offset=>({offset,size:4,sha256:file.sha256,base64:bytes.toString('base64')});
 await assert.rejects(migrateFileStep({file,state,writer,read}),/lost reply/);const recovered=await migrateFileStep({file,state,writer,read});assert.equal(recovered.phase,'verify');assert.equal(uploadCalls,1);
});

test('pinned super-administrator maps to the ordinary Dataverse administrator role, preserving source policy in history',()=>{
 const source={...people,superAdminId:'person',profiles:[{...people.profiles[0],role:'superbeheerder'}]};
 const before=structuredClone(source),result=mapPeople(source),employee=result.records.find(row=>row.table==='esmojo_medewerker'),audit=result.records.find(row=>row.table==='esmojo_historie');
 assert.equal(employee.fields.esmojo_rol,choice('medewerkerrol','beheerder'));
 assert.equal(JSON.parse(audit.fields.esmojo_snapshot_json).sourceRole,'superbeheerder');
 assert.equal(JSON.parse(audit.fields.esmojo_snapshot_json).policy,'existing-pinned-super-administrator');
 assert.deepEqual(source,before,'Source roles and policy remain unchanged');
 assert.throws(()=>mapPeople({...source,superAdminId:'different-person'}),/MIGRATION_SOURCE/);
 assert.throws(()=>mapPeople({...source,superAdminId:null}),/MIGRATION_SOURCE/);
});

test('native empty text and subsecond readback representations are equivalent; actual content and different seconds still conflict',()=>{
 const row=record('artiest','precision','Artist',{biografie:'',biografieopgehaaldop:'2026-11-12T10:20:30.789Z'}),native={...row.fields,esmojo_biografie:null,esmojo_biografieopgehaaldop:'2026-11-12T10:20:30Z'};
 assert.deepEqual(migrationDifferences(row,native),[]);
 assert.deepEqual(migrationDifferences(row,{...native,esmojo_biografie:'Actual text'}).map(d=>d.column),['esmojo_biografie']);
 assert.deepEqual(migrationDifferences(row,{...native,esmojo_biografieopgehaaldop:'2026-11-12T10:20:31Z'}).map(d=>d.column),['esmojo_biografieopgehaaldop']);
 assert.deepEqual(migrationDifferences(row,{...native,esmojo_biografieopgehaaldop:'2026-11-12T10:20:30.123Z'}).map(d=>d.column),['esmojo_biografieopgehaaldop']);
 assert.deepEqual(migrationDifferences(row,{...native,esmojo_naam:null}).map(d=>d.column),['esmojo_naam']);
 const count=record('ticketverkoop','zero','Tickets',{aantal:0},{bezoekersgegeven:reference('bezoekersgegeven','visitor'),concert:reference('concert','show')});assert.ok(migrationDifferences(count,{...count.fields,esmojo_aantal:null}).length);
});
test('conflict diagnostics contain only approved schema names/labels and fixed reasons; exact source timestamps remain in history',()=>{
 const error=Object.assign(Error('MIGRATION_CONFLICT'),{migration:{table:'esmojo_artiest',differences:[{column:'esmojo_biografieopgehaaldop',reason:'DATETIME_DIFFERENCE',actual:'secret actual value',expected:'secret source value'},{column:'unknown',reason:'VALUE_DIFFERENCE'}],private:'sensitive'}});
 const details=migrationConflictDetails(error);assert.equal(details.differences.length,1);assert.equal(details.differences[0].column,'esmojo_biografieopgehaaldop');assert.doesNotMatch(JSON.stringify(details),/secret|sensitive|actual|expected|unknown/);assert.equal(migrationConflictDetails({migration:{table:'unapproved',differences:[]}}),null);
 const source=fixture();source.biography={text:'Original biography',capturedAt:'2026-11-12T10:20:30.789Z'};const result=mapShow(source,people),history=result.records.find(row=>row.fields.esmojo_entiteitsoort==='artist-source');assert.equal(JSON.parse(history.fields.esmojo_snapshot_json).biography.capturedAt,source.biography.capturedAt);
});

test('an old native file session is renewed safely after a background-worker interruption',async()=>{
 const bytes=Buffer.from('file'),file={identity:'file',name:'f.pdf',mime:'application/pdf',size:4,sha256:digest(bytes)};let initializations=0,uploads=0;
 const writer={resolve:async()=>({id:'11111111-1111-4111-8111-111111111111',set:'docs'}),meta:async()=>({PrimaryIdAttribute:'native_id'}),json:async()=>({esmojo_bestand:'existing-file'}),call:async name=>{if(name==='InitializeFileBlocksDownload'){initializations++;return Response.json({FileContinuationToken:'fresh-download',FileSizeInBytes:4});}if(name==='UploadBlock')uploads++;throw Error('Unexpected mutation');}};
 const read=async()=>assert.fail('Restart initializes without reading a source block yet'),state={phase:'upload',offset:0,continuation:'expired-token',sessionStartedAt:1000};
 const resumed=await migrateFileStep({file,state,writer,read,now:()=>700000});assert.equal(resumed.phase,'verify');assert.equal(resumed.continuation,'fresh-download');assert.equal(resumed.sessionStartedAt,700000);assert.equal(initializations,1);assert.equal(uploads,0);
});
