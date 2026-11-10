import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer as createTcpServer} from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
assert.ok(chrome,'Chrome nodig voor Showbeheer-controle');
const userData=mkdtempSync(join(tmpdir(),'show-management-preview-'));
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const html=`<!doctype html><html lang="nl"><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/accounts.css"><link rel="stylesheet" href="/src/show-management.css"><link rel="stylesheet" href="/src/show-planning.css"></head><body><div id="show-management-root"></div><script type="module" src="/src/show-management-entry.js"></script><script type="module">import{createShowManagement}from'/src/show-management.js';import{retrySave}from'/src/lib/save-retry.js';import{isSaveRequest}from'/src/lib/background-saves.js';window.mountCards=()=>{document.querySelector('#show-management-root').replaceChildren();const host=document.createElement('div');host.style='container-type:inline-size;padding:24px';host.innerHTML='<div class="show-overview"><section class="show-team"><h2>Projectteam</h2></section><section>Planning</section></div>';document.body.append(host);window.requests=[];let created=false;const transport=async(action,{body,signal})=>{if(!(signal instanceof AbortSignal))throw Error('Annuleringssignaal ontbreekt');window.requests.push(body.operation);if(body.operation==='create')await new Promise(resolve=>window.releaseCreate=()=>{created=true;resolve();});return created?{available:true,url:'https://esmojo.nl/showbeheer/#'+'a'.repeat(64),pin:'123456'}:{available:false};};const request=(action,options)=>isSaveRequest(action,options)?retrySave(action,options,transport):transport(action,options);window.disposeCards=createShowManagement(host.firstElementChild,{show:{key:'fixture'},request});};</script></body></html>`;
const server=createServer(async(req,res)=>{
 if(req.url==='/api/show-management'){let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);res.setHeader('Content-Type','application/json');res.statusCode=data.pin==='123456'?200:403;res.end(JSON.stringify(data.pin==='123456'?{available:true}:{error:'De pincode is niet geldig.'}));return;}
 if(new URL(req.url,'http://localhost').pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const url=new URL(req.url,'http://localhost'),file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+'/src/')){res.writeHead(404);res.end();return;}
 if(url.searchParams.has('raw')){res.setHeader('Content-Type','text/javascript');res.end('export default '+JSON.stringify(readFileSync(file,'utf8')));return;}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/^import ['"].*\.css['"];\n/gm,''):readFileSync(file));
});await new Promise(done=>server.listen(0,'127.0.0.1',done));
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
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Runtime.exceptionThrown')console.error(JSON.stringify(data.params.exceptionDetails));if(data.method==='Fetch.requestPaused'){send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII='}).catch(()=>{});}if(data.id&&waiting.has(data.id)){const {done,fail,timer}=waiting.get(data.id);clearTimeout(timer);waiting.delete(data.id);data.error?fail(Error(data.error.message)):done(data.result);}});
 const send=(method,params={})=>new Promise((done,fail)=>{const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);fail(Error('CDP-timeout: '+method));},15000);waiting.set(id,{done,fail,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error('Fout in previewbrowser.');return data.result.value;};
 await send('Page.enable');await send('Runtime.enable');
 const until=async expression=>{for(let n=0;n<200;n++){if(await evaluate(expression))return;await pause(20);}throw Error('Browservoorwaarde niet bereikt: '+expression);};
 for(const theme of ['light','dark'])for(const width of [390,768,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?case='+theme+width+'#'+'a'.repeat(64)});
  await until("document.querySelectorAll('.show-management-pin input').length===6");
  await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.show-management-background')).filter"),'none');
  assert.equal(await evaluate("document.querySelector('.show-management-workspace').hidden"),true);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'PIN-pagina past mobiel');
  if(theme==='light'&&width===1440){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync('/tmp/showbeheer-pincode.png',Buffer.from(shot.data,'base64'));}
  const brand=await evaluate("(()=>{const r=document.querySelector('.show-management-brand').getBoundingClientRect();return[r.x,r.y,r.width,r.height]})()");
  await evaluate("document.querySelector('input').dispatchEvent(new ClipboardEvent('paste',{clipboardData:(()=>{const data=new DataTransfer();data.setData('text','654321');return data})(),bubbles:true,cancelable:true}));document.querySelector('form').requestSubmit();");
  await until("document.querySelector('.show-management-message').textContent==='De pincode is niet geldig.'");
  assert.equal(await evaluate("document.querySelector('.show-management-workspace').hidden"),true);
  await evaluate("document.querySelector('input').dispatchEvent(new ClipboardEvent('paste',{clipboardData:(()=>{const data=new DataTransfer();data.setData('text','123456');return data})(),bubbles:true,cancelable:true}));document.querySelector('form').requestSubmit();document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));");
  await until("document.querySelector('.show-management-page').classList.contains('is-open')");
  await until("getComputedStyle(document.querySelector('.show-management-background')).filter==='blur(22px)'");
  assert.equal(await evaluate("document.querySelector('.show-management-gate').hidden"),true);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.show-management-block h2')].map(el=>el.textContent)"),['Blok A','Blok B','Blok C','Blok D','Blok E']);
  assert.deepEqual(await evaluate("(()=>{const r=document.querySelector('.show-management-brand').getBoundingClientRect();return[r.x,r.y,r.width,r.height]})()"),brand,'Logo blijft op dezelfde plek');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Kaarten passen mobiel');
  if(width===1440){const boxes=await evaluate("[...document.querySelectorAll('.show-management-block')].map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,height:r.height}})");assert.equal(boxes[0].x,boxes[1].x);assert.equal(boxes[2].x,boxes[3].x);assert.ok(boxes[4].x>boxes[2].x);assert.ok(boxes[4].height>boxes[0].height*2);}
  if(theme==='light'&&width===1440){const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync('/tmp/showbeheer-blokken.png',Buffer.from(shot.data,'base64'));}
  await evaluate('window.mountCards()');await until("document.querySelector('.show-management-card-body button')?.disabled===false");
  assert.equal(await evaluate("document.querySelector('.show-management-venue').hidden"),true);
  await evaluate("document.querySelector('.show-management-card-body button').click()");
  await until("document.querySelector('.show-management-progress')!==null");assert.equal(await evaluate("document.querySelector('progress').hasAttribute('value')"),false,'Geen gefingeerd percentage');
  await evaluate('window.releaseCreate()');await until("document.querySelector('.show-management-venue').hidden===false");
  assert.deepEqual(await evaluate('window.requests'),['status','create','status']);
  assert.equal(await evaluate("document.querySelector('.show-management-code').textContent"),'Pincode: 123456');
  assert.equal(await evaluate("[...document.querySelectorAll('.show-management-card button')].find(el=>el.textContent==='Showbeheer verzenden').disabled"),true);
  assert.equal(await evaluate("document.querySelectorAll('.show-management-quadrant').length"),4);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Overzicht past mobiel');
  await evaluate('window.disposeCards()');
 }
 console.log('Showbeheer browsercontrole geslaagd: zes PIN-velden, plakken, onjuiste/juiste PIN, aanmaakstatus, vervaging, vijf kaarten en vier statusvakken; 390/768/1440px licht/donker.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
