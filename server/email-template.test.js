import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {renderEmailTemplate,emailGreeting,emailContext,EMAIL_BRAND,EMAIL_LOGO_URL} from './email-template.js';
import {accountActivationEmail} from './account-email.js';
import {sendEmail,EMAIL_FROM} from './email.js';
import {whiteEmailLogo,decodeRgbaPng} from '../tools/email/export-logo.mjs';
const link='https://esmojo.nl/#/activeren?token=local-fixture&type=recovery';
const message=()=>accountActivationEmail({to:'test@example.invalid',firstName:'Anne Marie',activationUrl:link});
test('Gedeelde accountopmaak heeft de bevestigde context, witte inhoud, standaardfooter en correcte HTML/plaintextlink',()=>{
 const result=renderEmailTemplate(message());
 assert.equal(result.subject,'Stel je ESMOJO-account in');
 for(const part of ['#0046f2','Account activeren','Beste Anne Marie,',EMAIL_LOGO_URL,EMAIL_BRAND])assert.ok(result.html.includes(part));
 assert.ok(result.html.includes('href="'+link.replace('&','&amp;')+'"'));assert.ok(result.text.includes(link));assert.ok(result.text.includes('Beste Anne Marie,'));
 assert.match(result.html,/border-radius:8px/);assert.match(result.html,/<td class="action-cell" align="center" style="padding:0;">/);
 assert.equal(/{{[^{}]*}}|Goed voorbereid op de show\.|Beste collega|data:image|file:\/\//.test(result.html),false);
 assert.match(result.html,/class="pad email-footer"[^>]*>[\s\S]*?<p[^>]*>Event Safety Mobility Operations<\/p>\s*<\/td>/);
});
test('Persoonlijke aanhef behoudt samengestelde voornamen; groepen/gedeelde mailboxen en ontbrekende namen krijgen de algemene aanhef',()=>{
 assert.equal(emailGreeting({firstName:' Anne Marie '}),'Beste Anne Marie,');
 assert.equal(emailGreeting({firstName:'Jean-Pierre'}),'Beste Jean-Pierre,');
 for(const recipient of [{},{firstName:''},{firstName:'naam@example.invalid'},{firstName:'Onjuist\nVeld'},{kind:'shared',firstName:'Niet gebruiken'},{kind:'group',firstName:'Niet gebruiken'}])assert.equal(emailGreeting(recipient),'Beste collega,');
});
test('Variabele tekst wordt ge-escaped; onveilige links en onvervulde placeholders blokkeren rendering vóór verzending',()=>{
 const attack='<img src=x onerror=alert(1)>';
 const base=message(),result=renderEmailTemplate({...base,title:attack,recipient:{firstName:attack},paragraphs:[attack],information:[{title:attack,text:attack}],actions:[{label:attack,url:link}]});
 assert.equal(result.html.includes(attack),false);assert.ok(result.html.includes('&lt;img'));assert.ok(result.text.includes(attack));
 for(const url of ['javascript:alert(1)','data:text/html,x','http://esmojo.nl/x','https://esmojo.nl.evil.invalid/x','https://evil@esmojo.nl/x','file:///tmp/x'])assert.throws(()=>renderEmailTemplate({...base,actions:[{label:'Openen',url}]}));
 assert.throws(()=>renderEmailTemplate({...base,subject:'Onderwerp\r\nBcc: x@example.invalid'}));
 assert.throws(()=>renderEmailTemplate({...base,title:'{{titel}}'}));assert.throws(()=>renderEmailTemplate({...base,html:'<b>Vrije HTML</b>'}));
 for(const url of ['https://esmojo.nl/activeren?token=x','https://esmojo.nl/#/activeren?token=','https://esmojo.nl/#/activeren?token=x&token=y','https://esmojo.nl/#/activeren?token=x&type=anders'])assert.throws(()=>accountActivationEmail({to:'test@example.invalid',activationUrl:url}));
});
test('Showregel gebruikt naam, locatie en alle relevante Nederlandse showdata, zonder willekeurige eerste datum',()=>{
 const show={key:'Fixture',name:'Testartiest',venue:'Gashouder',dates:['2026-11-14']};
 assert.equal(emailContext({kind:'show',show}),'Testartiest · Gashouder · 14 november 2026');
 const multi=emailContext({kind:'show',show:{...show,dates:['2026-11-07','2026-11-06','2026-11-08']}});assert.equal(multi,'Testartiest · Gashouder · 6 november 2026 · 7 november 2026 · 8 november 2026');
 for(const invalid of [{...show,key:''},{...show,name:''},{...show,venue:''},{...show,dates:[]},{...show,dates:['2026-02-30']}])assert.throws(()=>emailContext({kind:'show',show:invalid}));
 assert.throws(()=>emailContext({kind:'overig'}));assert.equal(emailContext({kind:'account'}),'Account activeren');
});
test('Verzendmodule rendert altijd centraal en doet precies één gemockte Resend-aanroep met de bestaande afzender',async()=>{
 const calls=[];const options={env:{RESEND_API_KEY:'local-test-only'},fetchImpl:async(url,init)=>{calls.push({url,init});return{ok:true,json:async()=>({id:'fixture'})};}};
 await sendEmail(message(),options);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.resend.com/emails');
 const body=JSON.parse(calls[0].init.body);assert.equal(body.from,EMAIL_FROM);assert.equal(body.to,'test@example.invalid');assert.equal(body.reply_to,undefined);assert.ok(body.html.includes('Beste Anne Marie,'));assert.ok(body.text.includes(link));
 assert.deepEqual(Object.keys(body).sort(),['from','html','subject','text','to']);assert.equal(body.html.includes('local-test-only'),false);
 await assert.rejects(sendEmail({...message(),to:['a@example.invalid','b@example.invalid']},options));await assert.rejects(sendEmail({...message(),html:'bypass'},options));assert.equal(calls.length,1);
});
test('Witte transparante PNG-export behoudt de bron en verhoudingen en bevat geen blauw vlak',()=>{
 const source=readFileSync(new URL('../public/brand/ESMOJO-logo-transparant.png',import.meta.url)),before=createHash('sha256').update(source).digest('hex');
 const output=decodeRgbaPng(whiteEmailLogo(source));assert.equal(output.width,320);assert.ok(Math.abs(output.height/output.width-4096/3301)<.003);
 let transparent=0,visible=0;
 for(let at=0;at<output.pixels.length;at+=4){assert.equal(output.pixels[at],255);assert.equal(output.pixels[at+1],255);assert.equal(output.pixels[at+2],255);if(output.pixels[at+3]===0)transparent++;else visible++;}
 assert.ok(transparent>0&&visible>0);assert.equal(output.pixels[3],0);assert.equal(createHash('sha256').update(source).digest('hex'),before);
});

test('Resend krijgt een gevalideerde idempotentiesleutel voor dezelfde bewuste testaanvraag',async()=>{
 const calls=[],options={env:{RESEND_API_KEY:'local-test-only'},idempotencyKey:'esmojo-test-11111111-1111-4111-8111-111111111111',fetchImpl:async(url,init)=>{calls.push(init);return{ok:true,json:async()=>({id:'fixture'})};}};
 await sendEmail(message(),options);assert.equal(calls[0].headers['Idempotency-Key'],options.idempotencyKey);
 await assert.rejects(sendEmail(message(),{...options,idempotencyKey:'bad\r\nheader'}));assert.equal(calls.length,1);
});

test('Variabele footer en ondertekening blijven tekst, zonder HTML-injectie of headerregels',()=>{
 const attack='<img src=x onerror=alert(1)>',rendered=renderEmailTemplate({...message(),senderName:attack,footer:attack});
 assert.equal(rendered.html.includes(attack),false);assert.ok(rendered.text.endsWith(attack));assert.ok(rendered.html.includes('&lt;img'));
 for(const footer of ['{{onvervuld}}','\r\nBcc: ander@example.invalid'])assert.throws(()=>renderEmailTemplate({...message(),footer}));
});

test('Centrale afzenderkeuze gebruikt uitsluitend vaste adressen en blokkeert vrije/headergeïnjecteerde afzenders vóór verzending',async()=>{
 const calls=[],options={env:{RESEND_API_KEY:'synthetic'},fetchImpl:async(url,init)=>{calls.push(JSON.parse(init.body));return{ok:true,json:async()=>({id:'synthetic'})};}};
 await sendEmail({...message(),senderId:'show-report'},options);assert.equal(calls[0].from,'ESMOJO <showrapportage@esmojo.nl>');assert.equal(calls[0].reply_to,undefined);
 await sendEmail(message(),options);assert.equal(calls[1].from,'ESMOJO <no-reply@esmojo.nl>');
 for(const senderId of ['extern@example.invalid','show-report\r\nBcc: x@example.invalid','__proto__',null,{},''])await assert.rejects(sendEmail({...message(),senderId},options),/Ongeldige e-mailafzender/);
 assert.equal(calls.length,2);
});
