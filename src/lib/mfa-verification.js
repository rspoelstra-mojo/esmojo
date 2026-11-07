import {createMfaClient} from './supabase.js';
const message=error=>{
 const code=error?.code;if(error?.status===429||['over_request_rate_limit','MFA_RATE_LIMIT'].includes(code))return 'Te veel pogingen. Wacht even en probeer het opnieuw.';
 if(['MFA_DENIED','mfa_verification_rejected'].includes(code))return 'Deze verificatie is niet toegestaan. Neem contact op met de beheerder.';
 if(code==='MFA_REPLAY')return 'Deze code is al gebruikt. Wacht op de volgende code uit je app.';
 if(code==='MFA_BUSY')return 'Er wordt al een code gecontroleerd. Wacht even.';
 if(['mfa_verification_failed','mfa_challenge_expired','mfa_ip_address_mismatch','mfa_factor_not_found','MFA_INVALID_CODE'].includes(code))return 'Deze code is ongeldig of verlopen. Gebruik de huidige code uit je app.';
 if(error?.status===401||code==='MFA_SESSION_EXPIRED')return 'Je aanmelding is verlopen. Log opnieuw in.';
 return 'De verificatiedienst is tijdelijk niet bereikbaar. Probeer het opnieuw.';
};
export function createMfaVerifier({request=fetch,clientFactory=createMfaClient}={}){
 let modePromise=null;
 async function mode(){if(!modePromise)modePromise=request('/api/mfa',{method:'GET',cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)}).then(async response=>{if(!response.ok)throw Error();const data=await response.json();if(!['direct','redis'].includes(data.mode))throw Error();return data.mode;}).catch(()=>{modePromise=null;throw Error(message());});return modePromise;}
 return{prepare:()=>mode().catch(()=>null),clear(){modePromise=null;},async verify({factorId,code,accessToken,isCurrent=()=>true}){
  try{
   if(typeof code!=='string'||!/^\d{6}$/.test(code))throw{code:'MFA_INVALID_CODE'};
   const transport=await mode();if(!isCurrent())return null;let session;
   if(transport==='redis'){
    const response=await request('/api/mfa',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({factorId,code}),signal:AbortSignal.timeout(30000)}),data=await response.json();if(!response.ok)throw{code:data.code,status:response.status};session=data.session;
   }else{
    // Een geïsoleerde SDK-client voorkomt dat een late response een nieuwe
    // browseraanmelding terugzet. TOTP-geheim en vergelijking blijven bij Auth.
    const client=await clientFactory(accessToken);if(!isCurrent())return null;const challenge=await client.auth.mfa.challenge({factorId});if(challenge.error)throw challenge.error;if(!isCurrent())return null;
    const result=await client.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});if(result.error)throw result.error;session=result.data;
   }
   if(!isCurrent())return null;if(typeof session?.access_token!=='string'||typeof session.refresh_token!=='string')throw Error();return{access_token:session.access_token,refresh_token:session.refresh_token};
  }catch(error){throw Error(message(error));}
 }};
}
