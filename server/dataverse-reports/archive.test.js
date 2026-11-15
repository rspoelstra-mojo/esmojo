import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeReaderFixture} from './reader-fixture.js';
import {createNativeReportsRepository} from './repository.js';
import {createNativeReportsMutations} from './mutations.js';
import {createNativeReportArchive} from './archive.js';
import {digest} from '../show-migration-writer.js';
const token='c'.repeat(64),recipient='77777777-7777-4777-8777-777777777777',reportId='a'.repeat(64),pdfBytes=Buffer.from('%PDF-1.7 synthetic confidential original');
async function fixture(){
 const f=await nativeReaderFixture({prepare:async({drive,show})=>{
  const pdf=drive.addFile(drive.folder,'SR_synthetic.pdf','application/pdf',pdfBytes),state=JSON.parse(drive.mail.content);
  state.reports.push({id:reportId,sourceId:'old-source',sourceHash:'b'.repeat(64),show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]},pdfId:pdf.id,fileName:pdf.name,sha256:digest(pdfBytes),version:'1.0',layoutVersion:'ontrack-showreport-v1',convertedAt:'2026-11-04T12:00:00Z',emailStatus:'sent',deliveries:[{recipientId:recipient,status:'sent',attempts:1,firstAttemptAt:'2026-11-04T12:01:00Z',sentAt:'2026-11-04T12:01:05Z',providerId:'synthetic-provider',target:{email:'synthetic@example.invalid',firstName:'Synthetic'},mail:{version:'online-report-v4'},receiptToken:token}]});drive.mail.setContent(JSON.stringify(state));
 }});
 const repository=createNativeReportsRepository({connection:f.destination.connection}),mutations=createNativeReportsMutations({connection:f.destination.connection,repository});let allowed=true,admin=true;
 const accounts=[{id:recipient,role:'beheerder',activated:true,disabled:false,modules:['reports'],firstName:'Synthetic',lastName:'Recipient',email:'synthetic@example.invalid'}],profiles=async(operation,actor)=>operation==='list'?accounts:{...accounts[0],id:actor,role:admin?'beheerder':'gebruiker',modules:allowed?['reports']:[]};
 const archive=createNativeReportArchive({repository,mutations,profiles,now:()=>new Date('2026-11-05T13:01:00Z')});
 return{...f,repository,archive,deny(){allowed=false;},regular(){admin=false;}};
}
test('native mail history and original PDF preserve historical versions and delivery snapshots',async()=>{
 const f=await fixture(),history=await f.archive.history(recipient),download=await f.archive.download(recipient,reportId);
 assert.equal(history.reports.length,1);assert.equal(history.reports[0].id,reportId);assert.deepEqual(history.reports[0].recipients,[{id:recipient,name:'Synthetic Recipient',email:'synthetic@example.invalid',tracked:true,openedAt:null}]);assert.ok(Buffer.from(download.pdfBase64,'base64').equals(pdfBytes));assert.equal(download.sha256,digest(pdfBytes));
});
test('first opening requires own delivery and exact receipt token; it never changes delivery status',async()=>{
 const f=await fixture(),payload={concertId:f.show.concertId,token},before=f.destination.rows('esmojo_rapportaflevering')[0];
 assert.deepEqual(await f.archive.open('another-account',payload),{ok:true,recorded:false});assert.deepEqual(await f.archive.open(recipient,{...payload,token:'d'.repeat(64)}),{ok:true,recorded:false});
 assert.deepEqual(await f.archive.open(recipient,payload),{ok:true,recorded:true});const row=f.destination.rows('esmojo_rapportaflevering')[0];assert.equal(row.esmojo_eerstgeopendop,'2026-11-05T13:01:00.000Z');assert.equal(row.esmojo_afleverstatus,before.esmojo_afleverstatus);assert.equal(row.esmojo_providerid,before.esmojo_providerid);
 const revision=row['@odata.etag'];await f.archive.open(recipient,payload);assert.equal(f.destination.rows('esmojo_rapportaflevering')[0]['@odata.etag'],revision);
});
test('concurrent openings record one first moment and a lost acknowledgement is independently confirmed',async()=>{
 const f=await fixture(),payload={concertId:f.show.concertId,token};f.destination.loseNextBatch('esmojo_rapportaflevering');
 const results=await Promise.all([f.archive.open(recipient,payload),f.archive.open(recipient,payload)]);assert.ok(results.every(r=>r.recorded));assert.equal(f.destination.rows('esmojo_rapportaflevering')[0].esmojo_eerstgeopendop,'2026-11-05T13:01:00.000Z');
});
test('current Reports and administrator boundaries reject content and files before native reads',async()=>{
 const f=await fixture();f.regular();await assert.rejects(f.archive.history(recipient),/FORBIDDEN/);await assert.rejects(f.archive.download(recipient,reportId),/FORBIDDEN/);
 f.deny();const before=f.destination.calls.length;await assert.rejects(f.archive.open(recipient,{concertId:f.show.concertId,token}),/FORBIDDEN/);assert.equal(f.destination.calls.length,before);
});
