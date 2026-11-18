import {test} from 'node:test';import assert from 'node:assert/strict';import {reportCatalogue} from './report-catalogue.js';import {groupReportMenu} from '../src/lib/report-menu.js';import {reportTabDates} from '../src/lib/report-view.js';
const item=(concertId,name,date,venue='Ziggo Dome')=>({concertId,name,date,venue,revision:'synthetic-revision'});
test('Een reeks groepeert shows van één zaal; nieuwste datum links, alleen beschikbare dagen en maximaal vijf tabs',()=>{
 const rows=[item('old','Synthetische artiest','2002-01-01'),item('one','Synthetische artiest','2026-11-01'),item('two','synthetische artiest','2026-11-02'),item('three','Synthetische artiest','2026-11-03'),item('four','Synthetische artiest','2026-11-04'),item('five','Synthetische artiest','2026-11-05'),item('future','Synthetische artiest','2026-11-06'),item('other','Ander','2026-10-01')];
 const result=reportCatalogue(rows,'2026-11-05');assert.equal(result.length,3);
 const series=result.find(row=>row.concertId==='five');assert.deepEqual(reportTabDates(series.dates),['2026-11-05','2026-11-04','2026-11-03','2026-11-02','2026-11-01']);
 assert.ok(result.some(row=>row.concertId==='old'&&row.dates.length===1),'een historische reeks staat apart en niet bij de recente shows');
 assert.equal(groupReportMenu(result,new Date('2026-11-05T12:00Z')).flatMap(group=>group.reports).filter(report=>report.label==='Ander').length,1);assert.equal(reportCatalogue([item('single','Een','2026-11-03')],'2026-11-05')[0].dates.length,1);
});
test('Een gedefinieerde reeks (seriesId) staat samen onder één artiestnaam, ook met tussendagen; andere reeksen en zalen blijven apart',()=>{
 const rows=[{...item('a','Beth Hart','2026-11-01'),seriesId:'S1'},{...item('b','Beth Hart','2026-11-04'),seriesId:'S1'},{...item('c','Beth Hart','2026-11-02','AFAS Live'),seriesId:'S2'},{...item('d','Beth Hart','2026-02-01'),seriesId:'S3'}];
 const result=reportCatalogue(rows,'2026-11-05');assert.equal(result.length,3);
 const together=result.find(row=>row.shows.some(show=>show.concertId==='a'));assert.deepEqual(together.dates,['2026-11-04','2026-11-01']);assert.equal(together.shows.length,2);
 assert.ok(!together.shows.some(show=>['c','d'].includes(show.concertId)));
 // Zonder reeksidentiteit: dezelfde zaal binnen 31 dagen vormt één reeks, een andere zaal of latere periode niet.
 const loose=reportCatalogue([item('x','Zonder','2026-11-01'),item('y','Zonder','2026-11-04'),item('z','Zonder','2026-11-03','AFAS Live'),item('w','Zonder','2026-06-01')],'2026-11-05');assert.equal(loose.length,3);
});
test('Twee concerten van dezelfde artiest op dezelfde datum worden niet stilzwijgend samengevoegd',()=>{assert.equal(reportCatalogue([item('a','Synthetisch','2026-11-03'),item('b','Synthetisch','2026-11-03')],'2026-11-05').length,0);assert.equal(reportCatalogue([item('a','Synthetisch','2026-11-03'),item('b','Synthetisch','2026-11-03','AFAS Live')],'2026-11-05').length,0,'ook in twee zalen op dezelfde dag blijft de dag verborgen');});
test('Expliciete middag/avond-voorstellingen houden eigen concert-ID, revisie en tab',()=>{
 const slots=[{...item('Show_Ziggo-Dome_03112026_S1','Show','2026-11-03'),performance:'middag'},{...item('Show_Ziggo-Dome_03112026_S2','Show','2026-11-03'),performance:'avond'}];
 const [result]=reportCatalogue(slots,'2026-11-05');assert.equal(result.shows.length,2);assert.deepEqual(result.dates,['2026-11-03']);assert.deepEqual(result.shows.map(row=>row.performance),['middag','avond']);
 assert.equal(reportCatalogue([slots[0],{...slots[1],performance:'middag'}],'2026-11-05').length,0);
});
