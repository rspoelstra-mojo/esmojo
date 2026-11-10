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
const html=`<!doctype html><html><head><link rel="stylesheet" href="/src/artists-page.css"><style>:root{--line:#ddd;--fluid-card:#fff;--muted:#888}body{font-family:Arial;margin:24px}</style></head><body><h2 id="submenu-title">Artiesten</h2><nav id="submenu"></nav><main id="content"></main><script type="module">
import{createArtistsPage}from'/src/artists-page.js';
window.mount=()=>{window.dispose?.();window.calls=[];window.gates=[];window.requested=[];window.signals=[];
const artist={id:'a_'+'a'.repeat(64),name:'Fixture'},state={artists:[artist],mostViewed:[],rankingLoaded:true};
const cache={current:()=>state,trackDetail(){},subscribe:()=>()=>{},refreshMenu:async()=>{},refreshRanking:async()=>{},detail:()=>{window.requested.push('profile');return new Promise(done=>window.resolveDetail=()=>done({artist,requestedReference:'fixture',canonicalArtistId:artist.id,canonicalArtistSlug:'fixture',profile:{audience:['Publiek'],concerts:[{venue:'Gashouder',dates:['2020-01-01','2021-01-01','2022-01-01']}]}}));}};
window.dispose=createArtistsPage(document.querySelector('#content'),document.querySelector('#submenu'),{selected:'fixture',cache,request:async(action,{body,signal})=>{if(action==='artist-risk'){window.requested.push('risk');window.riskSignal=signal;return new Promise(done=>window.resolveRisk=()=>done({score:{status:'incomplete',total:29.33,parts:{visitors:null,artist:null,operational:null,incidents:29.33},concerts:2,level:null},pending:false}));}window.calls.push(body.date);window.signals.push(signal);await new Promise((resolve,reject)=>window.gates.push({resolve,reject}));return{show:{name:'Fixture',date:body.date,venue:body.venue},kpis:null};}});
};window.mount();
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
 for(let n=0;n<100;n++){if(await evaluate("window.requested?.length===2"))break;await pause(20);}
 assert.deepEqual(await evaluate('window.requested'),['profile','risk']);
 assert.equal(await evaluate("document.querySelectorAll('.artist-page').length"),0);
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),false);
 await evaluate('window.resolveDetail()');await pause(30);
 assert.equal(await evaluate("document.querySelectorAll('.artist-page').length"),0);assert.equal(await evaluate('window.calls.length'),0);
 await evaluate('window.resolveRisk()');
 for(let n=0;n<100;n++){if(await evaluate("window.calls.length===1"))break;await pause(20);}
 assert.equal(await evaluate("document.querySelector('.artist-score-total').textContent"),'29 / 100');
 assert.equal(await evaluate("document.querySelector('.artist-score-segment').style.width"),'29%');
 assert.deepEqual(await evaluate('window.calls'),['2022-01-01']);
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),true);
 assert.equal(await evaluate("document.querySelectorAll('.artist-concert-select[aria-busy],.artist-concert-select[data-load-state]').length"),0);
 await evaluate("document.querySelector('[data-concert-date=\"2020-01-01\"]').click()");
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),false);
 assert.equal(await evaluate("document.querySelectorAll('.artist-concert-select[aria-busy]').length"),0);
 await evaluate('window.gates[0].resolve()');await pause(50);assert.deepEqual(await evaluate('window.calls'),['2022-01-01','2020-01-01']);
 await evaluate("document.querySelector('[data-concert-date=\"2022-01-01\"]').click()");
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),true,'Gecachte keuze beëindigt rondje van oude selectie');
 await evaluate("document.querySelector('[data-concert-date=\"2020-01-01\"]').click()");
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),false);assert.equal(await evaluate('window.calls.length'),2);
 await evaluate('window.gates[1].resolve()');await pause(50);
 assert.equal(await evaluate("document.querySelector('.artist-show-title').textContent.includes('2020')"),true);
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),true);
 assert.deepEqual(await evaluate('window.calls'),['2022-01-01','2020-01-01','2021-01-01']);
 await evaluate("document.querySelector('[data-concert-date=\"2022-01-01\"]').click()");assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),true);
 await evaluate("window.gates[2].reject(Error('synthetic background failure'))");await pause(30);
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),true);
 await evaluate("document.querySelector('[data-concert-date=\"2021-01-01\"]').click()");
 assert.equal(await evaluate("document.querySelector('[aria-current=page] .submenu-spinner').hidden"),false);assert.equal(await evaluate('window.calls.length'),4);
 await evaluate('window.dispose();window.gates[3].resolve()');await pause(30);
 assert.equal(await evaluate("document.querySelector('#content').children.length"),0);assert.equal(await evaluate('window.signals[3].aborted'),true);
 // Ook als de score eerst klaar is: geen gedeeltelijke landing en geen rapport-start.
 await evaluate('window.mount();window.resolveRisk()');await pause(30);assert.equal(await evaluate("document.querySelectorAll('.artist-page').length"),0);assert.equal(await evaluate('window.calls.length'),0);
 await evaluate('window.dispose();window.resolveDetail()');await pause(30);assert.equal(await evaluate('window.riskSignal.aborted'),true);assert.equal(await evaluate("document.querySelector('#content').children.length"),0);assert.equal(await evaluate('window.calls.length'),0);
 console.log('Browser: profiel+score parallel en samen zichtbaar, hele punten direct gevuld; rapporten daarna stil nieuwste-eerst; klikprioriteit/submenu-spinner, cache, retry en annulering.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
