import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleScheduleDays,scheduleDayLabel,scheduleUpdatedLabel} from './show-schedule.js';
const day=(date,rows,capturedAt='2026-11-17T04:00:00.000Z')=>({date,capturedAt,entries:rows.map(([label,time,kind='act'])=>({label,time,kind,localDate:date}))});
const now=new Date('2026-11-21T10:00:00Z');
test('Komende dagen met een schema blijven zichtbaar, op volgorde; voorbije dagen verdwijnen zolang er een komende dag is',()=>{
 const data={days:[day('2026-11-22',[['Deuren open','19:00','doors']]),day('2026-11-20',[['Deuren open','18:00','doors']]),day('2026-11-21',[['Westlife','20:00']])]};
 assert.deepEqual(visibleScheduleDays(data,now).map(item=>item.date),['2026-11-21','2026-11-22']);
 assert.deepEqual(visibleScheduleDays(data,new Date('2026-11-25T10:00:00Z')).map(item=>item.date),['2026-11-20','2026-11-21','2026-11-22'],'alle dagen voorbij: laatst bekende schema blijft zichtbaar');
});
test('Onbruikbare, onvolledige of ongeldige gegevens worden nooit getoond',()=>{
 assert.deepEqual(visibleScheduleDays(null,now),[]);assert.deepEqual(visibleScheduleDays({days:'x'},now),[]);assert.deepEqual(visibleScheduleDays({days:[]},now),[]);
 const data={days:[{date:'geen-datum',entries:[{label:'A',time:'18:00'}]},day('2026-11-22',[['','18:00'],['  ','19:00'],['Tijd ontbreekt',''],['Te laat','24:30'],['Ongeldig','7:5'],['Westlife','20:00'],['Spatie ',' 21:00']]),{date:'2026-11-23',entries:'x'},{date:'2026-11-24',entries:[]}]};
 const result=visibleScheduleDays(data,now);assert.equal(result.length,1);assert.deepEqual(result[0].entries.map(entry=>[entry.label,entry.time]),[['Westlife','20:00']]);
 assert.equal(visibleScheduleDays({days:[day('2026-11-22',Array.from({length:101},(_,i)=>['Act '+i,'20:00']))]},now).length,0,'meer dan honderd regels is ongeldig');
});
test('Nederlandse labels voor dag en laatste bijwerking, in Nederlandse tijd',()=>{
 assert.match(scheduleDayLabel('2026-11-23'),/^ma 23 nov/);
 assert.equal(scheduleUpdatedLabel('2026-11-17T04:00:00.000Z'),'Bijgewerkt op 17 nov om 05:00');assert.equal(scheduleUpdatedLabel('2026-06-17T03:00:00.000Z'),'Bijgewerkt op 17 jun om 05:00','zomertijd');
 assert.equal(scheduleUpdatedLabel('geen datum'),'');assert.equal(scheduleUpdatedLabel(undefined),'');
});
