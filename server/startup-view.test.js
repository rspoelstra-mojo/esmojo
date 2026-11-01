import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('Tijdens sessieherstel blijft de loginfoto verborgen; menu wordt voorbereid vóór het logo verdwijnt',async()=>{
 const boot={hidden:false},panel={hidden:true,replaceChildren(){}},profile={id:'synthetic-only'};let restore,entered=false;
 const sandbox={console,Date,Promise,navigator:{},location:{hash:''},document:{querySelector:selector=>selector==='#app-boot'?boot:panel,addEventListener(){}},window:{addEventListener(){}},setTimeout(){},clearTimeout(){},fetch:()=>new Promise(resolve=>restore=resolve),getSupabase:async()=>({auth:{onAuthStateChange(){},setSession:async()=>({data:{session:{user:profile}}})}})};
 let source=readFileSync(new URL('../src/auth.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const start=sandbox.startAuth({onReady:current=>{assert.equal(current.id,profile.id);assert.equal(boot.hidden,false);entered=true;},onSignedOut(){}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(boot.hidden,false);assert.equal(panel.hidden,true);assert.equal(entered,false);
 restore({status:200,ok:true,json:async()=>({profile,expiresAt:Date.now()+3600000,session:{access_token:'synthetic',refresh_token:'synthetic'}})});await start;assert.equal(entered,true);assert.equal(boot.hidden,true);assert.equal(panel.hidden,true);
});
test('Eerste HTML heeft het originele logo, geen loginfoto-preload of zichtbare loginplaceholder',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),logo=readFileSync(new URL('../src/assets/ESMOJO-logo.svg',import.meta.url),'utf8');
 assert.ok(html.includes('id="app-boot"'));assert.ok(html.includes('id="auth-panel" class="auth-panel" aria-label="Inloggen" hidden'));assert.equal(html.includes('Inloggen laden'),false);assert.equal(html.includes('preload" as="image"'),false);assert.equal(html.split(logo).length-1,2);
 const css=readFileSync(new URL('../src/accounts.css',import.meta.url),'utf8');assert.ok(css.includes('.auth-panel[data-screen="login"]::before'));assert.equal(css.includes('.auth-panel::before'),false);
});

test('Systeemthema geldt vóór eerste paint en schakelt de hele website live mee, zonder opgeslagen override',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const script=/<script>\s*([\s\S]*?)<\/script>/.exec(html)[1];let changed;const document={documentElement:{dataset:{}}};
 vm.runInNewContext(script,{document,window:{matchMedia:query=>{assert.equal(query,'(prefers-color-scheme: dark)');return{matches:true,addEventListener:(event,callback)=>{assert.equal(event,'change');changed=callback;}};}},localStorage:{getItem(){throw Error('Geen opgeslagen override lezen');}}});
 assert.equal(document.documentElement.dataset.theme,'dark');changed({matches:false});assert.equal(document.documentElement.dataset.theme,'light');assert.ok(html.includes('.boot-mark path{fill:#002ff4}'));assert.ok(html.includes('--boot-canvas:#080f20'));assert.equal(html.includes('id="theme-toggle"'),false);
});
