import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {harness} from './test-support/production-drive.js';import {makeAccountsHandler} from './accounts-api.js';
const actor='home-test-actor';
function homeHarness(){
 const h=harness();h.ctx.Utilities.formatDate=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 h.ctx.esmojoPdfSnapshot_=(id,target)=>({target,revision:Object.keys(JSON.parse(h.registerFile.content).reports)[0]});
 for(const name of ['AccountModules.gs','HomeCatalogue.gs','HomeDashboard.gs'])vm.runInContext(readFileSync('google-apps-script/'+name,'utf8'),h.ctx);
 const root=h.ctx.DriveApp.getFolderById('1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk');h.add(root,'_esmojo_accounts_v1.json',{profiles:[{id:actor,activated:true,modules:['shows']},{id:'reports-only',activated:true,modules:['reports']},{id:'disabled',activated:true,disabled:true,modules:['shows']}]});
 h.index.active=[h.concertId,h.laterId];h.index.checkedAt=new Date().toISOString();h.index.concerts[0].assignments=[{userId:actor,role:'event-safety-manager'}];h.indexFile.content=JSON.stringify(h.index);return h;
}
test('Ondertekende dashboard-read hergebruikt canonieke planningmetadata, geen ticketinhoud/PDF-bytes of writes',async()=>{
 const h=homeHarness(),data=await h.shows('home-dashboard',{actor});assert.equal(data.shows.length,1);const show=data.shows[0];assert.equal(show.key,h.concertId);assert.equal(show.assigned,true);assert.deepEqual(show.dates,['2026-11-06','2026-11-07']);assert.equal(show.snapshot.pdf.state,'ready');assert.equal(show.snapshot.risks.assessments.barrier.completed,false);assert.equal(h.writes(),0);
 for(const field of ['pdfBase64','affectedPerson','ticket_sales','analyses','leases','history','userId','folderId'])assert.equal(JSON.stringify(data).includes('"'+field+'"'),false,field);
 const metadata=await h.shows('home-metadata',{actor,concertId:h.concertId});assert.deepEqual(Object.keys(metadata.show).sort(),['city','dates','key','name','venue']);
 await assert.rejects(h.shows('home-dashboard',{actor,concertId:h.concertId}),/VALIDATION/);await assert.rejects(h.shows('home-metadata',{actor,concertId:'Onbekend'}),/NOT_FOUND/);
});
test('Drive-brug controleert opnieuw de actuele actieve Shows-module; extra actor/filevelden worden geweigerd',async()=>{
 const h=homeHarness();for(const id of ['reports-only','disabled','onbekend'])await assert.rejects(h.shows('home-dashboard',{actor:id}),/FORBIDDEN/);
 await assert.rejects(h.shows('home-metadata',{actor,concertId:h.concertId,fileId:'other'}),/VALIDATION/);
 h.ctx.esmojoHomeSnapshot_=()=>{throw Error('Bron gewijzigd');};const data=await h.shows('home-dashboard',{actor});assert.equal(data.shows[0].planningUnavailable,true);assert.equal(data.shows[0].snapshot,undefined);assert.equal(h.writes(),0);
});
test('Serverhandelingen vereisen MFA, activering, niet verlopen sessie en Shows; beheerder zonder module krijgt geen gegevens',async()=>{
 for(const action of ['home-dashboard','home-metadata'])for(const input of [{token:false},{aal:'aal1'},{activated:false},{expired:true},{modules:['reports']},{role:'beheerder',modules:[]},{}]){
  let calls=0;const claims={sub:actor,aal:input.aal||'aal2',amr:[{method:'password',timestamp:Math.floor(Date.now()/1000)-(input.expired?73*3600:0)},{method:'totp'}]},token='h.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.s';
  const handler=makeAccountsHandler({env:{VITE_SUPABASE_URL:'url',VITE_SUPABASE_PUBLISHABLE_KEY:'key',SUPABASE_SECRET_KEY:'secret'},clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:actor,factors:[{factor_type:'totp',status:'verified'}]}}})}}),profiles:async()=>({id:actor,activated:input.activated!==false,role:input.role||'gebruiker',modules:input.modules||['shows']}),shows:async(operation,payload)=>{calls++;assert.equal(operation,action);assert.equal(payload.actor,actor);return{shows:[]};}});
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await handler({method:action==='home-dashboard'?'GET':'POST',query:{action},body:action==='home-metadata'?{concertId:'Show_Gashouder_06112026'}:undefined,headers:{authorization:input.token===false?undefined:'Bearer '+token}},res);
  const allowed=Object.keys(input).length===0;assert.equal(calls,allowed?1:0,JSON.stringify(input));assert.equal(res.code,allowed?200:input.token===false||input.expired?401:403);
 }
});
