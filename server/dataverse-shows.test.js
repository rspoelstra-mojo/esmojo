import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDataverseShows,researchShow} from './dataverse-shows.js';
import {createDataverseResearch} from './dataverse-research.js';
import {dataversePilot} from '../shared/dataverse-pilot.js';
import {researchKeyForId,parseResearchKey} from '../shared/dataverse-shows.js';
import {visibleMenu} from '../src/lib/show-menu-cache.js';
const west='westlife_ziggodome_20261123',key='dataverse_'+west;
test('Westlife en Hatsune Miku krijgen onafhankelijke, stabiele showreferenties',()=>{
 const row=researchShow(west);assert.equal(row.name,'Westlife');assert.equal(row.venue,'Ziggo Dome');assert.equal(row.city,'Amsterdam');assert.deepEqual(row.dates,['2026-11-23']);assert.equal(row.key,key);assert.equal(researchKeyForId(key),west);
 assert.equal(researchShow(dataversePilot.sourceKey).key,dataversePilot.concertId);
 assert.equal(parseResearchKey('test_afaslive_20260230'),null);assert.equal(parseResearchKey('../test_afaslive_20261115'),null);
 assert.equal(researchKeyForId('Westlife_Ziggo-Dome_23112026'),west);
});
test('Betrouwbare catalogusnamen behouden spaties/casing; botsingen geven geen willekeurige identiteit',()=>{
 const source='thekidlaroi_afaslive_20270101',official={artist:'The Kid LAROI',venue:'AFAS Live',city:'Amsterdam',date:'2027-01-01'};
 assert.equal(researchShow(source,[official]).name,'The Kid LAROI');
 assert.throws(()=>researchShow(source,[official,{...official,artist:'The Kid La Roi'}]),/AMBIGUOUS/);
 const unknown=researchShow('voorbeeld_onbekendezaal_20270101');assert.equal(unknown.city,'');assert.equal(unknown.venue,'onbekendezaal');
});
function harness(){
 const calls=[];let keys=[dataversePilot.sourceKey];
 const research={configured:()=>true,sourceKeys:async()=>keys};
 const raw=async(op,input={})=>{calls.push([op,input]);if(op==='list')return{concerts:[{artist:'Bestaand',venue:'Gashouder',city:'Amsterdam',date:'2026-11-20'}],checkedAt:'2026-11-12T10:00:00Z'};if(op==='research-identities')return{concerts:[{artist:'Westlife',venue:'Ziggo Dome',city:'Amsterdam',date:'2026-11-23'},{artist:'Niet ontsluiten',venue:'AFAS Live',date:'2026-11-30'}]};if(op==='dataverse-ensure')return{concertId:input.show.key};return{operation:op,concertId:input.concertId};};
 return{service:createDataverseShows({shows:raw,research}),calls,setKeys:value=>{keys=value;}};
}
test('Nieuwe show verschijnt bij volgende menuread; geen volledige MOJO-zalen of onderzoektekst in menu',async()=>{
 const h=harness();assert.equal((await h.service('list')).dataverseShows.length,1);
 h.setKeys([dataversePilot.sourceKey,west]);const result=await h.service('list');assert.equal(result.dataverseShows.length,2);assert.equal(result.concerts[0].venue,'Gashouder');
 assert.ok(!result.dataverseShows.some(row=>row.name==='Niet ontsluiten'));assert.equal(h.calls.some(([op])=>op==='dataverse-ensure'),false,'Menulezen maakt geen showbestanden');
 const data=await h.service('home-metadata',{concertId:key});assert.equal(data.show.name,'Westlife');
 const opened=await h.service('show-open',{concertId:key,actor:'fixture'});assert.equal(opened.concertId,key);
 await h.service('profile-save',{concertId:key,summary:'Eigen tekst'});assert.equal(h.calls.filter(([op])=>op==='dataverse-ensure').length,1);
});
test('Een niet-geïmporteerde show krijgt geen nieuwe pagina of schrijfbestemming',async()=>{
 const h=harness();await assert.rejects(h.service('show-open',{concertId:key}),/NOT_FOUND/);assert.equal(h.calls.some(([op])=>op==='dataverse-ensure'),false);
});
test('Discovery ondersteunt ook500 volgende shows, zonder artiesten- of zalenallowlist',async()=>{
 const h=harness(),keys=Array.from({length:500},(_,i)=>`voorbeeld${i}_eigenzaal_20270101`);h.setKeys(keys);
 const listed=await h.service('list');assert.equal(listed.dataverseShows.length,500);assert.equal(new Set(listed.dataverseShows.map(show=>show.key)).size,500);
 const selected=listed.dataverseShows[499];assert.equal(selected.venue,'eigenzaal');assert.equal(selected.city,'');
 assert.equal((await h.service('home-metadata',{concertId:selected.key})).show.key,selected.key);
});
test('Dataverse-pagina blijft oplosbaar; submenu toont uitsluitend de komende45 dagen',()=>{
 const row=researchShow(west);const menu=visibleMenu([row,{key:'Oud_Gashouder_01012020',name:'Oud',venue:'Gashouder',city:'Amsterdam',dates:['2020-01-01']}],new Date('2027-01-01T12:00:00Z'));
 assert.equal(menu.length,0);assert.equal(researchKeyForId(row.key),west);
 const outside={...row,key:'dataverse_test_ziggodome_20261227',dates:['2026-12-27']};assert.equal(visibleMenu([outside],new Date('2026-11-12T12:00Z')).length,0);
});
test('Broncatalogus gebruikt alleen gegroepeerde metadata; twee shows lezen nooit elkaars onderzoek',async()=>{
 const env={DATAVERSE_TEST_TENANT_ID:'11111111-1111-4111-8111-111111111111',DATAVERSE_TEST_CLIENT_ID:'22222222-2222-4222-8222-222222222222',DATAVERSE_TEST_CLIENT_SECRET:'synthetic',DATAVERSE_TEST_URL:'https://org5bab852a.crm.dynamics.com'};
 const requests=[],research=createDataverseResearch({env,request:async(url,options)=>{
  requests.push([url,options]);if(url.includes('oauth2'))return Response.json({access_token:'synthetic',token_type:'Bearer',expires_in:3600});if(url.includes('EntityDefinitions'))return Response.json({LogicalName:'esmojo_onderzoeksresultaat',EntitySetName:'esmojo_onderzoeksresultaats'});
  const params=new URL(url).searchParams;
  if(params.has('fetchXml')){assert.ok(!params.get('fetchXml').includes('markdown'));assert.equal(options.headers.Prefer,'odata.maxpagesize=5000');return Response.json({value:[{showKey:west},{showKey:' '+west+'\n'},{showKey:dataversePilot.sourceKey}]});}
  const source=params.get('$filter').includes(west)?west:dataversePilot.sourceKey;
  return Response.json({value:Array.from({length:11},(_,i)=>({esmojo_showsleutel:source,esmojo_vraagnummer:i+1,esmojo_bronbibliotheekid:dataversePilot.libraryId,esmojo_bronbestanditemnummer:i+1,esmojo_bronversie:'1.0',esmojo_markdowninhoud:source+' '+(i+1),esmojo_bronbestandpad:'Shared Documents/General/NIEUWE_SHOW_RESULTAAT/'+source+'/test.md',createdon:'2026-11-12T10:00:00Z',esmojo_opruimstatus:158610002}))});
 }});
 assert.equal((await research.sourceKeys()).length,2);
 const first=await research.load(key),second=await research.load(dataversePilot.concertId);assert.equal(Object.keys(first.researchByNumber).length,11);assert.match(first.researchByNumber[1].answer,/westlife/);assert.match(second.researchByNumber[1].answer,/hatsune/);
 assert.equal(requests.filter(([url])=>url.includes('oauth2')).length,1);
});
