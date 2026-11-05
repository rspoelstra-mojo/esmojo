import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarDay,dutchToday,showPlanning,showMeasures} from './show-planning.js';
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

test('Actuele operationele analyse rondt pas af na alle geldige individuele beoordelingen',()=>{
 const source={revision:'a'.repeat(64),sha256:'b'.repeat(64)},row={revision:1,riskLevel:'low',riskNote:'',completedAt:'2026-11-05T10:00:00Z'},risks={state:'ready',risks:[{id:'R01'},{id:'R02'},{id:'R03'}],operational:{source,assessments:{R01:row,R02:row}}};
 assert.equal(showPlanning(show,{risks},now).steps[1].completed,false);risks.operational.assessments.R03=row;assert.equal(showPlanning(show,{risks},now).steps[1].completed,true);
 for(const change of [v=>v.state='pending',v=>v.operational.source=null,v=>v.operational.assessments.R03={...row,riskLevel:'high',riskNote:' '},v=>v.operational.assessments.R03={...row,completedAt:null}]){const copy=structuredClone(risks);change(copy);assert.equal(showPlanning(show,{risks:copy},now).steps[1].completed,false);}
 assert.equal(showPlanning(show,{risks:{...risks,risks:[]}},now).steps[1].completed,true,'Een beschikbare analyse zonder geïdentificeerde risico’s heeft geen open beoordelingen');
});

const completeMeasureSnapshot=()=>({risks:{state:'ready',risks:[{id:'R01',title:'Synthetisch risico'}],production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true,riskLevel:'none',riskNote:'Geen maatregel, wel toelichting.'},floor:{completed:true,riskLevel:'low',note:''}},operational:{source:{revision:'a'.repeat(64),sha256:'b'.repeat(64)},assessments:{R01:{revision:1,riskLevel:'low',riskNote:'',completedAt:'2026-11-05T10:00:00Z'}}}}});
test('Geen maatregelen: alleen na alle actuele operationele en toepasselijke productiebeoordelingen afronden',()=>{
 const snapshot=completeMeasureSnapshot();assert.equal(showMeasures(show,snapshot).rows.length,0);assert.equal(showMeasures(show,snapshot).complete,true);assert.equal(showPlanning(show,snapshot,now).steps[3].completed,true);
 for(const change of [v=>v.risks.state='pending',v=>delete v.risks.operational.assessments.R01,v=>v.risks.assessments.floor.completed=false,v=>delete v.risks.production.choices.lasers,v=>v.risks.production.choices.lasers=true]){const copy=structuredClone(snapshot);change(copy);assert.equal(showMeasures(show,copy).complete,false);}
 assert.equal(showMeasures({...show,venue:'AFAS Live'},snapshot).complete,false);
});
test('Midden/Hoog leveren losse maatregelen uit productie en actuele operationele bron; geen toelichtingen of oude risico’s',()=>{
 const snapshot=completeMeasureSnapshot();snapshot.risks.assessments.barrier={completed:true,riskLevel:'medium',riskNote:' Extra toezicht barrier. '};snapshot.risks.assessments.floor={completed:false,riskLevel:'high',note:'Vloervak vrijhouden.'};snapshot.risks.operational.assessments.R01={revision:1,riskLevel:'high',riskNote:'Afzonderlijke operationele maatregel.',completedAt:'2026-11-05T10:00:00Z'};snapshot.risks.operational.assessments.R02={revision:1,riskLevel:'high',riskNote:'Historisch en niet in huidige analyse.',completedAt:'2026-11-05T10:00:00Z'};
 const model=showMeasures(show,snapshot);assert.deepEqual(model.rows.map(row=>row.text),['Extra toezicht barrier.','Vloervak vrijhouden.','Afzonderlijke operationele maatregel.']);assert.equal(new Set(model.rows.map(row=>row.id)).size,3);assert.ok(model.rows.every(row=>row.implemented===false));assert.equal(model.complete,false);
 snapshot.risks.assessments.floor.completed=true;assert.equal(showMeasures(show,snapshot).allRisksCompleted,true);assert.equal(showMeasures(show,snapshot).complete,false);
 snapshot.risks.state='not-ready';assert.equal(showMeasures(show,snapshot).rows.length,2);
});
test('Historische afgeronde Midden/Hoog zonder expliciete maatregel niet stilzwijgend als maatregelenvrij afronden',()=>{
 const snapshot=completeMeasureSnapshot();snapshot.risks.assessments.barrier={completed:true,riskLevel:'medium',riskNote:null};assert.equal(showMeasures(show,snapshot).complete,false);
});
