import { access } from './auth.js';
export function createShowProfilePdfWidget(parent,{show,onStale}){
 const card=document.createElement('section');card.className='profile-pdf-card';const title=document.createElement('h3');title.textContent='Showprofiel';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const button=document.createElement('button');button.type='button';button.className='analysis-complete';button.hidden=true;card.append(title,status,button);parent.append(card);
 let disposed=false,timer=null,current=null,started=Date.now(),busy=false;
 const request=operation=>access('show-profile-pdf',{method:'POST',body:{concertId:show.key,operation}});
 function failure(text){card.classList.remove('profile-pdf-loading');status.textContent=text;button.hidden=false;button.disabled=false;button.textContent='Opnieuw proberen';current={state:'failed'};}
 async function update(operation='status'){
  try{const data=await request(operation);if(disposed)return;current=data;button.hidden=true;card.classList.remove('profile-pdf-loading');
   if(data.state==='ready'){status.textContent='Het showprofiel is gereed.';button.hidden=false;button.disabled=false;button.textContent='Showprofiel downloaden';return;}
   if(data.state==='not-ready'){status.textContent='Het showprofiel is niet meer actueel. Controleer de analyses.';onStale?.();return;}
   if(data.state==='failed'){failure(data.errorCode==='LAYOUT_ERROR'?'De PDF past niet binnen de afgesproken opmaak. Controleer te lange woorden, namen of teksten; je gegevens zijn behouden.':'De PDF kon niet worden gemaakt. Je gegevens zijn behouden.');return;}
   if(Date.now()-started>300000){failure('De PDF is nog niet bevestigd. Probeer opnieuw; een al opgeslagen document wordt hergebruikt.');return;}
   card.classList.add('profile-pdf-loading');status.textContent='Showprofiel wordt gemaakt en opgeslagen…';timer=setTimeout(()=>void update('status'),2500);
  }catch(error){if(!disposed)failure(error.message||'Het showprofiel kon niet worden geladen.');}
 }
 button.onclick=async()=>{if(busy)return;if(current?.state!=='ready'){started=Date.now();button.hidden=true;void update('retry');return;}busy=true;button.disabled=true;status.textContent='Download voorbereiden…';
  try{const data=await request('download');if(disposed)return;const binary=atob(data.pdfBase64),bytes=Uint8Array.from(binary,character=>character.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=data.fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Het showprofiel is gereed.';}
  catch(error){if(!disposed)status.textContent=error.message||'Downloaden is niet gelukt. Probeer opnieuw.';}
  finally{busy=false;if(!disposed)button.disabled=false;}
 };
 card.classList.add('profile-pdf-loading');status.textContent='Showprofiel voorbereiden…';void update('ensure');
 return()=>{disposed=true;clearTimeout(timer);};
}
