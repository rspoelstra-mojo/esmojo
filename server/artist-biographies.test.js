import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {biographyCandidates,createBiographyCapture,createInitialBiographyFill} from './artist-biographies.js';
import {parseMojoBiography,fetchMojoBiography} from './mojo-biography.js';
import {validArtistId,normalizeArtistName} from '../shared/artist-catalogue.js';
import {validTimetableDate,nextTimetableDate} from '../shared/show-timetable.js';
import {makeArtistBiographiesHandler} from '../api/artist-biographies-sync.js';
const hash=value=>createHash('sha256').update(value).digest('hex'),now=new Date('2026-11-08T12:00:00Z');
const row=(date,artist='Fixture act',venue='Gashouder')=>({artist,date,venue,sourceUrl:'https://www.mojo.nl/concerten/fixture'});
const text='Fixture act maakt al jarenlang energieke muziek voor een internationaal publiek. De muzikanten combineren verschillende stijlen en brengen hun herkenbare eigen geluid samen op het podium.';
const html=`<main><h1>Fixture act</h1><div class="rich-text"><p>${text}</p><p>Een tweede alinea over de geschiedenis van de artiest en de ontwikkeling van de muziek.</p></div><section><h2>Tijdschema</h2><p>Tickets en praktische informatie over Fixture act horen niet in de biografie van de artiest.</p></section></main>`;
test('45 Nederlandse kalenderdagen, eerste dag van aaneengesloten reeks, zes zalen, één opname per verschuldigde artiest',()=>{
 const concerts=[row('2026-11-07'),row('2026-11-08'),row('2026-11-09'),row('2026-12-23','Boundary act'),row('2026-12-24','Too far'),row('2026-11-20','Other venue','Unknown hall')];
 const result=biographyCandidates(concerts,{},now);assert.deepEqual(result.map(x=>x.name),['Boundary act']);
 const series=biographyCandidates([row('2026-11-09'),row('2026-11-10'),row('2026-12-15')],{},now);assert.equal(series.length,1);assert.equal(series[0].firstDate,'2026-12-15');
 const first=biographyCandidates([row('2026-11-09'),row('2026-11-10')],{},now)[0];assert.equal(first.lastDate,'2026-11-10');
 const across=biographyCandidates([row('2026-11-09'),row('2026-11-10','Fixture act','AFAS Live')],{},now)[0];assert.equal(across.firstDate,'2026-11-09');assert.equal(across.lastDate,'2026-11-10');
 assert.equal(biographyCandidates([row('2026-11-09')],{[first.artistId]:{firstDate:'2026-11-09'}},now).length,0);
 assert.equal(biographyCandidates([row('2026-11-09')],{[first.artistId]:{firstDate:'2026-12-15'}},now).length,0);
 assert.equal(biographyCandidates([row('2026-12-01')],{[first.artistId]:{firstDate:'2026-11-09'}},now).length,1);
});
test('Biografie neemt oorspronkelijke alinea’s over, geen tijdschema, tickets, HTML of tekst van een andere artiest',()=>{
 const parsed=parseMojoBiography(html,'Fixture act');assert.ok(parsed.startsWith(text+'\n\n'));assert.equal(parsed.includes('Tickets'),false);assert.equal(parsed.includes('<p>'),false);
 assert.throws(()=>parseMojoBiography(html,'Different artist'),/CONTEXT/);
 assert.throws(()=>parseMojoBiography('<main><h1>Fixture act</h1><p>Geen biografie.</p></main>','Fixture act'),/FORMAT/);
 const joint='<main><h1>Bloc Party &amp; Interpol</h1><div class="rich-text"><p>Bloc Party maakt al jaren eigenzinnige muziek. Hun concerten zijn bekend om de energie en de herkenbare gitaren.</p><p>Interpol brengt een eigen karakter en sound mee op het podium, gevormd door jaren van internationale optredens.</p></div></main>';
 assert.ok(parseMojoBiography(joint,'Bloc Party & Interpol').includes('Interpol brengt'));
});
test('Ophalen volgt uitsluitend begrensde MOJO-doorverwijzingen en behoudt bron en tekst',async()=>{
 let calls=0;const data=await fetchMojoBiography('Fixture act',{request:async url=>{calls++;return calls===1?new Response(null,{status:302,headers:{location:'/concerten/fixture'}}):new Response(html,{headers:{'Content-Type':'text/html'}});}});
 assert.equal(data.sourceUrl,'https://www.mojo.nl/concerten/fixture');assert.ok(data.text.startsWith(text));
 const query=await fetchMojoBiography('Fixture act',{request:async url=>url.includes('?date=')?new Response(html,{headers:{'Content-Type':'text/html'}}):new Response(null,{status:302,headers:{location:'/fixtureact?date=2026-11-20'}})});assert.equal(query.sourceUrl,'https://www.mojo.nl/fixtureact');
 let unsafe=0;await assert.rejects(fetchMojoBiography('Fixture act',{request:async()=>{unsafe++;return new Response(null,{status:302,headers:{location:'https://evil.invalid'}});}}),/REDIRECT/);assert.equal(unsafe,1);
});
function drive(){
 let contents=null,writes=0;const file={getBlob:()=>({getDataAsString:()=>contents}),setContent:body=>{contents=body;writes++;}};
 const root={createFile:blob=>{contents=blob.body;writes++;return file;}};
 class FixedDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now.getTime();}}
 const context=vm.createContext({Date:FixedDate,Set,Map,validArtistId,normalizeArtistName,validTimetableDate,nextTimetableDate,ESMOJO_FOLDER_ID:'fixed-root',DriveApp:{getFolderById:id=>{assert.equal(id,'fixed-root');return root;}},esmojoShowFile_:()=>contents?file:null,esmojoOnTrackHash_:hash,esmojoPublicArtistCatalogue_:()=>({artists:[{id:'a_'+hash(normalizeArtistName('Fixture act')),name:'Fixture act'}]}),esmojoTimetableCatalogue_:()=>new Map([['one',row('2026-11-20')],['two',row('2026-11-21')]]),Utilities:{formatDate:()=> '2026-11-08',newBlob:(body,type,name)=>({body,type,name,getBytes:()=>Buffer.from(body)})}});
 vm.runInContext(readFileSync('google-apps-script/ArtistBiographies.gs','utf8'),context);
 const series=biographyCandidates([row('2026-11-20'),row('2026-11-21')],{},now)[0],{sourceUrl,...identity}=series;
 const request={operation:'biography-save',series:identity,biography:{text,sourceUrl:'https://www.mojo.nl/fixtureact',capturedAt:now.toISOString()}};
 return{read:()=>context.esmojoArtistBiography_([series.artistId]),save:body=>context.esmojoArtistBiographies_(body||request),request,writes:()=>writes,contents:()=>contents};
}
test('Drive bewaart de laatste goede tekst, weigert losse latere reeksdag en overschrijft niet bij een herhaling of ongeldige tekst',()=>{
 const d=drive();assert.equal(d.read(),null);assert.equal(d.save().saved,true);assert.equal(d.read().text,text);assert.equal(d.writes(),1);assert.equal(d.save().unchanged,true);assert.equal(d.writes(),1);
 const saved=d.contents();assert.throws(()=>d.save({...d.request,biography:{...d.request.biography,text:''}}),/VALIDATION/);assert.equal(d.contents(),saved);
 const s={...d.request.series,firstDate:'2026-11-21'};s.seriesKey=hash(s.artistId+'\n'+s.venue+'\n'+s.firstDate);assert.throws(()=>d.save({...d.request,series:s}),/VALIDATION/);
 assert.throws(()=>d.save({...d.request,biography:{...d.request.biography,sourceUrl:'https://evil.invalid/text'}}),/VALIDATION/);assert.equal(d.contents(),saved);
});
test('Capture verandert niets bij verdwenen tekst, slaat geldige openbare tekst op en retourneert alleen samenvatting',async()=>{
 let writes=0;const store=async(op,payload)=>{if(op==='biography-candidates')return{concerts:[row('2026-11-20')],saved:{}};writes++;assert.ok(payload.biography.text);return{saved:true};};
 const failed=await createBiographyCapture({store,now:()=>now,fetchBiography:async()=>{throw Error('MOJO_BIOGRAPHY_HTTP');}})();assert.equal(writes,0);assert.equal(failed.failed.length,1);
 const good=await createBiographyCapture({store,now:()=>now,fetchBiography:async()=>({text,sourceUrl:'https://www.mojo.nl/fixtureact'})})();assert.equal(writes,1);assert.equal(good.captured,1);assert.equal(JSON.stringify(good).includes(text),false);
});
test('Worker vereist eigen main-identiteit en weigert vrije URLs/velden; browser kan niet schrijven',async()=>{
 let calls=0;const handler=makeArtistBiographiesHandler({identify:async token=>{if(token!=='trusted')throw Error();},capture:async()=>{calls++;return{ok:true};}}),response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
 for(const req of [{method:'GET',headers:{}},{method:'POST',headers:{}},{method:'POST',headers:{authorization:'Bearer trusted'},body:{url:'https://evil.invalid'}}]){const res=response();await handler(req,res);assert.ok([400,403,405].includes(res.code));}assert.equal(calls,0);
 const res=response();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{}},res);assert.equal(res.code,200);assert.equal(calls,1);
 const probe=response();await handler({method:'POST',headers:{authorization:'Bearer trusted'},body:{checkOnly:true}},probe);assert.equal(probe.data.workerVersion,4);assert.equal(calls,1);
});

