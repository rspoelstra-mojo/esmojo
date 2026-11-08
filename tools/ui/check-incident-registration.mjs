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
const zero={security:{total:0,verbal:0,physical:0,mischief:0,evictions:0,arrests:0},medical:{total:0,treatments:0,selfcare:0,unwell:0,contusion:0,ambulance:0}};
let row={concertId:'fixture',name:'Fixture',date:'2026-11-02',venue:'Gashouder',soldTickets:1001,visitors:975.975,visitorUnits:39039,visitorBasis:'ticket-minus-2.5',medicalComplete:true,securityComplete:true,hasSource:true,sourceReady:true,countsReady:true,kpis:zero};let pending=false;window.setPending=value=>pending=value;window.requests=[];window.setServerSales=value=>{row.soldTickets=value;row.visitorUnits=value===null?null:value*39;row.visitors=value===null?null:row.visitorUnits/40;};
window.dispose=createIncidentAdminView(document.querySelector('#content'),document.querySelector('#menu'),{request:async(action,options={})=>{window.requests.push(options.method||'GET');return{references:pending?null:incidentReferences([row]),progress:pending?{available:2,eligible:2,processed:1,visitors:2000}:null,shows:[row],updatedAt:null,pending};}});
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
 assert.equal(await evaluate("document.querySelectorAll('form,input,button').length"),0,'Geen bevestigingsformulier of opslagknop');
 await evaluate("document.querySelector('.incident-registration').open=true;const select=document.querySelector('select');select.value='fixture';select.dispatchEvent(new Event('change'))");
 assert.equal(await evaluate("document.querySelector('.incident-registration').textContent.includes('975,975')&&document.querySelector('.incident-registration').textContent.includes('97,5%')"),true);
 assert.equal(await evaluate("document.querySelectorAll('.incident-indicator').length"),12);
 await evaluate('window.setServerSales(2000);window.poll()');await pause(70);
 assert.equal(await evaluate("document.querySelector('select').value"),'fixture');
 assert.equal(await evaluate("document.querySelector('.incident-registration').textContent.includes('1.950')"),true);
 await evaluate('window.setServerSales(null);window.poll()');await pause(70);
 assert.equal(await evaluate("document.querySelector('.incident-registration').textContent.includes('Niet beschikbaar')"),true);
 assert.equal(await evaluate("window.requests.every(method=>method==='GET')"),true);
 await evaluate('window.setPending(true);window.poll()');await pause(70);
 assert.equal(await evaluate("document.querySelector('.incident-overview').textContent.includes('1 van 2 rapportages verwerkt')"),true);
 assert.deepEqual(await evaluate("[...document.querySelectorAll('.incident-overview-stats dd')].map(e=>e.textContent)"),['2','2.000']);
 assert.equal(await evaluate("[...document.querySelectorAll('.incident-indicator summary strong')].every(e=>e.textContent==='Nog niet berekend')"),true);
 await evaluate('window.dispose()');console.log('Browser: drie kaarten/twaalf indicatoren; automatische bezoekersbasis; geen handmatige bevestiging; wijzigingen en voortgang zonder fictieve nullen.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
