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
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {createNativeShowsService} from '../../server/dataverse-shows/service.js';
import {createNativeShowState} from '../../server/dataverse-shows/state.js';
import {nativeFixture,sampleSource,samplePeople} from '../../server/dataverse-shows/test-fixture.js';
const db=nativeFixture(structuredClone(sampleSource),structuredClone(samplePeople)),state=createNativeShowState({env:{GOOGLE_DRIVE_SHARED_SECRET:'synthetic-browser-secret-longer-than-32'},repository:db.repo,connection:db.connection}),service=createNativeShowsService({state,catalogue:{handles:()=>false}}),concertId=sampleSource.concertId,actor='synthetic-esm';
const bundle=await service('show-open',{concertId,actor}),saved=await service('barrier-complete',{concertId,actor,revision:bundle.barrier.record.revision,data:{barrierType:'end_stage_gc',riskLevel:'none',measureRequired:false,notes:null,uploadId:null}});
const png=await sharp({create:{width:100,height:100,channels:4,background:'#7194bb'}}).png({compressionLevel:0}).toBuffer(),webp=await sharp(png).webp({lossless:true}).toBuffer(),hash=x=>createHash('sha256').update(x).digest('hex'),image={type:'end_stage_gc',mime:'image/webp',sha256:hash(png),encodedSha256:hash(webp),size:webp.length,base64:webp.toString('base64')};
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/production-assessment.css"></head><body><main style="max-width:1000px;margin:auto"></main><script type="module">
import {createBarrierLayoutPage} from '/src/barrier-layout-page.js';import {createFloorPressurePage} from '/src/floor-pressure-page.js';import {createShowData} from '/src/lib/show-data.js';import {createBarrierReferenceCache} from '/src/lib/barrier-reference-cache.js';
window.errors=[];window.addEventListener('error',event=>window.errors.push(event.message));window.calls=[];window.imageCalls=0;
const image=${JSON.stringify(image)},cache=createBarrierReferenceCache({manifest:{end_stage_gc:{size:${png.length},sha256:image.sha256}},request:async()=>{window.imageCalls++;await new Promise(resolve=>setTimeout(resolve,500));return image;}});cache.bind({id:'synthetic',role:'gebruiker',activated:true,modules:['shows']});window.loadReference=type=>cache.load(type);
const context=createShowData(${JSON.stringify(bundle)},async action=>{window.calls.push(action);if(action!=='barrier-layout')throw Error('Unexpected dependent HTTP read');await new Promise(resolve=>setTimeout(resolve,600));return ${JSON.stringify(saved)};},${JSON.stringify(concertId)}),main=document.querySelector('main'),show={key:${JSON.stringify(concertId)}};
const floor=()=>{window.dispose?.();window.dispose=createFloorPressurePage(main,{show,onBack:()=>{},onBarrier:()=>{},request:body=>context.request('floor-pressure',{body})});};window.dispose=createBarrierLayoutPage(main,{show,onBack:floor,request:body=>context.request('barrier-layout',{body})});window.ready=true;
</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/src/barrier-images.js'){res.setHeader('Content-Type','text/javascript');res.end('export const loadBarrierImage=type=>window.loadReference(type);');return;}if(req.url==='/src/auth.js'){res.setHeader('Content-Type','text/javascript');res.end('export const access=()=>{throw Error("Onverwachte API-aanroep")};');return;}if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/shared/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/import\s*['"][^'"]+\.css['"];?/g,''):readFileSync(file));});
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
 const timings=[];
 for(const theme of ['light','dark'])for(const width of [390,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
  for(let n=0;n<100;n++){if(await evaluate('window.ready===true'))break;await pause(30);}
  await evaluate(`document.documentElement.dataset.theme='${theme}';window.imageStart=performance.now();document.querySelector('select').value='end_stage_gc';document.querySelector('select').dispatchEvent(new Event('change'))`);
  let imageMs;for(let n=0;n<100;n++){if(await evaluate("Boolean(document.querySelector('.assessment-preview img')?.naturalWidth)")){imageMs=await evaluate('performance.now()-window.imageStart');break;}await pause(15);}assert.ok(imageMs<850,'Delayed private image must render promptly');
  await evaluate("window.saveStart=performance.now();[...document.querySelectorAll('button')].find(button=>button.textContent==='Beoordelen').click()");
  let floorMs;for(let n=0;n<100;n++){if(await evaluate("Boolean(document.querySelector('[id$=\"-visitors\"]:not(:disabled)'))")){floorMs=await evaluate('performance.now()-window.saveStart');break;}await pause(15);}assert.ok(floorMs<950,'Confirmed save must enable floor without a second HTTP round');assert.deepEqual(await evaluate('window.calls'),['barrier-layout']);assert.equal(await evaluate('window.imageCalls'),1);assert.deepEqual(await evaluate('window.errors'),[]);timings.push({theme,width,imageMs:Math.round(imageMs),saveToFloorMs:Math.round(floorMs),simulatedImageMs:500,simulatedSaveMs:600});
 }
 console.log(JSON.stringify({kind:'synthetic-production-details',timings}));
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
