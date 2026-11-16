import {access} from './auth.js';
import {retrySetupStep} from './lib/setup-retry.js';
import {defaultFraming,initialLoginBackground} from '../shared/login-background.js';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createWebsiteSettingsSetup(container,{request=access,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 let disposed=false,busy=false;
 container.className='data-transition-access';const title=el('h2','Inlogachtergrond'),intro=el('p','Maak de aparte Dataverse-tabel Website-instellingen met bestandsopslag aan en controleer alle kolommen en de unieke sleutel. De eerste keer wordt de aangeleverde podiumfoto met de voorbereide uitsnede opgeslagen. Bestaande instellingen en oorspronkelijke foto’s blijven behouden. Houd deze pagina open tijdens de inrichting.'),button=el('button','Inlogachtergrond inrichten'),status=el('p'),link=el('a','Achtergrond aanpassen');button.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');link.href='/beheerder/instellingen';container.append(title,intro,button,status,link);
 button.onclick=async()=>{if(disposed||busy)return;busy=true;button.disabled=true;try{
  const plan=await request('website-settings-schema',{method:'POST',body:{operation:'plan'}});let count=0;
  for(const step of plan.steps){if(disposed)return;let verified=false;for(let attempt=0;attempt<120;attempt++){
   status.textContent=step.phase+' · '+step.title;
   const result=await retrySetupStep(()=>request('website-settings-schema',{method:'POST',body:{operation:'apply',stepId:step.id}}),{wait,active:()=>!disposed,onWait:({seconds})=>{status.textContent='Dataverse verwerkt de inrichting. Nieuwe controle over '+seconds+' seconden…';}});
   if(disposed)return;if(result.verified===true&&result.status==='verified'){verified=true;break;}if(result.status!=='pending')throw Error('De bestaande inrichting wijkt af. Er is niets overschreven. Laat de inrichting controleren.');status.textContent='De unieke sleutel wordt nog opgebouwd. Wachten op de bevestiging…';await wait(3000);
  }if(!verified)throw Error('De sleutel is nog niet Actief. Probeer later opnieuw; aangemaakte onderdelen blijven behouden.');count++;}
  if(disposed)return;status.textContent='Inrichting gecontroleerd. Achtergrond opslaan…';const current=await request('website-settings');
  if(!current.configured){const response=await fetch(initialLoginBackground);if(!response.ok)throw Error('De aangeleverde foto kon niet worden geladen.');const blob=await response.blob(),photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});const saved=await request('website-settings',{method:'POST',body:{operation:'save',revision:0,framing:structuredClone(defaultFraming),photo}});if(!saved.configured)throw Error('Opslag is nog niet bevestigd.');}
  status.textContent=`Inlogachtergrond klaar: ${count} inrichtingsstappen gecontroleerd. De foto en uitsnede zijn opgeslagen in Dataverse.`;button.textContent='Inrichting opnieuw controleren';
 }catch(error){if(!disposed)status.textContent=error.message||'De inrichting is onderbroken. Je kunt veilig opnieuw beginnen.';}finally{busy=false;if(!disposed)button.disabled=false;}};
 return{dispose(){disposed=true;}};
}
