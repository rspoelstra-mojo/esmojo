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
const html=`<!doctype html><html><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/accounts.css"><style>.submenu{position:static;width:210px} .submenu nav{display:flex;flex-direction:column;gap:4px}</style></head><body><aside class="submenu"><nav><h3 class="submenu-group-heading">Komende week</h3><a class="submenu-link" href="#"><span>Freya Skye</span></a><a class="submenu-link" href="#"><span>Montell Fish</span></a><a class="submenu-link" href="#"><span>Overmono en een extra lange artiestennaam</span></a><button class="submenu-link">Langere knop met meerdere woorden</button><h3 class="submenu-group-heading">Komende periode</h3><a class="submenu-link" href="#">Volgende artiest</a></nav></aside><main></main><script type="module">import{createSubmenuLoading}from'/src/lib/submenu-loading.js';window.loader=createSubmenuLoading;window.ready=true;</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(readFileSync(file));});
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
 await send('Page.enable');
 for(const theme of ['light','dark'])for(const width of [390,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
  for(let n=0;n<100;n++){if(await evaluate('window.ready===true'))break;await pause(30);}
  await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  const positions=()=>evaluate("[...document.querySelector('nav').children].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})");
  const baseline=await positions();
  for(let index=0;index<5;index++){
   await evaluate(`window.link=document.querySelectorAll('.submenu-link')[${index}];window.link.setAttribute('aria-current','page');window.ui=window.loader(window.link,document.querySelector('main'));`);
   assert.deepEqual(await positions(),baseline,'Constructie/selectie verplaatst submenu');
   await evaluate('window.finish=window.ui.start()');
   assert.deepEqual(await positions(),baseline,'Laden verplaatst submenu');
   assert.equal(await evaluate("window.link.querySelector('.submenu-spinner').hidden"),false);
   assert.equal(await evaluate("(()=>{const spinner=window.link.querySelector('.submenu-spinner').getBoundingClientRect(),text=window.link.firstChild,range=document.createRange();range.selectNodeContents(text);return range.getBoundingClientRect().right<=spinner.left})()"),true,'Tekst overlapt spinner');
   await evaluate('window.finish()');assert.deepEqual(await positions(),baseline,'Afronden verplaatst submenu');
   await evaluate("window.ui.dispose();window.link.removeAttribute('aria-current')");assert.deepEqual(await positions(),baseline,'Opruimen verplaatst submenu');
  }
 }
 console.log('Submenu browsercontrole geslaagd: selectie, laden en afronden zonder verschuiving; links/knoppen, lange namen, licht/donker, 390/1440px.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
