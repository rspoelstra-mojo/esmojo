import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ONTRACK_HEADERS} from './ontrack-report/data.js';
import {createWebReportService,validateWebReportRequest} from './report-web.js';
const csv=ONTRACK_HEADERS.join(',')+'\n'+[0,1,2].map(i=>ONTRACK_HEADERS.map(key=>({ID:'fake-'+i,'Date and Time':`2026-11-03 - 0${6+i}:00 PM`,Division:i?'Beveiliging':'Medisch',Type:i?'Test type':'Zelfzorg contact',Zone:'Fictieve locatie',Priority:'Medium',Description:'Fictieve omschrijving','Resolution Note':'Fictieve notitie','Affected Person':'1'}[key]||'')).join(',')).join('\n');

const key='Jungle_Ziggo-Dome_03112026',show={key,name:'Jungle',venue:'Ziggo Dome',date:'2026-11-03',sourceUrl:'https://www.mojo.nl/concerten/jungle'};
const sourceFor=(input=csv,extra={})=>({csvBase64:Buffer.from(input).toString('base64'),sourceHash:createHash('sha256').update(input).digest('hex'),modifiedAt:'2026-11-04T00:00:00Z',show,series:{dates:['2026-11-03'],shows:[{concertId:key,date:'2026-11-03',venue:'Ziggo Dome'}]},...extra});
test('Webvoorbeeld rekent met bestaande parser en geeft uitsluitend nodige velden terug zonder bron of vrije bestandskeuze',async()=>{
 const calls=[],read=createWebReportService({photo:async()=>null,store:async(...args)=>{calls.push(args);return sourceFor();}});
 const data=await read('geverifieerde-actor',{slug:'jungle'});assert.deepEqual(calls,[['web-read','geverifieerde-actor',{concertId:key}]]);
 assert.equal(data.show.key,'Jungle_Ziggo-Dome_03112026');assert.equal(data.report.kpis.medical.total,1);assert.equal(data.report.kpis.security.total,2);assert.equal(data.report.incidents.length,3);assert.equal(data.report.types.security[0].count,2);
 assert.equal(data.report.incidents[0].description,'Fictieve omschrijving');assert.equal('resolvedStatus' in data.report.incidents[0],false);assert.equal('csvBase64' in data,false);
});
test('Ongeldige keuzes of toegevoegde actor/bestandvelden bereiken Drive nooit; ongeldige bron wordt geweigerd',async()=>{
 const service=createWebReportService({store:()=>{throw Error('Mag niet lezen');}});
 for(const input of [null,{},[],{slug:'../jungle'},{slug:'ander'},{slug:'jungle',fileId:'ander-bestand'},{slug:'jungle',actor:'ander'}])await assert.rejects(service('actor',input),/VALIDATION/);
 assert.equal(validateWebReportRequest({slug:'jungle'}),key);assert.equal(validateWebReportRequest({concertId:'Myles-Smith_AFAS-Live_04112026'}),'Myles-Smith_AFAS-Live_04112026');
 await assert.rejects(createWebReportService({store:async()=>sourceFor('bad',{modifiedAt:'onjuist'})})('actor',{slug:'jungle'}),/REPORT_UNAVAILABLE/);
 await assert.rejects(createWebReportService({store:async()=>sourceFor('onjuiste CSV')})('actor',{slug:'jungle'}),/CSV_HEADERS/);
});
test('Artiestfoto gebruikt de vaste geverifieerde MOJO-bron; fouten zijn optioneel en bronincidenten blijven volledig',async()=>{
 const calls=[],source=sourceFor(),photo={imageUrl:'https://www.mojo.nl/media/test/photo.jpg',sourceUrl:'https://www.mojo.nl/concerten/jungle'};
 const service=createWebReportService({store:async()=>source,photo:async url=>{calls.push(url);return photo;}});const result=await service('actor',{slug:'jungle'});assert.deepEqual(calls,['https://www.mojo.nl/concerten/jungle']);assert.deepEqual(result.photo,photo);assert.equal(result.report.incidents.length,3);assert.equal(result.report.kpis.medical.total,1);
 const fallback=await createWebReportService({store:async()=>source,photo:async()=>{throw Error('Tijdelijk onbereikbaar');}})('actor',{slug:'jungle'});assert.equal(fallback.photo,null);assert.equal(fallback.report.incidents.length,3);
});
test('Webtypes vullen herhaalde meldingen aan tot vijf echte types en behouden de oorspronkelijke tie-break',async()=>{
 const {webReportTypes}=await import('./report-web.js');
 const incidents=[...Array.from({length:3},(_,i)=>({division:'Medisch',type:'Herhaald',position:i})),...['B','A','C','D','E'].map((type,i)=>({division:'Medisch',type,position:10+i})),{division:'Beveiliging',type:'Andere discipline',position:0}];
 assert.deepEqual(webReportTypes(incidents,'medisch'),[{name:'Herhaald',count:3},{name:'B',count:1},{name:'A',count:1},{name:'C',count:1},{name:'D',count:1}]);
 assert.deepEqual(webReportTypes(incidents.slice().reverse(),'medisch'),webReportTypes(incidents,'medisch'));
 const many=Array.from({length:6},(_,i)=>[{division:'Medisch',type:String(i),position:i*2},{division:'Medisch',type:String(i),position:i*2+1}]).flat();assert.equal(webReportTypes(many,'medisch').length,5);
 assert.deepEqual(webReportTypes(many.map(row=>({...row,division:'Beveiliging'})),'beveiliging').map(row=>row.name),['0','1','2','3','4']);
 assert.equal(webReportTypes([{division:'Medisch',type:'Een'}],'medisch').length,1);assert.deepEqual(webReportTypes([],'beveiliging'),[]);
});
test('Beveiligings-drilldown en KPI’s delen exacte criteria; alleen afgeleide labels worden aan incidenten toegevoegd',async()=>{
 const entries=[{ID:'a',Type:'Zelfzorg contact',Description:'PCM','Resolved Status':'Eviction, Arrest','Affected Person':'3'},{ID:'b',Type:'Verbale agressie'},{ID:'c',Type:'Fysieke agressie'}];
 const input=ONTRACK_HEADERS.join(',')+'\n'+entries.map(row=>ONTRACK_HEADERS.map(key=>'"'+String(({...row,'Date and Time':'2026-11-03 - 06:00 PM',Division:'Anders'})[key]||'').replaceAll('"','""')+'"').join(',')).join('\n');
 const service=createWebReportService({photo:async()=>null,store:async()=>sourceFor(input)});
 const result=await service('actor',{slug:'jungle'});assert.deepEqual(result.report.kpis.security,{total:0,verbal:1,physical:1,evictions:3,arrests:3,mischief:0});
 assert.deepEqual(result.report.incidents[0].securityFilters,['evictions','arrests']);assert.deepEqual(result.report.incidents[1].securityFilters,['verbal']);assert.deepEqual(result.report.incidents[2].securityFilters,['physical']);
 assert.equal('resolvedStatus' in result.report.incidents[0],false);
});
test('Medische selectie correspondeert met KPI’s en projecteert alleen afgeleide labels, ook bij ambulance buiten Medisch',async()=>{
 const entries=[{ID:'a',Division:'Medisch',Type:'Zelfzorg contact',Description:'PCM'},{ID:'b',Division:'Medisch',Type:'Onwelwording','Resolved Status':'Ambulance','Affected Person':'2'},{ID:'c',Division:'Medisch',Type:'Controle'},{ID:'d',Division:'Beveiliging',Type:'Onwelwording','Resolved Status':'Ambulance','Affected Person':'3'}];
 const input=ONTRACK_HEADERS.join(',')+'\n'+entries.map(row=>ONTRACK_HEADERS.map(key=>'"'+String(({...row,'Date and Time':'2026-11-03 - 06:00 PM'})[key]||'').replaceAll('"','""')+'"').join(',')).join('\n');
 const service=createWebReportService({photo:async()=>null,store:async()=>sourceFor(input)});
 const {report}=await service('actor',{slug:'jungle'});assert.deepEqual(report.kpis.medical,{total:3,selfcare:1,treatments:2,unwell:1,ambulance:5,contusion:0});
 assert.deepEqual(report.incidents.map(row=>row.medicalFilters),[['selfcare'],['treatments','unwell','ambulance'],['treatments'],['ambulance']]);
 for(const key of ['selfcare','treatments','unwell'])assert.equal(report.incidents.filter(row=>row.medicalFilters.includes(key)).length,report.kpis.medical[key]);
 assert.equal(report.incidents.filter(row=>row.medicalFilters.includes('ambulance')).length,2);assert.ok(report.incidents.every(row=>!('resolvedStatus' in row)&&!('affectedPerson' in row)&&!('division' in row)));
});

