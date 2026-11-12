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
const html=`<!doctype html><html><head><link rel="stylesheet" href="/src/style.css"></head><body><main></main><script type="module">import{createDataTransitionView}from'/src/data-transition.js';window.operations=[];window.fail=true;window.cleanup=createDataTransitionView(document.querySelector('main'),{request:async(action,{body})=>{window.operations.push(body);if(action==='dataverse-choices'){window.choiceOperations??=[];window.choiceOperations.push(body);if(body.operation==='list')return{choices:Array.from({length:24},(_,i)=>({name:'choice_'+i,title:'Keuze '+i}))};if(body.name==='choice_5'&&!window.choiceRetry){window.choiceRetry=true;throw Error('Publicatie onderbroken');}return body.name==='choice_1'?{status:'conflict',verified:false}:{status:'verified',verified:true,published:true,created:body.name==='choice_0'};}if(body.operation==='list')return{shows:[{concertId:'antoon',name:'Antoon',venue:'Gashouder',date:'2026-11-23'},{concertId:'other',name:'Andere artiest',venue:'AFAS Live',date:'2026-11-24'}]};if(body.operation==='inventory')return{numbers:body.concertId==='antoon'?[1,2]:[1]};if(body.operation==='bulk-import'){if(body.concertId==='other'&&!window.bulkRetry){window.bulkRetry=true;throw Error('Bulk onderbroken');}return body.concertId==='antoon'&&body.number===2?{status:'conflict'}:{status:'verified',verified:true,created:body.concertId==='other'};}if(body.operation==='preview')return{number:body.number,status:body.number<3?'ready':'missing',checksum:'a'.repeat(64),markdown:body.number<3?'Samenvatting <img src=x onerror=alert(1)>':undefined};if(body.number===2&&window.fail)throw Error('Onderbroken');return{status:'verified',verified:true};}});window.ready=true;</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/^import .*;\n/gm,''):readFileSync(file));});await new Promise(done=>server.listen(0,'127.0.0.1',done));
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
 await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let n=0;n<100;n++){if(await evaluate('window.ready===true'))break;await pause(30);}
 assert.equal(await evaluate('window.operations.length'),0);
 await evaluate("document.querySelectorAll('button')[0].click()");await pause(40);
 assert.equal(await evaluate("document.querySelectorAll('option').length"),2);
 await evaluate("const search=document.querySelector('input');search.value='Antoon';search.dispatchEvent(new Event('input'))");
 assert.equal(await evaluate("document.querySelectorAll('option').length"),1);
 await evaluate("document.querySelectorAll('button')[1].click()");await pause(150);
 assert.equal(await evaluate("document.querySelectorAll('details').length"),11);
 assert.equal(await evaluate("document.querySelectorAll('img').length"),0);
 assert.equal(await evaluate("document.querySelectorAll('button')[2].disabled"),false);
 await evaluate("document.querySelectorAll('button')[2].click()");await pause(50);
 assert.equal(await evaluate("document.querySelector('[role=status]').textContent"),'Onderbroken');
 assert.equal(await evaluate("document.querySelectorAll('summary')[0].textContent"),'Analyse 1 · Teruggelezen en gecontroleerd');
 await evaluate("window.fail=false;document.querySelectorAll('button')[2].click()");await pause(50);
 assert.match(await evaluate("document.querySelector('[role=status]').textContent"),/2 analyses bevestigd/);
 assert.equal(await evaluate("window.operations.filter(row=>row.operation==='import'&&row.number===1).length"),1,'Resume repeats only unconfirmed rows');
 assert.equal(await evaluate("document.querySelectorAll('button')[2].disabled"),true);
 await evaluate("document.querySelectorAll('button')[3].click();document.querySelectorAll('button')[3].click()");await pause(100);
 assert.equal(await evaluate("document.querySelector('[role=status]').textContent"),'Bulk onderbroken');
 assert.equal(await evaluate("document.querySelectorAll('button')[3].textContent"),'Alle AI-analyses hervatten');
 assert.equal(await evaluate("window.operations.filter(row=>row.operation==='inventory'&&row.concertId==='antoon').length"),1);
 await evaluate("document.querySelectorAll('button')[3].click()");await pause(100);
 assert.match(await evaluate("document.querySelector('[role=status]').textContent"),/2 shows gecontroleerd. 2 analyses bevestigd \(1 nieuw\), 19 niet aanwezig in Drive, 1 conflicten/);
 assert.equal(await evaluate("window.operations.filter(row=>row.operation==='bulk-import'&&row.concertId==='antoon'&&row.number===1).length"),1);
 assert.equal(await evaluate("window.operations.filter(row=>row.operation==='bulk-import').length"),4,'Only available files, with a single retry');
 assert.match(await evaluate("document.querySelector('main').textContent"),/afwijkende inhoud in Dataverse; niet overschreven/);
 assert.equal(await evaluate('window.choiceOperations?.length||0'),0,'No schema actions on page load or AI import');
 await evaluate("document.querySelectorAll('button')[4].click();document.querySelectorAll('button')[4].click()");await pause(100);
 assert.equal(await evaluate("document.querySelector('[role=status]').textContent"),'Publicatie onderbroken');
 assert.equal(await evaluate("window.choiceOperations.filter(row=>row.operation==='list').length"),1,'Double click cannot start two setups');
 assert.equal(await evaluate("document.querySelectorAll('button')[4].disabled"),false);
 await evaluate("document.querySelectorAll('button')[4].click()");await pause(100);
 assert.match(await evaluate("document.querySelector('[role=status]').textContent"),/23 van 24 bevestigd \(1 nieuw\), 1 conflicten/);
 assert.equal(await evaluate("document.querySelectorAll('main>section>div:last-child p').length"),24);
 assert.match(await evaluate("document.querySelector('main').textContent"),/Afwijkende bestaande lijst; niet aangepast/);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
 console.log('Datatransitie browser: selectie, veilige preview, gedeeltelijke import, hervatten bulk over alle shows, conflicten, hervatten en mobiel geslaagd.');

}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
