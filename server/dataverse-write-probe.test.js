import {test} from 'node:test';import assert from 'node:assert/strict';
import {runDataverseWriteProbe,dataverseProbeId} from './dataverse-write-probe.js';
const metadata={EntitySetName:'crf9f_tabel1s',PrimaryIdAttribute:'crf9f_tabel1id',PrimaryNameAttribute:'crf9f_name'};
const response=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
function fixture({foreign=false,createDenied=false,updateDenied=false,conflict=false,missingEtag=false,breakVerification=false}={}){
 let row=foreign?{[metadata.PrimaryIdAttribute]:dataverseProbeId,[metadata.PrimaryNameAttribute]:'OTHER DATA','@odata.etag':'W/"1"'}:null,version=1;const calls=[];
 return{get row(){return row;},calls,async run(){return runDataverseWriteProbe({origin:'https://org5bab852a.crm.dynamics.com',headers:{Authorization:'Bearer synthetic'},metadata,result:{tableFound:true,tableRead:true,recordCreated:false,recordRead:false,recordUpdated:false,recordVerified:false},request:async(url,options)=>{
  calls.push({url,...options});if(options.method==='GET'){if(breakVerification&&row?.crf9f_name?.endsWith('gewijzigd'))return response(503,{});return response(row?200:404,row?structuredClone(row):{});}
  assert.equal(options.method,'PATCH');const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),[metadata.PrimaryNameAttribute]);
  if(options.headers['If-None-Match']==='*'){if(createDenied)return response(403,{});if(row)return response(412,{});row={[metadata.PrimaryIdAttribute]:dataverseProbeId,...body,'@odata.etag':'W/"1"'};if(missingEtag)delete row['@odata.etag'];return response(204,{});}
  if(updateDenied)return response(403,{});if(conflict)return response(412,{});if(options.headers['If-Match']!==row['@odata.etag'])return response(412,{});row={...row,...body,'@odata.etag':`W/"${++version}"`};return response(204,{});
 }});}};
}
test('Schrijfproef maakt één fictief record, leest, wijzigt met ETag en verifieert',async()=>{
 const f=fixture(),result=await f.run();assert.equal(result.code,'TEST_TABLE_WRITE_OK');for(const key of ['recordCreated','recordRead','recordUpdated','recordVerified'])assert.equal(result[key],true);assert.deepEqual(f.calls.map(c=>c.method),['PATCH','GET','PATCH','GET']);assert.equal(f.calls[0].headers['If-None-Match'],'*');assert.equal(f.calls[2].headers['If-Match'],'W/"1"');assert.ok(!JSON.stringify(result).includes(dataverseProbeId));assert.ok(f.row.crf9f_name.endsWith('gewijzigd'));
});
test('Herhalen gebruikt dezelfde test-ID, maakt geen duplicaten en reset geen bijgewerkt testrecord',async()=>{
 const f=fixture();await f.run();const before=structuredClone(f.row);f.calls.length=0;assert.equal((await f.run()).code,'TEST_TABLE_WRITE_OK');assert.equal(f.row.crf9f_name,before.crf9f_name);assert.equal(f.row.crf9f_tabel1id,before.crf9f_tabel1id);assert.deepEqual(f.calls.map(c=>c.method),['PATCH','GET','PATCH','GET']);assert.ok(f.calls.every(c=>c.url.includes(dataverseProbeId)));
});
test('Onbekende inhoud en ontbrekende versiecontrole worden nooit overschreven',async()=>{
 for(const options of [{foreign:true},{missingEtag:true}]){const f=fixture(options),result=await f.run();assert.notEqual(result.code,'TEST_TABLE_WRITE_OK');assert.deepEqual(f.calls.map(c=>c.method),['PATCH','GET']);if(options.foreign)assert.equal(f.row.crf9f_name,'OTHER DATA');}
});
test('Aanmaakrecht, wijzigrecht, versieconflict en ontbrekende verificatie geven aparte codes',async()=>{
 for(const [options,code]of [[{createDenied:true},'TEST_RECORD_CREATE_FORBIDDEN'],[{updateDenied:true},'TEST_RECORD_UPDATE_FORBIDDEN'],[{conflict:true},'TEST_RECORD_CONFLICT'],[{breakVerification:true},'TEST_RECORD_VERIFY_UNCONFIRMED']]){const f=fixture(options),result=await f.run();assert.equal(result.code,code);assert.equal(result.recordVerified,false);}
});

test('Gelijktijdige proeven delen dezelfde record-ID en accepteren geen verouderde update',async()=>{
 const f=fixture(),results=await Promise.all([f.run(),f.run()]);assert.ok(results.some(result=>result.code==='TEST_TABLE_WRITE_OK'));assert.ok(results.every(result=>['TEST_TABLE_WRITE_OK','TEST_RECORD_CONFLICT'].includes(result.code)));assert.equal(f.row.crf9f_tabel1id,dataverseProbeId);assert.ok(f.calls.every(call=>call.url.includes(dataverseProbeId)));
});
