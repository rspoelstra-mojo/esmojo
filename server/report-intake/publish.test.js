import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {csv} from '../ontrack-report/data.test.js';
import {createReportIntakePublisher,planIntakeShow,intakeBundle,intakeRows,intakeStatus,assertReadable,repairLegacySource} from './publish.js';
import {digest,recordKey} from '../show-migration-writer.js';
const bytes=Buffer.from(csv([{Division:'Medisch','Date and Time':'2026-11-16 - 08:00 PM'},{Division:'Beveiliging','Date and Time':'2026-11-16 - 09:00 PM'}]));
const hash=createHash('sha256').update(bytes).digest('hex');
const concerts=[{id:'11111111-1111-4111-8111-111111111111',concertId:'Bekend_AFAS-Live_16112026',artist:'Bekend',venue:'AFAS Live',city:'Amsterdam',date:'2026-11-16',sourceUrl:null}];
const artists=[{id:'a1',artistId:'a_'+digest('bekend'),name:'Bekend'}];
const receipt=(over={})=>({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',esmojo_sleutel:'rapportage-12-1',esmojo_bestandsnaam:'incidents_good-charlotte_AFAS-Live_16112026.csv',esmojo_status:'ontvangen',createdon:'2026-11-16T22:00:00Z',modifiedon:'2026-11-16T22:00:05Z','@odata.etag':'W/"1"',...over});
test('Planning: bestaand concert, bestaande artiest, nieuwe artiest en handmatige gevallen',()=>{
 const known=planIntakeShow('incidents_bekend_AFAS-Live_16112026.csv',{concerts,artists});assert.equal(known.created,false);assert.equal(known.show.key,'Bekend_AFAS-Live_16112026');
 const fresh=planIntakeShow('incidents_good-charlotte_AFAS-Live_16112026.csv',{concerts,artists});assert.equal(fresh.created,true);assert.equal(fresh.newArtist,true);assert.equal(fresh.show.name,'Good Charlotte');assert.equal(fresh.show.key,'Good-Charlotte_AFAS-Live_16112026');
 const withArtist=planIntakeShow('incidents_bekend_Ziggo-Dome_16112026_s2.csv',{concerts,artists});assert.equal(withArtist.newArtist,false);assert.equal(withArtist.show.performance,'avond');assert.equal(withArtist.show.key,'Bekend_Ziggo-Dome_16112026_S2');
 assert.equal(planIntakeShow('rapport.csv',{concerts,artists}).code,'FILENAME');assert.equal(planIntakeShow('incidents_x_Onbekende-Zaal_16112026.csv',{concerts,artists}).code,'VENUE');
 assert.equal(planIntakeShow('incidents_bekend_AFAS-Live_16112026.csv',{concerts:[...concerts,{...concerts[0],id:'2',concertId:'Bekend_AFAS-Live_16112026_X'}],artists}).code,'AMBIGUOUS');
 assert.equal(planIntakeShow('incidents_bekend_AFAS-Live_16112026.csv',{concerts:[],artists:[...artists,{...artists[0],artistId:'b'}]}).code,'ARTIST_AMBIGUOUS');
 assert.equal(planIntakeShow('incidents_bekend_AFAS-Live_16112026.csv',{concerts:[],artists:[{...artists[0],artistId:'a_custom'}]}).code,'ARTIST_IDENTITY');
});
test('Bundle en rijen zijn stabiel bij herhaling en bevatten het originele bestand en alle incidenten',()=>{
 const show=planIntakeShow(receipt().esmojo_bestandsnaam,{concerts,artists}).show,a=intakeBundle({show,receipt:receipt(),bytes}),b=intakeBundle({show,receipt:receipt({modifiedon:'2027-01-01T00:00:00Z'}),bytes});
 assert.deepEqual(intakeRows(a,bytes).dataset.map(r=>r.key),intakeRows(b,bytes).dataset.map(r=>r.key));
 const rows=intakeRows(a,bytes);assert.equal(rows.incidents,2);assert.ok(rows.base.some(r=>r.table==='esmojo_document'&&r.fields.esmojo_sha256===hash));assert.ok(rows.base.some(r=>r.table==='esmojo_rapportbron'&&r.fields.esmojo_bronnamespace==='sharepoint/power-automate-v1'));
 assert.equal(rows.dataset.filter(r=>r.table==='esmojo_rapportincident').length,2);
});
function fake({bronbytes,files}={}){
 const store=new Map(),calls=[],uploaded=[],patches=[];let published=null,verifiedVersion=null,fileBytes=null;
 const writer={
  async core(entry){calls.push(['core',entry.show.key]);return{concert:{table:'esmojo_concert',key:'c'.repeat(64)},series:{table:'esmojo_concertreeks',key:'d'.repeat(64)},header:{table:'esmojo_rapportage',key:'e'.repeat(64)}};},
  async find(row){const r=store.get(row.key);return r?{...r.fields,'@odata.etag':'W/"1"'}:null;},patches,
  async ensureMany(rows){for(const r of rows)store.set(r.key,r);},async inspectMany(rows){return{missing:rows.filter(r=>!store.has(r.key)).length,count:rows.length};},
  async resolve(ref){return{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',set:'esmojo_documents'};},async meta(){return{PrimaryIdAttribute:'esmojo_documentid'};},
  async json(path){if(path.includes('$select=esmojo_bestand'))return{esmojo_bestand:fileBytes?'x':null};throw Error('json '+path);},
  async call(name,{body}={}){const ok=data=>({ok:true,status:200,json:async()=>data});
   if(String(name).includes('(')&&body?.esmojo_herkomst_json){patches.push(body.esmojo_herkomst_json);const key=[...store.keys()].find(k=>store.get(k).table==='esmojo_rapportbron');store.get(key).fields.esmojo_herkomst_json=body.esmojo_herkomst_json;return ok({});}
   if(name==='InitializeFileBlocksUpload')return ok({FileContinuationToken:'t'});
   if(name==='UploadBlock'){uploaded.push(Buffer.from(body.BlockData,'base64'));return ok({});}
   if(name==='CommitFileBlocksUpload'){fileBytes=Buffer.concat(uploaded);return ok({});}
   if(name==='InitializeFileBlocksDownload')return ok({FileSizeInBytes:fileBytes.length,FileContinuationToken:'t'});
   if(name==='DownloadBlock')return ok({Data:fileBytes.subarray(body.Offset,body.Offset+body.BlockLength).toString('base64')});
   throw Error('call '+name);},
  async markFileVerified(){calls.push(['fileVerified']);},async markVerified(ref,field){verifiedVersion=ref;},async publish(header,version){published=version;},
 };
 const row=receipt(bronbytes===undefined?{}:{esmojo_bronbytes:bronbytes}),updates=[];
 const repository={async list(){return[row];},async file(){return files??{present:true,size:bytes.length,declaredSize:bytes.length,sha256:hash,bytes,before:row};},
  async update(id,etag,change){updates.push({etag,...change});Object.assign(row,change.fields,{'@odata.etag':'W/"'+(updates.length+1)+'"'});return row;}};
 const catalogue={all:async()=>({concerts,artists})};
 return{writer,repository,catalogue,row,updates,calls,store,patches,state:()=>({published,verifiedVersion,fileBytes})};
}
test('Publiceert een ontvangst: nieuw concert/artiest, bestand, incidenten, koppeling en status verwerkt',async()=>{
 const f=fake({bronbytes:bytes.length}),publisher=createReportIntakePublisher(f);
 const out=await publisher.publish(f.row);
 assert.equal(out.status,intakeStatus.done);assert.equal(out.incidents,2);
 assert.deepEqual(f.calls[0],['core','Good-Charlotte_AFAS-Live_16112026']);assert.deepEqual(f.state().fileBytes,bytes);assert.ok(f.state().published);
 assert.equal(f.updates[0].fields.esmojo_status,intakeStatus.working);const last=f.updates.at(-1);assert.equal(last.fields.esmojo_status,intakeStatus.done);assert.equal(last.fields.esmojo_bestandshash,hash);assert.equal(last.concertRecordId,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 assert.match(last.fields.esmojo_resultaat,/"v":2/);assert.match(last.fields.esmojo_resultaat,/"createdConcert":true/);assert.ok(!last.fields.esmojo_resultaat.includes('Medisch'));
});
test('Onvolledig of afwijkend bestand wordt niet gepubliceerd',async()=>{
 for(const config of [{bronbytes:bytes.length+1},{files:{present:true,size:bytes.length,declaredSize:bytes.length+1,sha256:hash,bytes,before:receipt()}},{files:{present:false,before:receipt()}}]){
  const f=fake(config),out=await createReportIntakePublisher(f).publish(f.row);assert.equal(out.status,'retry');assert.equal(out.code,'INTAKE_FILE');assert.equal(f.state().published,null);assert.ok(!f.calls.some(c=>c[0]==='core'));
 }
});
test('Ongeldige CSV en handmatige gevallen krijgen een eindstatus en publiceren niets',async()=>{
 const bad=Buffer.from('kolom\n1'),f=fake({files:{present:true,size:bad.length,declaredSize:bad.length,sha256:'x',bytes:bad,before:receipt()}});
 assert.equal((await createReportIntakePublisher(f).publish(f.row)).status,intakeStatus.invalid);assert.equal(f.updates.at(-1).fields.esmojo_status,intakeStatus.invalid);assert.equal(f.state().published,null);
 const g=fake();g.row.esmojo_bestandsnaam='rapport.csv';assert.equal((await createReportIntakePublisher(g).publish(g.row)).status,intakeStatus.manual);assert.equal(g.updates.at(-1).fields.esmojo_status,intakeStatus.manual);assert.equal(g.state().published,null);
 const h=fake();h.row.esmojo_bestandsnaam='incidents_a_AFAS-Live_17112026.csv';assert.equal((await createReportIntakePublisher(h).publish(h.row)).code,'CSV_SHOW_MISMATCH');
});
test('Alleen ontvangen of verlopen leases worden verwerkt; herhaling is veilig; te veel pogingen stoppen',async()=>{
 for(const status of ['upload-bezig','verwerkt','handmatig']){const f=fake();f.row.esmojo_status=status;assert.equal((await createReportIntakePublisher(f).publish(f.row)).status,'skipped');assert.equal(f.updates.length,0);}
 const fresh=fake();fresh.row.esmojo_status='verwerken';fresh.row.modifiedon=new Date().toISOString();assert.equal((await createReportIntakePublisher(fresh).publish(fresh.row)).status,'skipped');
 const stale=fake();stale.row.esmojo_status='verwerken';stale.row.modifiedon='2020-01-01T00:00:00Z';assert.equal((await createReportIntakePublisher(stale).publish(stale.row)).status,intakeStatus.done);
 const tired=fake();tired.row.esmojo_resultaat=JSON.stringify({attempts:5});assert.equal((await createReportIntakePublisher(tired).publish(tired.row)).status,intakeStatus.failed);assert.equal(tired.state().published,null);
 const f=fake(),p=createReportIntakePublisher(f);await p.publish(f.row);const again=await p.publish(f.row);assert.equal(again.status,'skipped');
});
test('Een samenloop-verlies op de ETag stopt voor enige bedrijfswrite',async()=>{
 const f=fake();f.repository.update=async()=>{throw Error('INTAKE_CONFLICT');};await assert.rejects(createReportIntakePublisher(f).publish(f.row),/INTAKE_CONFLICT/);assert.ok(!f.calls.length);
});
test('Ontbrekende verificatierij blokkeert de publicatie',async()=>{
 const f=fake();f.writer.inspectMany=async rows=>({missing:1,count:rows.length});const out=await createReportIntakePublisher(f).publish(f.row);assert.equal(out.status,'retry');assert.equal(f.state().published,null);assert.equal(f.state().verifiedVersion,null);
});

test('De Rapportages-lezer accepteert de geplande bron (validation.context aanwezig); zonder context wordt niets gepubliceerd',()=>{
 const show=planIntakeShow(receipt().esmojo_bestandsnaam,{concerts,artists}).show,rows=intakeRows(intakeBundle({show,receipt:receipt(),bytes}),bytes);
 assert.doesNotThrow(()=>assertReadable(rows.base));
 const broken=structuredClone(rows.base),source=broken.find(r=>r.table==='esmojo_rapportbron'),json=JSON.parse(source.fields.esmojo_herkomst_json);delete json.validation.context;source.fields.esmojo_herkomst_json=JSON.stringify(json);
 assert.throws(()=>assertReadable(broken),/REPORT_CONFLICT/);
});
test('Een door V1.192 geschreven bron zonder context wordt exact hersteld en daarna opnieuw verwerkt',async()=>{
 const f=fake({bronbytes:bytes.length}),show=planIntakeShow(f.row.esmojo_bestandsnaam,{concerts,artists}).show,rows=intakeRows(intakeBundle({show,receipt:f.row,bytes}),bytes);
 await f.writer.ensureMany(rows.base);const stored=f.store.get(rows.base.find(r=>r.table==='esmojo_rapportbron').key),json=JSON.parse(stored.fields.esmojo_herkomst_json);delete json.validation.context;stored.fields={...stored.fields,esmojo_herkomst_json:JSON.stringify(json)};
 f.row.esmojo_status='verwerkt';f.row.esmojo_resultaat=JSON.stringify({v:1,concertId:'x'});
 const out=await createReportIntakePublisher(f).publish(f.row);assert.equal(out.status,intakeStatus.done);assert.equal(f.patches.length,1);assert.equal(JSON.parse(f.patches[0]).validation.context,JSON.parse(rows.base.find(r=>r.table==='esmojo_rapportbron').fields.esmojo_herkomst_json).validation.context);
 assert.equal(await repairLegacySource(f.writer,rows.base),false);
 const other=fake();other.row.esmojo_status='verwerkt';other.row.esmojo_resultaat=JSON.stringify({v:2});assert.equal((await createReportIntakePublisher(other).publish(other.row)).status,'skipped');
});
