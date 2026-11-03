import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,PDFName,PDFDict,PDFString} from 'pdf-lib';
import {extractText} from 'unpdf';
import {ONTRACK_HEADERS,calculateReport} from './data.js';
import {createShowReportPdf,showReportAssets,ONTRACK_LOGIN} from './pdf.js';
const csv=rows=>ONTRACK_HEADERS.join(',')+'\n'+rows.map((row,i)=>ONTRACK_HEADERS.map(key=>'"'+String({ID:i+1,'Date and Time':'2026-11-03 - 06:00 PM',...row}[key]||'').replaceAll('"','""')+'"').join(',')).join('\n');
const show={key:'synthetic-fixture',name:'Fictieve artiest',venue:'Ziggo Dome',dates:['2026-11-03']};
test('PDF master: A4, zes kaarten, hoge onderste rij, eigen fonts, exacte pagina’s/footer en ON-URI alleen pagina 1',async()=>{
 const assets=await showReportAssets();
 if(!assets.icon)await assert.rejects(createShowReportPdf(calculateReport(csv([{}])),{show}),/ONTRACK_ICON_MISSING/);
 // Alleen deze structuurtest injecteert een bestaande testafbeelding; geen vervangend ON-asset opslaan.
 const result=await createShowReportPdf(calculateReport(csv(Array.from({length:34},(_,i)=>({Description:'Synthetische incidenttekst '+i,Priority:i===2?'High':'Medium'})))),{show},{assets:{...assets,icon:assets.icon||assets.footer}}),doc=await PDFDocument.load(result.bytes);
 assert.ok(Math.abs((result.geometry.titleGroup.top+result.geometry.titleGroup.bottom-result.geometry.titleGroup.headerBottom-result.geometry.titleGroup.cardsTop)/2)<.05);
 assert.equal(result.geometry.dashboard.length,6);assert.ok(result.geometry.dashboard[4].height>result.geometry.dashboard[0].height);assert.ok(result.geometry.dashboard[5].height>result.geometry.dashboard[2].height);assert.equal(result.geometry.incidents.length,34);assert.equal(result.geometry.incidents.filter(r=>r.highlight).length,1);
 for(const [i,page]of doc.getPages().entries()){assert.equal(page.getWidth(),595.2);assert.equal(page.getHeight(),841.92);const annots=page.node.Annots();if(i===0){assert.equal(annots.size(),1);const annotation=doc.context.lookup(annots.get(0),PDFDict),action=annotation.lookup(PDFName.of('A'),PDFDict);assert.equal(action.lookup(PDFName.of('URI'),PDFString).decodeText(),ONTRACK_LOGIN);}else assert.ok(!annots||annots.size()===0);}
 const text=await extractText(new Uint8Array(result.bytes),{mergePages:false});assert.equal(text.text.length,result.pageCount);assert.match(text.text[0],/Showrapportage/);for(let i=0;i<text.text.length;i++){assert.ok(text.text[i].includes(`${i+1} / ${text.text.length}`));assert.ok(text.text[i].includes('nadrukkelijke toestemming van MOJO Concerts.'));if(i)assert.ok(!text.text[i].includes('Documentversie'));}assert.ok(text.text[1].includes('Priority'));assert.ok(!text.text[1].includes('Resolved Status'));
 for(const card of result.geometry.incidents)assert.ok(card.top+card.height<=result.geometry.pages[card.page-1].bodyEnd+.001);
});
test('Zeer lange incidenten splitsen zonder verlies en zonder lege vervolgpagina; geen header/icoon op vervolg',async()=>{
 const long='Testwoord '.repeat(2000)+'UNIEK_EINDE',result=await createShowReportPdf(calculateReport(csv([{Description:long,'Resolution Note':'BEWAAR_DEZE_NOTITIE',Priority:'Critical'}])),{show},{allowMissingIcon:true});
 assert.ok(result.pageCount>2);assert.ok(result.geometry.incidents.length>1);assert.equal(new Set(result.geometry.incidents.map(row=>row.id)).size,1);assert.equal(result.geometry.incidents.every(row=>row.highlight),true);const extracted=await extractText(new Uint8Array(result.bytes),{mergePages:true});assert.ok(extracted.text.includes('UNIEK_EINDE'));assert.ok(extracted.text.replace(/\s/g,'').includes('BEWAAR_DEZE_NOTITIE'));
});