test('Eenmalige Nederlandse aanvulling bewaart herkomst en oorspronkelijke MOJO-tekst blijft leidend',()=>{
 const d=drive(),text=Array.from({length:65},(_,i)=>'woord'+i).join(' '),id='a_'+hash(normalizeArtistName('Fixture act'));
 assert.throws(()=>d.save({operation:'biography-initial-save',artistId:id,name:'Fixture act',text:'te kort'}),/VALIDATION/);
 assert.equal(d.save({operation:'biography-initial-save',artistId:id,name:'Fixture act',text}).saved,true);
 assert.equal(d.read().origin,'editorial-ai-nl-v1');assert.equal(d.read().sourceUrl,null);
 assert.equal(d.save({operation:'biography-initial-save',artistId:id,name:'Fixture act',text}).unchanged,true);assert.equal(d.writes(),1);
 assert.equal(d.save().saved,true);assert.equal(d.read().sourceUrl,'https://www.mojo.nl/fixtureact');assert.notEqual(d.read().text,text);
 assert.equal(d.save({operation:'biography-initial-save',artistId:id,name:'Fixture act',text}).unchanged,true);
});
test('Initiële aanvulling is begrensd en stuurt uitsluitend bekende ontbrekende artiesten naar Drive',async()=>{
 const artists=Array.from({length:8},(_,i)=>({id:'a_'+hash('artist'+i),name:'Artist '+i})),calls=[];
 const fill=createInitialBiographyFill({store:async(op,payload)=>{calls.push([op,payload]);return op==='biography-initial-list'?{artists}:{saved:payload.entries.length,unchanged:0};},descriptions:Object.fromEntries(artists.slice(0,7).map(x=>[x.name,'Nederlandse tekst']))});
 const result=await fill();assert.equal(result.saved,6);assert.equal(result.more,true);assert.deepEqual(result.missing,['Artist 7']);assert.equal(calls.length,2);assert.equal(calls[1][1].entries.length,6);
});

