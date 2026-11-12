import {access} from './auth.js';
import './data-transition.css';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createDataTransitionView(content,{request=access}={}){
 let disposed=false,busy=false,previews=[];
 const card=el('section'),title=el('h1','Datatransitie'),intro=el('p','Verplaats openbare AI-analyses van Google Drive naar Dataverse. De volledige tekst en bronnen blijven samen in Markdown. Drive-originelen, eigen teksten en beoordelingen blijven behouden. Importeer één show per keer.'),label=el('label','Show zoeken'),search=el('input'),select=el('select'),load=el('button','Shows laden'),preview=el('button','Voorbeeld bekijken'),save=el('button','Importeren en controleren'),status=el('p'),results=el('div');
 card.className='data-transition';search.type='search';search.placeholder='Bijvoorbeeld Antoon';search.id='migration-search';label.htmlFor=search.id;select.setAttribute('aria-label','Te migreren show');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 for(const button of [load,preview,save])button.type='button';
 save.disabled=true;preview.disabled=true;let shows=[];
 const reset=()=>{previews=[];results.replaceChildren();save.disabled=true;};
 const renderShows=()=>{select.replaceChildren();const term=search.value.trim().toLocaleLowerCase();for(const show of shows.filter(row=>`${row.name} ${row.venue} ${row.date}`.toLocaleLowerCase().includes(term))){const option=el('option',`${show.name} · ${show.venue} · ${show.date}`);option.value=show.concertId;select.append(option);}preview.disabled=busy||!select.value;};
 search.oninput=()=>{reset();renderShows();};select.onchange=reset;
 async function run(task){if(busy||disposed)return;busy=true;for(const control of [load,preview,save,select,search])control.disabled=true;
  try{await task();}catch(error){if(!disposed)status.textContent=error.message||'De verwerking is onderbroken. Probeer opnieuw; bevestigde imports blijven behouden.';}
  finally{busy=false;if(!disposed){load.disabled=false;search.disabled=false;select.disabled=false;preview.disabled=!select.value;save.disabled=!previews.some(row=>row.status==='ready');}}
 }
 const call=body=>request('data-transition',{method:'POST',body});
 load.onclick=()=>run(async()=>{status.textContent='Shows uit Drive laden…';const data=await call({operation:'list'});if(disposed)return;shows=data.shows;reset();renderShows();status.textContent=`${shows.length} shows beschikbaar. Kies een show en bekijk het voorbeeld.`;});
 preview.onclick=()=>run(async()=>{reset();const concertId=select.value;for(let number=1;number<=11;number++){status.textContent=`Analyse ${number} van 11 lezen…`;const row=await call({operation:'preview',concertId,number});if(disposed)return;const box=el('details'),summary=el('summary',`Analyse ${number} · ${row.status==='missing'?'Niet aanwezig in Drive':'Klaar voor import'}`);box.append(summary);if(row.markdown)box.append(el('pre',row.markdown));results.append(box);previews.push({...row,concertId,summary});}status.textContent=`${previews.filter(row=>row.status==='ready').length} analyses gevonden. Controleer de teksten en kies daarna Importeren en controleren.`;});
 save.onclick=()=>run(async()=>{let verified=previews.filter(row=>row.status==='verified').length;for(const row of previews.filter(row=>row.status==='ready')){status.textContent=`Analyse ${row.number} importeren en teruglezen…`;const result=await call({operation:'import',concertId:row.concertId,number:row.number,checksum:row.checksum});if(disposed)return;if(result.status!=='verified'||result.verified!==true)throw Error('De bron is niet meer beschikbaar. Bekijk het voorbeeld opnieuw.');row.status='verified';row.summary.textContent=`Analyse ${row.number} · Teruggelezen en gecontroleerd`;verified++;}status.textContent=`${verified} analyses bevestigd in Dataverse. De Drive-originelen zijn behouden.`;const key=previews.find(row=>row.status==='verified')?.sourceKey;if(key){const link=el('a','Showpagina openen');link.href='/shows/'+encodeURIComponent('dataverse_'+key);results.append(link);}});
 const actions=el('div');actions.className='data-transition-actions';actions.append(load,preview,save);card.append(title,intro,label,search,select,actions,status,results);content.replaceChildren(card);return()=>{disposed=true;};
}
