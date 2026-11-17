import {access} from './auth.js';
import {retrySetupStep} from './lib/setup-retry.js';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createReportIntakeSetup(container,{request=access,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 let disposed=false,busy=false;
 const title=el('h2','CSV-rapportages ontvangen'),intro=el('p','Richt de Dataverse-ontvangsttabel voor CSV-bestanden in en controleer de kolommen en unieke sleutel. Deze knop start nog geen import of verwerking. Houd deze pagina open.'),button=el('button','CSV-ontvangst inrichten'),status=el('p');button.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');container.append(title,intro,button,status);
 button.onclick=async()=>{if(busy||disposed)return;busy=true;button.disabled=true;try{
  const plan=await request('report-intake-schema',{method:'POST',body:{operation:'plan'}});let count=0;
  for(const step of plan.steps){let verified=false;for(let attempt=0;attempt<120;attempt++){
   if(disposed)return;status.textContent=step.phase+' · '+step.title;
   const result=await retrySetupStep(()=>request('report-intake-schema',{method:'POST',body:{operation:'apply',stepId:step.id}}),{wait,active:()=>!disposed,onWait:({seconds})=>{status.textContent='Dataverse verwerkt de inrichting. Nieuwe controle over '+seconds+' seconden…';}});
   if(disposed)return;if(result.verified===true&&result.status==='verified'){verified=true;break;}if(result.status!=='pending')throw Error('De bestaande inrichting wijkt af. Er is niets overschreven.');status.textContent='De unieke sleutel wordt opgebouwd. Wachten op bevestiging…';await wait(3000);
  }if(!verified)throw Error('De sleutel is nog niet actief. Probeer later opnieuw.');count++;}
  if(!disposed){status.textContent=`CSV-ontvangst klaar: ${count} inrichtingsstappen gecontroleerd. De verwerking van rapportages is nog niet actief.`;button.textContent='Inrichting opnieuw controleren';}
 }catch(error){if(!disposed)status.textContent=error.message||'De inrichting is onderbroken. Je kunt opnieuw proberen.';}finally{busy=false;if(!disposed)button.disabled=false;}};
 return{dispose(){disposed=true;}};
}
