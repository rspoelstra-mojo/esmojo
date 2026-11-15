import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createReportsOperationalStore} from './operational.js';
import {createReportsProcessing} from './processing.js';
import {createReportsStateStore} from './operational.js';
import {createReportsIntake} from './bridge.js';
import {createNativeReportPublication} from './publication.js';
import {createNativeReportIngest} from './ingest.js';
import {createNativeReportReader} from './read.js';
import {createWebCatalogueService} from '../web-report-catalogue.js';
import {csvFixture} from '../test-support/web-reports-drive.js';
async function fixture(){
 const f=await nativeReaderFixture(),repo=createNativeReportsRepository({connection:f.destination.connection}),mutations=createNativeReportsMutations({repository:repo,connection:f.destination.connection}),store=createReportsStateStore({env:f.env,connection:f.destination.connection}),operational=createReportsOperationalStore({store}),processing=createReportsProcessing({env:f.env,repository:repo,store}),intake=createReportsIntake({bridge:f.drive.store}),reader=createNativeReportReader({repository:repo,now:()=>new Date('2026-11-07T12:00:00Z')}),summary=await reader.summary(f.show.concertId),dependencies={resolve:async()=>summary.show,context:async()=>({general:null,contextGeneral:summary.context.general,timetable:summary.context.timetable}),entry:show=>({show:{...show,city:'Amsterdam',seriesId:null},sources:[]})};let permitted=true;
 const ingest=createNativeReportIngest({intake,processing,dependencies,publication:createNativeReportPublication({writer:f.writer,repository:repo,mutations}),repository:repo,operational,authorize:async()=>{if(!permitted)throw Error('FORBIDDEN');}}),service=createWebCatalogueService({store:(op,actor,payload)=>({'web-scan':()=>ingest.scan(actor,payload),'web-source':()=>ingest.source(actor,payload),'web-commit':()=>ingest.commit(actor,payload)})[op]()});
 return{...f,ingest,service,reader,deny(){permitted=false;}};
}
test('unchanged CSV-per-show intake publishes natively through the existing parser contract with no Drive register writes',async()=>{
 const f=await fixture(),original=String(f.drive.mail.content);f.drive.advance(1000);const csv=f.drive.addCsv(f.show,{content:csvFixture(f.show.date,[{ID:'native-new',Description:'Synthetic incoming CSV'}])});
 const result=await f.service.synchronize();assert.equal(result.validated,1);const source=await f.reader.source(f.show.concertId);assert.equal(source.csvBase64,Buffer.from(csv.content).toString('base64'));assert.equal(String(f.drive.mail.content),original);
 const before=f.destination.rows('esmojo_rapportversie').length;assert.equal((await f.service.synchronize()).validated,0);assert.equal(f.destination.rows('esmojo_rapportversie').length,before);
});
test('invalid incoming CSV never replaces an existing report or creates fictional business incidents',async()=>{
 const f=await fixture(),before=await f.reader.source(f.show.concertId),incidents=f.destination.rows('esmojo_rapportincident').length;f.drive.advance(1000);f.drive.addCsv(f.show,{content:'not,the,CSV,contract'});
 assert.equal((await f.service.synchronize()).invalid,1);assert.equal((await f.reader.source(f.show.concertId)).sourceHash,before.sourceHash);assert.equal(f.destination.rows('esmojo_rapportincident').length,incidents);
});
test('current access is required before scanning the intake boundary',async()=>{const f=await fixture();f.deny();const before=f.drive.calls.length;await assert.rejects(f.ingest.scan(null),/FORBIDDEN/);assert.equal(f.drive.calls.length,before);});
