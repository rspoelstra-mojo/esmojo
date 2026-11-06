// Browsercontrole via aanwezige Chrome/CDP; geen extra dependency of verzendactie.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createServer as createTcpServer} from 'node:net';
import {resolve,join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createEmailPreviews} from './preview.mjs';
import {EMAIL_LOGO_URL,EMAIL_CONFIDENTIAL_FOOTER} from '../../server/email-template.js';
const directory=resolve(process.argv[2]||'/tmp/esmojo-email-preview');await createEmailPreviews(directory);
const chrome=process.env.CHROME_BIN||['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('Geen Chrome beschikbaar voor de e-mailpreviewcontrole.');
const userData=mkdtempSync(join(tmpdir(),'esmojo-email-chrome-'));
const server=createServer((req,res)=>{
 if(req.url==='/logo.png'){res.writeHead(200,{'Content-Type':'image/png'});res.end(readFileSync(new URL('../../public/brand/ESMOJO-logo-wit-email.png',import.meta.url)));return;}
 const file=['/account.html','/account-general.html','/show-report.html'].includes(req.url)?req.url.slice(1):'account-long.html';
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(readFileSync(resolve(directory,file),'utf8').replace(EMAIL_LOGO_URL,'/logo.png'));
});
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
 for(const fixture of ['account-long','show-report'])for(const width of [320,390,640,1024]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'+fixture+'.html'});
  let ready=false;for(let n=0;n<100;n++){ready=await evaluate("document.readyState==='complete'&&document.querySelector('.header-logo')?.complete&&document.querySelector('.header-logo')?.naturalWidth>0");if(ready)break;await pause(30);}
  assert.ok(ready,'Preview/logo niet geladen.');
  await evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)))');
  const metrics=await evaluate("(()=>{const action=document.querySelector('.action-link'),cell=document.querySelector('.action-cell'),logo=document.querySelector('.header-logo'),title=document.querySelector('.title'),header=logo.closest('.pad');return{overflow:document.documentElement.scrollWidth>innerWidth,radius:getComputedStyle(action).borderRadius,cellColor:getComputedStyle(cell).backgroundColor,headerColor:getComputedStyle(header).backgroundColor,logo:logo.naturalWidth,titleWidth:title.getBoundingClientRect().width,logoLeft:logo.getBoundingClientRect().left,titleRight:title.getBoundingClientRect().right,footer:document.querySelector('.email-footer').textContent.trim(),target:action.target,href:action.href,label:action.textContent,scripts:document.scripts.length};})()");
  assert.equal(metrics.overflow,false);assert.equal(metrics.radius,'8px');assert.ok(['rgba(0, 0, 0, 0)','rgb(255, 255, 255)'].includes(metrics.cellColor));assert.equal(metrics.headerColor,'rgb(0, 70, 242)');assert.ok(metrics.logo>0);assert.ok(metrics.titleRight<=metrics.logoLeft);assert.equal(metrics.footer,fixture==='show-report'?EMAIL_CONFIDENTIAL_FOOTER:'Event Safety Mobility Operations');if(fixture==='show-report'){assert.equal(metrics.target,'_blank');assert.equal(metrics.label,'Showprofiel openen');assert.equal(metrics.href,'https://esmojo.nl/rapportages/fictieve-preview');}assert.equal(metrics.scripts,0);
  const layout=await send('Page.getLayoutMetrics'),size=layout.cssContentSize;
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}});writeFileSync(resolve(directory,fixture+'-preview-'+width+'.png'),Buffer.from(screenshot.data,'base64'));
 }
 console.log('Account- en rapportagemailbrowsercontrole geslaagd op 320/390/640/1024px: logo, titel, mobiele overflow, knopcel, hoekradius en footer; geen echte mails.');
}finally{
 ws?.close();try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM');}catch{}if(child.exitCode===null)await Promise.race([new Promise(done=>child.once('exit',done)),pause(1000)]);
 server.closeAllConnections();await new Promise(done=>server.close(done));rmSync(userData,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
