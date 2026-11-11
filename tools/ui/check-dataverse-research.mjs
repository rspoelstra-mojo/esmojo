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
const html=`<!doctype html><html lang="nl"><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/show-profile.css"></head><body><nav id="submenu-navigation"><a aria-current="page">Hatsune Miku</a></nav><main id="content"></main><script type="module">
import {createShowProfile} from '/src/show-profile.js';
window.calls=[];const finalization={ticketsReady:false,basis:{profileRevision:0,finalRevision:0,ticketVersions:{ticket_sales:0,visitor_origins:0,domestic_origins:0}},categories:{visitors:{ready:false,completedAt:null},artist:{ready:false,completedAt:null}}};
const researchByNumber=Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,{questionNumber:i+1,answer:'# Samenvatting\\n\\nConcept '+(i+1)+'\\n\\n# Volledige analyse\\n\\nOnderzoek '+(i+1)+' <img src=x onerror=alert(1)>\\n\\n# Bronnen\\n\\n[Voorbeeld](https://example.invalid/)',sources:[],source:'dataverse',status:'ai-concept',sourceVersion:'1.0',importedAt:'2026-11-11T10:00:00Z'}]));
const data={revision:0,analyses:{1:{summary:'Eigen tekst',status:'draft',updatedAt:'2026-11-11T09:00:00Z'}},researchByNumber,researchErrors:{},finalization};
window.dispose=createShowProfile(document.querySelector('main'),{show:{key:'Hatsune-Miku_AFAS-Live_15112026'},readOnly:true,requestAccess:async(action)=>{window.calls.push(action);if(action==='show-profile'||action==='analysis-finalization')return data;throw Error('Unexpected API '+action);}});await window.dispose.ready;window.ready=true;
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
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Fetch.requestPaused'){send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII='}).catch(()=>{});}if(data.id&&waiting.has(data.id)){const {done,fail,timer}=waiting.get(data.id);clearTimeout(timer);waiting.delete(data.id);data.error?fail(Error(data.error.message)):done(data.result);}});
 const send=(method,params={})=>new Promise((done,fail)=>{const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);fail(Error('CDP-timeout: '+method));},15000);waiting.set(id,{done,fail,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error('Fout in previewbrowser.');return data.result.value;};
 await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'https://www.mojo.nl/media/*'}]});
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let n=0;n<100;n++){if(await evaluate("window.ready===true"))break;await pause(20);}
 assert.equal(await evaluate('window.ready'),true);
 const initial=await evaluate('window.calls.length');
 for(let n=1;n<=11;n++){
  await evaluate(`document.querySelector('#analysis-open-${n}').click()`);await pause(20);
  assert.equal(await evaluate("document.querySelector('.analysis-researched').textContent.includes('AI-concept')"),true);
  assert.equal(await evaluate("document.querySelector('.analysis-researched').textContent.includes('bronversie 1.0')"),true);
  assert.equal(await evaluate("document.querySelector('.analysis-researched').textContent.includes('Onderzocht op')"),false);
  assert.equal(await evaluate("document.querySelectorAll('main img').length"),0,'Markdown HTML nooit uitvoeren');
  if(n===1)assert.equal(await evaluate("document.querySelector('textarea').value"),'Eigen tekst');
  else assert.equal(await evaluate("document.querySelector('textarea').value"),'','Geen automatische overname AI-concept');
  await evaluate("document.querySelector('.profile-back').click()");await pause(10);
 }
 assert.equal(await evaluate('window.calls.length'),initial,'Onderwerpen wisselen zonder extra reads');
 console.log('Dataverse onderzoek: elf onderwerpen, AI-concept/herkomst, eigen tekst behouden, geen automatische overname, veilige Markdown en geen extra reads.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
