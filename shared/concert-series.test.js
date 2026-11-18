import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkSeriesSelection,autoSeries,seriesLabels} from './concert-series.js';
const row=(id,date,over={})=>({concertId:id,date,venue:'Ziggo Dome',artist:'Beth Hart',...over});
test('Handmatige reeks: zelfde zaal en artiest, ook met tussendagen, maximaal 31 dagen',()=>{
 assert.deepEqual(checkSeriesSelection([row('a','2026-12-01'),row('b','2026-12-03')]),{ok:true});
 assert.deepEqual(checkSeriesSelection([row('a','2026-12-01'),row('b','2026-12-01')]),{ok:true},'S1/S2 op één dag');
 assert.equal(checkSeriesSelection([row('a','2026-12-01')]).code,'COUNT');
 assert.equal(checkSeriesSelection([row('a','2026-12-01'),row('a','2026-12-02')]).code,'DUPLICATE');
 assert.equal(checkSeriesSelection([row('a','2026-12-01'),row('b','2026-12-02',{venue:'AFAS Live'})]).code,'VENUE');
 assert.equal(checkSeriesSelection([row('a','2026-12-01'),row('b','2026-12-02',{artist:'Andere'})]).code,'ARTIST');
 assert.deepEqual(checkSeriesSelection([row('a','2026-12-01'),row('b','2026-12-02',{artist:'beth  hart'})]),{ok:true},'naam normaliseert hoofdletters en spaties');
 assert.equal(checkSeriesSelection([row('a','2026-12-01'),row('b','2027-01-01')]).code,'SPAN');
 assert.deepEqual(checkSeriesSelection([row('a','2026-12-01'),row('b','2026-12-31')]),{ok:true},'30 dagen ertussen is toegestaan');
});
test('Automatische reeksen volgen de bestaande groepering en handmatige reeksen gaan voor in de weergave',()=>{
 const rows=[row('a','2026-12-01'),row('b','2026-12-02'),row('c','2026-12-05'),row('d','2026-12-06',{venue:'AFAS Live'}),row('e','2026-12-07',{artist:'Anders'})];
 assert.deepEqual(autoSeries(rows).map(group=>group.map(item=>item.concertId)),[['d'],['e'],['a','b'],['c']]);
 const labels=seriesLabels(rows,[]);assert.deepEqual([...labels.keys()].sort(),['a','b']);assert.equal(labels.get('a').kind,'auto');assert.equal(labels.get('a').size,2);
 const manual=seriesLabels(rows,[{id:'s1',members:['a','b','c']}]);assert.deepEqual([...manual.keys()].sort(),['a','b','c']);assert.equal(manual.get('c').kind,'manual');assert.equal(manual.get('c').size,3);
 // Een reeks met maar één aanwezig concert (de rest verlopen) telt niet als reeks.
 assert.equal(seriesLabels([row('a','2026-12-01')],[{id:'s1',members:['a','zzz']}]).size,0);
});
