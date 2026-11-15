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
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/report-web.css"><style>:root{--line:#ddd;--muted:#888;--fluid-card:#fff}body{margin:0;padding:16px;font-family:Arial;background:#fafafa}html[data-theme=dark] body{background:#0b1424;color:#f1f4ff}</style></head><body><a id="open" href="/rapportages/synthetic-report">Open rapportage</a><h2 id="submenu-title">Rapportages</h2><nav id="submenu"></nav><main></main><script type="module">
import{createReportsPage}from'/src/reports-page.js';import{createReportCatalogueCache}from'/src/lib/report-catalogue-cache.js';import{installRouter}from'/src/lib/router.js';
window.errors=[];window.calls=[];addEventListener('unhandledrejection',event=>{window.errors.push(event.reason?.message||'ERROR');event.preventDefault();});
const count=${Number(process.env.REPORT_PERF_INCIDENTS||500)},id='synthetic-report',date='2020-02-01',show={concertId:id,date,venue:'Ziggo Dome',revision:'a'.repeat(64)},menu={concertId:id,label:'Synthetische artiest',shows:[show],dates:[date]},data={show:{key:id,name:'Synthetische artiest',venue:'Ziggo Dome',dates:[date]},selectedDate:date,availableShows:[show],photo:{imageUrl:'https://www.mojo.nl/media/synthetic.jpg',sourceUrl:'https://www.mojo.nl/concerten/synthetic'},report:{timetable:{status:'missing'},kpis:{medical:{total:0,treatments:0,selfcare:0,unwell:0,contusion:0,ambulance:0},security:{total:count,verbal:0,physical:0,mischief:0,evictions:0,arrests:0}},types:{medical:[],security:[{name:'Overig',count}]},timeline:{points:[]},locations:[],incidents:Array.from({length:count},(_,i)=>({id:'synthetic-'+i,localDate:date,time:'20:00',zone:'Fictieve zone',type:'Overig',priority:'low',description:'Synthetische testinhoud. '.repeat(12),note:'Synthetische afhandeling',securityFilters:[],medicalFilters:[]}))}};
const request=async(action)=>{window.calls.push(action);if(action==='report-menu'){await new Promise(done=>setTimeout(done,2000));return{reports:[menu]};}if(action==='report-web'){await new Promise(done=>setTimeout(done,950));return data;}throw Error('UNEXPECTED_TEST_CALL');},cache=createReportCatalogueCache();cache.bind({id:'synthetic-viewer',role:'gebruiker',activated:true,modules:['reports']});installRouter({onNavigate:()=>{window.dispose?.();window.dispose=createReportsPage(document.querySelector('main'),document.querySelector('#submenu'),{selected:id,request,cache});}});window.ready=true;
</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/src/auth.js'){res.setHeader('Content-Type','text/javascript');res.end('export const access=()=>{throw Error("Onverwachte API-aanroep")};');return;}if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/shared/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/import\s*['"][^'"]+\.css['"];?/g,''):readFileSync(file));});
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
  await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector('#open').click()`);
  let duration=null;for(let n=0;n<150;n++){duration=await evaluate("document.querySelector('.web-report')?.dataset.reportReadyMs||null");if(duration!==null)break;await pause(15);}
  assert.ok(duration!==null,'Werkelijke rapportinhoud moet gereed komen');duration=Number(duration);assert.ok(duration<=1500,'Klik tot bruikbare inhoud: '+duration+'ms');
  assert.equal(await evaluate("document.querySelectorAll('.report-incident').length"),Number(process.env.REPORT_PERF_INCIDENTS||500));assert.equal(await evaluate("document.querySelectorAll('.report-stat-filter').length"),10);assert.equal(await evaluate("document.querySelector('.report-artist-photo img').complete"),true);
  await pause(1200);assert.equal(await evaluate("window.calls.filter(action=>action==='report-web').length"),1,'Menuverversing mag de eerste opening niet opnieuw laden');assert.deepEqual(await evaluate('window.errors'),[]);
  await evaluate("document.querySelector('[data-report-filter=evictions]').click()");assert.equal(await evaluate("document.querySelectorAll('.report-incident').length"),0);await evaluate("document.querySelector('.report-clear-filter').click()");assert.equal(await evaluate("document.querySelectorAll('.report-incident').length"),Number(process.env.REPORT_PERF_INCIDENTS||500));
  timings.push({theme,width,clickToReadyMs:duration,simulatedBackendMs:950});
 }
 console.log(JSON.stringify({kind:'synthetic-click-to-paint',incidents:Number(process.env.REPORT_PERF_INCIDENTS||500),timings}));
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
