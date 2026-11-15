import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createNativeReportPublication} from './publication.js';
import {createNativeReportReader} from './read.js';
import {csvFixture} from '../test-support/web-reports-drive.js';
import {digest,canonical} from '../show-migration-writer.js';
const snapshot=f=>{
 const header=f.destination.rows('esmojo_rapportage')[0],version=f.destination.rows('esmojo_rapportversie').find(v=>v.esmojo_rapportversie_id===header._esmojo_actueleversie_value),source=f.destination.rows('esmojo_rapportbron').find(s=>s.esmojo_rapportbron_id===version._esmojo_gekozenbron_value),original=JSON.parse(source.esmojo_herkomst_json),context=JSON.parse(f.destination.rows('esmojo_rapportcontext')[0].esmojo_snapshot_json);
 return{header,version,source,original,context};
};
async function fixture({duplicate=false}={}){
 const f=await nativeReaderFixture(),old=snapshot(f),bytes=duplicate?Buffer.from(f.csv.content):Buffer.from(csvFixture(f.show.date,[{ID:'new-synthetic',Description:'Synthetic new incident'}])),metadata={...old.original.source,id:'new-synthetic-source',name:'incidents_synthetic.csv',modifiedAt:'2026-11-06T12:00:00Z',size:bytes.length};delete metadata.context;metadata.context=digest(metadata);
 const item={source:metadata,sha256:digest(bytes),validation:{...old.original.validation,sourceHash:digest(bytes),context:metadata.context,validatedAt:'2026-11-06T12:01:00Z'},previousValidation:null},bundle={show:metadata.show,sources:[item],files:[{fileId:metadata.id,name:metadata.name,mime:'text/csv',size:bytes.length,sha256:digest(bytes),modifiedAt:metadata.modifiedAt,kind:'csv'}],groups:[],general:{contacts:{productionManager:old.context.general.productionManager,eventSafetyManager:old.context.general.eventSafetyManager,tscProjectLead:old.context.general.tscProjectLead},tickets:{sales:old.context.general.soldTickets,origins:null,shows:[{date:f.show.date}]}},timetable:old.context.timetable},entry={show:{...metadata.show,city:'Amsterdam',seriesId:null},sources:[{id:metadata.id,name:metadata.name,modifiedAt:metadata.modifiedAt,size:metadata.size}],group:{id:'synthetic-existing',first:f.show.date,last:f.show.date}};
 const repository=createNativeReportsRepository({connection:f.destination.connection}),mutations=createNativeReportsMutations({repository,connection:f.destination.connection}),service=createNativeReportPublication({writer:f.writer,repository,mutations});return{...f,old,bundle,item,bytes,entry,repository,service};
}
async function run(f,cursor=null){for(let n=0;n<100;n++){cursor=await f.service.advance({...f,cursor});if(cursor.phase==='complete')return cursor;}throw Error('not completed');}
test('native CSV publication resumes through immutable typed rows and independently verified File before one CAS',async()=>{
 const f=await fixture(),before=f.destination.rows('esmojo_rapportversie').length,first=await f.service.advance(f);assert.notEqual(first.phase,'complete');assert.equal(f.destination.rows('esmojo_rapportage')[0]._esmojo_actueleversie_value,f.old.header._esmojo_actueleversie_value);
 const cursor=await run(f,JSON.parse(JSON.stringify(first)));assert.equal(cursor.phase,'complete');assert.equal(f.destination.rows('esmojo_rapportversie').length,before+1);
 const reader=createNativeReportReader({repository:f.repository,now:()=>new Date('2026-11-07T12:00:00Z')}),read=await reader.source(f.show.concertId);assert.equal(read.csvBase64,f.bytes.toString('base64'));
 assert.equal(f.destination.rows('esmojo_rapportage')[0].esmojo_publicatiegeneratie,2);assert.equal(f.old.version.esmojo_versienummer,1);
});
test('same logical dataset from another physical source preserves the original version number and source anchor',async()=>{
 const f=await fixture({duplicate:true}),before=f.destination.rows('esmojo_rapportversie').length,old=canonical(f.old.version);await run(f);assert.equal(f.destination.rows('esmojo_rapportversie').length,before);assert.equal(canonical(f.destination.rows('esmojo_rapportversie')[0]),old);assert.equal(f.destination.rows('esmojo_rapportbron').length,2);
});
test('changed job proof and a concurrent header change never replace the currently published dataset',async()=>{
 const f=await fixture(),cursor=await f.service.advance(f),changed=structuredClone(f.bundle);changed.files[0].name='changed.csv';await assert.rejects(f.service.advance({...f,bundle:changed,item:changed.sources[0],cursor}),/REPORT_CONFLICT/);
 let next=cursor;while(next.phase!=='publish')next=await f.service.advance({...f,cursor:next});const header=f.destination.rows('esmojo_rapportage')[0];header['@odata.etag']='W/"999999"';await assert.rejects(f.service.advance({...f,cursor:next}),/REPORT_CONFLICT/);assert.equal(header._esmojo_actueleversie_value,f.old.header._esmojo_actueleversie_value);
});
