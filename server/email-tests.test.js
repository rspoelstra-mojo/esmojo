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
 const sent=[],service=createEmailTestService({registry:emailTemplates,mail:async(...args)=>sent.push(args),shows:async()=>{throw Error('Onnodige showread');}});
 const own={email:'zelf@example.invalid',firstName:'Anne Marie'},catalog=await service.catalog(own,true);assert.equal(catalog.templates.length,1);assert.equal(sent.length,0);assert.deepEqual(catalog.shows,[]);
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
