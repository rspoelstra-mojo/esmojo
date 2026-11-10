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
const html=`<!doctype html><html><head><link rel="stylesheet" href="/src/artists-page.css"><link rel="stylesheet" href="/src/detail-back.css"><style>:root{--line:#e5e7eb;--muted:#858995;--fluid-card:#fff}*{box-sizing:border-box}body{margin:0;padding:24px;background:#fafafa;color:#242424;font-family:Arial}html[data-theme=dark]{--line:#343a45;--muted:#a1a8b5;--fluid-card:#191e27}html[data-theme=dark] body{background:#11151c;color:#f2f4f8}</style></head><body><script type="module">import{renderArtistProfile}from'/src/artist-profile.js';window.reads=[];window.biography='Dit is de oorspronkelijke '+Array.from({length:66},(_,i)=>'woord'+i).join(' ');window.profile=renderArtistProfile('BUNT.',{photo:'https://www.mojo.nl/media/fixture.png',biography:{text:window.biography},latestDate:'2026-11-05',concerts:[{venue:'Gashouder',dates:['2026-11-04','2026-11-05','2025-06-14','2026-11-08','2026-11-09']},{venue:'Ziggo Dome',dates:['2024-02-02']}],audience:['Evenwichtige verdeling.','25 tot 60 jaar.','Verspreide aankomst.','Betrokken publiek.']},{now:()=>Date.parse('2026-11-08T12:00:00Z'),loadShow:async event=>{window.reads.push(event);const data={show:{name:'Voorbeeldartiest',...event},preparation:event.date==='2025-06-14'?null:{showId:'fixture-series',general:{eventSafetyManager:'Fixture Manager',soldTickets:600,foreignPercentage:20},production:{barrier:'End-stage met GC',densities:[{name:'Staanplaatsen',density:2.5},{name:'Golden Circle',density:3}],fireworks:false,openFire:true,drones:false},riskCounts:{low:2,medium:3,high:1,measures:4,unassessed:0}},kpis:event.date==='2025-06-14'?null:{medical:{total:34,treatments:28,selfcare:6,unwell:10,contusion:6,ambulance:0},security:{total:27,verbal:1,physical:0,mischief:4,evictions:2,arrests:1}},reportId:event.date==='2025-06-14'?null:'fixture-'+event.date,timetable:{status:'available',entries:[{kind:'doors',time:'18:30',label:'Deuren',publishedLabel:'Deuren open'},{kind:'act',time:'20:00',label:'Voorbeeldartiest',publishedLabel:'Aanvang Voorbeeldartiest'}]}};if(event.date==='2024-02-02')return new Promise(resolve=>window.resolveLate=()=>resolve(data));return data;}});document.body.append(window.profile);</script></body></html>`;
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/src/')&&!file.startsWith(root+'/shared/')){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(file.endsWith('.js')?readFileSync(file,'utf8').replace(/import\s*['"][^'"]+\.css['"];?/g,''):readFileSync(file));});
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
 for(const theme of ['light','dark'])for(const width of [390,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
  for(let n=0;n<100;n++){if(await evaluate("document.querySelectorAll('.artist-timeline-event').length===6"))break;await pause(30);}
  await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  assert.equal(await evaluate("document.querySelectorAll('.artist-concert-select:disabled').length"),2);
  assert.equal(await evaluate("document.querySelector('.artist-profile-photo-link').href"),'https://www.mojo.nl/bunt');
  assert.equal(await evaluate("document.querySelector('.artist-biography').textContent.split(/\\s+/).length"),65);
  assert.equal(await evaluate("document.querySelector('.artist-biography').textContent.endsWith('...')"),true);
  assert.equal(await evaluate("window.biography.split(/\\s+/).length"),70);
  assert.equal(await evaluate("document.querySelectorAll('.artist-score-segment').length"),0);
  assert.equal(await evaluate("document.querySelector('.artist-score-remaining').style.width"),'100%');
  assert.equal(await evaluate("document.querySelector('.artist-score-total').textContent"),'— / 100');
  assert.equal(await evaluate("document.querySelectorAll('.artist-score-legend dd').length"),4);
  await evaluate("window.profile.updateRisk({status:'incomplete',total:12.5,parts:{visitors:null,artist:null,operational:null,incidents:12.5},concerts:2})");
  assert.equal(await evaluate("document.querySelector('.artist-score-status').hidden"),true);
  assert.equal(await evaluate("document.querySelectorAll('.artist-score-segment').length"),0);
  assert.equal(await evaluate("document.querySelector('.artist-score-total').textContent"),'— / 100');
  assert.equal(await evaluate("document.querySelector('.artist-score-empty').textContent"),'Nog geen risicoscore beschikbaar');
  await evaluate("window.profile.updateRisk({status:'complete',availableMaximum:100,total:84,level:'Hoog risico',parts:{visitors:25,artist:25,operational:15,incidents:19},incidents:{security:19,medical:0},concerts:1})");
  assert.equal(await evaluate("document.querySelector('.artist-score-status').textContent"),'Volledige risicoscore');
  assert.equal(await evaluate("document.querySelector('.artist-score-status').classList.contains('artist-score-status-complete')"),true);
  assert.equal(await evaluate("document.querySelector('.artist-score-total').textContent"),'84,00 / 100');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.artist-score-legend dd')].map(el=>el.textContent)"),['25,00 / 25','25,00 / 25','15,00 / 15','19,00 / 35']);
  assert.equal(await evaluate("[...document.querySelectorAll('.artist-score-segment')].reduce((sum,el)=>sum+parseFloat(el.style.width),0)"),84);
  assert.equal(await evaluate("document.querySelector('.artist-score-remaining').style.width"),'16%');
  assert.equal(await evaluate("document.querySelector('.artist-score-level').textContent"),'Hoog risico');
  if(width===1440)assert.equal(await evaluate("(()=>{const badge=document.querySelector('.artist-score-status').getBoundingClientRect(),heading=document.querySelector('.artist-score-heading').getBoundingClientRect(),icon=document.querySelector('.artist-score-heading .artist-audience-icon').getBoundingClientRect();return Math.abs(badge.right-heading.right)<1&&Math.abs(badge.top-icon.top)<1;})()"),true);
  assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false);
  await evaluate("window.profile.updateRisk(null,{reliability:'unreliable',reason:'UNRELIABLE_REFERENCE'})");
  assert.equal(await evaluate("document.querySelector('.artist-score-card').dataset.scoreStatus"),'unreliable');
  assert.equal(await evaluate("document.querySelector('.artist-score-body').textContent.includes('niet betrouwbaar')"),true);
  assert.equal(await evaluate("document.querySelectorAll('.artist-score-segment').length"),0);
  await evaluate("window.profile.updateRisk(null)");

  const layout=await evaluate("(()=>{const page=document.querySelector('.artist-page').getBoundingClientRect(),header=document.querySelector('.artist-page-heading').getBoundingClientRect(),history=document.querySelector('.artist-concert-history').getBoundingClientRect(),main=document.querySelector('.artist-profile-main').getBoundingClientRect();return{full:Math.abs(header.width-page.width)<1,above:header.bottom<history.top,left:Math.abs(history.left-page.left)<1,ratio:history.width/main.width,stacked:history.bottom<main.top}})()");
  assert.equal(layout.full,true);assert.equal(layout.above,true);assert.equal(layout.left,true);if(width===1440)assert.ok(Math.abs(layout.ratio-.5)<.01);else assert.equal(layout.stacked,true);

  assert.equal(await evaluate("getComputedStyle(document.querySelector('.artist-event-past')).backgroundColor===getComputedStyle(document.querySelector('.artist-event-upcoming')).backgroundColor"),true);
  await evaluate("document.querySelector('[data-concert-date=\"2026-11-08\"]').click();document.querySelector('[data-concert-date=\"2026-11-09\"]').click()");
  assert.equal(await evaluate('window.reads.length'),0);
  await evaluate("document.querySelector('[data-concert-date=\"2026-11-04\"]').click()");
  for(let n=0;n<100;n++){if(await evaluate("!!document.querySelector('.artist-show-medical')"))break;await pause(20);}
  assert.equal(await evaluate("document.querySelector('.artist-score-card').hidden&&getComputedStyle(document.querySelector('.artist-score-card')).display==='none'"),true);
  const metrics=await evaluate(`(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.artist-show-card h3')].map(x=>x.textContent),totals:[...document.querySelectorAll('.artist-show-total')].map(x=>x.textContent),filters:document.querySelectorAll('[data-report-filter]').length,href:document.querySelector('.artist-show-report-link').getAttribute('href'),audience:document.querySelectorAll('.artist-audience-grid').length}))()`);
  assert.equal(metrics.overflow,false);assert.deepEqual(metrics.cards,['Algemene informatie','Tijdschema','Beveiliging','Productioneel','Medisch','Risico analyse']);assert.deepEqual(metrics.totals,['27','34']);assert.equal(metrics.filters,0);assert.equal(metrics.href,'/rapportages/fixture-2026-11-04');assert.equal(metrics.audience,0);assert.equal(await evaluate("document.querySelector('.artist-biography').textContent.startsWith('Dit is de oorspronkelijke')&&!document.querySelector('.artist-page-heading').textContent.includes('Laatste keer in Nederland')&&!document.querySelector('.artist-page-heading').textContent.includes('Populariteit')"),true);assert.equal(await evaluate("(async()=>{const{renderArtistShowOverview}=await import('/src/artist-show-overview.js');const el=renderArtistShowOverview({show:{name:'Fixture',date:'2026-11-04',venue:'AFAS Live'}});return el.querySelector('.artist-show-general').textContent.includes('Projectleider TSC:')&&!el.querySelector('.artist-show-general').textContent.includes('Projectleider The Firm:');})()"),true);assert.equal(await evaluate("document.querySelector('.artist-show-general').textContent.includes('Projectleider The Firm:')&&!document.querySelector('.artist-show-general').textContent.includes('Projectleider TSC:')"),true);assert.deepEqual(await evaluate("[...document.querySelectorAll('.artist-show-timetable dt')].map(x=>x.textContent)"),['Deuren open','Aanvang Voorbeeldartiest']);
  assert.equal(await evaluate("document.querySelectorAll('.artist-event-past .artist-concert-arrow').length"),4);assert.equal(await evaluate("document.querySelectorAll('.artist-event-upcoming .artist-concert-arrow').length"),0);
  assert.equal(await evaluate("document.querySelector('.artist-show-general').textContent.includes('600')&&document.querySelector('.artist-show-general').textContent.includes('20%')"),true);
  assert.equal(await evaluate("document.querySelector('.artist-show-production').textContent.includes('2,50 bezoekers/m²')&&!document.querySelector('.artist-show-production').textContent.includes('Staanplaatsen:')&&!document.querySelector('.artist-show-production').textContent.includes('Golden Circle')&&document.querySelector('.artist-show-production').textContent.includes('Nee')"),true);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.artist-risk-tile dd')].map(x=>x.textContent)"),['2','3','1','4']);
  assert.equal(await evaluate("document.querySelector('.artist-show-open-link').getAttribute('href')"),'/shows/fixture-series');
  assert.equal(await evaluate("!!document.querySelector('.artist-show-back svg')&&document.querySelector('.artist-show-back').textContent===''&&document.querySelector('.artist-show-title').getBoundingClientRect().left>document.querySelector('.artist-show-back').getBoundingClientRect().right"),true);

  if(width===1440)assert.equal(await evaluate("document.querySelector('.artist-show-security').getBoundingClientRect().top===document.querySelector('.artist-show-production').getBoundingClientRect().top&&document.querySelector('.artist-show-medical').getBoundingClientRect().top===document.querySelector('.artist-show-risks').getBoundingClientRect().top"),true);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync('/tmp/artist-layout-'+theme+'-'+width+'.png',Buffer.from(shot.data,'base64'));
  await evaluate("document.querySelector('.artist-show-back').click()");assert.equal(await evaluate("document.querySelector('.artist-score-card').hidden"),false);assert.equal(await evaluate("document.querySelectorAll('.artist-audience-grid').length"),1);
  await evaluate("document.querySelector('[data-concert-date=\"2025-06-14\"]').click()");await pause(50);
  assert.equal(await evaluate("document.querySelector('.artist-show-medical p').textContent"),'Geen informatie beschikbaar');assert.equal(await evaluate("document.querySelector('.artist-show-security p').textContent"),'Geen informatie beschikbaar');assert.equal(await evaluate("document.querySelector('.artist-show-report-link').disabled"),true);assert.equal(await evaluate("document.querySelector('.artist-show-general').textContent.includes('Nog toe te voegen')"),true);
  await evaluate("document.querySelector('[data-concert-date=\"2024-02-02\"]').click();document.querySelector('[data-concert-date=\"2026-11-05\"]').click()");await pause(50);await evaluate('window.resolveLate()');await pause(50);
  assert.equal(await evaluate("document.querySelector('.artist-show-report-link').getAttribute('href')"),'/rapportages/fixture-2026-11-05');
  await evaluate("document.querySelector('[data-concert-date=\"2024-02-02\"]').click();window.profile.dispose();window.resolveLate()");await pause(50);
  assert.equal(await evaluate("document.querySelector('.artist-show-report-link').getAttribute('href')"),'/rapportages/fixture-2026-11-05');
 }
 console.log('Showoverview browser checks passed: 390/1440px light/dark; past-only selection, six cards, exact KPIs, no filters, missing report, return, races and disposal.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
