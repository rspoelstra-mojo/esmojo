import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer as createTcpServer} from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
assert.ok(chrome,'Chrome nodig voor artiestcontrole');
const userData=mkdtempSync(join(tmpdir(),'artist-preview-'));
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
let mode='auth';
const authHtml=`<!doctype html><html><body><div id="app-boot"></div><section id="auth-panel"></section><script type="module">
import{startAuth}from'/src/auth.js';window.calls=[];window.entered=0;window.fixtureClient={auth:{onAuthStateChange:()=>()=>{},verifyOtp:input=>{window.calls.push(input);return new Promise(done=>window.resolveOtp=done);},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1'}}),listFactors:async()=>({data:{totp:[]}})}}};startAuth({onReady:()=>window.entered++,onSignedOut:()=>{}});
</script></body></html>`;
const accountHtml=`<!doctype html><html><body><button id="submenu">Accounts</button><main></main><script type="module">
import{createAccountsView}from'/src/accounts.js';import{backgroundSaves}from'/src/lib/background-saves.js';window.calls=[];window.copied=null;Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>window.copied=value},configurable:true});window.fixtureAccess=async(_action,options={})=>{if(!options.body)return{accounts:[{id:'11111111-1111-4111-8111-111111111111',firstName:'Pending',lastName:'Test',activated:false,email:'pending@example.invalid'},{id:'22222222-2222-4222-8222-222222222222',firstName:'Active',activated:true,email:'active@example.invalid'}]};return backgroundSaves.track(()=>{window.calls.push(options.body);return new Promise(done=>window.resolveLink=done);},{key:'fixture-account',route:'/beheerder/accounts'});};window.activity=()=>backgroundSaves.changed();window.dispose=createAccountsView(document.querySelector('main'),{id:'admin'},document.querySelector('#submenu'));
</script></body></html>`;
const server=createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.url.startsWith('/?')||req.url==='/'){mode=new URL(req.url,'http://localhost').searchParams.get('mode')||'auth';res.setHeader('Content-Type','text/html');res.end(mode==='accounts'?accountHtml:authHtml);return;}
 res.setHeader('Content-Type','text/javascript');
 if(req.url==='/src/auth.js'&&mode==='accounts'){res.end('export const access=(...args)=>window.fixtureAccess(...args);');return;}
 if(req.url==='/src/lib/supabase.js'){res.end('export const getSupabase=async()=>window.fixtureClient;export const createMfaClient=()=>{throw Error("Unexpected MFA request")};');return;}
 if(req.url==='/src/lib/mfa-verification.js'){res.end('export const createMfaVerifier=()=>({prepare:async()=>{},clear(){}});');return;}
 if(req.url==='/src/assets/ESMOJO-logo.svg?raw'){res.end('export default '+JSON.stringify(readFileSync(root+'/src/assets/ESMOJO-logo.svg','utf8')));return;}
 const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/shared/')){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/import\s*['"][^'"]+\.css['"];?/g,''):readFileSync(file));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const probe=createTcpServer();await new Promise(done=>probe.listen(0,'127.0.0.1',done));const debugPort=probe.address().port;await new Promise(done=>probe.close(done));
let diagnostics='';
const child=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--no-first-run','--no-default-browser-check','--remote-debugging-port='+debugPort,'--remote-debugging-address=127.0.0.1','--user-data-dir='+userData,'about:blank'],{stdio:['ignore','ignore','pipe'],detached:process.platform!=='win32'});
child.stderr.on('data',data=>{diagnostics=(diagnostics+String(data)).slice(-3000);});child.on('error',error=>{diagnostics=error.message;});
let ws;
const pause=ms=>new Promise(done=>setTimeout(done,ms));
try{
 let targets=null;
 for(let n=0;n<200;n++){
  try{const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',{signal:AbortSignal.timeout(1000)});if(response.ok){targets=await response.json();if(targets.some(t=>t.type==='page'))break;}}catch{}
  await pause(100);
 }
 assert.ok(targets?.some(t=>t.type==='page'),'Chrome start niet: '+diagnostics.replace(/ws:\/\/\S+/g,'[lokale-debug-url]'));
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
 let sequence=0;const waiting=new Map();
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Fetch.requestPaused'){send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII='}).catch(()=>{});}if(data.id&&waiting.has(data.id)){const {done,fail,timer}=waiting.get(data.id);clearTimeout(timer);waiting.delete(data.id);data.error?fail(Error(data.error.message)):done(data.result);}});
 const send=(method,params={})=>new Promise((done,fail)=>{const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);fail(Error('CDP-timeout: '+method));},15000);waiting.set(id,{done,fail,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error('Fout in previewbrowser.');return data.result.value;};
 await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'https://www.mojo.nl/media/*'}]});
 for(const type of ['invite','recovery']){
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?mode=auth&case='+type+'#/activeren?token=synthetic-hash&type='+type});
  for(let n=0;n<100;n++){if(await evaluate("document.querySelector('h1')?.textContent==='Account activeren'"))break;await pause(20);}
  assert.equal(await evaluate('window.calls.length'),0);assert.equal(await evaluate('location.hash'),'');
  await evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}))");
  assert.equal(await evaluate('window.calls.length'),1);assert.deepEqual(await evaluate('window.calls[0]'),{token_hash:'synthetic-hash',type:'email'});
  await evaluate("window.resolveOtp({data:{session:{access_token:'synthetic'}}})");await pause(50);
  assert.equal(await evaluate("document.querySelector('h1').textContent"),'2-stapsverificatie instellen');assert.equal(await evaluate('window.entered'),0);
 }
 // Een nieuw activeringsfragment in hetzelfde tabblad moet de authstart opnieuw uitvoeren.
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?mode=auth&case=recovery#/activeren?token=another-synthetic&type=recovery'});
 for(let n=0;n<100;n++){if(await evaluate("document.querySelector('h1')?.textContent==='Account activeren'&&window.calls.length===0"))break;await pause(20);}
 assert.equal(await evaluate("document.querySelector('h1').textContent"),'Account activeren');
 assert.equal(await evaluate('window.calls.length'),0);
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?mode=accounts'});
 for(let n=0;n<100;n++){if(await evaluate("document.querySelectorAll('.account-actions').length===2"))break;await pause(20);}
 assert.equal(await evaluate("document.querySelectorAll('[aria-label^=Nieuwe]').length"),1);
 await evaluate("document.querySelector('[aria-label^=Nieuwe]').click()");
 assert.equal(await evaluate('window.calls.length'),1);await evaluate('window.activity()');
 assert.equal(await evaluate("document.querySelector('[aria-label^=Nieuwe]').disabled"),true);
 assert.equal(await evaluate("document.querySelector('[aria-label^=Nodig]').disabled"),true);
 await evaluate("document.querySelector('[aria-label^=Nieuwe]').click()");assert.equal(await evaluate('window.calls.length'),1);
 await evaluate("window.resolveLink({activationUrl:'https://esmojo.nl/#/activeren?token=synthetic&type=invite'})");await pause(50);
 assert.equal(await evaluate('window.copied'),'https://esmojo.nl/#/activeren?token=synthetic&type=invite');
 assert.equal(await evaluate("document.querySelector('[aria-label^=Nieuwe]').disabled"),false);
 console.log('Browser: activeringslanding verbruikt geen token, invite/recovery één verificatie na klik, MFA blijft vereist; account-herbouw geeft geen dubbele linkuitgifte.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
