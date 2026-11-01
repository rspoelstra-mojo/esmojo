import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PDFPage,PDFDocument} from 'pdf-lib';
import {createReportPdf} from './report-original/server/report-pdf.ts';
import {reportCoverDate} from './report-original/src/report-show.ts';
import {createShowProfilePdfService,userReportRecord,validatePdfRequest,PDF_LAYOUT_VERSION} from './showprofile-pdf.js';
const original=new URL('./report-original/',import.meta.url),read=path=>readFile(new URL(path,original));
const assets=Object.fromEntries(await Promise.all(Object.entries({cover:'cover.pdf',watermark:'watermark.png',body:'body-font.ttf',heading:'heading-font.otf'}).map(async([key,name])=>[key,(await read('assets/'+name)).toString('base64')])));
const input=JSON.parse(await read('example-input.json'));
function context(){const record=structuredClone(input.record);for(const factor of ['visitors','artist'])for(const row of Object.values(record.workflow[factor].fields))row.completed_at=record.updated_at;return{state:'reserved',layoutVersion:PDF_LAYOUT_VERSION,sourceCommit:'eb2fa1a532267d7963f3d2358308c04b3bf8cfe6',concertId:record.concert_id,selectedConcertId:record.concert_id,version:1,revision:'a'.repeat(64),fileName:'SP_Voorbeeldartiest_Gashouder_14112026.pdf',show:input.show,record};}
test('Adapter en generator gebruiken uitsluitend gebruikersvelden; AI-zijbalk en provenance veranderen geen byte',async()=>{
 const c=context();c.record.research={cards:[{answer:'VERBODEN_AI_ANTWOORD'}]};c.record.summary_points=['VERBODEN_AI_ANTWOORD'];c.record.provenance='VERBODEN_AI_ANTWOORD';
 const record=userReportRecord(c);assert.equal(JSON.stringify(record).includes('VERBODEN_AI_ANTWOORD'),false);
 const output=await createReportPdf(record,assets,1,c.show,{fitText:true});assert.deepEqual(output,await read('example-output.pdf'));
 let saved,rendered=0;const service=createShowProfilePdfService({shows:async(op,payload)=>{if(op==='report-reserve')return c;if(op==='report-commit'){saved=payload;return{state:'ready'};}throw Error('Unexpected operation');},assets:async()=>assets,render:async(...args)=>{rendered++;return createReportPdf(...args);}});
 assert.equal((await service.ensure(c.selectedConcertId,'Voorbeeld ESM')).state,'ready');assert.equal(rendered,1);assert.equal(saved.sha256,createHash('sha256').update(await read('example-output.pdf')).digest('hex'));
 assert.ok(!('record'in saved));assert.ok(!('research'in saved));
});
test('Bestaande revisie wordt hergebruikt en opmaakfouten leveren geen gedeeltelijke PDF/commit op',async()=>{
 let rendered=0;const existing=createShowProfilePdfService({shows:async()=>({state:'ready'}),render:async()=>{rendered++;}});assert.equal((await existing.ensure('test','Manager')).state,'ready');assert.equal(rendered,0);
 const calls=[],failed=createShowProfilePdfService({shows:async(op,payload)=>{calls.push({op,payload});if(op==='report-reserve')return context();return{state:'failed'};},assets:async()=>assets,render:async()=>{throw Error('Privéwoord mag niet in logs of status.');}});
 assert.equal((await failed.ensure(input.record.concert_id,'Voorbeeld ESM')).state,'failed');assert.equal(calls.some(row=>row.op==='report-commit'),false);assert.equal(calls.at(-1).payload.errorCode,'LAYOUT_ERROR');assert.equal(JSON.stringify(calls.at(-1)).includes('Privéwoord'),false);
});
test('Normale productiemodus behoudt teksten en twee pagina’s; te brede woorden geven een fout',async()=>{
 const record=structuredClone(input.record);record.workflow.visitors.fields.gender_ratio.content='Begin bezoekers. '+('Lange maar door de gebruiker opgeslagen tekst. '.repeat(40))+'Einde bezoekers.';record.workflow.artist.fields.special_notes.content='Begin artiest. '+('Volledige eigen toelichting. '.repeat(60))+'Einde artiest.';
 const drawn=[],originalDraw=PDFPage.prototype.drawText;PDFPage.prototype.drawText=function(text,options){drawn.push(text);return originalDraw.call(this,text,options);};
 let pdf;try{pdf=await createReportPdf(record,assets,1,input.show,{fitText:true});}finally{PDFPage.prototype.drawText=originalDraw;}
 assert.equal((await PDFDocument.load(pdf)).getPageCount(),2);const all=drawn.join(' ');for(const marker of ['Begin bezoekers.','Einde bezoekers.','Begin artiest.','Einde artiest.'])assert.ok(all.includes(marker));
 record.workflow.visitors.fields.gender_ratio.content='X'.repeat(1000);await assert.rejects(createReportPdf(record,assets,1,input.show,{fitText:true}),/woord of URL/);
 await assert.rejects(createReportPdf(input.record,assets,1,{...input.show,artist:'LangeArtiestnaam'.repeat(100)},{fitText:true}),/lang|past niet/);
});
test('Originele datumafbreking voor meerdere dagen, maanden en jaren blijft behouden',()=>{
 const concert=dates=>({...input.record.concert,date:dates[0],shows:dates.map((date,i)=>({date,time:'20:00',id:i}))});
 for(const [dates,label]of [[['2026-11-06','2026-11-07','2026-11-08'],'6, 7, 8 november 2026'],[['2026-10-31','2026-11-01','2026-11-02'],'31 oktober, 1, 2 november 2026'],[['2026-12-31','2027-01-01'],'31 december 2026, 1 januari 2027']])assert.equal(reportCoverDate(concert(dates),dates[0]),label);
 assert.throws(()=>reportCoverDate(concert(['2026-02-30']),'2026-02-30'),/Ongeldige showdatum/);
});
test('Client kan geen vrije bestanden, brondata, managernaam of PDF aanleveren; runtime-dependencies zijn exact',async()=>{
 const request={operation:'ensure',concertId:'Test_Gashouder_01112026'};assert.equal(validatePdfRequest(request),request);
 for(const fields of [{fileId:'fake'},{record:{}},{manager:'Fake'},{pdfBase64:'fake'},{concertId:'../accounts'},{operation:'commit'}])assert.throws(()=>validatePdfRequest({...request,...fields}),/VALIDATION/);
 const current=JSON.parse(await readFile(new URL('../package-lock.json',import.meta.url))),locked=JSON.parse(await read('package-lock.json'));
 for(const name of ['pdf-lib','@pdf-lib/fontkit','@pdf-lib/standard-fonts','@pdf-lib/upng','pako','tslib']){const key='node_modules/'+name;const actual=current.packages['node_modules/pdf-lib/node_modules/'+name]||current.packages[key];assert.equal(actual.version,locked.packages[key].version);assert.equal(actual.integrity,locked.packages[key].integrity);}
});

