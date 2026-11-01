import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAppPath,pageRoute,legacyPageUrl,installRouter} from './router.js';
test('Schone routes en oude bladwijzers behouden artiest-ID en query; activatiegeheim blijft fragment',()=>{
 assert.equal(pageRoute(new URL('https://esmojo.nl/shows/Puscifer_Gashouder_05112026')),'shows/Puscifer_Gashouder_05112026');
 assert.equal(legacyPageUrl(new URL('https://esmojo.nl/#/shows/Puscifer_Gashouder_05112026')),'/shows/Puscifer_Gashouder_05112026');assert.equal(legacyPageUrl(new URL('https://esmojo.nl/#/beheerder/accounts?view=test')),'/beheerder/accounts?view=test');
 assert.equal(legacyPageUrl(new URL('https://esmojo.nl/#/activeren?token=synthetic')),null);assert.equal(legacyPageUrl(new URL('https://esmojo.nl/#//evil.example/shows')),null);assert.equal(isAppPath('/api/access'),false);assert.equal(isAppPath('/assets/test.js'),false);
});
test('Interne klik gebruikt History; terug/vooruit en legacywijziging renderen; externe/modifier/download niet',()=>{
 let location=new URL('https://esmojo.nl/#/shows'),rendered=0;const events={},handlers={};const win={get location(){return location;},history:{replaceState(_,__,path){location=new URL(path,location);},pushState(_,__,path){location=new URL(path,location);}},addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name]};const doc={addEventListener:(name,fn)=>handlers[name]=fn,removeEventListener:name=>delete handlers[name]};
 const dispose=installRouter({win,doc,onNavigate:()=>rendered++});assert.equal(location.href,'https://esmojo.nl/shows');
 const click=(href,extra={})=>{let prevented=false;handlers.click({button:0,target:{closest:()=>({href,target:'',hasAttribute:()=>false})},preventDefault(){prevented=true;},...extra});return prevented;};
 assert.equal(click('https://esmojo.nl/beheerder/accounts'),true);assert.equal(location.pathname,'/beheerder/accounts');assert.equal(rendered,1);events.popstate();assert.equal(rendered,2);
 assert.equal(click('https://example.org/shows'),false);assert.equal(click('https://esmojo.nl/shows',{ctrlKey:true}),false);assert.equal(click('https://esmojo.nl/api/access'),false);
 location=new URL('https://esmojo.nl/#/shows');events.hashchange();assert.equal(location.hash,'');assert.equal(rendered,3);dispose();assert.equal(Object.keys(handlers).length,0);
});
test('Hostingfallbacks omvatten alleen applicatiepaden en laten API/discovery/assets ongemoeid',()=>{
 const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url)));for(const rule of config.rewrites){assert.equal(rule.destination,'/index.html');assert.ok(isAppPath(rule.source.replace('/:path*','')));assert.ok(!rule.source.startsWith('/api'));}assert.equal(config.rewrites.length,6);
});
