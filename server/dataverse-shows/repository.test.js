import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {choice} from '../show-migration-writer.js';
import {createNativeShowsRepository} from './repository.js';
const id='11111111-1111-4111-8111-111111111111',key='a'.repeat(64),bytes=Buffer.from('synthetic file'),hash=createHash('sha256').update(bytes).digest('hex');
function fixture({corrupt=false,paged=false,duplicate=false,foreign=false}={}){let calls=0;const connection={connect:async()=>({headers:{}}),json:r=>r.json(),call:async(path,headers,options={})=>{calls++;
 if(path.includes("LogicalName='esmojo_documentkoppeling'"))return Response.json({LogicalName:'esmojo_documentkoppeling',EntitySetName:'links',PrimaryIdAttribute:'linkid',ManyToOneRelationships:[]});
 if(path.startsWith('links?'))return Response.json({value:foreign?[]:[{_esmojo_document_value:id,_esmojo_concertreeks_value:id,esmojo_koppelstatus:choice('koppelstatus','active')}]});
 if(path.startsWith('EntityDefinitions'))return Response.json({LogicalName:'esmojo_document',EntitySetName:'documents',PrimaryIdAttribute:'documentid',ManyToOneRelationships:[]});
 if(path.startsWith('documents?')){const row={documentid:id,'@odata.etag':'W/"1"',esmojo_sleutel:key,esmojo_bestand:'file',esmojo_documentstatus:choice('bronstatus','verified'),esmojo_sha256:hash,esmojo_bestandsgrootte:bytes.length,esmojo_bestandsnaam:'test.txt',esmojo_mimetype:'text/plain'};return Response.json({value:duplicate?[row,row]:[row],...(paged?{'@odata.nextLink':'private-next'}:{})});}
 if(path==='InitializeFileBlocksDownload')return Response.json({FileSizeInBytes:bytes.length,FileContinuationToken:'synthetic-private-token'});
 if(path==='DownloadBlock')return Response.json({Data:(corrupt?Buffer.alloc(bytes.length):bytes).toString('base64')});throw Error('Unexpected native operation');
 }};return{repository:createNativeShowsRepository({connection}),calls:()=>calls};}
test('native documents are read and checked against recorded size and SHA-256',async()=>{const f=fixture(),file=await f.repository.downloadDocument(key,{seriesId:id});assert.deepEqual(file.bytes,bytes);assert.equal(file.sha256,hash);assert.equal(file.fileName,'test.txt');});
test('corruption, duplicates and unconsumed pages fail closed',async()=>{await assert.rejects(fixture({corrupt:true}).repository.downloadDocument(key,{seriesId:id}),/SOURCE_CHANGED/);for(const input of [{duplicate:true},{paged:true}])await assert.rejects(fixture(input).repository.downloadDocument(key,{seriesId:id}),/DATAVERSE_SHOWS_CONFLICT/);});
test('unknown tables and free identifiers are rejected before network access',async()=>{const f=fixture();await assert.rejects(f.repository.byKey('accounts','invalid'),/VALIDATION/);await assert.rejects(f.repository.byKey('esmojo_document',"x' or true"),/VALIDATION/);await assert.rejects(f.repository.inSeries('esmojo_document','arbitrary-id'),/VALIDATION/);assert.equal(f.calls(),0);});

test('a document from another series or without explicit scope cannot be downloaded',async()=>{
 await assert.rejects(fixture({foreign:true}).repository.downloadDocument(key,{seriesId:id}),/FORBIDDEN/);
 const f=fixture();await assert.rejects(f.repository.downloadDocument(key),/VALIDATION/);assert.equal(f.calls(),0);
});

test('native writes use one atomic changeset with mandatory conditional versions',async()=>{
 let captured;const connection={connect:async()=>({headers:{}}),json:r=>r.json(),call:async(path,headers,options)=>{if(path.startsWith('EntityDefinitions'))return Response.json({LogicalName:'esmojo_analyse',EntitySetName:'analyses',PrimaryIdAttribute:'analysisid',ManyToOneRelationships:[]});assert.equal(path,'$batch');captured=options.multipart.body;return new Response('--synthetic\r\nHTTP/1.1 204 No Content\r\n\r\n--synthetic--');}};
 const repo=createNativeShowsRepository({connection});await repo.atomic([{table:'esmojo_analyse',id,method:'PATCH',etag:'W/"5"',payload:{esmojo_samenvatting:'Test'}}]);assert.match(captured,/If-Match: W\/"5"/);assert.match(captured,/PATCH \/api\/data\/v9.2\/analyses/);
 await assert.rejects(repo.atomic([{table:'esmojo_analyse',id,method:'PATCH',payload:{esmojo_samenvatting:'Test'}}]),/VALIDATION/);
 await assert.rejects(repo.atomic([{table:'esmojo_analyse',id,method:'PATCH',etag:'W/"5"',payload:{unexpected:'secret'}}]),/VALIDATION/);
});
test('failed changesets and suspicious paging never report successful native storage',async()=>{
 const connection={connect:async()=>({headers:{}}),json:r=>r.json(),call:async(path,headers,options)=>path.startsWith('EntityDefinitions')?Response.json({LogicalName:'esmojo_analyse',EntitySetName:'analyses',PrimaryIdAttribute:'analysisid',ManyToOneRelationships:[]}):path==='$batch'?new Response('HTTP/1.1 412 Precondition Failed\r\n'):Response.json({value:[],'@odata.nextLink':'https://example.invalid/private'})};const repo=createNativeShowsRepository({connection});
 await assert.rejects(repo.atomic([{table:'esmojo_analyse',id,method:'PATCH',etag:'W/"5"',payload:{esmojo_samenvatting:'Test'}}]),/CONFLICT/);await assert.rejects(repo.query('esmojo_analyse',{filter:'statecode eq 0'}),/RESPONSE/);
});
test('native relationship binds accept only the schema target entity set and native GUID',async()=>{
 const connection={connect:async()=>({headers:{}}),json:r=>r.json(),call:async path=>{
  if(path.includes("LogicalName='esmojo_analyse'"))return Response.json({LogicalName:'esmojo_analyse',EntitySetName:'analyses',PrimaryIdAttribute:'analysisid',ManyToOneRelationships:[{ReferencingAttribute:'esmojo_concertreeks',ReferencingEntityNavigationPropertyName:'esmojo_concertreeks'}]});
  if(path.includes("LogicalName='esmojo_concertreeks'"))return Response.json({LogicalName:'esmojo_concertreeks',EntitySetName:'series',PrimaryIdAttribute:'seriesid',ManyToOneRelationships:[]});return new Response('HTTP/1.1 204 No Content\r\n');
 }};const repo=createNativeShowsRepository({connection}),op={table:'esmojo_analyse',id,method:'PATCH',etag:'W/"1"',payload:{'esmojo_concertreeks@odata.bind':'/series('+id+')'}};await repo.atomic([op]);for(const binding of ['/accounts('+id+')','https://example.invalid/series('+id+')','/series(free)'])await assert.rejects(repo.atomic([{...op,payload:{'esmojo_concertreeks@odata.bind':binding}}]),/VALIDATION/);
});
