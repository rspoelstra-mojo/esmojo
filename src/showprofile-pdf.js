import { access } from './auth.js';
export function createShowProfilePdfWidget(parent,{show,onStale,firstGeneration=false,onReady}){
 const card=document.createElement('section');card.className='profile-pdf-card';const title=document.createElement('h3');title.textContent='Showprofiel';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const button=document.createElement('button');button.type='button';button.className='analysis-complete';card.append(title,status,button);parent.append(card);
 let disposed=false,timer=null,current={state:'ready'},started=Date.now(),busy=false,generating=firstGeneration;
 const request=operation=>access('show-profile-pdf',{method:'POST',body:{concertId:show.key,operation}});
 function ready(){card.classList.remove('profile-pdf-loading');status.textContent='Showprofiel is gereed';button.hidden=false;button.disabled=busy;button.textContent='Showprofiel downloaden';}
 function progress(){generating=true;card.classList.add('profile-pdf-loading');status.textContent='Showprofiel wordt gemaakt en opgeslagen…';button.hidden=true;}
 function failure(text){card.classList.remove('profile-pdf-loading');status.textContent=text;button.hidden=false;button.disabled=false;button.textContent='Opnieuw proberen';current={state:'failed'};}
 async function update(operation='status'){
  try{const data=await request(operation);if(disposed)return;current=data;
   if(data.state==='ready'){generating=false;ready();onReady?.();return;}
   if(data.state==='not-ready'){button.hidden=true;card.classList.remove('profile-pdf-loading');status.textContent='Het showprofiel is niet meer actueel. Controleer de analyses.';onStale?.();return;}
   if(data.state==='failed'){failure(data.errorCode==='LAYOUT_ERROR'?'De PDF past niet binnen de afgesproken opmaak. Controleer te lange woorden, namen of teksten; je gegevens zijn behouden.':'De PDF kon niet worden gemaakt. Je gegevens zijn behouden.');return;}
   progress();
   if(Date.now()-started>300000){failure('De PDF is nog niet bevestigd. Probeer opnieuw; een al opgeslagen document wordt hergebruikt.');return;}
   if(data.state==='pending'&&operation==='status'){void update('ensure');return;}
   timer=setTimeout(()=>void update('status'),2500);
  }catch(error){if(disposed)return;if(generating)failure(error.message||'Het showprofiel kon niet worden geladen.');else{current={state:'ready'};ready();}}
 }
 button.onclick=async()=>{if(busy)return;if(current?.state==='failed'){started=Date.now();progress();void update('retry');return;}busy=true;button.disabled=true;
  try{const data=await request('download');if(disposed)return;const binary=atob(data.pdfBase64),bytes=Uint8Array.from(binary,character=>character.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=data.fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);ready();}
  catch(error){if(!disposed)status.textContent=error.message||'Downloaden is niet gelukt. Probeer opnieuw.';}
  finally{busy=false;if(!disposed)button.disabled=false;}
 };
 if(firstGeneration)progress();else ready();void update(firstGeneration?'ensure':'status');
 return()=>{disposed=true;clearTimeout(timer);};
}
