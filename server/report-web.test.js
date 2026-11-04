import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ONTRACK_HEADERS} from './ontrack-report/data.js';
import {createWebReportService,validateWebReportRequest} from './report-web.js';
const csv=ONTRACK_HEADERS.join(',')+'\n'+[0,1,2].map(i=>ONTRACK_HEADERS.map(key=>({ID:'fake-'+i,'Date and Time':`2026-11-03 - 0${6+i}:00 PM`,Division:i?'Beveiliging':'Medisch',Type:i?'Test type':'Zelfzorg contact',Zone:'Fictieve locatie',Priority:'Medium',Description:'Fictieve omschrijving','Resolution Note':'Fictieve notitie','Affected Person':'1'}[key]||'')).join(',')).join('\n');
test('Webvoorbeeld rekent met bestaande parser en geeft uitsluitend nodige velden terug zonder bron of vrije bestandskeuze',async()=>{
 const calls=[],read=createWebReportService({photo:async()=>null,store:async(...args)=>{calls.push(args);return{csvBase64:Buffer.from(csv).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'};}});
 const data=await read('geverifieerde-actor',{slug:'jungle'});assert.deepEqual(calls,[['web-preview','geverifieerde-actor',{slug:'jungle'}]]);
 assert.equal(data.show.key,'Jungle_Ziggo-Dome_03112026');assert.equal(data.report.kpis.medical.total,1);assert.equal(data.report.kpis.security.total,2);assert.equal(data.report.incidents.length,3);assert.equal(data.report.types.security[0].count,2);
 assert.equal(data.report.incidents[0].description,'Fictieve omschrijving');assert.equal('resolvedStatus' in data.report.incidents[0],false);assert.equal('csvBase64' in data,false);
});
test('Ongeldige keuzes of toegevoegde actor/bestandvelden bereiken Drive nooit; ongeldige bron wordt geweigerd',async()=>{
 const service=createWebReportService({store:()=>{throw Error('Mag niet lezen');}});
 for(const input of [null,{},[],{slug:'../jungle'},{slug:'ander'},{slug:'jungle',fileId:'ander-bestand'},{slug:'jungle',actor:'ander'}])await assert.rejects(service('actor',input),/VALIDATION/);
 assert.equal(validateWebReportRequest({slug:'jungle'}),'jungle');
 await assert.rejects(createWebReportService({store:async()=>({csvBase64:'AA==',modifiedAt:'onjuist'})})('actor',{slug:'jungle'}),/REPORT_UNAVAILABLE/);
 await assert.rejects(createWebReportService({store:async()=>({csvBase64:Buffer.from('onjuiste CSV').toString('base64'),modifiedAt:'2026-11-03T00:00:00Z'})})('actor',{slug:'jungle'}),/CSV_HEADERS/);
});
test('Artiestfoto gebruikt de vaste geverifieerde MOJO-bron; fouten zijn optioneel en bronincidenten blijven volledig',async()=>{
 const calls=[],source={csvBase64:Buffer.from(csv).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'},photo={imageUrl:'https://www.mojo.nl/media/test/photo.jpg',sourceUrl:'https://www.mojo.nl/concerten/jungle'};
 const service=createWebReportService({store:async()=>source,photo:async url=>{calls.push(url);return photo;}});const result=await service('actor',{slug:'jungle'});assert.deepEqual(calls,['https://www.mojo.nl/concerten/jungle']);assert.deepEqual(result.photo,photo);assert.equal(result.report.incidents.length,3);assert.equal(result.report.kpis.medical.total,1);
 const fallback=await createWebReportService({store:async()=>source,photo:async()=>{throw Error('Tijdelijk onbereikbaar');}})('actor',{slug:'jungle'});assert.equal(fallback.photo,null);assert.equal(fallback.report.incidents.length,3);
});
test('Webtypes vullen herhaalde meldingen aan tot vijf echte types en behouden de oorspronkelijke tie-break',async()=>{
 const {webReportTypes}=await import('./report-web.js');
 const incidents=[...Array.from({length:3},(_,i)=>({division:'Medisch',type:'Herhaald',position:i})),...['B','A','C','D','E'].map((type,i)=>({division:'Medisch',type,position:10+i})),{division:'Beveiliging',type:'Andere discipline',position:0}];
 assert.deepEqual(webReportTypes(incidents,'medisch'),[{name:'Herhaald',count:3},{name:'B',count:1},{name:'A',count:1},{name:'C',count:1},{name:'D',count:1}]);
 assert.deepEqual(webReportTypes(incidents.slice().reverse(),'medisch'),webReportTypes(incidents,'medisch'));
 const many=Array.from({length:6},(_,i)=>[{division:'Medisch',type:String(i),position:i*2},{division:'Medisch',type:String(i),position:i*2+1}]).flat();assert.equal(webReportTypes(many,'medisch').length,6);
 assert.equal(webReportTypes([{division:'Medisch',type:'Een'}],'medisch').length,1);assert.deepEqual(webReportTypes([],'beveiliging'),[]);
});
