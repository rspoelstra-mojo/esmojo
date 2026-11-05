import {test} from 'node:test';import assert from 'node:assert/strict';
import {createHomeCache,cleanHomePublic} from './home-cache.js';
const profile={id:'private-account-id',role:'gebruiker',activated:true,modules:['shows']},ready={profile:true,production:false,operational:false,measures:false};
const data={shows:[{key:'Reeks_Gashouder_06112026',name:'Reeks',venueId:'gashouder',venue:'Gashouder',city:'Amsterdam',dates:['2026-11-06','2026-11-07'],assigned:true,userId:profile.id,concerts:[{key:'Reeks_Gashouder_06112026',date:'2026-11-06',assigned:true}],snapshot:{completion:ready,risks:{production:{choices:{private:true}}}},planningUpdatedAt:'2026-11-05T11:00:00Z'}]};
const storage=()=>{let content;return{getItem:()=>content,setItem:(key,value)=>{content=value;},text:()=>content};};
test('Alleen openbare velden persistent; herstelde cache kan zonder geverifieerde private koppeling nooit renderen',()=>{
 const disk=storage(),cache=createHomeCache({storage:disk});assert.equal(cache.current(),null);cache.bind(profile);assert.equal(cache.accept(data,{actor:profile.id}),true);assert.equal(cache.current().shows[0].assigned,true);
 for(const field of ['userId','assigned','private-account-id','risks','choices'])assert.equal(disk.text().includes(field),false,field);
 const restored=createHomeCache({storage:disk});restored.bind(profile);assert.equal(restored.current(),null,'Openbare opslag verleent geen persoonlijke koppelingen');restored.accept({...data,shows:data.shows.map(show=>({...show,assigned:false,concerts:[]}))},{actor:profile.id});assert.equal(restored.current().shows[0].assigned,false);
 cache.clear();assert.equal(cache.current(),null);assert.ok(disk.text(),'Uitsluitend openbare cache mag blijven');
});
test('Statuswijziging werkt direct door, oude reads overschrijven geen nieuwere status, late reacties andere account geweigerd',()=>{
 const cache=createHomeCache();cache.bind(profile);cache.accept(data,{actor:profile.id});let notifications=0;cache.subscribe(()=>notifications++);const context=cache.context();
 cache.patch({key:data.shows[0].key,completion:{...ready,profile:false},updatedAt:'2026-11-05T12:00:00Z'},context);assert.equal(cache.current().shows[0].snapshot.completion.profile,false);assert.equal(notifications,1);
 cache.accept(data,context);assert.equal(cache.current().shows[0].snapshot.completion.profile,false);
 cache.bind({...profile,id:'other-private-id'});assert.equal(cache.current(),null);assert.equal(cache.accept(data,context),false);cache.patch({key:data.shows[0].key,completion:ready,updatedAt:'2026-11-05T13:00:00Z'},context);assert.equal(cache.current(),null);
 cache.bind({...profile,modules:['reports']});assert.equal(cache.current(),null);
});
test('Whitelisting weigert geïnjecteerde metadata/statussen en externe foto’s; geblokkeerde browseropslag blijft optioneel',()=>{
 assert.throws(()=>cleanHomePublic({shows:[{...data.shows[0],venue:'Ziggo Dome'}]}));assert.throws(()=>cleanHomePublic({shows:[{...data.shows[0],snapshot:{completion:{...ready,secret:'injection'}}}]}));
 const result=cleanHomePublic({shows:[{...data.shows[0],photo:{imageUrl:'https://evil.test/image.jpg',sourceUrl:'https://www.mojo.nl/concerten/reeks'}}]});assert.equal(result.shows[0].photo,undefined);
 const cache=createHomeCache({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});cache.bind(profile);cache.accept(data,{actor:profile.id});assert.equal(cache.current().shows.length,1);
});

test('Achtergrondcontrole en tijdelijke fout behouden laatst bevestigde status tot een nieuwe is bevestigd',()=>{
 const cache=createHomeCache();cache.bind(profile);cache.accept(data,{actor:profile.id});const before=cache.current().shows[0].snapshot;const context=cache.context();
 cache.accept({shows:[{...data.shows[0],snapshot:undefined,planningUnavailable:true,planningUpdatedAt:'2026-11-05T12:00:00Z'}]},context);assert.deepEqual(cache.current().shows[0].snapshot,before);
 cache.patch({key:data.shows[0].key,updatedAt:'2026-11-05T12:10:00Z',planningUnavailable:true},context);assert.deepEqual(cache.current().shows[0].snapshot,before);
 cache.patch({key:data.shows[0].key,updatedAt:'2026-11-05T12:20:00Z',completion:{...ready,profile:false}},context);assert.equal(cache.current().shows[0].snapshot.completion.profile,false);
});
