// Preview leest uitsluitend via de bestaande beveiligde productie-API.
// Geen Drive-sleutels of refresh-tokens doorsturen, geen bedrijfswrites.
// Alleen het op productie uitgegeven, sessiegebonden MFA-bewijs mag mee.
export function createFluidPreviewSource({token,mfaCookie,request=fetch}){
  async function read(action,method='GET',body){
    let response,result;
    try{
      response=await request('https://esmojo.nl/api/access?action='+action,{
        method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000),
        headers:{Authorization:'Bearer '+token,...(/^__Host-esmojo-mfa=[A-Za-z0-9_-]{1,2000}$/.test(mfaCookie||'')?{Cookie:mfaCookie}:{}),...(body?{'Content-Type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),
      });
      result=await response.json();
    }catch{throw Error('PREVIEW_SOURCE_UNAVAILABLE');}
    if(!response.ok)throw Error(response.status===401?'PREVIEW_AUTH_REQUIRED':response.status===403?'FORBIDDEN':'PREVIEW_SOURCE_UNAVAILABLE');
    return result;
  }
  const definitions={
    'profile-read':['show-profile','read'],
    'ticket-read':['ticket-data','read'],
    'barrier-read':['barrier-layout','read'],
    'barrier-download':['barrier-layout','download'],
    'report-status':['show-profile-pdf','status'],
    'report-download':['show-profile-pdf','download'],
  };
  return{
    session:()=>read('session'),
    menu:()=>read('shows'),
    photo:concertId=>read('show-photo','POST',{concertId}),
    async shows(operation,payload={}){
      if(operation==='list')return read('shows');
      if(operation==='risk-view')return read('show-risks','POST',{concertId:payload.concertId});
      const definition=definitions[operation];if(!definition)throw Error('PREVIEW_READ_ONLY');
      const [action,op]=definition;
      return read(action,'POST',{operation:op,concertId:payload.concertId,...(operation==='barrier-download'?{uploadId:payload.uploadId}:{})});
    },
  };
}
