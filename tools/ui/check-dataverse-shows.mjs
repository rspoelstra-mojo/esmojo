import {harness} from '../../server/test-support/production-drive.js';
import {researchShow} from '../../server/dataverse-shows.js';
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
const h=harness();h.indexFile.content=JSON.stringify({...h.index,active:[]});h.indexFile.setContent=function(value){this.content=value;};Object.getPrototypeOf(h.folder).createFolder=function(name){return new this.constructor(name,this);};
const fixtures=[];
for(const source of ['hatsunemiku_afaslive_20261115','westlife_ziggodome_20261123']){
 const show=researchShow(source);await h.shows('dataverse-ensure',{show});
 await h.shows('profile-save',{concertId:show.key,questionNumber:1,summary:'Eigen tekst '+show.name,status:'draft',revision:0});
 const bundle=await h.shows('show-open',{concertId:show.key,actor:'synthetic-browser'});
 bundle.profile.researchByNumber=Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,{answer:'Samenvatting\n\n'+show.name+' concept '+(i+1)+'\n\nVolledige analyse\n\nOnderzoek '+show.name+'\n\nBronnen\n\n[1] [Bron](https://example.invalid/)',sources:[],source:'dataverse',status:'ai-concept',sourceVersion:'1.0',importedAt:'2026-11-12T10:00:00Z'}]));fixtures.push({show,bundle});
}
const html=`<!doctype html><html lang="nl"><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/show-profile.css"></head><body><nav id="submenu-navigation"><a aria-current="page">Shows</a></nav><main id="content"></main><script type="module">
import {createShowPage} from '/src/show-page.js';
const fixtures=${JSON.stringify(fixtures)};window.calls=[];HTMLImageElement.prototype.decode=()=>new Promise(()=>{});window.mount=index=>{window.dispose?.();const {show,bundle}=fixtures[index];bundle.photo={imageUrl:'https://www.mojo.nl/media/test.jpg',sourceUrl:'https://www.mojo.nl/concerten/test'};window.dispose=createShowPage(document.querySelector('main'),show,{initialTab:1,readOnly:true,loadPhoto:async()=>{throw Error('Photo metadata must be in the complete bundle');},request:async(action)=>{window.calls.push(action);if(action==='show-open'){await new Promise(done=>setTimeout(done,400));return structuredClone(bundle);}throw Error('Unexpected transport '+action);}});};window.mount(0);window.ready=true;
</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/src/auth.js'){res.setHeader('Content-Type','text/javascript');res.end('export const access=()=>{throw Error("Unexpected API")};');return;}if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/shared/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/import\s*['"][^'"]+\.css['"];?/g,''):readFileSync(file));});
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
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Fetch.requestPaused'){setTimeout(()=>send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII='}).catch(()=>{}),120);}if(data.id&&waiting.has(data.id)){const {done,fail,timer}=waiting.get(data.id);clearTimeout(timer);waiting.delete(data.id);data.error?fail(Error(data.error.message)):done(data.result);}});
 const send=(method,params={})=>new Promise((done,fail)=>{const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);fail(Error('CDP-timeout: '+method));},15000);waiting.set(id,{done,fail,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error('Fout in previewbrowser.');return data.result.value;};
 await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'https://www.mojo.nl/media/*'}]});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let n=0;n<100;n++){if(await evaluate("window.ready===true"))break;await pause(20);}
 assert.equal(await evaluate('window.ready'),true);
 const samples=[];
 for(const [width,theme]of [[1440,'light'],[1440,'dark'],[390,'light'],[390,'dark']]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<500});await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
 for(const [index,name,venue]of [[0,'Hatsune Miku','AFAS Live'],[1,'Westlife','Ziggo Dome']]){
  await evaluate(`window.mount(${index})`);
  for(let n=0;n<100;n++){if(await evaluate(`document.querySelector('.show-title')?.textContent===${JSON.stringify(name)}`))break;await pause(30);}
  assert.equal(await evaluate("document.querySelector('.show-title')?.textContent"),name);
  assert.ok((await evaluate("document.querySelector('.show-meta').textContent")).includes(venue));
  assert.equal(await evaluate("document.querySelectorAll('.show-tab').length"),5);
  const duration=await evaluate("performance.getEntriesByName('esmojo-show-ready').at(-1).duration");assert.ok(duration<1000,'Complete page exceeds one second in the 400ms transport fixture: '+duration);
  for(let n=0;n<40;n++){if(await evaluate("document.querySelector('.show-artist-photo img')?.naturalWidth>0"))break;await pause(20);}
  assert.equal(await evaluate("document.querySelector('.show-artist-photo img')?.complete"),true);assert.equal(await evaluate("document.querySelector('.show-artist-photo').hidden"),false);
  assert.ok(await evaluate("document.querySelector('.show-artist-photo img').src.includes('format=webp')"));
  const photoMs=await evaluate("performance.now()-performance.getEntriesByName('esmojo-show-ready').at(-1).startTime");assert.ok(photoMs<1000,'Photo and all tabs must both be available within one second in the controlled fixture');samples.push({readyMs:Math.round(duration),photoMs:Math.round(photoMs)});

  const reads=await evaluate('window.calls.length');
  for(const tab of [2,3,1])await evaluate(`document.querySelector('#show-tab-${tab}').click()`);
  await pause(30);assert.equal(await evaluate('window.calls.length'),reads,'Tabs hergebruiken de volledige showbundel');
  for(const number of [1,11]){
   await evaluate(`document.querySelector('#analysis-open-${number}').click()`);await pause(20);
   assert.equal(await evaluate("document.querySelector('.analysis-ai-text').textContent"),name+' concept '+number);
   assert.ok((await evaluate("document.querySelector('.analysis-researched').textContent")).includes('AI-concept'));
   if(number===1)assert.equal(await evaluate("document.querySelector('textarea').value"),'Eigen tekst '+name);
   await evaluate("document.querySelector('.profile-back').click()");await pause(10);
  }
  assert.equal(await evaluate('window.calls.length'),reads);
 }
 }
 console.log('Complete opening with 400ms transport and 120ms image response, desktop/mobile light/dark (ms):',samples);
 console.log('Dataverse-showpagina: Hatsune/AFAS en Westlife/Ziggo, alle tabs voorbereid, geïsoleerde AI-concepten, eigen tekst behouden en geen extra reads bij schakelen.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
