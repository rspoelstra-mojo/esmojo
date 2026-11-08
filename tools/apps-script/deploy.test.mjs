import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,existsSync,readdirSync,cpSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {deploy} from './deploy.mjs';
import {scriptSource} from './check-syntax.mjs';
const config=JSON.parse(readFileSync(new URL('./deployment.json',import.meta.url),'utf8'));
const env={CLASPRC_JSON:JSON.stringify({tokens:{default:{refresh_token:'fake-test-only'}}}),GITHUB_SHA:'a'.repeat(40)};
const manifest=JSON.stringify({timeZone:'Europe/Amsterdam',runtimeVersion:'V8',webapp:{access:'ANYONE_ANONYMOUS',executeAs:'USER_DEPLOYING'}});
function fixture({verifyOnly=false,missing=false,mismatch=false,wrongVersion=false,failCommand=null,staleReads=0}={}){
 const commands=[],pauses=[];let temporary,active=11,saved;
 const execute=(args,source)=>{
  temporary=dirname(source);const offset=args.includes('--json')?5:4,command=args[offset];commands.push(command);
  if(command===failCommand)throw {stderr:'Syntax error: Unexpected token = line: 42 file: Artists private-token'};
  if(command==='list-deployments')return JSON.stringify(missing?[]:[{deploymentId:config.deploymentId,versionNumber:wrongVersion?10:active===12&&staleReads-->0?11:active}]);
  if(command==='pull'){
   if(args.includes('--versionNumber')){
    assert.equal(args[offset+2],String(active));
    assert.equal(readdirSync(source).length,0,'Gepubliceerde bron moet in een lege map worden teruggelezen');
    cpSync(scriptSource,source,{recursive:true});
    if(mismatch)writeFileSync(join(source,'Artists.gs'),'// wrong deployed source');
   }else writeFileSync(join(source,'Code.gs'),'// old');
   writeFileSync(join(source,'appsscript.json'),manifest);writeFileSync(join(source,'Extra.gs'),'// preserve remote file');
  }
  if(command==='push'){
   assert.equal(readFileSync(join(source,'appsscript.json'),'utf8'),manifest);
   assert.match(readFileSync(join(source,'Code.gs'),'utf8'),/function doPost/);
   assert.equal(readFileSync(join(source,'Extra.gs'),'utf8'),'// preserve remote file');
   assert.ok(!existsSync(join(source,'credentials.json')));saved=true;
  }
  if(command==='create-version'){assert.ok(saved);assert.equal(args[offset+1],'ESMOJO '+env.GITHUB_SHA.slice(0,12));return JSON.stringify({versionNumber:12});}
  if(command==='update-deployment'){assert.equal(args[offset+1],config.deploymentId);active=12;return JSON.stringify({deploymentId:config.deploymentId,versionNumber:active});}
  return '';
 };
 return{commands,pauses,pause:async ms=>{pauses.push(ms);},execute,temporary:()=>temporary,env:{...env,...(verifyOnly?{APPS_SCRIPT_VERIFY_ONLY:'true'}:{})}};
}

test('Ontbrekende credentials veroorzaken geen netwerkactie',async()=>{
 await assert.rejects(deploy({env:{},execute:()=>assert.fail()}),/ontbreekt/);
 await assert.rejects(deploy({env:{CLASPRC_JSON:'{}'},execute:()=>assert.fail()}),/refresh token/);
});
test('Bestaande URL/manifest/remote extra bestanden blijven behouden en vaste gedeployde versie wordt teruggelezen',async()=>{
 const f=fixture();let health=0;
 const result=await deploy({...f,request:async url=>{health++;assert.equal(url,`https://script.google.com/macros/s/${config.deploymentId}/exec`);return Response.json({ok:false,error:'Gebruik een ondertekend serververzoek.'});}});
 assert.equal(result.versionNumber,12);assert.equal(health,1);
 assert.deepEqual(f.commands,['list-deployments','pull','push','create-version','update-deployment','list-deployments','pull']);assert.equal(existsSync(f.temporary()),false);
});
test('Alleen verifiëren leest de gepubliceerde versie zonder push, nieuwe versie of deploymentwrite',async()=>{
 const f=fixture({verifyOnly:true});assert.equal((await deploy({...f,verify:false})).versionNumber,11);
 assert.deepEqual(f.commands,['list-deployments','list-deployments','pull']);assert.equal(existsSync(f.temporary()),false);
});
test('Vertraagde Google-versiepropagatie wordt uitsluitend door begrensde reads bevestigd, zonder dubbele publicatie',async()=>{
 const f=fixture({staleReads:2});assert.equal((await deploy({...f,verify:false})).versionNumber,12);
 assert.deepEqual(f.pauses,[1000,2000]);assert.equal(f.commands.filter(c=>c==='create-version').length,1);assert.equal(f.commands.filter(c=>c==='update-deployment').length,1);assert.equal(f.commands.filter(c=>c==='push').length,1);
 const mismatch=fixture({wrongVersion:true});await assert.rejects(deploy({...mismatch,verify:false}),/APPS_SCRIPT_VERSION/);assert.equal(mismatch.pauses.length,5);assert.equal(mismatch.commands.filter(c=>c==='update-deployment').length,1);
});
test('Onbekende deployment, verkeerde versie en afwijkende bron falen gesloten en ruimen credentials op',async()=>{
 for(const [options,error]of [[{missing:true},/niet gevonden/],[{wrongVersion:true},/APPS_SCRIPT_VERSION/],[{mismatch:true},/SOURCE_MISMATCH/]]){
  const f=fixture(options);await assert.rejects(deploy({...f,verify:false}),error);assert.equal(existsSync(f.temporary()),false);
 }
});
test('Clasp-fouten geven veilige bruikbare diagnose en ruimen credentials op',async()=>{
 const f=fixture({failCommand:'push'});await assert.rejects(deploy({...f,verify:false}),error=>/APPS_SCRIPT_SOURCE_SYNTAX/.test(error.message)&&/Artists.gs:42/.test(error.message)&&!error.message.includes('private-token'));
 assert.equal(existsSync(f.temporary()),false);assert.ok(!f.commands.includes('update-deployment'));
});
test('Ongeldige clasp-JSON en onverwachte anonieme toegang worden nooit als publicatiesucces gemeld',async()=>{
 await assert.rejects(deploy({env,verify:false,execute:()=>'{private-token'}),error=>/APPS_SCRIPT_RESPONSE/.test(error.message)&&!error.message.includes('private-token'));
 const f=fixture();await assert.rejects(deploy({...f,request:async()=>Response.json({ok:true,secret:'never print'})}),error=>/anonieme toegang/.test(error.message)&&!error.message.includes('never print'));
});
