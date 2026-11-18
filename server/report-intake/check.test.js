import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {csv} from '../ontrack-report/data.test.js';
import {createReportIntakeCheck,describeReceipt} from './check.js';
import {matchReportIntakeConcert} from './concert.js';
const concerts=[
 {id:'11111111-1111-4111-8111-111111111111',concertId:'Fictief_Artiest_AFAS-Live_16112026',artist:'Fictief Artiest',venue:'AFAS Live',date:'2026-11-16'},
 {id:'22222222-2222-4222-8222-222222222222',concertId:'Dubbel_Artiest_Ziggo-Dome_16112026_S1',artist:'Dubbel Artiest',venue:'Ziggo Dome',date:'2026-11-16',performance:'middag'},
 {id:'33333333-3333-4333-8333-333333333333',concertId:'Dubbel_Artiest_Ziggo-Dome_16112026_S2',artist:'Dubbel Artiest',venue:'Ziggo Dome',date:'2026-11-16',performance:'avond'},
];
const bytes=Buffer.from(csv([{Division:'Medisch','Date and Time':'2026-11-16 - 08:00 PM'}]));
const row=(name,id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')=>({id,esmojo_bestandsnaam:name,esmojo_status:'upload-bezig',createdon:'2026-11-16T22:00:00Z',modifiedon:'2026-11-16T22:00:05Z','@odata.etag':'W/"1"'});
const file=b=>({present:true,size:b.length,declaredSize:b.length,sha256:createHash('sha256').update(b).digest('hex'),bytes:b});
test('Ontvangstcontrole: bestand, hash, CSV en concertmatch zonder inhoud',()=>{
 const out=describeReceipt(row('incidents_fictief-artiest_AFAS-Live_16112026.csv'),file(bytes),concerts);
 assert.equal(out.file.complete,true);assert.equal(out.file.bytes,bytes.length);assert.equal(out.csv.valid,true);assert.equal(out.csv.incidents,1);assert.equal(out.csv.showDay,true);assert.equal(out.match.status,'matched');
 assert.ok(!JSON.stringify(out).includes('Medisch'));assert.equal(out.file.sha256.length,16);
});
test('Ongeldige of onvolledige bestanden worden niet als gelukt gemeld',()=>{
 assert.equal(describeReceipt(row('x.csv'),{present:false},concerts).file.present,false);
 const bad=describeReceipt(row('incidents_a_b_16112026.csv'),file(Buffer.from('kolom\n1')),concerts);assert.equal(bad.csv.valid,false);assert.match(bad.csv.code,/^CSV_/);
 assert.equal(describeReceipt(row('x.csv'),{...file(bytes),declaredSize:bytes.length+1},concerts).file.complete,false);
 assert.equal(describeReceipt(row('x.csv'),file(Buffer.alloc(0)),concerts).file.complete,false);
});
test('Concertmatch: S1/S2, ontbrekend, dubbel en dubbelzinnig',()=>{
 const m=name=>matchReportIntakeConcert(name,concerts);
 assert.equal(m('incidents_dubbel-artiest_Ziggo-Dome_16112026_s1.csv').concertId,'Dubbel_Artiest_Ziggo-Dome_16112026_S1');
 assert.equal(m('incidents_dubbel-artiest_Ziggo-Dome_16112026_s2.csv').concertId,'Dubbel_Artiest_Ziggo-Dome_16112026_S2');
 assert.notEqual(m('incidents_dubbel-artiest_Ziggo-Dome_16112026.csv').status,'matched');
 assert.equal(m('incidents_onbekend_AFAS-Live_16112026.csv').status,'not-found');
 assert.equal(matchReportIntakeConcert('incidents_fictief-artiest_AFAS-Live_16112026.csv',[...concerts,{...concerts[0],id:'44444444-4444-4444-8444-444444444444',concertId:'Fictief_Artiest_AFAS-Live_16112026_X'}]).status,'ambiguous');
 assert.equal(m('rapport.csv').status,'invalid-filename');assert.equal(m('incidents_a_b_31022026.csv').status,'invalid-filename');
});
test('Controle vereist actuele beheerder met Rapportages en leest alleen',async()=>{
 const calls=[],repository={list:async()=>[row('incidents_fictief-artiest_AFAS-Live_16112026.csv')],file:async()=>file(bytes)},catalogue={all:async()=>({concerts})};
 const admin={id:'a',activated:true,role:'beheerder',modules:['reports']};
 const run=profile=>createReportIntakeCheck({repository,catalogue,profiles:async(...a)=>{calls.push(a);return profile;}})('a',{limit:5});
 const result=await run(admin);assert.equal(result.count,1);assert.equal(result.receipts[0].match.status,'matched');
 await assert.rejects(run({...admin,modules:[]}),/FORBIDDEN/);await assert.rejects(run({...admin,role:'gebruiker'}),/FORBIDDEN/);await assert.rejects(run({...admin,disabled:true}),/FORBIDDEN/);await assert.rejects(run({...admin,activated:false}),/FORBIDDEN/);
 await assert.rejects(createReportIntakeCheck({repository,catalogue,profiles:async()=>admin})('a',{limit:500}),/VALIDATION/);
});
test('Bestandsfout of gewijzigde bron geeft nooit een geslaagde controle',async()=>{
 const admin={id:'a',activated:true,role:'beheerder',modules:['reports']},mk=error=>createReportIntakeCheck({repository:{list:async()=>[row('x.csv')],file:async()=>{throw Error(error);}},catalogue:{all:async()=>{throw Error('down');}},profiles:async()=>admin})('a');
 assert.equal((await mk('INTAKE_SOURCE_CHANGED')).receipts[0].file.error,'changed');assert.equal((await mk('INTAKE_UNAVAILABLE')).receipts[0].file.error,'unavailable');
});

test('Opgegeven bronbytes uit de flow moeten gelijk zijn aan het teruggelezen bestand',()=>{
 const ok=describeReceipt({...row('x.csv'),esmojo_bronbytes:bytes.length},file(bytes),concerts);assert.equal(ok.file.complete,true);assert.equal(ok.file.sourceBytes,bytes.length);
 assert.equal(describeReceipt({...row('x.csv'),esmojo_bronbytes:bytes.length+5},file(bytes),concerts).file.complete,false);
test('Bij ontbrekende match tonen openbare hints de concerten van die dag',()=>{
 const out=describeReceipt(row('incidents_onbekend_AFAS-Live_16112026.csv'),file(bytes),concerts);
 assert.equal(out.match.status,'not-found');assert.equal(out.hints.sameDay,3);assert.ok(out.hints.sameDayVenue.includes('Fictief Artiest @ AFAS Live'));
 assert.equal(describeReceipt(row('incidents_fictief-artiest_AFAS-Live_16112026.csv'),file(bytes),concerts).hints,undefined);
});
