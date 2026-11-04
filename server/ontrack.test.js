import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import {createOnTrackStore,validateOnTrackRecipients} from './ontrack-store.js';
const admin='11111111-1111-4111-8111-111111111111',user='22222222-2222-4222-8222-222222222222',inactive='33333333-3333-4333-8333-333333333333';
const folderId='1V5lw-IicMW_bkphtjD4HIEejCpsOapps',rootId='1HT5DXCzW_Nkzx45Q2HRS_8ck3e7hqHHk',secret='fixture-secret-'.repeat(4);
function fixture(){
 const profiles=[{id:admin,role:'beheerder',activated:true,email:'admin@example.invalid'},{id:user,role:'gebruiker',activated:true,email:'user@example.invalid'},{id:inactive,role:'gebruiker',activated:false}],files=[],reads=[];let stored=null,locked=false;
 const iterator=items=>{let i=0;return{hasNext:()=>i<items.length,next:()=>items[i++]};};
 const file=(id,name)=>({getId:()=>id,getName:()=>name,isTrashed:()=>false,getDateCreated:()=>new Date('2026-11-03T01:00:00Z'),getLastUpdated:()=>new Date('2026-11-03T01:00:00Z')});files.push(file('csv1','Tickets.CSV'),file('ignore','notes.txt'));
 const register={getBlob:()=>({getDataAsString:()=>stored}),setContent:value=>{stored=value;}};
 const context={ESMOJO_FOLDER_ID:rootId,Set,Date,JSON,Number,Error,Utilities:{Charset:{UTF_8:'UTF-8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,s)=>[...createHash('sha256').update(s).digest()],computeHmacSha256Signature:(s,key)=>[...createHmac('sha256',key).update(s).digest()],newBlob:data=>data},PropertiesService:{getScriptProperties:()=>({getProperty:()=>secret})},LockService:{getScriptLock:()=>({tryLock:()=>{locked=true;return true;},releaseLock:()=>{locked=false;}})},esmojoReply_:value=>value,DriveApp:{getFolderById:id=>{reads.push(id);assert.ok([folderId,rootId].includes(id));if(id===rootId)return{getFoldersByName:()=>iterator([]),getFilesByName:()=>iterator([{getBlob:()=>({getDataAsString:()=>JSON.stringify({profiles})})}])};return{isTrashed:()=>false,getFilesByName:name=>iterator(name==='_esmojo_ontrack_v1.json'&&stored?[register]:[]),getFiles:()=>iterator(files),createFile:data=>{stored=data;return register;}};}}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../google-apps-script/AccountModules.gs',import.meta.url),'utf8'),context);vm.runInContext(readFileSync('google-apps-script/OnTrackReports.gs','utf8'),context);vm.runInContext(readFileSync('google-apps-script/OnTrack.gs','utf8'),context);
 const store=createOnTrackStore({env:{GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/fixture/exec',GOOGLE_DRIVE_SHARED_SECRET:secret},request:async(url,options)=>{const result=context.esmojoOnTrack_(JSON.parse(options.body));return{ok:true,json:async()=>JSON.parse(JSON.stringify(result))};}});
 return{store,context,profiles,files,file,reads,get stored(){return stored;},get locked(){return locked;}};
}
test('Ondertekende inventaris registreert echte CSV’s eenmaal, bewaart historie en wijzigt geen showbestanden',async()=>{
 const f=fixture(),first=await f.store('status',admin);assert.equal(first.received,1);assert.equal(first.converted,0);assert.deepEqual(first.latest,[]);assert.equal(first.processingStatus,'idle');assert.equal(f.locked,false);
 assert.equal((await f.store('status',admin)).received,1);f.files.push(f.file('csv2','Nieuwe.csv'));assert.equal((await f.store('status',admin)).received,2);f.files.splice(0,1);assert.equal((await f.store('status',admin)).received,2);assert.equal(JSON.parse(f.stored).sources.length,2);
 const state=JSON.parse(f.stored);state.reports=Array.from({length:6},(_,i)=>({sourceId:'s'+i,pdfId:'p'+i,name:'fixture'+i+'.csv',convertedAt:`2026-11-0${i+1}T12:00:00Z`,emailStatus:i===5?'sent':'pending'}));f.context.DriveApp.getFolderById(folderId).getFilesByName('_esmojo_ontrack_v1.json').next().setContent(JSON.stringify(state));
 const status=await f.store('status',admin);assert.equal(status.converted,6);assert.equal(status.latest.length,5);assert.equal(status.latest[0].name,'fixture5.csv');assert.equal(status.latest[0].emailStatus,'sent');
});
test('Ontvangers persistent per account-ID, actuele actieve accounts, revisieconflict en tweede autorisatie in Drive',async()=>{
 const f=fixture();await f.store('status',admin);const result=await f.store('recipients',admin,{revision:0,recipientIds:[user]});assert.equal(result.revision,1);assert.deepEqual((await f.store('status',admin)).recipientIds,[user]);
 await assert.rejects(f.store('recipients',admin,{revision:0,recipientIds:[]}),/CONFLICT/);await assert.rejects(f.store('recipients',admin,{revision:1,recipientIds:[inactive]}),/VALIDATION/);await assert.rejects(f.store('recipients',admin,{revision:1,recipientIds:[user,user]}),/VALIDATION/);await assert.rejects(f.store('status',user),/FORBIDDEN/);
 assert.deepEqual(JSON.parse(f.stored).recipientIds,[user]);assert.equal(f.context.esmojoOnTrack_({body:'{}',timestamp:Date.now(),nonce:'a'.repeat(32),signature:'0'.repeat(64)}).ok,false);assert.equal(f.locked,false);
});
test('Server valideert ontvangers en bewaart veilige generieke brugfouten',async()=>{
 assert.deepEqual(validateOnTrackRecipients({revision:0,recipientIds:[]}),{revision:0,recipientIds:[]});for(const input of [{revision:0,recipientIds:[user,user]},{revision:-1,recipientIds:[]},{revision:0,recipientIds:[],email:'free@example.invalid'},{revision:0,recipientIds:['bogus']}])assert.throws(()=>validateOnTrackRecipients(input),/VALIDATION/);
 const env={GOOGLE_DRIVE_SCRIPT_URL:'https://script.google.com/macros/s/fixture/exec',GOOGLE_DRIVE_SHARED_SECRET:secret};let fetched=false;await assert.rejects(createOnTrackStore({env:{...env,GOOGLE_DRIVE_SCRIPT_URL:'https://evil.invalid'},request:()=>{fetched=true;}})('status',admin),/ONTRACK_UNAVAILABLE/);assert.equal(fetched,false);
 await assert.rejects(createOnTrackStore({env,request:async()=>({ok:true,json:async()=>({ok:false,code:'Private details'})})})('status',admin),/^Error: ONTRACK_UNAVAILABLE$/);
});
