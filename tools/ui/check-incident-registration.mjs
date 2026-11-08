import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer as createTcpServer} from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('Geen Chrome beschikbaar voor de incidentencontrole.');
const userData=mkdtempSync(join(tmpdir(),'incident-preview-'));
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const html=`<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="/src/incident-admin.css"><style>:root{--line:#ddd;--muted:#888;--fluid-card:white}body{font-family:Arial}*{box-sizing:border-box}</style></head><body><a id="menu">Incidenten</a><main id="content"></main><script type="module">
const originalTimeout=window.setTimeout;window.setTimeout=(fn,delay,...args)=>delay===60000?(window.poll=fn,0):originalTimeout(fn,delay,...args);
import{createIncidentAdminView}from'/src/incident-admin.js';import{incidentReferences}from'/shared/artist-risk-score.js';
let row={concertId:'fixture',name:'Fixture',date:'2026-11-01',venue:'Gashouder',revision:0,visitors:null,medicalComplete:false,securityComplete:false,zeroIncidents:false,hasSource:false,sourceReady:false,countsReady:false};window.body=null;window.fail=false;window.setServerRevision=value=>row.revision=value;
window.dispose=createIncidentAdminView(document.querySelector('#content'),document.querySelector('#menu'),{request:async(action,options={})=>{if(options.method==='PATCH'){window.body=options.body;await new Promise(resolve=>window.confirmSave=resolve);if(window.fail)throw Error('FIXTURE');row={...row,...options.body,revision:row.revision+1};return{ok:true};}return{references:incidentReferences([]),shows:[row],updatedAt:null,pending:false};}});
</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/shared/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/import\s*['"][^'"]+\.css['"];?/g,'').replace(/import\s*\{\s*access\s*\}\s*from\s*'\.\/auth.js';/, 'const access=()=>{};'):readFileSync(file));});
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
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&waiting.has(data.id)){const {done,fail,timer}=waiting.get(data.id);clearTimeout(timer);waiting.delete(data.id);data.error?fail(Error(data.error.message)):done(data.result);}});
 const send=(method,params={})=>new Promise((done,fail)=>{const id=++sequence,timer=setTimeout(()=>{waiting.delete(id);fail(Error('CDP-timeout: '+method));},15000);waiting.set(id,{done,fail,timer});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error('Fout in previewbrowser.');return data.result.value;};
 await send('Page.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let n=0;n<100;n++){if(await evaluate("document.querySelector('select')?.options.length===2"))break;await pause(25);}
 assert.equal(await evaluate("document.querySelectorAll('.incident-admin-card').length"),3);
 await evaluate("document.querySelector('.incident-registration').open=true;const select=document.querySelector('select');select.value='fixture';select.dispatchEvent(new Event('change'))");
 assert.equal(await evaluate("document.querySelector('input[type=number]').value"),'');
 assert.equal(await evaluate("[...document.querySelectorAll('input[type=checkbox]')].some(e=>e.checked)"),false);
 await evaluate("document.querySelector('input[type=number]').value='1234';document.querySelectorAll('input[type=checkbox]').forEach(e=>e.checked=true);document.querySelector('form').requestSubmit()");await pause(25);
 assert.equal(await evaluate('window.body.visitors'),1234);assert.equal(await evaluate('window.body.revision'),0);
 assert.equal(await evaluate("[...document.querySelectorAll('input,select')].every(e=>e.disabled)"),true);
 await evaluate('window.confirmSave()');await pause(70);
 assert.equal(await evaluate("document.querySelector('input[type=number]').value"),'1234');
 await evaluate("window.fail=true;const input=document.querySelector('input[type=number]');input.value='2222';input.dispatchEvent(new Event('input',{bubbles:true}));window.setServerRevision(8);window.poll()");await pause(25);await evaluate("document.querySelector('form').requestSubmit()");await pause(25);assert.equal(await evaluate('window.body.revision'),1,'Een stille refresh mag de zichtbare formulierbasis niet verhogen');await evaluate('window.confirmSave()');await pause(70);
 assert.equal(await evaluate("document.querySelector('input[type=number]').value"),'2222','Invoer behouden bij onzekere opslag');
 assert.equal(await evaluate("document.querySelector('input[type=number]').disabled"),false);
 await evaluate('window.dispose()');console.log('Browser: drie hoofdkaarten, bevestigingen alleen na invoer; veilig vastgezette revisie/write; fout behoudt invoer; achtergrondrefresh verandert oorspronkelijke revisie niet.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
