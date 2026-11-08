import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';
import {buildArtistCatalogue} from '../shared/artist-catalogue.js';import {createArtistService} from './artist-service.js';import {makeAccountsHandler} from './accounts-api.js';
const rows=buildArtistCatalogue(['Artist A','Artist B','Historical report only'],v=>createHash('sha256').update(v).digest('hex'));
test('Catalogus coalescet reads, bewaart alleen metadata en telt geen menu/detailreads als klik',async()=>{
 let calls=0,recorded=0,clock=1000;const service=createArtistService({now:()=>clock,shows:async(op,payload)=>{calls++;assert.equal(op,'artist-catalogue');assert.equal(payload.actor,'actor');return{artists:rows.map(row=>({...row,private:'no'}))};},views:{counts:async()=>[{id:rows[1].id,views:7},{id:rows[0].id,views:2}],record:async()=>{recorded++;return{recorded:true};}}});
 const [a,b]=await Promise.all([service.menu('actor'),service.menu('actor')]);assert.equal(calls,1);assert.deepEqual(a,b);assert.deepEqual(a.artists,rows);await service.detail('actor',{artistId:rows[0].id});assert.equal(recorded,0);assert.equal(calls,1);assert.deepEqual((await service.ranking('actor')).mostViewed.map(row=>row.views),[7,2]);
 await service.record('actor',{artistId:rows[0].id,eventId:randomUUID()});assert.equal(recorded,1);await assert.rejects(service.record('actor',{artistId:rows[0].id,eventId:randomUUID(),userId:'injected'}),/VALIDATION/);await assert.rejects(service.record('actor',{artistId:'a_'+'f'.repeat(64),eventId:randomUUID()}),/NOT_FOUND/);assert.equal(recorded,1);clock+=31000;await service.menu('actor');assert.equal(calls,3);
});
test('Een defecte ranking blokkeert het artiestenmenu of de detailpagina niet',async()=>{
 const service=createArtistService({shows:async()=>({artists:rows}),views:{record:async()=>({recorded:true}),counts:async()=>{throw Error('ARTIST_VIEWS_UNAVAILABLE');}}});assert.deepEqual((await service.menu('actor')).artists,rows);await assert.rejects(service.ranking('actor'),/ARTIST_VIEWS_UNAVAILABLE/);assert.equal((await service.detail('actor',{artistId:rows[0].id})).artist.id,rows[0].id);assert.deepEqual(await service.record('actor',{artistId:rows[0].id,eventId:randomUUID()}),{recorded:true});
});
test('Alle artiestacties vereisen actuele MFA, activering, sessie en Artiestenmodule; geen impliciete Shows-/Rapportagesrechten',async()=>{
 const actor='actor',actions={'artist-menu':'GET','artist-ranking':'GET','artist-detail':'POST','artist-view':'POST','artist-show':'POST','artist-risk':'POST'};
 for(const [action,method]of Object.entries(actions))for(const input of [{token:false},{aal:'aal1'},{activated:false},{expired:true},{disabled:true},{modules:['shows']},{modules:['reports']},{role:'beheerder',modules:[]},{}]){
  let calls=0;const claims={sub:actor,aal:input.aal||'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-(input.expired?73*3600:0)},{method:'totp'}]},token='h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s';
  const run=async()=>{calls++;return{ok:true};},handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:actor,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({id:actor,activated:input.activated!==false,disabled:input.disabled===true,role:input.role||'gebruiker',modules:input.modules||['artists']}),artistService:{menu:run,ranking:run,detail:run,record:run,show:run,risk:run},shows:async()=>{throw Error('Other modules must not be read');}}),res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler({method,query:{action},body:method==='POST'?{artistId:rows[0].id}:undefined,headers:{authorization:input.token===false?undefined:'Bearer '+token}},res);const allowed=Object.keys(input).length===0;assert.equal(calls,allowed?1:0,action+' '+JSON.stringify(input));assert.equal(res.code,allowed?200:input.token===false||input.expired?401:403,JSON.stringify(input));
 }
});
test('Hernoemen behoudt oude links en retry-IDs en telt oude/nieuwe klikrecords samen',async()=>{
 const legacy=buildArtistCatalogue(['U2: The Greatest Show On Earth World Tour','U2'],v=>createHash('sha256').update(v).digest('hex')),old=legacy.find(row=>row.name.startsWith('U2:')),canonical=legacy.find(row=>row.name==='U2'),writes=[];
 const service=createArtistService({shows:async()=>({artists:legacy}),views:{counts:async()=>[{id:old.id,views:7},{id:canonical.id,views:2}],record:async(id,eventId)=>{writes.push({id,eventId});return{recorded:false};}}});
 assert.deepEqual((await service.menu('actor')).artists,[canonical]);const detail=await service.detail('actor',{artistId:old.id});assert.deepEqual(detail.artist,{id:old.id,name:'U2'});assert.equal(detail.canonicalArtistId,canonical.id);assert.equal((await service.ranking('actor')).mostViewed[0].views,9);
 const eventId=randomUUID(),record=await service.record('actor',{artistId:old.id,eventId});assert.deepEqual(writes,[{id:old.id,eventId}]);assert.equal(record.recorded,false);assert.equal(record.mostViewed[0].views,9);
});
test('Leesbare URL-referenties openen de juiste artiest; tellen blijft op interne IDs gebaseerd',async()=>{
 const raw=buildArtistCatalogue(['U2: The Greatest Show On Earth World Tour','New Wave - All Stars','¥ØU$UK€ ¥UK1MAT$U (Yousuke Yukimatsu)'],v=>createHash('sha256').update(v).digest('hex')),service=createArtistService({shows:async()=>({artists:raw}),views:{counts:async()=>[]}});
 for(const [slug,name]of [['u2','U2'],['newwave','New Wave'],['yousukeyukimatsu','Yousuke Yukimatsu']]){const result=await service.detail('actor',{artistId:slug});assert.equal(result.artist.name,name);assert.equal(result.canonicalArtistSlug,slug);assert.equal(result.requestedReference,slug);}
 await assert.rejects(service.detail('actor',{artistId:'../u2'}),/VALIDATION/);await assert.rejects(service.record('actor',{artistId:'u2',eventId:randomUUID()}),/VALIDATION/);
});

