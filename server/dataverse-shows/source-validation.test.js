import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFixture,sampleSource,samplePeople} from './test-fixture.js';import {createSourceValidation} from './source-validation.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
function fixture({active=true,changed=false}={}){
 const source=structuredClone(sampleSource),people=structuredClone(samplePeople);source.documents['productionele-risicos.json']={managedBy:'ESMOJO/ProductionRisks-v1',classification:'vertrouwelijk',concertId:source.concertId,revision:0,choices:{},history:[{at:'2026-11-01T12:00:00Z',field:'floor_pressure',action:'test'},{at:'2026-11-01T11:00:00Z',field:'barrier',action:'test'}]};
 if(active){source.activeRevision=7;source.activeAudit={revision:7,concertId:source.concertId,snapshot:{version:1}};}
 const db=nativeFixture(source,people),fresh=structuredClone(source);delete fresh.activeAudit;fresh.activeRevision=8;fresh.marker={managedBy:'ESMOJO/ActiveStorage-v1',classification:'vertrouwelijk',version:1,mode:'archive',archived:true,revision:8,command:'a'.repeat(64),at:'2026-11-13T10:00:00Z'};fresh.documents['productionele-risicos.json'].history.reverse();if(changed)fresh.documents['productionele-risicos.json'].choices.fireworks=false;
 const exports={catalogue:async()=>[{...source.shows[0],source:'drive'}],people:async()=>people,referenceFiles:()=>[],show:async()=>({bundle:structuredClone(fresh),management:null})},validate=createSourceValidation({env,source:exports,connection:db.connection});return{...db,validate};
}
test('archival protocol changes and chronological ordering preserve exact business fields without target writes',async()=>{
 for(const active of [true,false]){const f=fixture({active}),before=f.writes();let cursor=await f.validate(null,'synthetic-esm');cursor=await f.validate(cursor,'synthetic-esm');cursor=await f.validate(cursor,'synthetic-esm');assert.equal(cursor.phase,'complete');assert.equal(cursor.archiveLineage[0].archivedGeneration,8);assert.equal(cursor.archiveLineage[0].copiedGeneration,active?7:0);assert.equal(f.writes(),before);}
});
test('a real production choice difference still blocks despite a valid terminal archive marker',async()=>{
 const f=fixture({changed:true});const cursor=await f.validate(null,'synthetic-esm');await assert.rejects(f.validate(cursor,'synthetic-esm'),error=>error.message==='MIGRATION_CONFLICT'&&error.migration.table==='esmojo_historie');
});
