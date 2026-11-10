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
const html=`<!doctype html><html><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/accounts.css"><link rel="stylesheet" href="/src/dataverse-test.css"></head><body><main id="content"></main><script type="module">import{createDataverseTestView}from'/src/dataverse-test.js';window.calls=0;window.cleanup=createDataverseTestView(document.querySelector('main'),{request:async()=>{window.calls++;return new Promise(resolve=>window.finish=resolve);}});window.ready=true;</script></body></html>`;
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
 assert.equal(await evaluate('window.calls'),0,'Geen automatische verbindingstest');
 await evaluate("document.querySelector('button').click();document.querySelector('button').click()");assert.equal(await evaluate('window.calls'),1);assert.equal(await evaluate("document.querySelector('button').disabled"),true);
 await evaluate("window.finish({configuration:true,token:true,dataverse:false,code:'DATAVERSE_FORBIDDEN'})");await pause(20);
 assert.equal(await evaluate("document.querySelector('button').disabled"),false);assert.equal(await evaluate("document.querySelector('code').textContent"),'DATAVERSE_FORBIDDEN');assert.equal(await evaluate("document.querySelectorAll('li').length"),3);
 await evaluate("document.querySelector('button').click();window.finish({configuration:true,token:true,dataverse:true,code:'CONNECTION_OK'})");await pause(20);assert.equal(await evaluate("document.querySelector('code').textContent"),'CONNECTION_OK');
 await evaluate("document.querySelectorAll('button')[1].click();document.querySelector('button').click()");assert.equal(await evaluate('window.calls'),3);assert.equal(await evaluate("document.querySelectorAll('button')[1].disabled"),true);
 await evaluate("window.finish({configuration:true,token:true,dataverse:true,tableFound:true,tableRead:false,code:'TEST_TABLE_READ_FORBIDDEN'})");await pause(20);assert.equal(await evaluate("document.querySelectorAll('li').length"),5);assert.equal(await evaluate("document.querySelector('code').textContent"),'TEST_TABLE_READ_FORBIDDEN');
 await evaluate("document.querySelector('button').click();window.cleanup();document.querySelector('main').replaceChildren();window.finish({code:'STALE'})");await pause(20);assert.equal(await evaluate("document.querySelector('main').children.length"),0);
 console.log('Dataverse-testpagina: uitsluitend klik, één lopende test, afzonderlijke stappen/diagnose, herstel en geen late resultaten na navigatie.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
