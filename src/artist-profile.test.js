import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artistTimeline} from './lib/artist-timeline.js';
test('Concerttijdlijn splitst reeksen en jaargrenzen, sorteert nieuwste eerst en behoudt verschillende zalen',()=>{
 const groups=artistTimeline([{venue:'Gashouder',dates:['2025-12-31','2026-01-01','2026-11-04']},{venue:'Ziggo Dome',dates:['2026-11-04']},{venue:'Gashouder',dates:['2026-11-04']}]);
 assert.deepEqual(groups,[{year:'2026',events:[{venue:'Gashouder',date:'2026-11-04'},{venue:'Ziggo Dome',date:'2026-11-04'},{venue:'Gashouder',date:'2026-01-01'}]},{year:'2025',events:[{venue:'Gashouder',date:'2025-12-31'}]}]);
 assert.deepEqual(artistTimeline(),[]);
});
test('Twee voorstellingen op dezelfde datum blijven twee selecteerbare gebeurtenissen',()=>{
 const events=artistTimeline([{venue:'Ziggo Dome',dates:['2026-04-18'],performances:[{date:'2026-04-18',performance:'middag'},{date:'2026-04-18',performance:'avond'}]}])[0].events;
 assert.equal(events.length,2);assert.deepEqual(events.map(row=>row.performance),['middag','avond']);
});