test('Eenmalige redactionele catalogus bevat complete Nederlandse teksten binnen het Drive-woordlimiet',async()=>{
 const {initialDescriptions}=await import('./artist-initial-descriptions.js');
 assert.equal(Object.keys(initialDescriptions).length,223);
 for(const [name,text]of Object.entries(initialDescriptions)){
  assert.ok(name.trim());assert.equal(typeof text,'string');
  assert.ok(text.split(/\s+/).length>=60&&text.split(/\s+/).length<=70,name);
  assert.ok(!/[\x00-\x1f<>]/.test(text),name);assert.ok(/[.!?]$/.test(text),name);
 }
 assert.ok(initialDescriptions['Numidia - Muziekfeest van het Jaar'].includes('Numidia'));
});

test('Drive-batch valideert alles vóór schrijven en herhaling verandert geen bestaande tekst',()=>{
 const d=drive(),entry={artistId:'a_'+hash(normalizeArtistName('Fixture act')),name:'Fixture act',text:Array(65).fill('woord').join(' ')},request={operation:'biography-initial-batch',entries:[entry]};
 assert.throws(()=>d.save({...request,entries:[entry,{...entry,artistId:'a_'+hash('unknown')}]}),/VALIDATION/);assert.equal(d.writes(),0);
 assert.throws(()=>d.save({...request,entries:[entry,entry]}),/VALIDATION/);assert.equal(d.writes(),0);
 assert.equal(d.save(request).saved,1);assert.equal(d.writes(),1);assert.equal(d.save(request).saved,0);assert.equal(d.writes(),1);
 assert.equal(d.save().saved,true);assert.equal(d.save(request).saved,0);assert.equal(d.read().sourceUrl,'https://www.mojo.nl/fixtureact');
});
