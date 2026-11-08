import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artistTimeline} from './lib/artist-timeline.js';
test('Concerttijdlijn splitst reeksen en jaargrenzen, sorteert nieuwste eerst en behoudt verschillende zalen',()=>{
 const groups=artistTimeline([{venue:'Gashouder',dates:['2025-12-31','2026-01-01','2026-11-04']},{venue:'Ziggo Dome',dates:['2026-11-04']},{venue:'Gashouder',dates:['2026-11-04']}]);
 assert.deepEqual(groups,[{year:'2026',events:[{venue:'Gashouder',date:'2026-11-04'},{venue:'Ziggo Dome',date:'2026-11-04'},{venue:'Gashouder',date:'2026-01-01'}]},{year:'2025',events:[{venue:'Gashouder',date:'2025-12-31'}]}]);
 assert.deepEqual(artistTimeline(),[]);
});
