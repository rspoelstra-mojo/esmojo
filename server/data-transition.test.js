import {researchInline} from '../src/lib/research-view.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDataTransition,researchMarkdown} from './data-transition.js';
const concertId='Antoon_Gashouder_23112026';
function fixture(){
 const writes=[],document={managedBy:'ESMOJO/Research-v1',classification:'openbaar',concertId,questionNumber:1,answer:'Samenvatting\n\nEen bestaand onderzoek.\n\nVolledige analyse\n\nDe volledige tekst.',sources:[{title:'Voorbeeld',url:'https://example.invalid/bron'}],researchedAt:'2026-01-01'};
 const service=createDataTransition({shows:async()=>({concerts:[{concertId,artist:'Antoon',venue:'Gashouder',date:'2026-11-23'}]}),research:async input=>{if(input.questionNumber!==1)throw Error('NOT_FOUND');return{storage:{concertId,artist:'Antoon',venue:'Gashouder',date:'2026-11-23'},document};},dataverse:{importDrive:async input=>{writes.push(input);return{verified:true,created:true};}}});
 return{service,writes,document};
}
test('preview has no writes, imports server-read Markdown and sources without research date',async()=>{
 const {service,writes}=fixture();assert.equal((await service({operation:'list'})).shows[0].name,'Antoon');
 const row=await service({operation:'preview',concertId,number:1});assert.equal(writes.length,0);assert.match(row.markdown,/## Bronnen/);assert.ok(researchInline(row.markdown).some(token=>token.type==='link'&&token.href==='https://example.invalid/bron'));assert.doesNotMatch(row.markdown,/2026-01-01/);
 const result=await service({operation:'import',concertId,number:1,checksum:row.checksum});assert.equal(result.verified,true);assert.equal(writes[0].sourceKey,'antoon_gashouder_20261123');assert.equal(writes[0].markdown,row.markdown);
 assert.equal((await service({operation:'preview',concertId,number:2})).status,'missing');
});
test('source changes and browser-injected content are rejected before writes',async()=>{
 const {service,writes,document}=fixture();const row=await service({operation:'preview',concertId,number:1});document.answer+=' gewijzigd';
 await assert.rejects(service({operation:'import',concertId,number:1,checksum:row.checksum}),/SOURCE_CHANGED/);
 await assert.rejects(service({operation:'preview',concertId,number:1,markdown:'injected'}),/VALIDATION/);
 assert.equal(writes.length,0);
});
test('private or mismatched research cannot be migrated',async()=>{
 for(const patch of [{classification:'vertrouwelijk'},{concertId:'andere'},{questionNumber:2}]){const {service,document}=fixture();Object.assign(document,patch);await assert.rejects(service({operation:'preview',concertId,number:1}),/SOURCE_INVALID/);}
});
test('sources remain in body, unsafe URLs rejected and existing links not duplicated',()=>{
 const answer='Analyse [bron](https://example.invalid/bron)';assert.equal(researchMarkdown({answer,sources:[{title:'Bron',url:'https://example.invalid/bron'}]}),answer);
 assert.throws(()=>researchMarkdown({answer,sources:[{title:'X',url:'javascript:alert(1)'}]}));
});
