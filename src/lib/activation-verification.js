// Eén tokenverificatie per activeringsscherm, uitsluitend in tijdelijk geheugen.
export function createActivationVerification(verifyOtp,token){
 let pending=null,session=null;
 return async()=>{
  if(session)return session;
  if(pending)return pending;
  pending=(async()=>{
   let result;try{result=await verifyOtp({token_hash:token,type:'email'});}catch{throw Error('De activeringsdienst is tijdelijk niet bereikbaar. Probeer opnieuw.');}
   if(result.error){
    if(result.error.code==='otp_expired')throw Error('De activeringslink is ongeldig of al gebruikt, of de geldigheidsduur is verstreken. Vraag je beheerder om een nieuwe link.');
    if(!result.error.status||result.error.status>=500||result.error.name==='AuthRetryableFetchError')throw Error('De activeringsdienst is tijdelijk niet bereikbaar. Probeer opnieuw.');
    throw Error('De activeringslink kon niet worden bevestigd. Vraag je beheerder om een nieuwe link.');
   }
   if(!result.data?.session)throw Error('De activeringssessie kon niet worden bevestigd. Probeer opnieuw.');
   session=result.data.session;return session;
  })().finally(()=>{pending=null;});
  return pending;
 };
}
