import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showInformation,scoreHue} from './show-information.js';
const show={venue:'Gashouder',dates:['2026-11-27']};
test('Zonder gegevens: risico’s 0 en de rest onbekend',()=>{
 assert.deepEqual(showInformation(show,{}),{risks:{low:0,medium:0,high:0},scores:{visitors:null,artist:null},soldTickets:null,soldDays:null,gender:null,ageRange:null});
});
test('Eindcijfers tellen pas na afronden; ongeldige cijfers worden genegeerd',()=>{
 const info=showInformation(show,{finalization:{categories:{visitors:{completedAt:'2026-11-10T10:00:00Z',score:7},artist:{completedAt:null,score:9}}}});
 assert.deepEqual(info.scores,{visitors:7,artist:null});
 assert.equal(showInformation(show,{finalization:{categories:{visitors:{completedAt:'x',score:11}}}}).scores.visitors,null);
});
test('Verkochte kaarten: één dag als getal, meerdere dagen als totaal',()=>{
 assert.equal(showInformation(show,{ticketSales:'4200'}).soldTickets,4200);
 const multi=JSON.stringify([{date:'2026-11-27',time:'20:00',count:'1000'},{date:'2026-11-28',time:'20:00',count:'2500'}]);
 const info=showInformation(show,{ticketSales:multi});assert.equal(info.soldTickets,3500);assert.equal(info.soldDays,2);
 assert.equal(showInformation(show,{ticketSales:'onzin'}).soldTickets,null);
});
test('Man/vrouw verhouding en leeftijdsrange komen uit de showprofiel-samenvattingen',()=>{
 const info=showInformation(show,{analyses:{1:{summary:' 55% vrouw, 45% man '},2:{summary:''}}});
 assert.equal(info.gender,'55% vrouw, 45% man');assert.equal(info.ageRange,null);
});
test('Risico’s tellen de ESM-beoordelingen per klasse',()=>{
 const risks={state:'ready',risks:[{id:'R01'},{id:'R02'},{id:'R03'},{id:'R04'}],operational:{assessments:{R01:{riskLevel:'low'},R02:{riskLevel:'medium'},R03:{riskLevel:'high'},R04:{riskLevel:'high'}}},production:{choices:{}},assessments:{}};
 const info=showInformation(show,{risks});
 assert.deepEqual(info.risks,{low:1,medium:1,high:2});
});
test('Score 1 is groen, 10 is rood en ongeldige cijfers hebben geen tint',()=>{
 assert.equal(scoreHue(1),140);assert.equal(scoreHue(5),30);assert.equal(scoreHue(10),0);
 assert.ok(scoreHue(3)>scoreHue(4)&&scoreHue(7)>scoreHue(8));
 for(const bad of [0,11,null,undefined,'7',5.5])assert.equal(scoreHue(bad),null);
});