test('Het artiestprofiel gebruikt canonieke aliassen en geeft alleen compacte bezoekersinformatie terug',async()=>{
 const artists=buildArtistCatalogue(['U2','U2: World Tour'],v=>createHash('sha256').update(v).digest('hex'));
 const service=createArtistService({photo:async name=>{assert.equal(name,'U2');return{imageUrl:'https://www.mojo.nl/media/u2.jpg'};},shows:async(operation,payload)=>{
  if(operation==='artist-catalogue')return {artists,profileSupported:true};
  assert.equal(operation,'artist-profile');
  assert.deepEqual(new Set(payload.artistIds),new Set(artists.map(artist=>artist.id)));
  return {profileConcertId:'internal',concerts:[{venue:'Ziggo Dome',dates:['2026-11-06','2026-11-07']}],
   latestDate:'2026-11-07',photo:null,audience:{1:{summary:'Bevestigde tekst',answer:'Niet tonen',storedAt:'2026-11-08T10:00:00Z'},2:{answer:'### Samenvatting\n25–60 jaar\n### Volledige analyse\nNiet tonen',storedAt:'invalid'},3:{storedAt:'2026-11-08T10:00:00Z'}}};
 }});
 const {profile}=await service.detail('actor',{artistId:'u2',includeProfile:true});
 assert.deepEqual(profile.audience,['Bevestigde tekst','25–60 jaar',null,null]);
 assert.deepEqual(profile.audienceStoredAt,['2026-11-08T10:00:00Z',null,null,null]);
 assert.equal(profile.profileConcertId,undefined);
 assert.equal(profile.concerts[0].dates.length,2);
 assert.equal(profile.photo,'https://www.mojo.nl/media/u2.jpg');
});

test('Bestaande artiestfoto blijft behouden; alleen ontbrekende foto wordt bij MOJO opgehaald',async()=>{
 let calls=0,saved='https://www.mojo.nl/media/existing.jpg';
 const service=createArtistService({photo:async()=>{calls++;return null;},shows:async operation=>operation==='artist-catalogue'?{artists:rows,profileSupported:true}:{concerts:[],photo:saved,audience:{}}});
 assert.equal((await service.detail('actor',{artistId:rows[0].id,includeProfile:true})).profile.photo,saved);assert.equal(calls,0);
 saved=null;assert.equal((await service.detail('actor',{artistId:rows[0].id,includeProfile:true})).profile.photo,null);assert.equal(calls,1);
 await service.menu('actor');await service.detail('actor',{artistId:rows[0].id});assert.equal(calls,1);
});
