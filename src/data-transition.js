import {retrySetupStep} from './lib/setup-retry.js';
import {access} from './auth.js';
import './data-transition.css';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createDataTransitionView(content,{request=access,setupDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 let disposed=false,busy=false,previews=[],bulkRun=null,migrationToken=null;
 const card=el('section'),title=el('h1','Datatransitie'),intro=el('p','Bereid de Dataverse-tabellen en keuzelijsten voor, of verplaats openbare AI-analyses van Google Drive naar Dataverse. De volledige tekst en bronnen blijven samen in Markdown. Drive-originelen, eigen teksten en beoordelingen blijven behouden. Kies één show of zet alle beschikbare analyses over met één knop. Houd deze pagina open tijdens de verwerking.'),label=el('label','Show zoeken'),search=el('input'),select=el('select'),load=el('button','Shows laden'),preview=el('button','Voorbeeld bekijken'),save=el('button','Importeren en controleren'),status=el('p'),results=el('div'),bulk=el('button','Alle AI-analyses overzetten'),choices=el('button','Keuzelijsten aanmaken en controleren'),tables=el('button','Tabellen aanmaken en controleren'),migrate=el('button','Alle Shows-gegevens overzetten');
 card.className='data-transition';search.type='search';search.placeholder='Bijvoorbeeld Antoon';search.id='migration-search';label.htmlFor=search.id;select.setAttribute('aria-label','Te migreren show');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 for(const button of [load,preview,save,bulk,choices,tables,migrate])button.type='button';
 save.disabled=true;preview.disabled=true;let shows=[];
 const reset=()=>{previews=[];results.replaceChildren();save.disabled=true;};
 const renderShows=()=>{select.replaceChildren();const term=search.value.trim().toLocaleLowerCase();for(const show of shows.filter(row=>`${row.name} ${row.venue} ${row.date}`.toLocaleLowerCase().includes(term))){const option=el('option',`${show.name} · ${show.venue} · ${show.date}`);option.value=show.concertId;select.append(option);}preview.disabled=busy||!select.value;};
 search.oninput=()=>{reset();renderShows();};select.onchange=reset;
 async function run(task){if(busy||disposed)return;busy=true;for(const control of [load,preview,save,bulk,choices,tables,migrate,select,search])control.disabled=true;
  try{await task();}catch(error){if(!disposed)status.textContent=error.message||'De verwerking is onderbroken. Probeer opnieuw; bevestigde imports blijven behouden.';}
  finally{busy=false;if(!disposed){if(bulkRun)bulk.textContent='Alle AI-analyses hervatten';load.disabled=false;bulk.disabled=false;choices.disabled=false;tables.disabled=false;migrate.disabled=false;search.disabled=false;select.disabled=false;preview.disabled=!select.value;save.disabled=!previews.some(row=>row.status==='ready');}}
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
  const plan=await retrySetupStep(()=>request('dataverse-tables',{method:'POST',body:{operation:'plan'}}),{wait:setupDelay,active:()=>!disposed,onWait:({seconds})=>{status.textContent=`Dataverse is nog bezig met de voorbereiding; automatisch opnieuw controleren over ${seconds} seconden…`;}});if(disposed)return;
  const pending=[],createdSteps=new Set();let verified=0;
  const lines=new Map();
  const apply=async(step,index)=>{
   status.textContent=`${step.phase}: stap ${index+1} van ${plan.steps.length} · ${step.title}…`;
   let line=lines.get(step.id);if(!line){line=el('p',step.title+' · Bezig…');lines.set(step.id,line);results.append(line);}
   let result;try{result=await retrySetupStep(()=>request('dataverse-tables',{method:'POST',body:{operation:'apply',stepId:step.id}}),{wait:setupDelay,active:()=>!disposed,onWait:({attempt,maxAttempts,seconds})=>{line.textContent=step.title+` · Dataverse verwerkt deze stap nog; opnieuw controleren over ${seconds} seconden (poging ${attempt} van ${maxAttempts})…`;status.textContent=`${step.phase}: stap ${index+1} van ${plan.steps.length} · Wachten op ${step.title}; je hoeft niet te verversen.`;}});}catch(error){if(!disposed)line.textContent=step.title+' · Niet bevestigd; start opnieuw om te controleren en te hervatten.';throw error;}
   if(disposed)return null;if(result.created)createdSteps.add(step.id);
   if(result.status==='conflict'){const details=result.details;const requiredLabels={None:'Optioneel',SystemRequired:'Systeemvereist',ApplicationRequired:'Bedrijfsvereist',Recommended:'Aanbevolen',Unknown:'Onbekend'};const explanation=details?.expectedRequired?` Kolom ${details.column}: verwacht ${requiredLabels[details.expectedRequired]||'Onbekend'}, ontvangen ${requiredLabels[details.actualRequired]||'Onbekend'}.`:details?.column?' Kolom '+details.column+'.':'';line.textContent=step.title+' · Afwijking ('+result.difference+'); niet aangepast.'+explanation;throw Error('Setup gestopt bij '+step.title+'. Los de gemelde schema-afwijking op en start daarna opnieuw. Er zijn geen bestaande definities overschreven.');}
   if(result.status==='pending'&&result.reason==='KEY_INDEX_PENDING'){line.textContent=step.title+' · Sleutelindex wordt door Dataverse opgebouwd…';return false;}
   if(result.status!=='verified'||result.verified!==true)throw Error('Deze setupstap is nog niet bevestigd. Start opnieuw om veilig te hervatten.');
   line.textContent=step.title+' · Gecontroleerd'+(result.normalizedPrimary?' (standaard Naam gecorrigeerd)':createdSteps.has(step.id)?' (nieuw)':'');return true;
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
 migrate.onclick=()=>run(async()=>{
  reset();status.textContent='Alle Shows-gegevens voorbereiden. Eerst worden schema en actieve sleutelindexen gecontroleerd; daarna start de overdracht. Houd deze pagina open.';
  const callMigration=body=>retrySetupStep(()=>request('show-migration',{method:'POST',body}),{wait:setupDelay,active:()=>!disposed,onWait:({seconds})=>{status.textContent=`Tijdelijk wachten; dezelfde migratiestap wordt over ${seconds} seconden opnieuw gecontroleerd…`;}});
  const progressLine=el('p');results.append(progressLine);
  let result=await callMigration(migrationToken?{operation:'advance',token:migrationToken}:{operation:'start'});
  while(!disposed){
   if(!result?.token)throw Error('Migratiestap niet bevestigd. Probeer opnieuw.');migrationToken=result.token;
   const progress=result.progress||{};status.textContent=`${result.label||'Shows-gegevens verwerken'} · ${progress.current||0}${result.total?' van '+result.total:''} · ${progress.verifiedRecords||0} records en ${progress.verifiedFiles||0} bestanden gecontroleerd.`;
   progressLine.textContent=status.textContent;
   if(result.status==='blocked'){status.textContent=result.reason==='KEY_INDEX_PENDING'?`${result.label}: de sleutelindex is nog niet Actief. Er zijn geen gegevens overgezet. Klik later op hervatten om opnieuw te controleren.`:`Migratie geblokkeerd bij ${result.label}. Controleer eerst het Dataverse-schema. Er zijn geen gegevens overgezet.`;migrate.textContent='Shows-migratie hervatten';return;}
   if(result.status==='complete'){status.textContent=`Shows-migratie klaar: ${result.total} shows, ${progress.verifiedRecords} records en ${progress.verifiedFiles} bestanden overgezet en teruggelezen. Supabase- en Drive-originelen zijn behouden. De website gebruikt nog de bestaande opslagroutes.`;migrationToken=null;migrate.textContent='Alle Shows-gegevens opnieuw controleren';return;}
   if(result.status!=='running')throw Error('Migratiestap niet bevestigd. Probeer opnieuw.');
   migrate.textContent='Shows-migratie hervatten';result=await callMigration({operation:'advance',token:migrationToken});
  }
 });
 const migrationInfo=el('p','Alle Shows-gegevens overzetten kopieert de bestaande showgegevens, relaties en bestanden naar Dataverse. Eerst moeten alle sleutelindexen Actief zijn. Originelen blijven behouden en de website wordt hiermee nog niet naar Dataverse omgeschakeld. Na een onderbreking kun je hervatten; na verversen worden bestaande gegevens opnieuw herkend.');
 const actions=el('div');actions.className='data-transition-actions';actions.append(load,preview,save,bulk,choices,tables,migrate);card.append(title,intro,label,search,select,actions,migrationInfo,status,results);content.replaceChildren(card);return()=>{disposed=true;};
}
