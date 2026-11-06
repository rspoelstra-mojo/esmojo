import {backgroundSaves} from './lib/background-saves.js';
import './save-notice.css';
export function createSaveNotice({activity=backgroundSaves,doc=document}={}){
 const box=doc.createElement('aside');box.className='save-notice';box.setAttribute('aria-label','Achtergrondopslag');box.hidden=true;doc.body.append(box);
 const render=()=>{
  box.replaceChildren();box.hidden=!activity.failures.length;if(box.hidden)return;
  const status=doc.createElement('p');status.setAttribute('role','status');status.textContent='Opslaan is niet bevestigd.';box.append(status);
  for(const failure of activity.failures){const row=doc.createElement('div'),copy=doc.createElement('span'),open=doc.createElement('a'),dismiss=doc.createElement('button');copy.textContent=failure.label+' is niet bevestigd. Open het onderdeel om de opslag te controleren.';open.href=failure.route;open.textContent='Bekijken';dismiss.type='button';dismiss.textContent='Melding sluiten';dismiss.onclick=()=>activity.dismiss(failure.id);row.append(copy,open,dismiss);box.append(row);}
 };
 const off=activity.subscribe(render);render();return()=>{off();box.remove();};
}
