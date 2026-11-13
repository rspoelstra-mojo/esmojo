import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';import {createSourceValidation} from './source-validation.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
function fixture({active=true,changed=false,sourceMode='archived',revision=8}={}){
 const source=structuredClone(sampleSource),people=structuredClone(samplePeople);source.documents['productionele-risicos.json']={managedBy:'ESMOJO/ProductionRisks-v1',classification:'vertrouwelijk',concertId:source.concertId,revision:0,choices:{},history:[{at:'2026-11-01T12:00:00Z',field:'floor_pressure',action:'test'},{at:'2026-11-01T11:00:00Z',field:'barrier',action:'test'}]};
 if(active){source.activeRevision=7;source.activeAudit={revision:7,concertId:source.concertId,snapshot:{version:1}};}
 const db=nativeFixture(source,people),fresh=structuredClone(source);delete fresh.activeAudit;fresh.activeRevision=8;fresh.marker={managedBy:'ESMOJO/ActiveStorage-v1',classification:'vertrouwelijk',version:1,mode:'archive',archived:true,revision:8,command:'a'.repeat(64),at:'2026-11-13T10:00:00Z'};fresh.activeRevision=revision;fresh.marker.revision=revision;if(sourceMode==='active'){fresh.marker.archived=false;fresh.marker.mode='sync';fresh.activeAudit={revision,concertId:source.concertId,snapshot:{version:1}};}fresh.documents['productionele-risicos.json'].history.reverse();if(changed)fresh.documents['productionele-risicos.json'].choices.fireworks=false;
 const exports={catalogue:async()=>[{...source.shows[0],source:'drive'}],people:async()=>people,referenceFiles:()=>[],show:async()=>({bundle:structuredClone(fresh),management:null})},validate=createSourceValidation({env,source:exports,connection:db.connection});return{...db,validate};
}
test('archival protocol changes and chronological ordering preserve exact business fields without target writes',async()=>{
 for(const active of [true,false]){const f=fixture({active}),before=f.writes();let cursor=await f.validate(null,'synthetic-esm');cursor=await f.validate(cursor,'synthetic-esm');cursor=await f.validate(cursor,'synthetic-esm');assert.equal(cursor.phase,'complete');assert.equal(cursor.sourceLineage[0].currentGeneration,8);assert.equal(cursor.sourceLineage[0].copiedGeneration,active?7:0);assert.equal(f.writes(),before);}
});
test('a real production choice difference still blocks despite a valid terminal archive marker',async()=>{
 const f=fixture({changed:true});const cursor=await f.validate(null,'synthetic-esm');await assert.rejects(f.validate(cursor,'synthetic-esm'),error=>error.message==='MIGRATION_CONFLICT'&&error.migration.table==='esmojo_historie');
});
test('shared timetable capture respects the same production writer barrier',async()=>{
 const {makeTimetablesSyncHandler}=await import('../../api/timetables-sync.js');let captured=0;const handler=makeTimetablesSyncHandler({identify:async()=>{},guard:async()=>{throw Error('STORAGE_BUSY');},capture:async()=>{captured++;return{ok:true};}}),res={setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};await handler({method:'POST',headers:{}},res);assert.equal(res.code,503);assert.equal(captured,0);
});
test('an active monotone provider revision is harmless only with equal documents and typed business fields',async()=>{
 const f=fixture({sourceMode:'active'});let cursor=await f.validate(null,'synthetic-esm');cursor=await f.validate(cursor,'synthetic-esm');assert.equal(cursor.sourceLineage[0].kind,'active');assert.equal(cursor.sourceLineage[0].copiedGeneration,7);assert.equal(cursor.sourceLineage[0].currentGeneration,8);assert.equal(f.writes(),0);
 const changed=fixture({sourceMode:'active',changed:true}),before=await changed.validate(null,'synthetic-esm');await assert.rejects(changed.validate(before,'synthetic-esm'),/MIGRATION_CONFLICT/);
});
test('a backward active provider generation remains a conflict',async()=>{
 const f=fixture({sourceMode:'active',revision:6}),cursor=await f.validate(null,'synthetic-esm');await assert.rejects(f.validate(cursor,'synthetic-esm'),error=>error.message==='MIGRATION_CONFLICT'&&error.sourceMode==='active');
});
test('dependency diagnostics expose only schema allowlisted table and fixed stage',async()=>{
 const {migrationDependencyDetails}=await import('../show-migration-writer.js');
 assert.deepEqual(migrationDependencyDetails({dependency:{table:'esmojo_concert',stage:'lookup',secret:'must not leak'}}),{table:'esmojo_concert',label:'Concert',stage:'lookup'});
 assert.equal(migrationDependencyDetails({dependency:{table:'private-secret',stage:'lookup'}}),null);
 assert.equal(migrationDependencyDetails({dependency:{table:'esmojo_concert',stage:'private-secret'}}),null);
});
function timetableFixture({copied=false,change=false,allow=true,moving=false}={}){
 const source=structuredClone(sampleSource),people=structuredClone(samplePeople),concertId=source.concertId;
 const timetable={concertId,snapshot:{concertId,date:'2026-11-15',capturedAt:'2026-11-13T12:00:00Z',entries:[{kind:'doors',label:'Deuren',publishedLabel:'19:00',time:'19:00',localDate:'2026-11-15'}]}};
 if(copied)source.timetables=[structuredClone(timetable)];
 const db=nativeFixture(source,people),fresh=structuredClone(source);fresh.timetables=[timetable];if(change)timetable.snapshot.entries[0].time='20:00';let calls=0;
 const exports={catalogue:async()=>[{...source.shows[0],source:'drive'}],people:async()=>people,referenceFiles:()=>[],show:async()=>{const bundle=structuredClone(fresh);if(moving&&++calls>1)bundle.timetables[0].snapshot.entries[0].time='21:00';return{bundle,management:null};}};
 return{...db,source,people,exports,allow};
}
async function timetableValidator(f){const {createNativeShowState}=await import('./state.js');const state=createNativeShowState({env,repository:f.repo});return{state,validate:createSourceValidation({env,source:f.exports,connection:f.connection,nativeState:state,allowNewTimetables:f.allow})};}
test('cutover can atomically copy only the first timetable, read it back and verify again',async()=>{
 const f=timetableFixture(),{validate,state}=await timetableValidator(f);let cursor=await validate(null,'synthetic-esm');cursor=await validate(cursor,'synthetic-esm');assert.equal(cursor.index,1);assert.ok(f.writes()>0);
 const loaded=await state.load(f.source.concertId);assert.equal(loaded.source.timetables.length,1);assert.equal(loaded.source.timetables[0].snapshot.entries[0].time,'19:00');
 const before=f.writes();cursor=await validate(null,'synthetic-esm');await validate(cursor,'synthetic-esm',{stableSource:true});assert.equal(f.writes(),before);
});
test('normal read-only validation never imports a missing timetable',async()=>{
 const f=timetableFixture({allow:false}),{validate}=await timetableValidator(f),cursor=await validate(null,'synthetic-esm');await assert.rejects(validate(cursor,'synthetic-esm'),/MIGRATION_DEPENDENCY/);assert.equal(f.writes(),0);
});
test('an existing changed timetable or moving source cannot be silently replaced',async()=>{
 for(const options of [{copied:true,change:true},{moving:true}]){const f=timetableFixture(options),{validate}=await timetableValidator(f),cursor=await validate(null,'synthetic-esm');await assert.rejects(validate(cursor,'synthetic-esm'),/MIGRATION_CONFLICT|MIGRATION_SOURCE_CHANGED/);assert.equal(f.writes(),0);}
});
test('concurrent target change rolls back the complete timetable addition',async()=>{
 const f=timetableFixture(),{state}=await timetableValidator(f),{mapShow}=await import('../show-migration-map.js'),{newTimetableRows,addNewTimetables}=await import('./timetable-delta.js');
 const loaded=await state.load(f.source.concertId),{bundle}=await f.exports.show(),rows=newTimetableRows(bundle,loaded,mapShow(bundle,f.people));
 const actual=f.tables.get('esmojo_concertreeks').get(loaded.seriesId);actual['@odata.etag']='W/"changed"';const before=f.writes();await assert.rejects(addNewTimetables(state,loaded,rows),/DATAVERSE_SHOWS_CONFLICT/);assert.equal(f.writes(),before);assert.equal(f.tables.get('esmojo_tijdschemaregel').size,0);
});
