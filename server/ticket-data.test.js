import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseVisitorOrigins, parseDomesticOrigins, parseTicketSales, validSaleCount, ticketSalesMatch, normalizedTicketSales, saleShows, matchingSuggestions, validTicketContent } from '../shared/ticket-data.js';
import { validateTicketRequest } from './ticket-data.js';
const foreign={netherlands:'99,3',foreign:[{country:'België',percentage:'0,5'},{country:'Zwitserland',percentage:'0,1'},{country:'Verenigd Koninkrijk',percentage:'0,1'}]};
const domestic=[{province:'Noord-Holland',percentage:'29,1'},{province:'Zuid-Holland',percentage:'17,4'},{province:'Gelderland',percentage:'11,7'}];
const valid=value=>parseVisitorOrigins(JSON.stringify(value));
test('Aangeleverde procentregels behouden komma/punt, handmatig Nederland en onvolledige som',()=>{
 assert.deepEqual(valid(foreign),foreign);assert.equal(valid({...foreign,netherlands:'99.3'}).netherlands,'99.3');
 assert.ok(valid({...foreign,netherlands:'90',foreign:foreign.foreign.map((r,i)=>({...r,percentage:['3','2','1'][i]}))}));
 for(const percentage of ['-1','100,01','1,111','1e2','0,','1%',' 1','.5'])assert.equal(valid({...foreign,netherlands:percentage}),null);
 assert.equal(valid({...foreign,netherlands:'99,31'}),null);
 for(const country of [' Nederland ','NL','netherlands','BELGIË','<test>','a\n'])assert.equal(valid({...foreign,foreign:foreign.foreign.map((r,i)=>i===1?{...r,country}:r)}),null);
 assert.ok(valid({...foreign,foreign:foreign.foreign.map((r,i)=>i===0?{...r,country:'Vrij geldig land'}:r)}));
 assert.ok(valid({...foreign,foreign:foreign.foreign.map((r,i)=>i===1?{...r,country:'Belgie'}:r)}));
 assert.deepEqual(parseDomesticOrigins(JSON.stringify(domestic)),domestic);
 for(const province of ['Holland','noord-holland','Gelderland'])assert.equal(parseDomesticOrigins(JSON.stringify(domestic.map((r,i)=>i===0?{...r,province}:r))),null);
 assert.equal(parseDomesticOrigins(JSON.stringify(domestic.map(r=>({...r,percentage:'34'})))),null);
});
test('Verkoopstanden blijven per echte show, maximaal vijf, zonder verborgen totalen',()=>{
 const shows=saleShows({shows:[{date:'2026-11-08',time:'20:00'},{date:'2026-11-06',time:'20:00'},{date:'2026-11-07',time:'20:00'},{date:'2026-11-06',time:'20:00'}]});
 const rows=shows.map((r,i)=>({...r,count:['003327','3438','3373'][i]}));const content=JSON.stringify(rows);
 assert.ok(ticketSalesMatch(content,shows));assert.equal(ticketSalesMatch('3327',shows),false);assert.equal(parseTicketSales(JSON.stringify([rows[0],rows[0]])),null);
 assert.deepEqual(JSON.parse(normalizedTicketSales(content,shows)).map(r=>r.count),['3327','3438','3373']);
 for(const count of ['-1','1.0','1 000','1.000','1e3','1234567890'])assert.equal(validSaleCount(count),false);
 assert.ok(validSaleCount('0'));assert.equal(normalizedTicketSales('000',[shows[0]]),'0');
 assert.equal(parseTicketSales(JSON.stringify([{date:'2026-02-30',time:'20:00',count:'1'}])),null);
 assert.equal(validTicketContent('ticket_sales','1',Array.from({length:6},()=>shows[0])),false);
});
test('Zoeken is accentongevoelig substring, behoudt lijstvolgorde, geen membership voor landen',()=>{
 assert.deepEqual(matchingSuggestions(['België','Belarus'],'belgie'),['België']);
 assert.deepEqual(matchingSuggestions(['Noord-Holland','Zuid-Holland'],'holland'),['Noord-Holland','Zuid-Holland']);
 assert.deepEqual(matchingSuggestions(['België','Duitsland'],''),['België','Duitsland']);
});
test('API accepteert geen actor, vrij pad, ontbrekende reservering of extra velden; GAS gebruikt dezelfde parsers',()=>{
 const input={operation:'review',concertId:'Test_Gashouder_01112026',field:'ticket_sales',token:'a'.repeat(36),expectedVersion:0,content:'1'};
 assert.equal(validateTicketRequest(input).operation,'ticket-review');
 for(const change of [{actor:'fake'},{concertId:'../account'},{field:'gender'},{token:''},{content:'a'.repeat(3201)},{expectedVersion:-1}])assert.throws(()=>validateTicketRequest({...input,...change}),/VALIDATION/);
 assert.equal(readFileSync(new URL('../google-apps-script/TicketValidators.gs',import.meta.url),'utf8'),'// Gegenereerd uit shared/ticket-data.js: alleen export-keywords verwijderd.\n'+readFileSync(new URL('../shared/ticket-data.js',import.meta.url),'utf8').replaceAll('export ',''));
});