test('Na de tweede definitieve categorie wordt generatie automatisch ingepland, zonder de eindbeoordeling te blokkeren',async()=>{
 const {makeAccountsHandler}=await import('./accounts-api.js');let ready=true;const queued=[],ensured=[];
 const claims={sub:'test-user',aal:'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)},{method:'totp'}]},token='a.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.b';
 const handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:'test-user',factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({role:'gebruiker',activated:true,firstName:'Test',lastName:'ESM'}),shows:async()=>({analyses:{},revision:0,finalization:{categories:{visitors:{completedAt:ready?'2026-11-01T12:00:00Z':null},artist:{completedAt:'2026-11-01T12:00:00Z'}}}}),pdfService:{ensure:async(...args)=>{ensured.push(args);return{state:'ready'};}},background:task=>queued.push(task)});
 const body={operation:'complete',concertId:'Test_Gashouder_01112026',category:'artist',score:4,note:'Eigen toelichting',basis:{profileRevision:0,finalRevision:0,ticketVersions:{ticket_sales:0,visitor_origins:0,domestic_origins:0}}};
 const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
 let res=response();await handler({method:'POST',query:{action:'analysis-finalization'},headers:{authorization:'Bearer '+token},body},res);assert.equal(res.code,200);assert.equal(queued.length,1);await queued[0];assert.deepEqual(ensured,[['Test_Gashouder_01112026','Test ESM']]);
 ready=false;res=response();await handler({method:'POST',query:{action:'analysis-finalization'},headers:{authorization:'Bearer '+token},body},res);assert.equal(res.code,200);assert.equal(queued.length,1);
});
