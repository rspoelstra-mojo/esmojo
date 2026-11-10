// Eén herkenbaar fictief record; geen IDs of waarden uit de browser.
export const dataverseProbeId='e590f990-bc11-4bb9-a13e-5c6ef0bf2026';
const initial='ESMOJO verbindingstest - aangemaakt',updated='ESMOJO verbindingstest - gewijzigd';
export async function runDataverseWriteProbe({request,origin,headers,metadata,result}){
 const target=origin+'/api/data/v9.2/'+metadata.EntitySetName+'('+dataverseProbeId+')',field=metadata.PrimaryNameAttribute,id=metadata.PrimaryIdAttribute;
 const call=(method,extra={})=>request(target+(method==='GET'?'?$select='+id+','+field:''),{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{...headers,...extra.headers},...(extra.body?{body:JSON.stringify(extra.body)}:{})});
 const failed=code=>({...result,code});
 const read=async()=>{const response=await call('GET');if(!response.ok)return null;const row=await response.json();return row?.[id]===dataverseProbeId&&[initial,updated].includes(row[field])?row:null;};
 try{
  // If-None-Match:* maakt alleen aan. Een bestaande rij wordt nooit blind gewijzigd.
  const created=await call('PATCH',{headers:{'If-None-Match':'*','Content-Type':'application/json'},body:{[field]:initial}});
  if(!created.ok&&created.status!==412)return failed(created.status===403?'TEST_RECORD_CREATE_FORBIDDEN':'TEST_RECORD_CREATE_UNCONFIRMED');
  const row=await read();if(!row)return failed('TEST_RECORD_READ_UNCONFIRMED');
  result.recordCreated=true;result.recordRead=true;
  {
   const etag=row['@odata.etag'];if(typeof etag!=='string'||!/^W\/"\d+"$/.test(etag))return failed('TEST_RECORD_ETAG_INVALID');
   const changed=await call('PATCH',{headers:{'If-Match':etag,'Content-Type':'application/json'},body:{[field]:updated}});
   if(!changed.ok)return failed(changed.status===403?'TEST_RECORD_UPDATE_FORBIDDEN':changed.status===412?'TEST_RECORD_CONFLICT':'TEST_RECORD_UPDATE_UNCONFIRMED');
  }
  // Ook bij herhalen het huidige schrijfrecht controleren; geen nieuwe rij of reset.
  const confirmed=await read();if(!confirmed||confirmed[field]!==updated)return failed('TEST_RECORD_VERIFY_UNCONFIRMED');
  return{...result,recordUpdated:true,recordVerified:true,code:'TEST_TABLE_WRITE_OK'};
 }catch{return failed('TEST_RECORD_WRITE_UNCONFIRMED');}
}
