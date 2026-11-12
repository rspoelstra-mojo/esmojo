// Herhaal één idempotente setupstap; behoud reeds bevestigde voortgang.
export async function retrySetupStep(perform,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onWait=()=>{},active=()=>true,maxAttempts=6}={}){
 for(let attempt=0;attempt<maxAttempts;attempt++){
  if(!active())return null;let result,error;
  try{result=await perform();}catch(caught){if(caught.retryable!==true)throw caught;error=caught;}
  if(!active())return null;
  const processing=result?.status==='pending'&&result.reason==='METADATA_PROCESSING';
  if(!error&&!processing)return result;
  if(attempt+1===maxAttempts)throw error||Error('Dataverse heeft deze stap na meerdere controles nog niet bevestigd. De verwerking is gestopt; eerder bevestigde onderdelen blijven behouden. Probeer later opnieuw.');
  const requested=Number(result?.retryAfterSeconds||error?.retryAfterSeconds||0),backoff=[3,6,10,15,20][attempt]||20;
  if(Number.isFinite(requested)&&requested>300)throw Error('Dataverse vraagt een langere wachttijd. Eerder bevestigde onderdelen blijven behouden; probeer later opnieuw.');
  const seconds=Number.isFinite(requested)&&requested>0?Math.max(backoff,Math.ceil(requested)):backoff;
  onWait({attempt:attempt+2,maxAttempts,seconds});await wait(seconds*1000);
 }
}
