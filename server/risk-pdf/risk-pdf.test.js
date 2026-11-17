import test from 'node:test';
import assert from 'node:assert/strict';
import {createRiskPdf,riskPdfAssets,riskPdfFileName} from './render.js';
import {createRiskPdfService,validateRiskPdfRequest} from './index.js';
const id='operational:'+'a'.repeat(64)+':R04';
const data=(change={})=>({show:{artist:'Synthetische Artiest',venue:'Gashouder',city:'Amsterdam',date:'2026-11-27',dates:['2026-11-27','2026-11-28']},risk:{id,sourceType:'operational',title:'Synthetisch risico',origin:'Operationele risico’s · Synthetisch risico',description:'Synthetische beschrijving.',consequence:'Synthetisch gevolg.',own:false,riskLevel:'high',assessedAt:'2026-11-17T10:00:00Z'},measure:{text:'Synthetische maatregel.',implemented:true,riskLevelAfter:'low',briefing:true,briefingChosen:true,completedAt:'2026-11-18T09:30:00Z',attachments:[]},...change});
test('Risico-PDF is één A4-pagina met kop, inhoud en vertrouwelijke voet',async()=>{
 const pdf=await createRiskPdf(data(),await riskPdfAssets(),{now:new Date('2026-11-18T10:00:00Z')});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length<2*1024*1024);
 const {PDFDocument}=await import('pdf-lib');const doc=await PDFDocument.load(pdf);assert.equal(doc.getPageCount(),1);const {width,height}=doc.getPage(0).getSize();assert.equal(width.toFixed(1),'595.2');assert.equal(height.toFixed(2),'841.92');
});
test('Lange tekst loopt door naar een tweede pagina zonder inkorten; ontbrekend gevolg en niet-geïmplementeerd renderen',async()=>{
 const long=data({measure:{...data().measure,text:'Lange maatregeltekst voor de paginering. '.repeat(120),implemented:false,riskLevelAfter:null,completedAt:null},risk:{...data().risk,consequence:null,description:null,own:true}});
 const {PDFDocument}=await import('pdf-lib');assert.ok((await PDFDocument.load(await createRiskPdf(long,await riskPdfAssets()))).getPageCount()>=2);
});
test('Te lange artiestnaam wordt geweigerd in plaats van afgesneden',async()=>{await assert.rejects(createRiskPdf(data({show:{...data().show,artist:'Woord '.repeat(40)}}),await riskPdfAssets()),/artiestnaam/);});
test('Bestandsnaam is veilig en bevat artiest, zaal, datum en risico',()=>{const name=riskPdfFileName(data({show:{...data().show,artist:'A/B ../ Ünïcode'}}));assert.match(name,/^RISICO_[\w.-]+\.pdf$/);assert.ok(name.endsWith('_2026-11-27_R04.pdf'));assert.equal(name.includes('/'),false);});
test('Invoer is strikt: alleen concert en geldige maatregel-ID',()=>{
 assert.deepEqual(validateRiskPdfRequest({concertId:'Test',measureId:id}),{concertId:'Test',measureId:id});
 for(const bad of [null,[],{},{concertId:'Test'},{concertId:'',measureId:id},{concertId:'a/b',measureId:id},{concertId:'Test',measureId:'operational:x:R04'},{concertId:'Test',measureId:id,actor:'x'},{concertId:'Test',measureId:id,html:'<b>'}])assert.throws(()=>validateRiskPdfRequest(bad),/VALIDATION/);
});
test('Service haalt de gegevens server-side op, bindt de actor en levert alleen een bestand terug',async()=>{
 const calls=[],service=createRiskPdfService({shows:async(operation,input)=>{calls.push([operation,input]);return data();}});
 const result=await service.create({concertId:'Test',measureId:id},'actor-1');
 assert.deepEqual(calls,[['risk-measure-export',{concertId:'Test',measureId:id,actor:'actor-1'}]]);assert.equal(Buffer.from(result.pdfBase64,'base64').subarray(0,5).toString(),'%PDF-');assert.match(result.sha256,/^[a-f0-9]{64}$/);assert.deepEqual(Object.keys(result).sort(),['fileName','layout','pdfBase64','sha256']);
 await assert.rejects(createRiskPdfService({shows:async()=>data(),render:async()=>Buffer.alloc(3*1024*1024)}).create({concertId:'Test',measureId:id},'a'),/PDF_TOO_LARGE/);
 await assert.rejects(createRiskPdfService({shows:async()=>data(),render:async()=>{throw Error('x');}}).create({concertId:'Test',measureId:id},'a'),/LAYOUT_ERROR/);
});
