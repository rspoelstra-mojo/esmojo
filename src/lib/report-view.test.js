import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleReportIncidents,shortIncidentDate,highlightedReportIncident,reportPhoto,reportTabDates} from './report-view.js';
test('Locatie/tijd gebruikt twaalf Nederlandse maandafkortingen zonder punt',()=>{
 const months=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
 for(let month=1;month<=12;month++)assert.equal(shortIncidentDate(`2026-${String(month).padStart(2,'0')}-03`),`3 ${months[month-1]} 2026`);
});
test('Alleen gevraagde type-/omschrijvingmatches verdwijnen, hoofdletterongevoelig; invoer blijft intact',()=>{
 const hidden=[{type:'Zelfzorg contact'},{type:'KOLVEN'},{type:'Extra zelfzorgmelding'},{description:'Een PLEISTER aangebracht'},{description:'PCM gegeven'},{description:'Paracetamol'},{description:'paracetemol'}];
 const shown=[{id:'a',type:'Medisch',description:'Controle'},{id:'b',description:'Kolven gemeld'},{id:'c',type:'Pleister'},{id:'d'}],input=[...hidden,...shown],before=structuredClone(input);
 assert.deepEqual(visibleReportIncidents(input),shown);assert.deepEqual(input,before);
});
test('High en bestaande Critical krijgen rood ongeacht hoofdletters of ontbrekende oude highlightvlag',()=>{
 for(const priority of ['High','HIGH',' high ','Critical'])assert.equal(highlightedReportIncident({priority,highlight:false}),true);
 for(const priority of ['Low','Medium','',null])assert.equal(highlightedReportIncident({priority,highlight:true}),false);
});
test('Foto accepteert uitsluitend bestaande MOJO-afbeeldingen en concertpagina’s',()=>{
 const photo={imageUrl:'https://www.mojo.nl/media/test/image.jpg?width=600',sourceUrl:'https://www.mojo.nl/concerten/test'};assert.deepEqual(reportPhoto(photo),photo);
 for(const invalid of [null,{...photo,imageUrl:'https://evil.invalid/image.jpg'},{...photo,imageUrl:'javascript:alert(1)'},{...photo,imageUrl:'https://www.mojo.nl/media/test/image.svg'},{...photo,sourceUrl:'https://evil.invalid/test'},{...photo,imageUrl:'https://user:pass@www.mojo.nl/media/test/image.jpg'}])assert.equal(reportPhoto(invalid),null);
});
test('Expliciete beveiligingsfilter vindt alle passende records, inclusief standaard verborgen zelfzorg, en wissen herstelt default',async()=>{
 const {selectedReportIncidents}=await import('./report-view.js');
 const source=[{id:'zorg',type:'Zelfzorg',securityFilters:['evictions','arrests']},{id:'verbaal',type:'Verbale agressie',securityFilters:['verbal']},{id:'fysiek',type:'Fysieke agressie',securityFilters:['physical']},{id:'ander',type:'Overig'}];
 assert.deepEqual(selectedReportIncidents(source).map(row=>row.id),['verbaal','fysiek','ander']);
 for(const [filter,expected]of [['verbal','verbaal'],['physical','fysiek'],['evictions','zorg'],['arrests','zorg']])assert.deepEqual(selectedReportIncidents(source,filter).map(row=>row.id),[expected]);
 assert.deepEqual(selectedReportIncidents(source,'onbekend'),[]);assert.deepEqual(selectedReportIncidents(source,null),visibleReportIncidents(source));
});
test('Medische filters tonen ook standaard verborgen zelfzorg, kiezen uitsluitend eigen labels en herstellen default bij wissen',async()=>{
 const {selectedReportIncidents}=await import('./report-view.js');
 const source=[{id:'zorg',type:'Zelfzorg',medicalFilters:['selfcare']},{id:'overlap',description:'PCM',medicalFilters:['selfcare','unwell']},{id:'behandeling',type:'Controle',medicalFilters:['treatments','ambulance']},{id:'ander',securityFilters:['evictions']}];
 for(const [filter,ids]of [['selfcare',['zorg','overlap']],['treatments',['behandeling']],['unwell',['overlap']],['ambulance',['behandeling']]])assert.deepEqual(selectedReportIncidents(source,filter).map(row=>row.id),ids);
 assert.deepEqual(selectedReportIncidents(source,'evictions').map(row=>row.id),['ander']);assert.deepEqual(selectedReportIncidents(source,null).map(row=>row.id),['behandeling','ander']);
});

test('Prioriteiten worden uitsluitend voor weergave Nederlands, ongeacht hoofdletters; onbekend/ontbrekend blijft leesbaar',async()=>{
 const {reportPriorityLabel}=await import('./report-view.js');
 for(const [source,label]of [['Low','Laag'],[' medium ','Midden'],['HIGH','Hoog'],['Critical','Kritisch'],['Laag','Laag'],['Urgent','Urgent'],['__proto__','__proto__'],['','Niet opgegeven'],[null,'Niet opgegeven']])assert.equal(reportPriorityLabel(source),label);
});

test('Datumtabs tonen maximaal vijf unieke shows van nieuw naar oud; minder beschikbare shows worden niet aangevuld',async()=>{
 const {reportTabDates}=await import('./report-view.js');
 const source=['2002-06-01','2026-11-03','2026-10-31','2027-01-02','2026-11-04','2026-11-02','2026-11-03'],before=[...source];
 assert.deepEqual(reportTabDates(source),['2027-01-02','2026-11-04','2026-11-03','2026-11-02','2026-10-31']);assert.deepEqual(source,before);
 assert.deepEqual(reportTabDates(['2002-06-01','2026-11-03']),['2026-11-03','2002-06-01']);
 assert.deepEqual(reportTabDates(['2026-11-03']),['2026-11-03']);assert.deepEqual(reportTabDates(['2026-11-03','2026-11-03']),['2026-11-03']);assert.deepEqual(reportTabDates([]),[]);
});
assert.deepEqual(reportTabDates(['2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01'],'2026-01-01'),['2026-06-01','2026-05-01','2026-04-01','2026-03-01','2026-01-01']);

import {reportTimetableCaption} from './report-timetable-caption.js';
test('TSC-tijden zonder MOJO-opnamedatum blokkeren rapport niet en suggereren geen MOJO-bron',()=>{
 const tsc={status:'available',sourceType:'tsc-historical',entries:[]};
 assert.match(reportTimetableCaption(tsc),/Werkelijke tijden.*TSC/);assert.doesNotMatch(reportTimetableCaption(tsc),/MOJO/);
 assert.match(reportTimetableCaption({...tsc,status:'missing'}),/Geen tijden.*TSC/);
 assert.match(reportTimetableCaption({status:'available',capturedAt:'2020-02-01T11:00:00.000Z'}),/MOJO.*2020/);
 for(const capturedAt of [undefined,null,'invalid',''])assert.equal(reportTimetableCaption({status:'available',capturedAt}),'Geplande tijden volgens MOJO.');
 assert.match(reportTimetableCaption(null),/Geen.*MOJO/);
});
