import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeShowState} from './state.js';import {createStaffPlanning} from './staff-planning.js';import {nativeFixture,samplePeople,sampleSource} from './test-fixture.js';
const env={GOOGLE_DRIVE_SHARED_SECRET:'synthetic-native-state-secret-1234567890'};
function fixture(at='2026-11-17T04:00:00Z'){
 const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env,repository:db.repo,connection:db.connection});let clock=new Date(at);
 const staff=createStaffPlanning({env,repo:state.repo,now:()=>clock});return{...db,state,staff,set:value=>{clock=new Date(value);}};
}
const day=(date,n)=>({concertId:'Artiest_'+n+'_'+date,artist:'Artiest '+n,date,sourceUrl:'https://www.mojo.nl/concerten/artiest-'+n});
const body=(venue,concerts,from='2026-11-17',until='2027-11-17')=>({venue,from,until,concerts});
test('de lijst voor 365 dagen wordt per zaal en maand opgeslagen; alleen gewijzigde maanden worden herschreven',async()=>{
 const f=fixture(),list=[day('2026-12-05',1),day('2026-12-20',2),day('2027-02-01',3)];
 assert.deepEqual(await f.staff.handle('staff-planning-store',body('gashouder',list)),{venue:'gashouder',concerts:3,saved:2,unchanged:0});
 assert.deepEqual(await f.staff.handle('staff-planning-store',body('gashouder',list)),{venue:'gashouder',concerts:3,saved:0,unchanged:2},'ongewijzigd: geen writes');
 assert.deepEqual(await f.staff.handle('staff-planning-store',body('ziggo-dome',[day('2026-12-01',4)])),{venue:'ziggo-dome',concerts:1,saved:1,unchanged:0});
 const read=await f.staff.handle('staff-planning-read');
 assert.deepEqual(read.concerts.map(row=>[row.date,row.venue,row.artist]),[['2026-12-01','Ziggo Dome','Artiest 4'],['2026-12-05','Gashouder','Artiest 1'],['2026-12-20','Gashouder','Artiest 1'.replace('1','2')],['2027-02-01','Gashouder','Artiest 3']]);
 // Een verdwenen concert verdwijnt uit de lijst, ook als zijn maand daarmee leeg wordt.
 await f.staff.handle('staff-planning-store',body('gashouder',[day('2026-12-05',1),day('2026-12-20',2)]));
 assert.equal((await f.staff.handle('staff-planning-read')).concerts.some(row=>row.artist==='Artiest 3'),false);
 // Buiten het venster van 365 dagen en in het verleden wordt niet getoond.
 f.set('2027-12-01T04:00:00Z');assert.deepEqual((await f.staff.handle('staff-planning-read')).concerts,[]);
});
test('dezelfde bron-URL’s als de bestaande catalogus: de agenda-terugval en queryparameters zijn geldig',async()=>{
 const f=fixture();
 const rows=[{...day('2026-12-05',1),sourceUrl:'https://www.mojo.nl/agenda'},{...day('2026-12-06',2),sourceUrl:'https://www.mojo.nl/concerten/artiest-2?ref=agenda'},{...day('2026-12-07',3),sourceUrl:'https://www.mojo.nl/agenda?query=Ziggo%20Dome'}];
 assert.deepEqual(await f.staff.handle('staff-planning-store',body('ziggo-dome',rows)),{venue:'ziggo-dome',concerts:3,saved:1,unchanged:0});
 await assert.rejects(f.staff.handle('staff-planning-store',body('ziggo-dome',[{...rows[0],sourceUrl:'https://www.mojo.nl.evil.example/agenda'}])),/STAFF_BAD_URL/);
 await assert.rejects(f.staff.handle('staff-planning-store',body('ziggo-dome',[{...rows[0],sourceUrl:'http://www.mojo.nl/agenda'}])),/STAFF_BAD_URL/);
 // Slugs met apostrofs, punten of plustekens zijn gewone MOJO-adressen.
 const odd=[{...day('2026-12-08',4),sourceUrl:"https://www.mojo.nl/concerten/guns-n'-roses"},{...day('2026-12-09',5),sourceUrl:'https://www.mojo.nl/concerten/dj.set+friends'},{...day('2026-12-10',6),sourceUrl:'https://www.mojo.nl/concerten/andré-2027'}];
 assert.equal((await f.staff.handle('staff-planning-store',body('afas-live',odd))).concerts,3);
});
test('ongeldige of verdachte lijsten worden geweigerd en wissen niets',async()=>{
 const f=fixture(),list=Array.from({length:6},(_,i)=>day('2026-12-0'+(i+1),i+1));await f.staff.handle('staff-planning-store',body('gashouder',list));
 await assert.rejects(f.staff.handle('staff-planning-store',body('gashouder',[])),/STAFF_LIST_SUSPECT/);
 for(const bad of [body('onbekend',list),body('gashouder',list,'2026-11-16'),body('gashouder',list,'2026-11-17','2027-11-18'),{...body('gashouder',list),extra:1}])await assert.rejects(f.staff.handle('staff-planning-store',bad),/VALIDATION/);
 // Per rij een eigen veilige foutcode.
 const code=async(row,expected)=>assert.rejects(f.staff.handle('staff-planning-store',body('gashouder',[row])),new RegExp(expected));
 await code({...list[0],extra:1},'STAFF_BAD_SHAPE');await code({...list[0],concertId:'a/b'},'STAFF_BAD_ID');await code({...list[0],artist:' '},'STAFF_BAD_ARTIST');await code({...list[0],artist:'x'.repeat(161)},'STAFF_BAD_ARTIST');
 await code({...list[0],date:'2028-01-01'},'STAFF_BAD_DATE');await code({...list[0],date:'2026-02-30'},'STAFF_BAD_DATE');await code({...list[0],sourceUrl:'https://evil.example/x'},'STAFF_BAD_URL');
 await assert.rejects(f.staff.handle('staff-planning-store',body('gashouder',[list[0],list[0]])),/STAFF_DUPLICATE/);
 assert.equal((await f.staff.handle('staff-planning-read')).concerts.length,6);
});
test('namen worden versleuteld opgeslagen, met revisiecontrole en idempotente herhaling',async()=>{
 const f=fixture(),item=day('2026-12-05',1);await f.staff.handle('staff-planning-store',body('gashouder',[item]));
 const save=(field,value,revision)=>f.staff.handle('staff-planning-save',{concertId:item.concertId,field,value,revision});
 const first=await save('productionManager','  Sanne   Jansen ',0);assert.equal(first.revision,1);assert.equal(first.roles.productionManager,'Sanne Jansen');
 const second=await save('venueCmtLead','Pieter Bakker',1);assert.equal(second.revision,2);assert.equal(second.roles.productionManager,'Sanne Jansen');
 assert.deepEqual(await save('venueCmtLead','Pieter Bakker',1),second,'herhaling na verloren bevestiging is geslaagd');
 await assert.rejects(save('eventSafetyManager','Iemand',1),/STAFF_CONFLICT/);
 const stored=JSON.stringify([...f.tables.get('esmojo_integratiestatus').values()]);assert.ok(!stored.includes('Sanne')&&!stored.includes('Pieter')&&!stored.includes('Jansen'),'namen staan nergens leesbaar in de opslag');
 const read=await f.staff.handle('staff-planning-read');assert.equal(read.concerts[0].roles.productionManager,'Sanne Jansen');assert.equal(read.concerts[0].revision,2);
 const cleared=await save('productionManager','',2);assert.equal(cleared.roles.productionManager,'');
});
test('opslag valideert veld, waarde, revisie en bestaan van het concert',async()=>{
 const f=fixture(),item=day('2026-12-05',1);await f.staff.handle('staff-planning-store',body('gashouder',[item]));
 const good={concertId:item.concertId,field:'cmtLeadMojo',value:'Naam',revision:0};
 for(const bad of [{...good,field:'onbekend'},{...good,value:5},{...good,value:'x'.repeat(121)},{...good,value:'a\u0000b'},{...good,revision:-1},{...good,revision:'0'},{...good,extra:1},{...good,concertId:''}])await assert.rejects(f.staff.handle('staff-planning-save',bad),/VALIDATION/);
 await assert.rejects(f.staff.handle('staff-planning-save',{...good,concertId:'Onbekend_concert'}),/NOT_FOUND/);
});
test('een gemanipuleerde versleutelde rij wordt nooit geopend of overschreven',async()=>{
 const f=fixture(),item=day('2026-12-05',1);await f.staff.handle('staff-planning-store',body('gashouder',[item]));
 await f.staff.handle('staff-planning-save',{concertId:item.concertId,field:'productionManager',value:'Naam',revision:0});
 for(const row of f.tables.get('esmojo_integratiestatus').values())if(row.esmojo_integratiecode==='staff-planning-names-v1'){const cfg=JSON.parse(row.esmojo_configuratie_json);cfg.sealed=cfg.sealed.slice(0,-4)+'AAAA';row.esmojo_configuratie_json=JSON.stringify(cfg);}
 const read=await f.staff.handle('staff-planning-read');assert.equal(read.concerts[0].unreadable,true);assert.equal(read.concerts[0].roles.productionManager,'');
 await assert.rejects(f.staff.handle('staff-planning-save',{concertId:item.concertId,field:'venueEventManager',value:'X',revision:0}),/STAFF_CONFLICT/);
});
test('de showpagina krijgt alleen de vier functies van het projectteam, ook via een gelijkwaardig concert-ID',async()=>{
 const f=fixture(),item=day('2026-12-05',1);await f.staff.handle('staff-planning-store',body('gashouder',[item]));
 for(const [field,value]of [['productionManager','Produ'],['eventSafetyManager','Safe'],['securityProjectLead','Lead'],['cmtLeadMojo','Cmt'],['venueCmtLead','Zaal']]){const row=await f.staff.handle('staff-planning-read');await f.staff.handle('staff-planning-save',{concertId:item.concertId,field,value,revision:row.concerts[0].revision});}
 const expected={roles:{productionManager:'Produ',eventSafetyManager:'Safe',securityProjectLead:'Lead',cmtLeadMojo:'Cmt'}};
 assert.deepEqual(await f.staff.handle('staff-planning-team',{concertId:item.concertId}),expected);
 assert.deepEqual(await f.staff.handle('staff-planning-team',{concertId:item.concertId.toLowerCase().replaceAll('_','-')}),expected);
 assert.deepEqual(await f.staff.handle('staff-planning-team',{concertId:'Onbekend'}),{roles:{productionManager:'',eventSafetyManager:'',securityProjectLead:'',cmtLeadMojo:''}});
 await assert.rejects(f.staff.handle('staff-planning-team',{concertId:item.concertId,extra:1}),/VALIDATION/);
});

