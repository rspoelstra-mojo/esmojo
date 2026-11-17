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
test('Te lange risiconaam of artiestnaam wordt geweigerd in plaats van afgesneden',async()=>{
 await assert.rejects(createRiskPdf(data({risk:{...data().risk,title:'Woord '.repeat(60)}}),await riskPdfAssets()),/risiconaam/);
 await assert.rejects(createRiskPdf(data({show:{...data().show,artist:'Woord '.repeat(40)}}),await riskPdfAssets()),/artiestnaam/);
});
test('Kop toont de risiconaam; de regel eronder artiest - datum - zaal; Risico is gewone tekst en opsommingen blijven opsommingen',async()=>{
 const drawn=[],{PDFPage}=await import('pdf-lib'),original=PDFPage.prototype.drawText;
 PDFPage.prototype.drawText=function(value,options){drawn.push([value,options?.font?.name,options?.size]);return original.call(this,value,options);};
 try{await createRiskPdf(data({risk:{...data().risk,title:'Flares',description:'Tijdens eerdere shows zijn flares ontstoken.'},measure:{...data().measure,text:'Intro\n• Eerste punt\n- Tweede punt dat lang genoeg is om over twee regels te lopen en dan netjes ingesprongen te blijven staan\n* Derde punt'}}),await riskPdfAssets());}finally{PDFPage.prototype.drawText=original;}
 const text=drawn.map(item=>item[0]);
 assert.ok(text.includes('Flares'));assert.ok(drawn.find(item=>item[0]==='Flares')[2]>20,'de risiconaam staat in de kop');
 assert.ok(text.includes('Synthetische Artiest - 27 november 2026 · 28 november 2026 - Gashouder, Amsterdam'));
 const description=drawn.find(item=>item[0]==='Tijdens eerdere shows zijn flares ontstoken.');assert.ok(description&&description[2]===12&&description[1]!==drawn.find(item=>item[0]==='Flares')[1],'Risico staat in gewone tekst (lettergrootte en lettertype van de andere kaarten), niet als kop');
 assert.equal(text.filter(value=>value==='•').length,3,'drie opsommingstekens');assert.ok(text.includes('Eerste punt')&&text.includes('Derde punt'),'opsommingstekst staat los van het opsommingsteken');
});
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
