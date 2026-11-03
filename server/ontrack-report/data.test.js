import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ONTRACK_HEADERS,parseCsv,parseOnTrackTime,calculateReport,displayValue} from './data.js';
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
export const csv=rows=>ONTRACK_HEADERS.map(quote).join(',')+'\r\n'+rows.map((row,i)=>ONTRACK_HEADERS.map(header=>quote({ID:String(i+1),'Date and Time':'2026-11-03 - 06:00 PM',...row}[header]||'')).join(',')).join('\r\n');
test('Strenge 17 headers, volgorde en RFC4180 quoting/BOM/newlines; geen indexverwisseling',()=>{
 const source='\uFEFF'+csv([{Description:'Regel 1, met "quotes"\nRegel 2','Resolution Note':'Volledige notitie'}]),rows=parseCsv(source);assert.equal(rows[0].Description,'Regel 1, met "quotes"\nRegel 2');assert.equal(rows[0]['Resolution Note'],'Volledige notitie');
 for(const value of [source.replace('Affected Person','Affected Persons'),source.replace('Resolution Note','Resolved Note'),source.replace('"ID","Date and Time"','"Date and Time","ID"')])assert.throws(()=>parseCsv(value),/CSV_HEADERS/);
 assert.throws(()=>parseCsv(csv([{ID:'1'},{ID:'2'}]).replace('"2",','"2","extra",')),/CSV_COLUMNS/);assert.throws(()=>parseCsv(csv([])),/CSV_EMPTY/);assert.throws(()=>parseCsv(csv([{}])+'"'),/CSV_QUOTES/);
});
test('KPI’s tellen unieke rijen/discipline-substrings en personen, zonder extra beveiligingsfilter',()=>{
 const report=calculateReport(csv([
  {Division:'Facilitair, Medisch, Beveiliging',Type:'Zelfzorg onwelwording',Description:'pcm, paracetamol, pleister, kolven','Resolved Status':'Arrest, ambulance','Affected Person':'4'},
  {Division:'Medisch',Type:'Flauwval'},
  {Division:'Ander',Type:'Verbale en fysieke agressie','Resolved Status':'Eviction','Affected Person':'3.0'},
  {Division:'Medisch',Type:'Ander',Description:'paracetemol'},
  {Division:'Beveiliging',Type:'Ander','Resolved Status':'Ambulance','Affected Person':'N/A'},
 ]));
 assert.deepEqual(report.kpis.medical,{total:3,selfcare:2,treatments:1,unwell:2,ambulance:4});assert.deepEqual(report.kpis.security,{total:2,verbal:1,physical:1,evictions:3,arrests:4});
 const zero=calculateReport(csv([{Division:'Medisch'}]));assert.equal(zero.kpis.medical.ambulance,0);assert.equal(zero.kpis.security.total,0);
 for(const value of ['-1','twee','1.5','Infinity'])assert.throws(()=>calculateReport(csv([{'Affected Person':value}])),/CSV_AFFECTED_PERSON/);
 assert.throws(()=>calculateReport(csv([{ID:'zelfde'},{ID:'zelfde'}])),/CSV_ID/);
});
test('AM/PM lokale tijd, zomer-/wintertijd, geen stille UTC-interpretatie',()=>{
 assert.equal(parseOnTrackTime('2026-10-25 - 07:08 AM').timestamp,Date.parse('2026-10-25T06:08:00Z'));
 assert.equal(parseOnTrackTime('2026-06-01 - 12:00 AM').timestamp,Date.parse('2026-05-31T22:00:00Z'));
 assert.equal(parseOnTrackTime('2026-06-01 - 12:00 PM').time,'12:00');
 assert.equal(parseOnTrackTime('2026-10-25 - 02:30 AM').ambiguous,true);assert.equal(parseOnTrackTime('2026-10-25 - 02:30 AM').timestamp,Date.parse('2026-10-25T00:30:00Z'));
 assert.throws(()=>parseOnTrackTime('2026-03-29 - 02:30 AM'),/CSV_TIME_NONEXISTENT/);assert.throws(()=>parseOnTrackTime('2026-02-30 - 01:00 PM'),/CSV_TIME/);assert.throws(()=>parseOnTrackTime('2026-11-03 - 18:00 PM'),/CSV_TIME/);
});
test('Grafiek strikt na 17:00 eerste datum plus gehele volgende dag, nulbakken en geen derde dag',()=>{
 const times=['2026-11-03 - 04:59 PM','2026-11-03 - 05:00 PM','2026-11-03 - 05:01 PM','2026-11-03 - 06:31 PM','2026-11-04 - 12:00 AM','2026-11-04 - 02:00 AM','2026-11-05 - 01:00 AM'];
 const result=calculateReport(csv(times.map(value=>({'Date and Time':value,Division:'Medisch, Beveiliging'}))));assert.equal(result.incidents.length,7);assert.equal(result.timeline.points[0].time,'17:00');assert.equal(result.timeline.points[0].medical,1);assert.equal(result.timeline.points[1].medical,0);assert.equal(result.timeline.points.at(-1).time,'02:00');assert.equal(result.timeline.points.reduce((sum,p)=>sum+p.medical,0),4);assert.equal(result.timeline.points.reduce((sum,p)=>sum+p.security,0),4);assert.ok(result.warnings.some(w=>w.code==='GRAPH_DATES_AFTER_SECOND'));
});
test('Taartdiagrammen alleen types >1; locaties alle regels en deterministische eerste-voorkomen-ties; priority exact high/critical',()=>{
 const result=calculateReport(csv([{Division:'Medisch',Type:'Dubbel',Zone:'Z'},{Division:'Medisch',Type:'Dubbel',Zone:'A'},{Division:'Medisch',Type:'Single',Zone:'Z'},{Division:'Beveiliging',Zone:'A',Priority:'High'},{Zone:'B',Priority:' CRITICAL '},{Zone:'C',Priority:'Medium'},{Zone:'D',Priority:'Low'},{Zone:'E',Priority:'N/A'},{Zone:'F'},{Zone:'G'},{Zone:'H'}]));
 assert.deepEqual(result.types.medical,[{name:'Dubbel',count:2}]);assert.deepEqual(result.types.security,[]);assert.equal(result.kpis.medical.total,3);assert.equal(result.locations.length,7);assert.deepEqual(result.locations.slice(0,2),[{name:'Z',count:2},{name:'A',count:2}]);assert.equal(result.incidents.filter(row=>row.highlight).length,2);assert.equal(displayValue('N/A'),'Niet opgegeven');assert.equal(displayValue(''),'Niet opgegeven');assert.equal(displayValue(' echte tekst '),'echte tekst');
});