test('Tijdschema hoort bij dezelfde geverifieerde rapportidentiteit; ingetrokken toegang is geen optionele schemafout',async()=>{
 const timetable={status:'available',entries:[]},service=createWebReportService({photo:async()=>null,store:async(operation,actor,payload)=>{assert.equal(actor,'actor');assert.equal(operation,'web-read');assert.equal(payload.concertId,key);return sourceFor(csv,{timetable});}});
 assert.deepEqual((await service('actor',{slug:'jungle'})).report.timetable,timetable);
 const revoked=createWebReportService({photo:async()=>null,store:async()=>{throw Error('FORBIDDEN');}});await assert.rejects(revoked('actor',{slug:'jungle'}),/FORBIDDEN/);
});

test('Nieuwe webfilters, KPI’s en incidentenlijst volgen dezelfde CSV-types; PDF-berekening blijft behouden',async()=>{
 const {calculateReport}=await import('./ontrack-report/data.js');
 const {selectedReportIncidents}=await import('../src/lib/report-view.js');
 const {medicalReportFilters}=await import('../shared/report-medical.js'),{securityReportFilters}=await import('../shared/report-security.js');
 const entries=[
  {ID:'flauwte',Division:'Medisch',Type:'Benauwd/ Flauwte','Affected Person':'4'},
  {ID:'blessure-zelfzorg',Division:'Medisch',Type:'Contusie / Distorsie',Description:'PCM gegeven'},
  {ID:'blessure',Division:'Medisch',Type:'CONTUSIE/DISTORSIE'},
  {ID:'baldadigheid',Division:'Beveiliging',Type:'Baldadigheid','Affected Person':'2'},
  {ID:'omschrijving',Division:'Beveiliging',Type:'Controle',Description:'Baldadigheid'},
  {ID:'verkeerde-afdeling',Division:'Beveiliging',Type:'Contusie / Distorsie'},
  {ID:'omschrijving-medisch',Division:'Medisch',Type:'Controle',Description:'Flauwte'},
  {ID:'onwel',Division:'Medisch',Type:'Onwelwording'},
  {ID:'flauwval',Division:'Medisch',Type:'Flauwval'},
 ];
 const input=ONTRACK_HEADERS.join(',')+'\n'+entries.map(row=>ONTRACK_HEADERS.map(key=>'"'+String(({'Date and Time':'2026-11-03 - 06:00 PM',...row})[key]||'').replaceAll('"','""')+'"').join(',')).join('\n');
 const base=calculateReport(input),{report}=await createWebReportService({photo:async()=>null,store:async()=>sourceFor(input)})('actor',{slug:'jungle'});
 assert.equal(base.kpis.medical.unwell,2);assert.equal(report.kpis.medical.unwell,3);assert.equal(report.kpis.medical.contusion,2);assert.equal(report.kpis.security.mischief,1);
 for(const [filter,ids,amount]of [['unwell',['flauwte','onwel','flauwval'],report.kpis.medical.unwell],['contusion',['blessure-zelfzorg','blessure'],report.kpis.medical.contusion],['mischief',['baldadigheid'],report.kpis.security.mischief]]){const selected=selectedReportIncidents(report.incidents,filter);assert.deepEqual(selected.map(row=>row.id),ids);assert.equal(selected.length,amount);}
 assert.equal(selectedReportIncidents(report.incidents).some(row=>row.id==='blessure-zelfzorg'),false);
 assert.deepEqual(medicalReportFilters.map(row=>row.id),['treatments','selfcare','unwell','contusion','ambulance']);assert.deepEqual(securityReportFilters.map(row=>row.id),['verbal','physical','mischief','evictions','arrests']);
 assert.equal('contusion' in base.kpis.medical,false);assert.equal('mischief' in base.kpis.security,false);
});
