import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseMojoTimetable,fetchMojoTimetable} from './mojo-timetable.js';
import {reportChronology,timetableEntryLabel,timetableClock,validateTimetable} from '../shared/show-timetable.js';
const show={concertId:'Fictief_Gashouder_05112026',artist:'Fictief',date:'2026-11-05',venue:'Gashouder',city:'Amsterdam',sourceUrl:'https://www.mojo.nl/concerten/fictief'},capturedAt='2026-11-05T11:00:00.000Z';
const panel=(date,rows,venue='Gashouder — Amsterdam',id='2000')=>`<div role="tabpanel" id="show-${date}-${id}"><p class="item-list__label">${venue}</p><ul>${rows.map(([label,time])=>`<li><div><h3 class="item-list__title">${label}</h3><p class="item-list__body">${time}</p></div></li>`).join('')}</ul></div>`;
const html=content=>`<h1>Fictief</h1><div><h2>TIJDSCHEMA</h2>${content}</div><p>Generieke aanvang 20:00, geen tijdschemabron</p>`;
test('Variabel aantal acts, surprise, pauze, echte hoofdacttijd en einde; juiste datum en zaal gekozen',()=>{
 const rows=[['Deuren open','18:30'],['Support act Een','19.00 uur'],['Support act Twee','19:20 – 19:40'],['Surprise act Verrassing','20:00'],['Pauze','20:30'],['Fictief','21:00'],['Verwacht einde','22:45']];
 const result=parseMojoTimetable(html(panel('2026-11-06',[['Fictief','18:00']])+panel(show.date,rows)),show,{capturedAt});assert.equal(result.entries.length,7);assert.deepEqual(result.entries.map(row=>row.time),['18:30','19:00','19:20','20:00','20:30','21:00','22:45']);assert.equal(result.entries[3].label,'Verrassing');assert.equal(timetableEntryLabel(result.entries[0]),'Geplande tijd deuren open');assert.equal(timetableEntryLabel(result.entries[4]),'Geplande starttijd pauze');assert.equal(timetableEntryLabel(result.entries[5]),'Geplande aanvang Fictief');assert.equal(timetableEntryLabel(result.entries[6]),'Geplande eindtijd show');
 const venueMatch=parseMojoTimetable(html(panel(show.date,[['Fictief','18:00']],'Ziggo Dome — Amsterdam','1800')+panel(show.date,rows)),show,{capturedAt});assert.equal(venueMatch.entries.length,7);
});
test('Nachtmomenten krijgen volgende kalenderdag; chronologie plaatst tussenkop vóór een incident op dezelfde minuut',()=>{
 const result=parseMojoTimetable(html(panel(show.date,[['Deuren open','22:00'],['Fictief','23:30'],['Pauze','00:15'],['Verwacht einde','01:00']])),show,{capturedAt});assert.deepEqual(result.entries.map(row=>row.localDate),[show.date,show.date,'2026-11-06','2026-11-06']);
 const incidents=[{id:'een',localDate:show.date,time:'22:00'},{id:'twee',localDate:'2026-11-06',time:'00:20'}],merged=reportChronology(incidents,result);assert.equal(merged[0].type,'timetable');assert.equal(merged[1].value.id,'een');assert.equal(merged.at(-1).value.kind,'end');assert.equal(merged.filter(item=>item.type==='incident').length,2);assert.equal(reportChronology([],result).length,4);
 const midnight=parseMojoTimetable(html(panel(show.date,[['Deuren open','19:00'],['Verwacht einde','24:00']])),show,{capturedAt});assert.equal(midnight.entries[1].time,'00:00');assert.equal(midnight.entries[1].localDate,'2026-11-06');
});
test('Ontbrekende/andere datum wordt niet ingevuld; geen prijzen, metadata-aanvang of onzekere tijden als vervanging',()=>{
 assert.equal(parseMojoTimetable('<h1>Fictief</h1><p>Aanvang 20:00</p>',show,{capturedAt}).status,'missing');assert.equal(parseMojoTimetable(html(panel('2026-11-06',[['Fictief','21:00']])),show,{capturedAt}).reason,'DATE_NOT_PUBLISHED');
 const result=parseMojoTimetable(html(panel(show.date,[['Support act','Nog niet bekend'],['Fictief','21:00']])),show,{capturedAt});assert.equal(result.entries.length,1);assert.deepEqual(result.unresolved,['Support act']);
 assert.throws(()=>parseMojoTimetable(html(panel(show.date,[['Fictief','21:00']],'AFAS Live — Amsterdam')),show,{capturedAt}),/CONTEXT/);
 assert.throws(()=>parseMojoTimetable(html(panel(show.date,[['Fictief','21:00']])+panel(show.date,[['Fictief','22:00']],undefined,'2200')),show,{capturedAt}),/AMBIGUOUS/);
 assert.throws(()=>parseMojoTimetable('<h1>Andere artiest</h1>'+html(panel(show.date,[['Fictief','21:00']])),show,{capturedAt}),/CONTEXT/);
});
test('Noon-Nederland met zomer/wintertijd en alleen geverifieerde bron/echte showdag',async()=>{
 assert.deepEqual(timetableClock('2026-11-05T11:00:00Z'),{date:show.date,hour:12});assert.equal(timetableClock('2026-06-05T10:00:00Z').hour,12);
 const result=parseMojoTimetable(html(panel(show.date,[['Fictief','21:00']])),show,{capturedAt});for(const changed of [{...result,sourceUrl:'https://evil.invalid/test'},{...result,capturedAt:'2026-11-05T10:00:00.000Z'},{...result,concertId:'ander'},{...result,date:'2026-11-04'}])assert.throws(()=>validateTimetable(changed,show),/INVALID/);
 let calls=0;await assert.rejects(fetchMojoTimetable({...show,sourceUrl:'https://evil.invalid/test'},{request:()=>{calls++;}}),/SOURCE/);assert.equal(calls,0);
});
