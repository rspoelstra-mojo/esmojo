import {test} from 'node:test';import assert from 'node:assert/strict';
import {createMailingConcertsStore} from './ontrack-concerts.js';
import {MOJO_VENUES,canonicalVenueName,matchesMojoVenue} from './mojo-venues.js';
import {scrapeConcertCatalogue} from './shows-sync-api.js';
test('all ten requested venues share one fixed canonical scope and Ahoy variants normalize without another register',()=>{
 assert.equal(MOJO_VENUES.length,10);for(const label of ['AHOY Rotterdam','Rotterdam AHOY','Rotterdam Ahoy'])assert.equal(canonicalVenueName(label),'Rotterdam AHOY');
 assert.equal(matchesMojoVenue('Brabanthallen, Den Bosch',MOJO_VENUES.find(row=>row.id==='brabanthallen')),true);assert.equal(matchesMojoVenue('AFAS Stadion, Alkmaar',MOJO_VENUES.find(row=>row.id==='afas-stadion')),true);assert.equal(matchesMojoVenue('Malieveld, Den Haag',MOJO_VENUES.find(row=>row.id==='malieveld')),true);
});
test('mail concert choices read only the central native catalogue after current admin/Reports authorization',async()=>{
 let reads=0;const concerts=[{id:'native-guid',concertId:'retained-route',artist:'Synthetic'}],store=createMailingConcertsStore({profiles:async()=>({activated:true,disabled:false,role:'beheerder',modules:['reports']}),catalogue:{all:async()=>{reads++;return{concerts};}}});
 assert.deepEqual((await store('list','actor')).concerts,concerts);assert.equal(reads,1);await assert.rejects(store('sync','actor',{snapshot:{}}),/CATALOGUE_WRITE_FORBIDDEN/);assert.equal(reads,1);
 for(const profile of [{activated:false,role:'beheerder',modules:['reports']},{activated:true,role:'beheerder',modules:['artists']},{activated:true,role:'gebruiker',modules:['reports']}])await assert.rejects(createMailingConcertsStore({profiles:async()=>profile,catalogue:{all:async()=>{throw Error('must not read');}}})('list','actor'),/FORBIDDEN/);
});
test('one agenda import reads all ten venues with exactly 45 days and never publishes a partial fetch',async()=>{
 const calls=[],now=new Date('2026-11-15T04:00:00Z'),scrape=async options=>{calls.push(options);return{from:'2026-11-15',until:'2026-12-30',pages:1,concerts:[]};};const result=await scrapeConcertCatalogue({scrape,now});assert.equal(calls.length,10);assert.ok(calls.every(row=>row.days===45));assert.equal(result.pages,10);
 await assert.rejects(scrapeConcertCatalogue({now,scrape:async options=>{if(options.venue==='afas-stadion')throw Error('MOJO_UNAVAILABLE');return scrape(options);}}),/MOJO_UNAVAILABLE/);
});
