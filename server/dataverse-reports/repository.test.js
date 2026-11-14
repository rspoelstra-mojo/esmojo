import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeReportsRepository} from './repository.js';
import {nativeReaderFixture} from './reader-fixture.js';
import {digest} from '../show-migration-writer.js';
const writes=f=>f.destination.calls.filter(c=>c.method!=='GET'&&!['InitializeFileBlocksDownload','DownloadBlock'].includes(c.path)).length;
function scope(f){const header=f.destination.rows('esmojo_rapportage')[0],version=f.destination.rows('esmojo_rapportversie').find(r=>r.esmojo_rapportversie_id===header._esmojo_actueleversie_value);return{reportKey:header.esmojo_sleutel,versionKey:version.esmojo_sleutel};}
test('native CSV File is downloaded only through its verified report/version/source relation, with no business writes',async()=>{
 const f=await nativeReaderFixture(),repo=createNativeReportsRepository({env:f.env,connection:f.destination.connection}),before=writes(f),read=await repo.file(scope(f));
 assert.equal(read.bytes.toString(),String(f.csv.content));assert.equal(read.mime,'text/csv');assert.equal(writes(f),before);
});
test('forged keys, unknown tables and mismatched native owners fail before File bytes can be read',async()=>{
 const f=await nativeReaderFixture(),repo=createNativeReportsRepository({connection:f.destination.connection});
 await assert.rejects(repo.byKey('arbitrary','a'.repeat(64)),/VALIDATION/);await assert.rejects(repo.byKey('esmojo_rapportage',"' or true"),/VALIDATION/);
 const source=f.destination.rows('esmojo_rapportbron')[0],before=f.destination.calls.filter(c=>c.path==='DownloadBlock').length;source._esmojo_rapportage_value='99999999-9999-4999-8999-999999999999';
 await assert.rejects(repo.file(scope(f)),/REPORT_CONFLICT/);assert.equal(f.destination.calls.filter(c=>c.path==='DownloadBlock').length,before);
});
test('missing files, wrong bytes and a concurrent owner change fail closed',async()=>{
 for(const kind of ['missing','corrupt','changed']){
  const f=await nativeReaderFixture();let connection=f.destination.connection;
  if(kind==='missing')delete f.destination.rows('esmojo_document')[0].esmojo_bestand;
  if(kind==='corrupt')f.destination.corruptDownloads();
  if(kind==='changed')connection={...connection,call:async(...args)=>{const result=await f.destination.connection.call(...args);if(args[0]==='DownloadBlock')f.destination.rows('esmojo_rapportage')[0]['@odata.etag']='W/"999999"';return result;}};
  const repo=createNativeReportsRepository({connection}),before=writes(f);await assert.rejects(repo.file(scope(f)),/REPORT_UNAVAILABLE|SOURCE_CHANGED/);assert.equal(writes(f),before);
 }
});
test('paged reads reject an external continuation URL and never send requests outside the fixed environment',async()=>{
 const f=await nativeReaderFixture();let external=false;
 const connection={...f.destination.connection,call:async(path,...args)=>{if(path.includes('https://'))external=true;if(path.startsWith('esmojo_rapportages?'))return Response.json({value:[], '@odata.nextLink':'https://external.invalid/api/data/v9.2/esmojo_rapportages'});return f.destination.connection.call(path,...args);}};
 await assert.rejects(createNativeReportsRepository({connection}).query('esmojo_rapportage'),/REPORT_UNAVAILABLE/);assert.equal(external,false);
});
test('historical PDF downloads use their own archive version and cannot borrow the current CSV version',async()=>{
 const bytes=Buffer.from('%PDF-1.7 synthetic retained artifact'),f=await nativeReaderFixture({prepare:async({drive,show})=>{
  const pdf=drive.addFile(drive.folder,'SR_synthetic.pdf','application/pdf',bytes),state=JSON.parse(drive.mail.content);
  state.reports.push({id:'a'.repeat(64),sourceId:'missing-old-source',sourceHash:'b'.repeat(64),show:{key:show.concertId,name:show.artist,venue:show.venue,dates:[show.date]},pdfId:pdf.id,fileName:pdf.name,sha256:digest(bytes),version:'1.0',layoutVersion:'ontrack-showreport-v1',convertedAt:'2026-11-04T12:00:00Z',emailStatus:'no-recipients',deliveries:[]});drive.mail.setContent(JSON.stringify(state));
 }}),repo=createNativeReportsRepository({connection:f.destination.connection}),artifact=f.destination.rows('esmojo_rapportpdf')[0],version=f.destination.rows('esmojo_rapportversie').find(row=>row.esmojo_rapportversie_id===artifact._esmojo_rapportversie_value),current=scope(f),before=writes(f);
 const archived={reportKey:current.reportKey,versionKey:version.esmojo_sleutel,pdfKey:artifact.esmojo_sleutel};
 assert.ok((await repo.file(archived)).bytes.equals(bytes));await assert.rejects(repo.file({...current,pdfKey:artifact.esmojo_sleutel}),/FORBIDDEN/);
 artifact.esmojo_layoutfingerprint='f'.repeat(64);await assert.rejects(repo.file(archived),/REPORT_CONFLICT/);assert.equal(writes(f),before);
});
