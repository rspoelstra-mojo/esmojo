import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createEmailTemplateRegistry,emailTemplates} from './email-template-registry.js';
import {createEmailTestService} from './email-tests.js';
import {renderEmailTemplate} from './email-template.js';

test('Een nieuw geldig modulebestand verschijnt automatisch in hetzelfde catalogus zonder lijst- of UI-wijziging',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'esmojo-mail-registry-'));
 try{
  await writeFile(join(dir,'package.json'),'{"type":"module"}');
  const module=id=>`export default {id:'${id}',label:'${id}',requiresShow:false,build(){},buildTest(){}};`;
  await writeFile(join(dir,'eerste.js'),module('eerste'));await writeFile(join(dir,'README.md'),'Geen template');
  const registry=createEmailTemplateRegistry({directory:pathToFileURL(dir+'/')});assert.deepEqual((await registry.list()).map(t=>t.id),['eerste']);
  await writeFile(join(dir,'tweede.js'),module('tweede'));assert.deepEqual((await registry.list()).map(t=>t.id),['eerste','tweede']);
  assert.equal(typeof(await registry.get('tweede')).buildTest,'function');assert.equal(await registry.get('../../escape'),null);
  await writeFile(join(dir,'fout.js'),"export default {id:'fout',label:'Fout',requiresShow:false,build(){}};");await assert.rejects(registry.list(),/INVALID_EMAIL_TEMPLATE/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('Huidige accounttemplate-test heeft uitsluitend de eigen ontvanger en geen echte activatielink',async()=>{
 const sent=[],service=createEmailTestService({registry:emailTemplates,mail:async(...args)=>sent.push(args),shows:async()=>({shows:[]})});
 const own={email:'zelf@example.invalid',firstName:'Anne Marie'},catalog=await service.catalog(own,true);assert.equal(catalog.templates.length,2);assert.equal(sent.length,0);assert.deepEqual(catalog.shows,[]);
 await service.send(own,{templateId:'account-activation',requestId:'11111111-1111-4111-8111-111111111111'});
 assert.equal(sent.length,1);const message=sent[0][0],rendered=renderEmailTemplate(message);assert.match(rendered.subject,/^\[TEST\]/);assert.equal(message.to,own.email);assert.match(rendered.text,/Beste Anne Marie,/);assert.equal(rendered.html.includes('test-only-not-an-activation'),false);assert.equal(message.actions[0].url,'https://esmojo.nl/');
});

test('Toekomstige showtemplates testen met werkelijk gekozen concert en alle showdagen; module mag geen ander adres afdwingen',async()=>{
 const show={key:'Reeks',name:'Fixture artiest',venue:'Gashouder',dates:['2026-11-06','2026-11-07']};let sent;
 const template={id:'fixture-show',label:'Fixture show',requiresShow:true,buildTest:()=>({to:'ander@example.invalid',subject:'Showbericht',preheader:'Fixture',title:'Fixture',context:{kind:'show',show:{...show,name:'Niet gebruiken'}},paragraphs:['Testinhoud']})};
 const service=createEmailTestService({registry:{list:async()=>[{id:template.id,label:template.label,requiresShow:true}],get:async id=>id===template.id?template:null},shows:async()=>({shows:[show]}),mail:async message=>{sent=message;}});
 const own={email:'zelf@example.invalid',firstName:'Eigen naam'},base={templateId:template.id,requestId:'11111111-1111-4111-8111-111111111111'};
 assert.equal((await service.catalog(own,true)).shows[0].key,show.key);await assert.rejects(service.send(own,base),/VALIDATION/);await assert.rejects(service.send(own,{...base,concertId:'Onbekend'}),/EMAIL_SHOW_NOT_FOUND/);
 await service.send(own,{...base,concertId:show.key});const rendered=renderEmailTemplate(sent);assert.equal(sent.to,own.email);assert.ok(rendered.text.includes('Fixture artiest · Gashouder · 6 november 2026 · 7 november 2026'));assert.equal(rendered.text.includes('Niet gebruiken'),false);
});

test('Showrapportage verschijnt automatisch en verzendt exact de gekoppelde showtekst met verplichte PDF-bijlage',async()=>{
 const {showReportEmail}=await import('./email-templates/show-report.js'),{sendEmail}=await import('./email.js'),{PDFDocument}=await import('pdf-lib');
 const show={key:'rapport-fixture',name:'Fixture & artiest',venue:'Gashouder',dates:['2026-11-14']};
 let payload,calls=0;
 const service=createEmailTestService({registry:emailTemplates,shows:async()=>({shows:[show]}),mail:async(message,options)=>sendEmail(message,{...options,env:{RESEND_API_KEY:'fixture'},fetchImpl:async(url,request)=>{calls++;payload=JSON.parse(request.body);return{ok:true,json:async()=>({id:'mock-only'})};}})});
 assert.ok((await service.catalog({email:'zelf@example.invalid'},true)).templates.some(t=>t.id==='show-report'&&t.label==='Showrapportage'&&t.requiresShow));
 await service.send({email:'zelf@example.invalid',firstName:'Anne Marie'},{templateId:'show-report',concertId:show.key,requestId:'11111111-1111-4111-8111-111111111111'});
 assert.equal(calls,1);assert.equal(payload.to,'zelf@example.invalid');assert.equal(payload.subject,'[TEST] Showrapportage');assert.ok(payload.text.includes('Beste Anne Marie,'));assert.ok(payload.text.includes('Hierbij ontvang je de showrapportage van Fixture & artiest op 14 november 2026 in de Gashouder.'));assert.ok(payload.html.includes('Fixture &amp; artiest'));assert.ok(payload.text.includes('Met vriendelijke groet,\nEvent Safety Mobility Operations'));
 assert.equal(payload.attachments.length,1);assert.equal(payload.attachments[0].filename,'TEST-Showrapportage.pdf');const bytes=Buffer.from(payload.attachments[0].content,'base64');assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);
 assert.throws(()=>showReportEmail({to:'zelf@example.invalid',show}),/PDF is verplicht/);assert.throws(()=>showReportEmail({show:{...show,dates:[]}}),/Showdatums ontbreken/);
 await assert.rejects(sendEmail({to:'zelf@example.invalid',subject:'Showrapportage',preheader:'Fixture',title:'Showrapportage',context:{kind:'show',show},paragraphs:['Fixture'],requirePdfAttachment:true,attachments:[]},{fetchImpl:()=>{throw Error('Mag niet verzenden');}}),/PDF is verplicht/);assert.equal(calls,1);
 const invalid={filename:'../rapport.pdf',content:bytes,contentType:'application/pdf'};
 assert.throws(()=>renderEmailTemplate({to:'zelf@example.invalid',subject:'Fixture',preheader:'Fixture',title:'Fixture',context:{kind:'show',show},paragraphs:['Fixture'],attachments:[invalid]}),/Ongeldige PDF/);
 assert.throws(()=>showReportEmail({show,pdf:{filename:'Rapport.pdf',content:Buffer.from('geen pdf')}}),/Ongeldige PDF/);
 const production=showReportEmail({to:'zelf@example.invalid',firstName:'Anne Marie',show,pdf:{filename:'Showrapportage.pdf',content:bytes}});assert.equal(production.attachments[0].filename,'Showrapportage.pdf');assert.ok(!renderEmailTemplate(production).text.includes('[artiestnaam]'));
});

test('Alle testtemplates hebben alleen voor Richards beheerdersaccount twee vaste ontvangers',async()=>{
 const calls=[],show={key:'testconcert',name:'Testartiest',venue:'Gashouder',dates:['2026-11-04']};
 const service=createEmailTestService({mail:async(message,options)=>calls.push({message,options}),shows:async()=>({shows:[show]}),mailingConcerts:async()=>({concerts:[]})});
 const own={role:'beheerder',email:'r.spoelstra@mojo.nl',firstName:'Richard'},input={requestId:'11111111-1111-4111-8111-111111111111'};
 const catalog=await service.catalog(own,true);assert.deepEqual(catalog.recipients,[own.email,'richspoelstra@gmail.com']);assert.equal(calls.length,0);
 for(const template of catalog.templates){
  calls.length=0;await service.send(own,{...input,templateId:template.id,...(template.requiresShow?{concertId:show.key}:{})});
  assert.deepEqual(calls.map(row=>row.message.to),catalog.recipients);assert.notEqual(calls[0].options.idempotencyKey,calls[1].options.idempotencyKey);
  assert.equal(renderEmailTemplate(calls[0].message).html,renderEmailTemplate(calls[1].message).html);
  assert.equal(calls[0].message.attachments,calls[1].message.attachments);
 }
 calls.length=0;await service.send({...own,role:'superbeheerder',modules:[]},{...input,templateId:'account-activation'});assert.deepEqual(calls.map(row=>row.message.to),[own.email,'richspoelstra@gmail.com']);
 for(const profile of [{...own,email:'ander@example.invalid'},{...own,role:'medewerker'},{...own,email:'r.spoelstra@mojo.nl.example.invalid'}]){
  calls.length=0;assert.deepEqual((await service.catalog(profile,true)).recipients,[profile.email]);
  await service.send(profile,{...input,templateId:'account-activation'});assert.deepEqual(calls.map(row=>row.message.to),[profile.email]);
 }
 await assert.rejects(service.send(own,{...input,templateId:'account-activation',recipients:['ongewenst@example.invalid']}),/VALIDATION/);
});

test('Herhalen na mislukte extra testmail gebruikt dezelfde afzonderlijke idempotentiesleutels',async()=>{
 const calls=[];let fail=true;
 const service=createEmailTestService({mail:async(message,options)=>{calls.push({to:message.to,key:options.idempotencyKey});if(message.to==='richspoelstra@gmail.com'&&fail){fail=false;throw Error('Tijdelijke mailfout');}},shows:async()=>({shows:[]})});
 const profile={role:'beheerder',email:'r.spoelstra@mojo.nl',firstName:'Richard'},request={templateId:'account-activation',requestId:'11111111-1111-4111-8111-111111111111'};
 await assert.rejects(service.send(profile,request),/Tijdelijke mailfout/);assert.deepEqual(await service.send(profile,request),{ok:true});
 assert.deepEqual(calls.slice(0,2),calls.slice(2));
});
test('Showrapportage-test is zonder Rapportages-module niet opvraagbaar of verzendbaar, ook niet als beheerder',async()=>{
 let calls=0;const service=createEmailTestService({mail:async()=>{calls++;},shows:async()=>{throw Error('Geen showgegevens zonder toegang nodig');}});
 const profile={role:'beheerder',email:'fixture@example.invalid',modules:['artists']};const catalog=await service.catalog(profile,true);assert.deepEqual(catalog.templates.map(template=>template.id),['account-activation']);
 await assert.rejects(service.send(profile,{templateId:'show-report',requestId:'11111111-1111-4111-8111-111111111111',concertId:'bekende-show'}),/FORBIDDEN/);assert.equal(calls,0);
});
