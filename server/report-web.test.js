import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ONTRACK_HEADERS} from './ontrack-report/data.js';
import {createWebReportService,validateWebReportRequest} from './report-web.js';
const csv=ONTRACK_HEADERS.join(',')+'\n'+[0,1,2].map(i=>ONTRACK_HEADERS.map(key=>({ID:'fake-'+i,'Date and Time':`2026-11-03 - 0${6+i}:00 PM`,Division:i?'Beveiliging':'Medisch',Type:i?'Test type':'Zelfzorg contact',Zone:'Fictieve locatie',Priority:'Medium',Description:'Fictieve omschrijving','Resolution Note':'Fictieve notitie','Affected Person':'1'}[key]||'')).join(',')).join('\n');
test('Webvoorbeeld rekent met bestaande parser en geeft uitsluitend nodige velden terug zonder bron of vrije bestandskeuze',async()=>{
 const calls=[],read=createWebReportService({photo:async()=>null,store:async(...args)=>{calls.push(args);return{csvBase64:Buffer.from(csv).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'};}});
 const data=await read('geverifieerde-actor',{slug:'jungle'});assert.deepEqual(calls,[['web-preview','geverifieerde-actor',{slug:'jungle'}],['timetable-read','geverifieerde-actor',{concertId:'Jungle_Ziggo-Dome_03112026'}]]);
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
test('Beveiligings-drilldown en KPI’s delen exacte criteria; alleen afgeleide labels worden aan incidenten toegevoegd',async()=>{
 const entries=[{ID:'a',Type:'Zelfzorg contact',Description:'PCM','Resolved Status':'Eviction, Arrest','Affected Person':'3'},{ID:'b',Type:'Verbale agressie'},{ID:'c',Type:'Fysieke agressie'}];
 const input=ONTRACK_HEADERS.join(',')+'\n'+entries.map(row=>ONTRACK_HEADERS.map(key=>'"'+String(({...row,'Date and Time':'2026-11-03 - 06:00 PM',Division:'Anders'})[key]||'').replaceAll('"','""')+'"').join(',')).join('\n');
 const service=createWebReportService({photo:async()=>null,store:async()=>({csvBase64:Buffer.from(input).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'})});
 const result=await service('actor',{slug:'jungle'});assert.deepEqual(result.report.kpis.security,{total:0,verbal:1,physical:1,evictions:3,arrests:3});
 assert.deepEqual(result.report.incidents[0].securityFilters,['evictions','arrests']);assert.deepEqual(result.report.incidents[1].securityFilters,['verbal']);assert.deepEqual(result.report.incidents[2].securityFilters,['physical']);
 assert.equal('resolvedStatus' in result.report.incidents[0],false);
});
test('Medische selectie correspondeert met KPI’s en projecteert alleen afgeleide labels, ook bij ambulance buiten Medisch',async()=>{
 const entries=[{ID:'a',Division:'Medisch',Type:'Zelfzorg contact',Description:'PCM'},{ID:'b',Division:'Medisch',Type:'Onwelwording','Resolved Status':'Ambulance','Affected Person':'2'},{ID:'c',Division:'Medisch',Type:'Controle'},{ID:'d',Division:'Beveiliging',Type:'Onwelwording','Resolved Status':'Ambulance','Affected Person':'3'}];
 const input=ONTRACK_HEADERS.join(',')+'\n'+entries.map(row=>ONTRACK_HEADERS.map(key=>'"'+String(({...row,'Date and Time':'2026-11-03 - 06:00 PM'})[key]||'').replaceAll('"','""')+'"').join(',')).join('\n');
 const service=createWebReportService({photo:async()=>null,store:async()=>({csvBase64:Buffer.from(input).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'})});
 const {report}=await service('actor',{slug:'jungle'});assert.deepEqual(report.kpis.medical,{total:3,selfcare:1,treatments:2,unwell:1,ambulance:5});
 assert.deepEqual(report.incidents.map(row=>row.medicalFilters),[['selfcare'],['treatments','unwell','ambulance'],['treatments'],['ambulance']]);
 for(const key of ['selfcare','treatments','unwell'])assert.equal(report.incidents.filter(row=>row.medicalFilters.includes(key)).length,report.kpis.medical[key]);
 assert.equal(report.incidents.filter(row=>row.medicalFilters.includes('ambulance')).length,2);assert.ok(report.incidents.every(row=>!('resolvedStatus' in row)&&!('affectedPerson' in row)&&!('division' in row)));
});

test('Tijdschema gebruikt dezelfde geverifieerde rapportidentiteit; ingetrokken toegang wordt niet als ontbrekend tijdschema genegeerd',async()=>{
 const timetable={status:'available',entries:[]},service=createWebReportService({photo:async()=>null,store:async(operation,actor,payload)=>{assert.equal(actor,'actor');if(operation==='timetable-read'){assert.equal(payload.concertId,'Jungle_Ziggo-Dome_03112026');return{timetable};}return{csvBase64:Buffer.from(csv).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'};}});
 assert.deepEqual((await service('actor',{slug:'jungle'})).report.timetable,timetable);
 const revoked=createWebReportService({photo:async()=>null,store:async operation=>{if(operation==='timetable-read')throw Error('FORBIDDEN');return{csvBase64:Buffer.from(csv).toString('base64'),modifiedAt:'2026-11-04T00:00:00Z'};}});await assert.rejects(revoked('actor',{slug:'jungle'}),/FORBIDDEN/);
});
