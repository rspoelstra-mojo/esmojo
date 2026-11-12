import {access} from './auth.js';
import './data-transition.css';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createDataTransitionView(content,{request=access,setupDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 let disposed=false,busy=false,previews=[],bulkRun=null;
 const card=el('section'),title=el('h1','Datatransitie'),intro=el('p','Bereid de Dataverse-tabellen en keuzelijsten voor, of verplaats openbare AI-analyses van Google Drive naar Dataverse. De volledige tekst en bronnen blijven samen in Markdown. Drive-originelen, eigen teksten en beoordelingen blijven behouden. Kies één show of zet alle beschikbare analyses over met één knop. Houd deze pagina open tijdens de verwerking.'),label=el('label','Show zoeken'),search=el('input'),select=el('select'),load=el('button','Shows laden'),preview=el('button','Voorbeeld bekijken'),save=el('button','Importeren en controleren'),status=el('p'),results=el('div'),bulk=el('button','Alle AI-analyses overzetten'),choices=el('button','Keuzelijsten aanmaken en controleren'),tables=el('button','Tabellen aanmaken en controleren');
 card.className='data-transition';search.type='search';search.placeholder='Bijvoorbeeld Antoon';search.id='migration-search';label.htmlFor=search.id;select.setAttribute('aria-label','Te migreren show');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 for(const button of [load,preview,save,bulk,choices,tables])button.type='button';
 save.disabled=true;preview.disabled=true;let shows=[];
 const reset=()=>{previews=[];results.replaceChildren();save.disabled=true;};
 const renderShows=()=>{select.replaceChildren();const term=search.value.trim().toLocaleLowerCase();for(const show of shows.filter(row=>`${row.name} ${row.venue} ${row.date}`.toLocaleLowerCase().includes(term))){const option=el('option',`${show.name} · ${show.venue} · ${show.date}`);option.value=show.concertId;select.append(option);}preview.disabled=busy||!select.value;};
 search.oninput=()=>{reset();renderShows();};select.onchange=reset;
 async function run(task){if(busy||disposed)return;busy=true;for(const control of [load,preview,save,bulk,choices,tables,select,search])control.disabled=true;
  try{await task();}catch(error){if(!disposed)status.textContent=error.message||'De verwerking is onderbroken. Probeer opnieuw; bevestigde imports blijven behouden.';}
  finally{busy=false;if(!disposed){if(bulkRun)bulk.textContent='Alle AI-analyses hervatten';load.disabled=false;bulk.disabled=false;choices.disabled=false;tables.disabled=false;search.disabled=false;select.disabled=false;preview.disabled=!select.value;save.disabled=!previews.some(row=>row.status==='ready');}}
 }
 const call=body=>request('data-transition',{method:'POST',body});
 load.onclick=()=>run(async()=>{status.textContent='Shows uit Drive laden…';const data=await call({operation:'list'});if(disposed)return;shows=data.shows;reset();renderShows();status.textContent=`${shows.length} shows beschikbaar. Kies een show en bekijk het voorbeeld.`;});
 preview.onclick=()=>run(async()=>{reset();const concertId=select.value;for(let number=1;number<=11;number++){status.textContent=`Analyse ${number} van 11 lezen…`;const row=await call({operation:'preview',concertId,number});if(disposed)return;const box=el('details'),summary=el('summary',`Analyse ${number} · ${row.status==='missing'?'Niet aanwezig in Drive':'Klaar voor import'}`);box.append(summary);if(row.markdown)box.append(el('pre',row.markdown));results.append(box);previews.push({...row,concertId,summary});}status.textContent=`${previews.filter(row=>row.status==='ready').length} analyses gevonden. Controleer de teksten en kies daarna Importeren en controleren.`;});
 save.onclick=()=>run(async()=>{let verified=previews.filter(row=>row.status==='verified').length;for(const row of previews.filter(row=>row.status==='ready')){status.textContent=`Analyse ${row.number} importeren en teruglezen…`;const result=await call({operation:'import',concertId:row.concertId,number:row.number,checksum:row.checksum});if(disposed)return;if(result.status!=='verified'||result.verified!==true)throw Error('De bron is niet meer beschikbaar. Bekijk het voorbeeld opnieuw.');row.status='verified';row.summary.textContent=`Analyse ${row.number} · Teruggelezen en gecontroleerd`;verified++;}status.textContent=`${verified} analyses bevestigd in Dataverse. De Drive-originelen zijn behouden.`;const key=previews.find(row=>row.status==='verified')?.sourceKey;if(key){const link=el('a','Showpagina openen');link.href='/shows/'+encodeURIComponent('dataverse_'+key);results.append(link);}});
 bulk.onclick=()=>run(async()=>{
  reset();
  if(!bulkRun){
   status.textContent='Alle shows uit Drive ophalen…';const data=await call({operation:'list'});if(disposed)return;
   bulkRun={shows:data.shows,index:0,number:1,available:null,verified:0,created:0,missing:0,conflicts:0,lines:[]};
  }
  const batch=bulkRun;for(const line of batch.lines)results.append(line);
  for(;batch.index<batch.shows.length;batch.index++,batch.number=1,batch.available=null){
   const show=batch.shows[batch.index];let line=batch.lines[batch.index];
   if(!line){line=el('div');line.append(el('p'));batch.lines.push(line);results.append(line);}
   if(batch.available===null){status.textContent=`Show ${batch.index+1} van ${batch.shows.length}: ${show.name} · beschikbare analyses zoeken…`;const inventory=await call({operation:'inventory',concertId:show.concertId});if(disposed)return;batch.available=inventory.numbers;}
   for(;batch.number<=11;batch.number++){
    if(!batch.available.includes(batch.number)){batch.missing++;line.firstChild.textContent=`${show.name} · ${show.venue} · ${show.date}: ${batch.number} van 11 gecontroleerd.`;continue;}
    status.textContent=`Show ${batch.index+1} van ${batch.shows.length}: ${show.name} · analyse ${batch.number} van 11. ${batch.verified} bevestigd, ${batch.conflicts} conflicten.`;
    const result=await call({operation:'bulk-import',concertId:show.concertId,number:batch.number});if(disposed)return;
    if(result.status==='verified'&&result.verified===true){batch.verified++;if(result.created===true)batch.created++;}
    else if(result.status==='missing')batch.missing++;
    else if(result.status==='conflict')batch.conflicts++;
    else throw Error('Onverwacht antwoord. De verwerking is onderbroken; klik opnieuw om te hervatten.');
    line.firstChild.textContent=`${show.name} · ${show.venue} · ${show.date}: ${batch.number} van 11 gecontroleerd.`;
    if(result.status==='conflict'){const warning=el('p',`${show.name} · ${show.date} · analyse ${batch.number}: afwijkende inhoud in Dataverse; niet overschreven.`);line.append(warning);}
   }
  }
  status.textContent=`Verwerking klaar: ${batch.shows.length} shows gecontroleerd. ${batch.verified} analyses bevestigd (${batch.created} nieuw), ${batch.missing} niet aanwezig in Drive, ${batch.conflicts} conflicten. Drive-originelen behouden.`;
  bulkRun=null;bulk.textContent='Alle AI-analyses opnieuw controleren';
 });
 choices.onclick=()=>run(async()=>{
  reset();status.textContent='Dataverse-verbinding, oplossing en basistaal controleren…';
  const plan=await request('dataverse-choices',{method:'POST',body:{operation:'list'}});if(disposed)return;
  let verified=0,created=0,conflicts=0;
  for(const [index,choice] of plan.choices.entries()){
   status.textContent=`Keuzelijst ${index+1} van ${plan.choices.length}: ${choice.title}…`;
   const line=el('p',choice.title+' · Bezig…');results.append(line);let result;
   try{result=await request('dataverse-choices',{method:'POST',body:{operation:'create',name:choice.name}});}catch(error){if(!disposed)line.textContent=choice.title+' · Niet bevestigd; klik opnieuw om te controleren en te hervatten.';throw error;}
   if(disposed)return;
   if(result.status==='verified'&&result.verified===true&&result.published===true){verified++;if(result.created)created++;line.textContent=choice.title+' · '+(result.created?'Aangemaakt, gepubliceerd en gecontroleerd':'Bestaat, gepubliceerd en gecontroleerd');}
   else if(result.status==='conflict'){conflicts++;line.textContent=choice.title+' · Afwijkende bestaande lijst; niet aangepast. Controleer de namen en waarden in het schema.';}
   else throw Error('Keuzelijst niet bevestigd. Klik opnieuw om te controleren en te hervatten.');
  }
  status.textContent=`Keuzelijsten klaar: ${verified} van ${plan.choices.length} bevestigd (${created} nieuw), ${conflicts} conflicten. Bestaande Opruimstatus en showgegevens zijn niet gewijzigd.`;
 });
 tables.onclick=()=>run(async()=>{
  reset();status.textContent='Tabelsetup voorbereiden. Houd deze pagina open; dit kan enige tijd duren.';
  const plan=await request('dataverse-tables',{method:'POST',body:{operation:'plan'}});if(disposed)return;
  const pending=[],createdSteps=new Set();let verified=0;
  const lines=new Map();
  const apply=async(step,index)=>{
   status.textContent=`${step.phase}: stap ${index+1} van ${plan.steps.length} · ${step.title}…`;
   let line=lines.get(step.id);if(!line){line=el('p',step.title+' · Bezig…');lines.set(step.id,line);results.append(line);}
   let result;try{result=await request('dataverse-tables',{method:'POST',body:{operation:'apply',stepId:step.id}});}catch(error){if(!disposed)line.textContent=step.title+' · Niet bevestigd; start opnieuw om te controleren en te hervatten.';throw error;}
   if(disposed)return null;if(result.created)createdSteps.add(step.id);
   if(result.status==='conflict'){line.textContent=step.title+' · Afwijking ('+result.difference+'); niet aangepast.';throw Error('Setup gestopt bij '+step.title+'. Los de gemelde schema-afwijking op en start daarna opnieuw. Er zijn geen bestaande definities overschreven.');}
   if(result.status==='pending'&&result.reason==='KEY_INDEX_PENDING'){line.textContent=step.title+' · Sleutelindex wordt door Dataverse opgebouwd…';return false;}
   if(result.status!=='verified'||result.verified!==true)throw Error('Deze setupstap is nog niet bevestigd. Start opnieuw om veilig te hervatten.');
   line.textContent=step.title+' · Gecontroleerd'+(createdSteps.has(step.id)?' (nieuw)':'');return true;
  };
  for(const [index,step] of plan.steps.entries()){const done=await apply(step,index);if(disposed)return;if(done)verified++;else pending.push({step,index});}
  const until=Date.now()+180000;
  while(pending.length){
   if(Date.now()>until)throw Error(`${pending.length} sleutelindexen zijn nog niet bevestigd als Actief. Dataverse verwerkt deze op de achtergrond. Start later opnieuw om te controleren; er worden geen dubbele onderdelen gemaakt.`);
   await setupDelay(2000);if(disposed)return;
   for(let index=pending.length-1;index>=0;index--){const entry=pending[index],done=await apply(entry.step,entry.index);if(disposed)return;if(done){verified++;pending.splice(index,1);}if(Date.now()>until)break;}
  }
  status.textContent=`Tabelsetup klaar: ${plan.tableCount} tabellen gecontroleerd, ${verified} van ${plan.steps.length} schemastappen bevestigd (${createdSteps.size} nieuw). Sleutelindexen zijn Actief. Bestaande onderzoeksinhoud en showgegevens zijn behouden; er zijn nog geen gegevens gemigreerd.`;
 });
 const actions=el('div');actions.className='data-transition-actions';actions.append(load,preview,save,bulk,choices,tables);card.append(title,intro,label,search,select,actions,status,results);content.replaceChildren(card);return()=>{disposed=true;};
}
