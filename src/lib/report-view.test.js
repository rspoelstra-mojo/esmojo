import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleReportIncidents,shortIncidentDate,highlightedReportIncident,reportPhoto} from './report-view.js';
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
