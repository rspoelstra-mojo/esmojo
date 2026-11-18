import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showActions,showPlanActions} from './show-actions.js';
import {requestedShowTarget,showTargetHref} from '../../shared/show-navigation.js';
const show={key:'Artiest_Gashouder_27112026',venue:'Gashouder',dates:['2026-11-27']},other={...show,venue:'Ziggo Dome'};
const now=new Date('2026-11-10T12:00:00Z');
const hash=char=>char.repeat(64);
const base=(over={})=>({profileSentAt:null,profile:{analyses:{},finalization:{ticketsReady:false,categories:{visitors:{ready:false,completedAt:null},artist:{ready:false,completedAt:null}}}},risks:{state:'pending',risks:[],production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true},floor:{completed:true}}},...over});
const done=n=>Object.fromEntries(Array.from({length:n},(_,i)=>[i+1,{status:'completed'}]));
test('Geen deadlines gemist: Op schema; alle 11 analyses open geeft één samenvattende regel',()=>{
 const model=showActions(show,base(),new Date('2026-10-01T12:00:00Z'));
 assert.equal(model.status,'on-track');assert.equal(model.label,'Op schema');
 assert.equal(model.items[0].title,'Nog meerdere openstaande analyses');assert.deepEqual(model.items[0].target,{tab:'showprofiel'});assert.equal(model.items[0].suffix,'');
});
test('Deadline gemist: Achter op schema; planning niet beschikbaar zonder datum',()=>{
 assert.equal(showActions(show,base(),now).status,'behind');
 assert.equal(showActions({...show,dates:[]},base(),now),null);
});
test('Maximaal drie openstaande onderdelen: losse regels met een diepe link per analyse',()=>{
 const analyses={...done(11)};delete analyses[2];delete analyses[7];
 const model=showActions(other,base({profile:{analyses,finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}}}),now);
 assert.deepEqual(model.items.map(item=>item.title),['Leeftijdsrange','Show karakter']);
 assert.deepEqual(model.items.map(item=>item.target),[{tab:'showprofiel',analysis:2},{tab:'showprofiel',analysis:7}]);
 assert.ok(model.items.every(item=>item.suffix==='nog te doen'));
 // Een vierde openstaand onderdeel (aantallen en herkomst) maakt er één samenvatting van.
 delete analyses[3];const four=showActions(other,base({profile:{analyses,finalization:{ticketsReady:false,categories:{visitors:{ready:false},artist:{ready:false}}}}}),now);
 assert.equal(four.items[0].title,'Nog meerdere openstaande analyses');
});
test('Aantallen en herkomst en de afrondingen zijn eigen onderdelen; verzenden alleen bij Gashouder met gereed profiel',()=>{
 const ready={ticketsReady:false,categories:{visitors:{ready:true,completedAt:null},artist:{ready:true,completedAt:null}}};
 const model=showActions(other,base({profile:{analyses:done(11),finalization:ready}}),now);
 assert.deepEqual(model.items.map(item=>item.title),['Aantallen en herkomst','Bezoekersanalyse afronden','Artiestanalyse afronden']);
 const final={ticketsReady:true,categories:{visitors:{ready:true,completedAt:'2026-11-01T10:00:00Z'},artist:{ready:true,completedAt:'2026-11-01T10:00:00Z'}}};
 const send=showActions(show,base({profile:{analyses:done(11),finalization:final},pdf:{state:'ready'}}),now);
 assert.deepEqual(send.items.filter(item=>item.id==='send').map(item=>item.target),[{tab:'overzicht',send:true}]);
 assert.equal(showActions(other,base({profile:{analyses:done(11),finalization:final},pdf:{state:'ready'}}),now).items.some(item=>item.id==='send'),false);
 assert.equal(showActions(show,base({profile:{analyses:done(11),finalization:final},pdf:{state:'ready'},profileSentAt:'2026-11-05T10:00:00Z'}),now).items.some(item=>item.id==='send'),false);
});
const review=(overrides={})=>({source:{revision:hash('a'),sha256:hash('b')},assessments:overrides});
const assessed=level=>({revision:1,riskLevel:level,riskNote:'Maatregel',completedAt:'2026-11-05T10:00:00Z'});
test('Risico’s volgen dezelfde logica: maximaal drie losse regels, daarboven één samenvatting',()=>{
 const profile={analyses:done(11),finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}};
 const risks=n=>({state:'ready',risks:Array.from({length:n},(_,i)=>({id:'R0'+(i+1),title:'Risico '+(i+1)})),operational:review({R01:assessed('low')}),production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true},floor:{completed:true}}});
 const few=showActions(show,base({profile,risks:risks(3)}),now);
 assert.deepEqual(few.items.map(item=>item.title),['Risico 2','Risico 3']);assert.deepEqual(few.items[0].target,{tab:'risicoanalyse',risk:'R02'});
 const many=showActions(show,base({profile,risks:risks(6)}),now);
 assert.equal(many.items.length,1);assert.equal(many.items[0].title,'Nog meerdere openstaande risico’s');assert.deepEqual(many.items[0].target,{tab:'risicoanalyse'});
 // Productionele beoordelingen en onbeantwoorde Ja/Nee-keuzes tellen mee; Entreeproces is NVT bij Gashouder.
 const production=showActions(show,base({profile,risks:{...risks(1),production:{choices:{escape_routes:true,fireworks:false,open_fire:false,lasers:false}},assessments:{barrier:{completed:false},floor:{completed:true}}}}),now);
 assert.deepEqual(production.items.map(item=>item.title),['Barrieropstelling','Drones']);assert.deepEqual(production.items[0].target,{tab:'risicoanalyse',production:'barrier_layout'});
});
test('Beheersmaatregelen: elke aangemaakte, nog niet afgeronde maatregel apart met "nog niet afgerond", zonder maximum per onderdeel',()=>{
 const profile={analyses:done(11),finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}};
 const risks={state:'ready',risks:[{id:'R01',title:'Eerste'}],operational:review({R01:{...assessed('high'),riskNote:'Extra toezicht plaatsen'}}),production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true,riskLevel:'medium',riskNote:'Hekken vergroten'},floor:{completed:true,riskLevel:'low'}}};
 const model=showActions(show,base({profile,risks}),now);
 const measures=model.items.filter(item=>item.id.startsWith('measure-'));
 assert.ok(measures.length>=1&&measures.every(item=>item.suffix==='nog niet afgerond'&&item.target.tab==='maatregelen'&&typeof item.target.measure==='string'));
});
test('Sortering op deadline en nooit meer dan drie to-do’s: eerst showprofiel, dan risico’s, dan maatregelen',()=>{
 const risks={state:'ready',risks:[{id:'R01',title:'A'},{id:'R02',title:'B'}],operational:review({}),production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true},floor:{completed:true}}};
 const model=showActions(other,base({profile:{analyses:{...done(11),4:{status:'draft'}},finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}},risks}),now);
 assert.deepEqual(model.items.map(item=>item.title),['Typische kenmerken','A','B']);assert.equal(model.total,3);
 const crowded=showActions(other,base({profile:{analyses:{...done(11),1:{status:'draft'},2:{status:'draft'},3:{status:'draft'}},finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}},risks}),now);
 assert.equal(crowded.items.length,3);assert.deepEqual(crowded.items.map(item=>item.id),['analysis-1','analysis-2','analysis-3']);assert.equal(crowded.total,5);
});
test('Afgerond: alles gedaan en alle beheersmaatregelen geïmplementeerd',()=>{
 const profile={analyses:done(11),finalization:{ticketsReady:true,categories:{visitors:{ready:true,completedAt:'x'},artist:{ready:true,completedAt:'x'}}}};
 const risks={state:'ready',risks:[],operational:review({}),production:{choices:{escape_routes:false,fireworks:false,open_fire:false,lasers:false,drones:false}},assessments:{barrier:{completed:true,riskLevel:'low'},floor:{completed:true,riskLevel:'low'}}};
 const model=showActions(show,{profileSentAt:'2026-11-05T10:00:00Z',profile,pdf:{state:'ready'},risks},now);
 assert.equal(model.status,'done');assert.equal(model.label,'Afgerond');assert.deepEqual(model.items,[]);
});
test('Diepe links: veilige parsing en één bestemming per link',()=>{
 assert.deepEqual(requestedShowTarget('?tab=showprofiel&analysis=3'),{tab:'showprofiel',analysis:3});
 assert.deepEqual(requestedShowTarget('?tab=showprofiel&tickets=1'),{tab:'showprofiel',tickets:true});
 assert.deepEqual(requestedShowTarget('?tab=showprofiel&finalize=artist'),{tab:'showprofiel',finalize:'artist'});
 assert.deepEqual(requestedShowTarget('?tab=risicoanalyse&risk=R07'),{tab:'risicoanalyse',risk:'R07'});
 assert.deepEqual(requestedShowTarget('?tab=risicoanalyse&production=barrier_layout'),{tab:'risicoanalyse',production:'barrier_layout'});
 assert.deepEqual(requestedShowTarget('?tab=maatregelen&measure=production:floor_pressure'),{tab:'maatregelen',measure:'production:floor_pressure'});
 assert.deepEqual(requestedShowTarget('?tab=maatregelen&measure=operational:'+'a'.repeat(64)+':R01'),{tab:'maatregelen',measure:'operational:'+'a'.repeat(64)+':R01'},'echt maatregel-id met bronhash');
 assert.deepEqual(requestedShowTarget('?tab=overzicht&send=1'),{tab:'overzicht',send:true});
 for(const bad of ['?tab=showprofiel&analysis=12','?tab=showprofiel&analysis=3&analysis=4','?tab=risicoanalyse&risk=../x','?tab=showprofiel&analysis=3&tickets=1','?tab=maatregelen&analysis=3','?tab=maatregelen&measure=a:b:c:d','?tab=maatregelen&measure=x%20y'])assert.deepEqual(requestedShowTarget(bad),{tab:requestedShowTarget(bad).tab},bad);
 assert.equal(requestedShowTarget('?analysis=3'),null);
 assert.equal(showTargetHref('A B/1',{tab:'showprofiel',analysis:3}),'/shows/A%20B%2F1?tab=showprofiel&analysis=3');
 assert.equal(showTargetHref('X',{tab:'maatregelen',measure:'production:floor_pressure'}),'/shows/X?tab=maatregelen&measure=production%3Afloor_pressure');
});

test('Planning-acties: per planningsstap gegroepeerd met status; geen acties geeft lege groepen',()=>{
 const analyses={...done(11)};delete analyses[2];delete analyses[7];
 const plan=showPlanActions(other,base({profile:{analyses,finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}}}),now);
 assert.equal(plan.status,'behind');assert.equal(plan.label,'Achter op schema');
 assert.deepEqual(plan.groups.profile.map(item=>item.title),['Leeftijdsrange','Show karakter']);assert.ok(plan.groups.profile.every(item=>item.group==='profile'&&item.overdue===true));
 assert.deepEqual(Object.keys(plan.groups),['profile','risks','measures']);
 // Zelfde bestemmingen als de losse actielijst; niets valt weg.
 const flat=showActions(other,base({profile:{analyses,finalization:{ticketsReady:true,categories:{visitors:{ready:false},artist:{ready:false}}}}}),now);
 for(const item of flat.items)assert.ok(Object.values(plan.groups).flat().some(entry=>entry.id===item.id&&JSON.stringify(entry.target)===JSON.stringify(item.target)));
 assert.equal(showPlanActions({...show,dates:[]},base(),now),null);
});
