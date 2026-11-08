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
 const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url)));assert.deepEqual(config.rewrites.find(rule=>rule.source==='/api/mfa'),{source:'/api/mfa',destination:'/api/access?action=mfa'});for(const rule of config.rewrites.filter(rule=>!['/test/fluid-layout','/api/mfa','/api/incident-references-sync'].includes(rule.source))){assert.equal(rule.destination,'/index.html');assert.ok(isAppPath(rule.source.replace('/:path*','')));assert.ok(!rule.source.startsWith('/api'));}assert.deepEqual(config.rewrites.find(rule=>rule.source==='/api/incident-references-sync'),{source:'/api/incident-references-sync',destination:'/api/web-reports-sync?incidentMetrics=1'});assert.equal(config.rewrites.length,9);assert.deepEqual(config.rewrites.at(-1),{source:'/test/fluid-layout',destination:'/index.html'});assert.equal(isAppPath('/test/fluid-layout'),true);assert.equal(isAppPath('/test/other'),false);
});
test('Rapportages gebruikt het opgeslagen concert-ID en normaliseert oude URL’s, root, query’s en hashbladwijzers',()=>{
 const canonical='/rapportages/Jungle_Ziggo-Dome_03112026';
 for(const path of ['/statistieken/jungle','/statistieken','/rapportages','/rapportages/jungle','/statistieken/Jungle_Ziggo-Dome_03112026',canonical]){
  let location=new URL('https://esmojo.nl'+path+'?view=voorbeeld');const listeners={},clicks={};let renders=0;
  const win={get location(){return location;},history:{replaceState(_,__,target){location=new URL(target,location);},pushState(_,__,target){location=new URL(target,location);}},addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:name=>delete listeners[name]};
  const doc={addEventListener:(name,fn)=>clicks[name]=fn,removeEventListener:name=>delete clicks[name]};
  const dispose=installRouter({win,doc,onNavigate:()=>renders++});assert.equal(location.pathname,['/statistieken','/rapportages'].includes(path)?'/rapportages':canonical);assert.equal(location.search,'?view=voorbeeld');assert.equal(renders,0);
  location=new URL('https://esmojo.nl/');clicks.click({button:0,target:{closest:()=>({href:'https://esmojo.nl/rapportages',target:'',hasAttribute:()=>false})},preventDefault(){}});assert.equal(location.pathname,'/rapportages');assert.equal(renders,1);dispose();
 }
 assert.equal(legacyPageUrl(new URL('https://esmojo.nl/#/statistieken/jungle?view=voorbeeld')),canonical+'?view=voorbeeld');
 assert.equal(isAppPath('/rapportages/Jungle_Ziggo-Dome_03112026'),true);
 const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url)));assert.ok(config.rewrites.some(row=>row.source==='/rapportages/:path*'));
 assert.equal(config.redirects.find(row=>row.source==='/statistieken/jungle').destination,canonical);assert.equal(config.redirects.find(row=>row.source==='/rapportages/jungle').destination,canonical);assert.ok(config.redirects.every(row=>row.permanent));
});

test('Showtab-query is expliciet gewhitelist en blijft beschikbaar bij schone en oude URL’s',async()=>{
 const {requestedShowTab}=await import('../../shared/show-navigation.js');
 for(const [tab,index]of [['overzicht',0],['showprofiel',1],['risicoanalyse',2],['maatregelen',3],['documenten',4]]){assert.equal(requestedShowTab('?tab='+tab),index);assert.equal(legacyPageUrl(new URL('https://esmojo.nl/#/shows/BUNT._Gashouder_01122026?tab='+tab)),'/shows/BUNT._Gashouder_01122026?tab='+tab);}
 for(const query of ['', '?tab=onbekend','?tab=https://example.invalid','?tab=showprofiel&tab=maatregelen'])assert.equal(requestedShowTab(query),null);
});