test('artiestnaam-alias: opslaan met revisie, toepassen in de agenda, wissen en veilige foutcodes',async()=>{
 const f=fixture(),list=[{concertId:'Numidia-muziekfeest_Gashouder_05122026',artist:'Numidia muziekfeest van het jaar',date:'2026-12-05',sourceUrl:'https://www.mojo.nl/concerten/n'},{concertId:'Numidia_Gashouder_06122026',artist:'Numidia',date:'2026-12-06',sourceUrl:'https://www.mojo.nl/concerten/n2'}];
 await f.staff.handle('staff-planning-store',body('gashouder',list));
 let read=await f.staff.handle('staff-planning-read');assert.deepEqual(read.concerts.map(row=>row.artist),['Numidia muziekfeest van het jaar','Numidia']);assert.deepEqual(read.aliases,[]);
 const saved=await f.staff.handle('staff-planning-alias',{source:'Numidia muziekfeest van het jaar',name:'  Numidia ',revision:0});assert.deepEqual(saved,{source:'Numidia muziekfeest van het jaar',name:'Numidia',revision:1});
 read=await f.staff.handle('staff-planning-read');assert.deepEqual(read.concerts.map(row=>[row.artist,row.sourceArtist]),[['Numidia','Numidia muziekfeest van het jaar'],['Numidia','Numidia']]);
 assert.deepEqual(read.aliases,[{source:'Numidia muziekfeest van het jaar',name:'Numidia',revision:1}]);assert.ok(read.suggestions.includes('Numidia'));
 // Herhaling na een verloren bevestiging is geslaagd; een verouderde revisie is een conflict.
 assert.deepEqual(await f.staff.handle('staff-planning-alias',{source:'Numidia muziekfeest van het jaar',name:'Numidia',revision:0}),saved);
 await assert.rejects(f.staff.handle('staff-planning-alias',{source:'Numidia muziekfeest van het jaar',name:'Anders',revision:0}),/ALIAS_CONFLICT/);
 // Bronnaam met andere hoofdletters/spaties is dezelfde alias; wissen zet de alias terug (de rij blijft, name=null).
 const cleared=await f.staff.handle('staff-planning-alias',{source:'numidia  muziekfeest van het jaar',name:null,revision:1});assert.equal(cleared.name,null);assert.equal(cleared.revision,2);
 read=await f.staff.handle('staff-planning-read');assert.equal(read.concerts[0].artist,'Numidia muziekfeest van het jaar');
 // Een naam gelijk aan de bronnaam telt als geen alias; ongeldige invoer wordt geweigerd.
 assert.equal((await f.staff.handle('staff-planning-alias',{source:'Test Artiest',name:'test artiest',revision:0})).name,null);
 for(const bad of [{source:'',name:'X',revision:0},{source:'A',name:'',revision:0},{source:'A',name:'x'.repeat(161),revision:0},{source:'A',name:'a\nb',revision:0},{source:'A',name:'B',revision:-1},{source:'A',name:'B',revision:0,extra:1},{source:'A',name:5,revision:0}])await assert.rejects(f.staff.handle('staff-planning-alias',bad),/VALIDATION/);
});
test('alias-keten wordt gevolgd zonder lus',async()=>{
 const {resolveArtistAlias}=await import('../../shared/artist-alias.js');
 const map=new Map([['a','B'],['b','C'],['c','A']]);assert.ok(['A','B','C'].includes(resolveArtistAlias('A',map)));
 assert.equal(resolveArtistAlias('Onbekend',new Map([['a','B']])),'Onbekend');assert.equal(resolveArtistAlias('A',new Map([['a','B'],['b','C']])),'C');
});
