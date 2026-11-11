import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDataverseResearch} from './dataverse-research.js';
import {dataversePilot as pilot,pilotShow} from '../shared/dataverse-pilot.js';
import {upcomingShows} from './mojo-agenda.js';
import {cleanMenu} from '../src/lib/show-menu-cache.js';
const env={DATAVERSE_TEST_TENANT_ID:'11111111-1111-4111-8111-111111111111',DATAVERSE_TEST_CLIENT_ID:'22222222-2222-4222-8222-222222222222',DATAVERSE_TEST_CLIENT_SECRET:'synthetic-secret',DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com'};
const row=(n,version='1.0')=>({esmojo_showsleutel:pilot.sourceKey,esmojo_vraagnummer:n,esmojo_markdowninhoud:'# Samenvatting\n\nSynthetische tekst '+n,esmojo_bronbibliotheekid:pilot.libraryId,esmojo_bronbestanditemnummer:n,esmojo_bronversie:version,esmojo_bronbestandpad:'Shared Documents/General/NIEUWE_SHOW_RESULTAAT/'+pilot.sourceKey+'/test_'+n+'.md',createdon:'2026-11-11T10:00:00Z'});
function setup(rows=Array.from({length:11},(_,i)=>row(i+1)),extra={}){
 const calls=[];const service=createDataverseResearch({env,request:async(url,options)=>{
  calls.push({url,options});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  if(url.includes('/oauth2/'))return Response.json({token_type:'Bearer',access_token:'synthetic-access',expires_in:3600});
  assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer synthetic-access');
  if(url.includes('EntityDefinitions'))return Response.json({LogicalName:'esmojo_onderzoeksresultaat',EntitySetName:'esmojo_onderzoeksresultaats'});
  return extra.response?extra.response(calls):Response.json({value:rows});
 }});return{service,calls};
}
test('Exacte testshow, alle elf AI-concepten in één query, geen verzonnen onderzoeksdatum',async()=>{
 const {service,calls}=setup();assert.equal(await service.load('Andere_AFAS-Live_15112026'),null);assert.equal(calls.length,0);
 const result=await service.load(pilot.concertId);assert.equal(Object.keys(result.researchByNumber).length,11);assert.deepEqual(result.researchErrors,{});
 assert.equal(result.researchByNumber[1].status,'ai-concept');assert.equal(result.researchByNumber[1].source,'dataverse');assert.equal(result.researchByNumber[1].researchedAt,undefined);
 const query=new URL(calls[2].url);assert.match(query.searchParams.get('$filter'),/esmojo_bronbibliotheekid eq/);assert.equal(calls.length,3);
 await service.load(pilot.concertId);assert.equal(calls.length,4,'Inhoud opnieuw lezen, token/schema tijdelijk hergebruiken');
 const profile={revision:9,analyses:{1:{summary:'Eigen beoordeling',status:'completed'}},finalization:{unchanged:true},researchByNumber:{1:{answer:'Oud'}}};
 const merged=service.merge(profile,result,1);assert.equal(merged.analyses,profile.analyses);assert.equal(merged.finalization,profile.finalization);assert.equal(merged.revision,9);assert.equal(merged.research.answer,row(1).esmojo_markdowninhoud);assert.equal(profile.researchByNumber[1].answer,'Oud');
});
test('Bronversies worden numeriek vergeleken en ontbrekende onderwerpen blijven zichtbaar',async()=>{
 const {service}=setup([row(1,'1.9'),{...row(1,'1.10'),esmojo_markdowninhoud:'Nieuw'},row(2,'2.0')]);
 const result=await service.load(pilot.concertId);assert.equal(result.researchByNumber[1].answer,'Nieuw');assert.equal(result.researchByNumber[2].sourceVersion,'2.0');assert.ok(result.researchErrors[3]);
});
test('Geïmporteerde randspaties herstellen alle elf vragen; andere shows blijven uitgesloten',async()=>{
 const rows=Array.from({length:11},(_,i)=>({...row(i+1),esmojo_showsleutel:'\t '+pilot.sourceKey+'\r\n'}));
 rows.push({...row(1),esmojo_showsleutel:pilot.sourceKey+'_andere_show',esmojo_markdowninhoud:'Niet koppelen'});
 rows.push({...row(1),esmojo_showsleutel:'voorvoegsel_'+pilot.sourceKey,esmojo_markdowninhoud:'Niet koppelen'});
 const {service,calls}=setup(rows),result=await service.load(pilot.concertId);
 assert.equal(Object.keys(result.researchByNumber).length,11);assert.deepEqual(result.researchErrors,{});assert.doesNotMatch(JSON.stringify(result),/Niet koppelen/);
 assert.ok(new URL(calls.at(-1).url).searchParams.get('$filter').includes(`contains(esmojo_showsleutel,'${pilot.sourceKey}')`));
 assert.equal(rows[0].esmojo_showsleutel,'\t '+pilot.sourceKey+'\r\n','Brondata niet wijzigen');
});
test('Dubbele vraagnummers uit verschillende bestanden zijn ambigu, geen willekeurige selectie',async()=>{
 for(const rows of [[row(1),{...row(1),esmojo_bronbestanditemnummer:22}],[row(1),row(1)]]){
  const {service}=setup(rows);const result=await service.load(pilot.concertId);assert.deepEqual(result.researchByNumber,{});assert.equal(Object.keys(result.researchErrors).length,11);
 }
});
test('Ongeldige inhoud, bron of versie wordt niet als betrouwbaar onderzoek doorgegeven',async()=>{
 for(const patch of [{esmojo_showsleutel:'andere_show'},{esmojo_bronbibliotheekid:'ander'},{esmojo_vraagnummer:12},{esmojo_markdowninhoud:''},{esmojo_bronversie:'onbekend'},{esmojo_bronbestandpad:'Shared Documents/General/SHOWPROFIELEN_RESULTAAT/test.md'},{createdon:'ongeldig'}]){
  const {service}=setup([{...row(1),...patch}]);assert.deepEqual((await service.load(pilot.concertId)).researchByNumber,{});
 }
});
test('Providerfouten en verkeerd ingestelde credentials lekken geen details; geen Drive-terugval',async()=>{
 const {service}=setup([],{response:()=>new Response('private provider details',{status:403})});const result=await service.load(pilot.concertId);assert.equal(Object.keys(result.researchErrors).length,11);assert.doesNotMatch(JSON.stringify(result),/private provider|synthetic-secret|synthetic-access/);
 const missing=createDataverseResearch({env:{},request:()=>assert.fail('Geen netwerk zonder configuratie')});assert.equal(Object.keys((await missing.load(pilot.concertId)).researchErrors).length,11);
});
test('Paginering blijft op de vaste Dataverse-tabel; geen token naar externe host',async()=>{
 const {service,calls}=setup([],{response:()=>Response.json({value:[row(1)],'@odata.nextLink':'https://evil.invalid/token'})});assert.deepEqual((await service.load(pilot.concertId)).researchByNumber,{});assert.equal(calls.length,3);
 let page=0;const good=setup([],{response:()=>Response.json(++page===1?{value:[row(1)],'@odata.nextLink':env.DATAVERSE_TEST_URL+'/api/data/v9.2/esmojo_onderzoeksresultaats?$skiptoken=next'}:{value:[row(2)]})});assert.equal(Object.keys((await good.service.load(pilot.concertId)).researchByNumber).length,2);
});
test('Menu toont alleen de exacte AFAS Live-uitzondering naast bestaande Gashouder-shows',()=>{
 const shows=upcomingShows([pilot,{...pilot,concertId:'Andere_AFAS-Live_15112026',artist:'Andere'}],new Date('2026-11-11T12:00:00Z'));assert.equal(shows.length,1);assert.equal(shows[0].venue,'AFAS Live');assert.equal(cleanMenu(shows).length,1);
 assert.throws(()=>cleanMenu([{...pilotShow(),key:'Ander'}]),/MENU_FORMAT/);
});
test('Bewuste diagnose onderscheidt lege tabel, bronverschil en randspaties zonder bronwaarden terug te geven',async()=>{
 for(const [rows,code]of [[[],'RESEARCH_NO_VISIBLE_ROWS'],[[row(1)],'RESEARCH_MATCH_FOUND'],[[{...row(1),esmojo_showsleutel:'ander'}],'RESEARCH_KEYS_DIFFER'],[[{...row(1),esmojo_showsleutel:'\t'+pilot.sourceKey}],'RESEARCH_WHITESPACE']]){
  const {service,calls}=setup(rows);const result=await service.diagnose();assert.equal(result.code,code);assert.equal(result.tableRead,true);
  assert.doesNotMatch(JSON.stringify(result),/Synthetische tekst|synthetic-secret|synthetic-access|ander/);
  assert.equal(new URL(calls.at(-1).url).searchParams.get('$select'),'esmojo_showsleutel,esmojo_bronbibliotheekid');
 }
});
