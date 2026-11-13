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
