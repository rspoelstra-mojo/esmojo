import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {createPageFeedback} from './lib/page-feedback.js';
import {backgroundSaves} from './lib/background-saves.js';
import {staffTabs,staffNameMax} from '../shared/staff-planning.js';
import './show-tabs.css';
import './staff-planning.css';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const dateFormat=new Intl.DateTimeFormat('nl-NL',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const dateLabel=date=>dateFormat.format(new Date(date+'T12:00:00Z')).replace(/\.(?=\s|$)/g,'');
// Beheerder / Concertagenda (voorheen Personeelsplanning): alle MOJO-concerten van de komende 365 dagen met per concert de functies als tekstveld.
// Een getypte naam wordt na een korte typpauze (of bij verlaten van het veld) automatisch en serieel per concert opgeslagen met de
// laatst bevestigde revisie. Namen zijn Vertrouwelijk: alleen sessiegeheugen, nooit localStorage of logs.
export function createStaffPlanningView(content,link,{request=access,debounce=600}={}){
  let disposed=false;const controller=new AbortController(),loading=createSubmenuLoading(link,content);
  const feedback=createPageFeedback({key:'staff-planning',label:'Concertagenda',route:'/beheerder/concertagenda'});
  const page=node('section','staff-planning-page'),header=node('section','staff-card staff-header'),tabs=node('div','show-tabs'),indicator=node('span','show-tab-indicator'),body=node('section','staff-card staff-table-card');
  header.append(node('h1','','Concertagenda'));tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Concertagenda');
  let active=0,concertsData=[];const tabButtons=staffTabs.map((definition,index)=>{const button=node('button','show-tab',definition.label);button.type='button';button.setAttribute('role','tab');button.id='staff-tab-'+definition.id;button.setAttribute('aria-controls','staff-panel');button.addEventListener('click',()=>select(index));button.addEventListener('keydown',event=>{const step={ArrowRight:1,ArrowLeft:-1}[event.key];if(!step)return;event.preventDefault();select((index+step+staffTabs.length)%staffTabs.length,true);});return button;});
  tabs.append(...tabButtons,indicator);header.append(tabs);
  body.id='staff-panel';body.setAttribute('role','tabpanel');page.append(header,body);content.replaceChildren(page);
  const position=()=>{const tab=tabButtons[active];indicator.style.width=tab.offsetWidth+'px';indicator.style.transform=`translate(${tab.offsetLeft}px, ${tab.offsetTop+tab.offsetHeight-3}px)`;};
  const frame=requestAnimationFrame(()=>{position();tabs.classList.add('show-tabs-ready');});
  const rows=new Map(),timers=new Map();let inflight=0;
  // Wachtende of lopende opslag telt mee voor de centrale afsluitwaarschuwing.
  const dirty=()=>[...rows.values()].some(row=>row.drafts.size>0)||inflight>0;
  const stopWatching=backgroundSaves.watch(dirty);
  async function reload(){
    const data=await request('staff-planning',{method:'POST',body:{operation:'read'},signal:controller.signal});
    if(!Array.isArray(data?.concerts))throw Error('Ongeldig antwoord');return data.concerts;
  }
  const retrySave=()=>{for(const row of rows.values())if(row.drafts.size)void flush(row);return true;};
  // Serieel per concert; één automatische herpoging na een revisieconflict (dezelfde invoer op de actuele revisie).
  async function flush(row){
    if(row.busy||disposed&&!row.drafts.size)return;row.busy=true;inflight++;
    try{
      while(row.drafts.size){
        const [field,value]=row.drafts.entries().next().value;let result,conflicts=0;
        for(;;){
          try{result=await request('staff-planning',{method:'POST',body:{operation:'save',concertId:row.concertId,field,value,revision:row.revision}});break;}
          catch(error){
            if(error?.code==='STAFF_CONFLICT'&&conflicts++<1){try{const fresh=(await reload()).find(item=>item.concertId===row.concertId);if(fresh){row.revision=fresh.revision;row.roles=fresh.roles;continue;}}catch{/* Valt terug op de foutmelding hieronder. */}}
            if(!disposed)feedback.show(error?.code==='STAFF_CONFLICT'?'Deze cel is intussen elders gewijzigd. Je invoer is behouden.':'Opslaan is niet bevestigd. Je invoer is behouden.',retrySave,'Opnieuw proberen');
            return;
          }
        }
        row.revision=result.revision;row.roles=result.roles;
        // Is er intussen verder getypt, dan blijft die nieuwere invoer staan; anders is de cel bevestigd.
        if(row.drafts.get(field)===value)row.drafts.delete(field);
        if(!disposed){const input=row.inputs?.get(field);if(input&&row.drafts.get(field)===undefined)input.dataset.saved='true';}
        if(!disposed&&![...rows.values()].some(item=>item.drafts.size&&item!==row))feedback.resolved();
      }
    }finally{row.busy=false;inflight--;backgroundSaves.changed();}
  }
  function schedule(row,field,input){
    const value=input.value;
    if(value===row.roles[field]&&!row.drafts.has(field))return;
    row.drafts.set(field,value);input.dataset.saved='false';backgroundSaves.changed();
    clearTimeout(timers.get(row));timers.set(row,setTimeout(()=>{timers.delete(row);void flush(row);},debounce));
  }
  function select(index,focus=false){
    // Wachtende invoer blijft in de rijstatus staan en wordt op de achtergrond opgeslagen; de tabelcellen worden opnieuw opgebouwd.
    active=index;tabButtons.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
    body.setAttribute('aria-labelledby',tabButtons[index].id);position();if(focus)tabButtons[index].focus();if(concertsData.length||loaded)render(concertsData);
  }
  let loaded=false;
  function render(concerts){
    concertsData=concerts;body.replaceChildren();const tabDefinition=staffTabs[active];
    const intro=node('div','staff-table-intro');intro.append(node('h2','',tabDefinition.label),node('p','staff-muted',`${concerts.length} ${concerts.length===1?'concert':'concerten'} · komende 365 dagen · wordt dagelijks om 05:00 bijgewerkt`));body.append(intro);
    if(!concerts.length){body.append(node('p','staff-empty','Er staan nog geen concerten in de agenda. De lijst wordt dagelijks om 05:00 uit de MOJO-agenda gevuld.'));return;}
    const wrap=node('div','staff-table-wrap'),table=node('table','staff-table'),head=node('thead',''),headRow=node('tr','');
    wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Concertagenda, scrolbaar');table.dataset.tab=tabDefinition.id;
    const groups=[{id:'concert',label:'Concert',fields:[{id:'artist',label:'Artiestnaam'},{id:'venue',label:'Locatie'},{id:'date',label:'Datum'}]},...(tabDefinition.fields.length?[{id:tabDefinition.color,label:tabDefinition.label,fields:tabDefinition.fields}]:[])];
    for(const group of groups)group.fields.forEach((field,index)=>{const th=node('th','staff-group-'+group.id,field.label);th.scope='col';if(index===0)th.dataset.groupStart='true';headRow.append(th);});
    head.append(headRow);const tbody=node('tbody','');
    for(const concert of concerts){
      let row=rows.get(concert.concertId);
      if(!row){row={concertId:concert.concertId,roles:{...concert.roles},revision:concert.revision,drafts:new Map(),inputs:new Map(),busy:false};rows.set(concert.concertId,row);}
      row.inputs=new Map();
      const tr=node('tr','');
      const artist=node('th','staff-group-concert staff-artist',concert.artist);artist.scope='row';tr.append(artist,node('td','staff-group-concert',concert.venue),node('td','staff-group-concert staff-date',dateLabel(concert.date)));
      for(const group of groups.slice(1))group.fields.forEach((field,index)=>{
        const td=node('td','staff-group-'+group.id+' staff-input-cell'),input=node('input','staff-input');if(index===0)td.dataset.groupStart='true';
        input.type='text';input.maxLength=staffNameMax;input.value=row.drafts.get(field.id)??row.roles[field.id]??'';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',`${field.label} – ${concert.artist}, ${dateLabel(concert.date)}`);
        if(concert.unreadable){input.disabled=true;input.title='Deze gegevens zijn niet leesbaar.';}
        input.addEventListener('input',()=>schedule(row,field.id,input));input.addEventListener('blur',()=>{if(row.drafts.size){clearTimeout(timers.get(row));timers.delete(row);void flush(row);}});
        row.inputs.set(field.id,input);td.append(input);tr.append(td);
      });
      tbody.append(tr);
    }
    table.append(head,tbody);wrap.append(table);body.append(wrap);
  }
  (async()=>{
    const finish=loading.start?.()||null;content.setAttribute('aria-busy','true');
    try{const concerts=await reload();if(!disposed){feedback.clear();loaded=true;render(concerts);}}
    catch(error){if(!disposed&&error?.name!=='AbortError'){body.replaceChildren(node('p','staff-empty','De concertagenda kon niet worden geladen.'));feedback.show('De concertagenda kon niet worden geladen.',async()=>{try{loaded=true;render(await reload());feedback.clear();return true;}catch{return false;}},'Opnieuw laden');}}
    finally{finish?.();content.removeAttribute('aria-busy');}
  })();
  select(0);const resize=new ResizeObserver(position);resize.observe(tabs);
  return()=>{
    disposed=true;cancelAnimationFrame(frame);resize.disconnect();controller.abort();loading.dispose?.();
    // Wachtende invoer wordt nog weggeschreven; de opslag loopt op de achtergrond door.
    for(const [row,timer]of timers){clearTimeout(timer);if(row.drafts.size)void flush(row);}timers.clear();
    stopWatching();feedback.dispose();content.removeAttribute('aria-busy');
  };
}
