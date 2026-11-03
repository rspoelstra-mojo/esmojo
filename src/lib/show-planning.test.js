import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarDay,dutchToday,showPlanning} from './show-planning.js';
const show={dates:['2026-11-05'],venue:'Gashouder'},now=new Date('2026-11-03T12:00:00Z');
const snapshot=()=>({pdf:{state:'ready'},profile:{finalization:{categories:{visitors:{completedAt:'2026-10-23T12:00:00Z'},artist:{completedAt:'2026-10-24T12:00:00Z'}}}},risks:{production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true},floor:{completed:true}}}});
test('De vijf kalenderdeadlines gebruiken de vroegste reeksdatum; vandaag wordt correct tussen mijlpalen geplaatst',()=>{
 const model=showPlanning({...show,dates:['2026-11-07','2026-11-05','2026-11-06']},{},now);
 assert.deepEqual(model.steps.map(step=>step.date),['2026-10-05','2026-10-22','2026-10-29','2026-11-04','2026-11-05']);assert.equal(model.today,'2026-11-03');assert.ok(model.todayPosition>50&&model.todayPosition<70);assert.equal(model.steps[3].badge,'Morgen');assert.equal(model.next.id,'profile');
});
test('Kalenderdagen behouden maand-/jaargrenzen, schrikkeldag en zomer-/wintertijd',()=>{
 for(const [date,dayBefore]of [['2028-03-01','2028-02-29'],['2026-03-30','2026-03-29'],['2026-10-26','2026-10-25'],['2027-01-01','2026-12-31']])assert.equal(showPlanning({...show,dates:[date]},{},now).steps[3].date,dayBefore);
 assert.equal(dutchToday(new Date('2026-11-03T23:30:00Z')),'2026-11-04');assert.equal(dutchToday(new Date('2026-06-01T22:30:00Z')),'2026-06-02');
 for(const date of ['2026-02-30','2026-13-01','geen-datum'])assert.equal(calendarDay(date),null);
 assert.equal(showPlanning({...show,dates:[]},{},now),null);assert.equal(showPlanning({...show,dates:['2026-11-05','geen-datum']},{},now),null);
});
test('Alleen beschikbare actuele PDF rondt Showprofiel af; echte afronddata worden gebruikt',()=>{
 for(const state of ['pending','not-ready','failed','generating'])assert.equal(showPlanning(show,{...snapshot(),pdf:{state}},now).steps[0].completed,false);
 const model=showPlanning(show,snapshot(),now);assert.equal(model.steps[0].completed,true);assert.equal(model.steps[0].badge,'Afgerond · 24 okt');assert.equal(model.next.id,'operational');
});
test('Productionele afronding vereist alle toepasselijke onderdelen; onbeantwoord, Ja en onvolledig blijven open',()=>{
 assert.equal(showPlanning(show,snapshot(),now).steps[2].completed,true);
 assert.equal(showPlanning({...show,venue:'AFAS Live'},snapshot(),now).steps[2].completed,false);
 for(const change of [value=>delete value.risks.production.choices.drones,value=>value.risks.production.choices.drones=true,value=>value.risks.assessments.floor.completed=false,value=>delete value.risks.assessments.barrier,value=>delete value.risks.production]){const value=snapshot();change(value);assert.equal(showPlanning(show,value,now).steps[2].completed,false);}
 assert.equal(showPlanning(show,{},now).steps[2].completed,false);
});
test('Operationeel en maatregelen worden nooit fictief voltooid; showdag blijft een datum en geen afrondactie',()=>{
 const model=showPlanning(show,{...snapshot(),operational:{completed:true},measures:{completed:true}},now);
 assert.equal(model.steps[1].completed,false);assert.equal(model.steps[3].completed,false);assert.equal(model.steps[4].completed,false);assert.equal(model.steps[4].badge,'Showdag');
 assert.equal(showPlanning(show,{},new Date('2026-10-01T12:00:00Z')).todayPosition,10);assert.equal(showPlanning(show,{},new Date('2026-12-01T12:00:00Z')).todayPosition,90);
});
