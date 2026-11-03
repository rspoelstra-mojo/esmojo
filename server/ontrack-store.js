import {createHash,createHmac,randomBytes} from 'node:crypto';

// Vertrouwelijk: uitsluitend ondertekend verkeer naar de bestaande Drive-brug.
export function createOnTrackStore({env=process.env,request=fetch}={}){
  return async(operation,actor,payload={})=>{
    const url=env.GOOGLE_DRIVE_SCRIPT_URL,secret=env.GOOGLE_DRIVE_SHARED_SECRET;
    if(!url||!secret||secret.length<32)throw Error('ONTRACK_UNAVAILABLE');
    const parsed=new URL(url);
    if(parsed.origin!=='https://script.google.com'||!/^\/macros\/s\/[\w-]+\/exec$/.test(parsed.pathname)||parsed.search||parsed.hash||parsed.username||parsed.password)throw Error('ONTRACK_UNAVAILABLE');
    const body=JSON.stringify({operation,actor,...payload}),timestamp=Date.now(),nonce=randomBytes(16).toString('hex');
    const digest=createHash('sha256').update(body).digest('hex'),signature=createHmac('sha256',secret).update(`ontrack\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
    const response=await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ontrack',timestamp,nonce,signature,body}),signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw Error('ONTRACK_UNAVAILABLE');
    const result=await response.json();
    if(!result.ok)throw Error(['VALIDATION','CONFLICT','FORBIDDEN'].includes(result.code)?result.code:'ONTRACK_UNAVAILABLE');
    return result.data;
  };
}
export function validateOnTrackRecipients(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['revision','recipientIds'].includes(key))||!Number.isSafeInteger(input.revision)||input.revision<0||!Array.isArray(input.recipientIds)||input.recipientIds.some(id=>typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))||new Set(input.recipientIds).size!==input.recipientIds.length)throw Error('VALIDATION');
  return {revision:input.revision,recipientIds:input.recipientIds};
}
