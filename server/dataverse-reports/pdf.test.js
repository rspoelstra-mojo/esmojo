import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createReportsOperationalStore} from './operational.js';
import {createReportsProcessing} from './processing.js';
import {createReportsStateStore} from './operational.js';
import {createReportsIntake} from './bridge.js';
import {createNativeReportReader} from './read.js';
import {createNativeReportPdf} from './pdf.js';
import {createNativeReportArchive} from './archive.js';
import {digest} from '../show-migration-writer.js';
import {SHOW_REPORT_LAYOUT} from '../ontrack-report/contract.js';
const jobId='88888888-8888-4888-8888-888888888888';
async function fixture(){
 const f=await nativeReaderFixture(),repo=createNativeReportsRepository({connection:f.destination.connection}),mutations=createNativeReportsMutations({repository:repo,connection:f.destination.connection}),store=createReportsStateStore({env:f.env,connection:f.destination.connection}),operational=createReportsOperationalStore({store}),processing=createReportsProcessing({env:f.env,repository:repo,store}),intake=createReportsIntake({bridge:f.drive.store}),reader=createNativeReportReader({repository:repo}),shown=(await reader.current())[0].show,service=createNativeReportPdf({intake,processing,dependencies:{resolve:async()=>shown},reader,repository:repo,writer:f.writer,mutations,operational,authorize:async()=>{},selection:async()=>({recipientIds:[]}),accounts:async()=>[],now:()=>Date.parse('2026-11-05T12:00:00Z')});return{...f,repo,service,processing};
}
test('native PDF worker reserves original native CSV, freezes generation and stores/verifies PDF File without sending mail',async()=>{
 const f=await fixture(),original=String(f.drive.mail.content);await f.service.scan();const job=await f.service.reserve({jobId,layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(job.state,'reserved');assert.equal(Buffer.from(job.csvBase64,'base64').toString(),String(f.csv.content));assert.equal((await f.service.reserve({jobId:'99999999-9999-4999-8999-999999999999',layoutVersion:SHOW_REPORT_LAYOUT})).state,'idle');
 const bytes=Buffer.from('%PDF-1.7 synthetic retained confidential document '+'.'.repeat(110)),payload={sourceId:job.sourceId,jobId,reportId:job.reportId,pdfBase64:bytes.toString('base64'),sha256:digest(bytes),pageCount:2,warnings:[]};await f.service.commit(payload);await f.service.commit(payload);
 const archive=createNativeReportArchive({repository:f.repo,profiles:async()=>({id:'synthetic-admin',activated:true,role:'beheerder',modules:['reports']})}),download=await archive.download('synthetic-admin',job.reportId);assert.ok(Buffer.from(download.pdfBase64,'base64').equals(bytes));assert.equal(f.destination.rows('esmojo_rapportpdf').length,1);const metadata=JSON.parse(f.destination.rows('esmojo_rapportverzending')[0].esmojo_mailparameters_json);assert.equal(metadata.exportGeneratedAt,job.generatedAt);assert.equal(metadata.timeZone,'Europe/Amsterdam');assert.equal(f.destination.rows('esmojo_rapportaflevering').length,0);assert.equal(String(f.drive.mail.content),original);
});
test('native PDF generation failure releases only the matching job while retaining the frozen version for retry',async()=>{
 const f=await fixture();await f.service.scan();const job=await f.service.reserve({jobId,layoutVersion:SHOW_REPORT_LAYOUT});await f.service.fail({sourceId:job.sourceId,jobId:'99999999-9999-4999-8999-999999999999',errorCode:'GENERATION_FAILED'});assert.equal((await f.processing.read(job.sourceId)).value.job.id,jobId);
 await f.service.fail({sourceId:job.sourceId,jobId,errorCode:'GENERATION_FAILED'});const next=await f.service.reserve({jobId:'99999999-9999-4999-8999-999999999999',layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(next.version,job.version);assert.equal(next.generatedAt,job.generatedAt);assert.equal(next.reportId,job.reportId);
});
test('two physical copies of the same CSV cannot reserve two simultaneous renders',async()=>{const f=await fixture();f.drive.addCsv(f.show);await f.service.scan();const first=await f.service.reserve({jobId,layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(first.state,'reserved');const second=await f.service.reserve({jobId:'99999999-9999-4999-8999-999999999999',layoutVersion:SHOW_REPORT_LAYOUT});assert.equal(second.state,'idle');assert.equal((await f.processing.read('generation-'+first.reportId)).value.job.sourceId,first.sourceId);});
