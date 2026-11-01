import './ticket-data.css';
import { access } from './auth.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';
import { suggestionInput } from './lib/suggestion-input.js';
import { foreignCountries, provinces, emptyVisitorOrigins, emptyDomesticOrigins, parseTicketSales, validSaleCount, validTicketContent, normalizedTicketSales, fullShowDate } from '../shared/ticket-data.js';
const fields=[['ticket_sales','Huidige kaartverkoopstand'],['visitor_origins','Top 3 buitenlandse bezoekers'],['domestic_origins','Top 3 binnenlandse herkomst']];
const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
export function createTicketDataPage(section,{show,state,onBack}) {
  let disposed=false,workflow={visitors:{fields:{}}},shows=[],busy=false,expanded=false,ready=false;
  const leases=new Map(),pending=new Map(),cards=new Map();
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,section):null;
  const request=body=>access('ticket-data',{method:'POST',body:{concertId:show.key,...body}});
  const stored=field=>workflow.visitors.fields[field];
  const version=field=>state.base[field]??stored(field)?.version??0;
  function base(field){if(state.base[field]===undefined)state.base[field]=stored(field)?.version||0;}
  const locked=field=>!ready||busy||Boolean(stored(field)?.completed_at)||Boolean(workflow.visitors.completed_at)||Boolean(cards.get(field)?.conflict);
  const held=field=>leases.get(field)?.expiresAt>Date.now();
  async function reserve(field,renew=false){
    if(disposed||!ready)return false;
    if(pending.has(field))return pending.get(field);
    if(!renew&&held(field))return true;
    base(field);const token=leases.get(field)?.token||crypto.randomUUID();
    const task=(async()=>{try{
      const data=await request({operation:renew?'renew':'reserve',field,token,expectedVersion:version(field)});
      if(disposed){void request({operation:'release',field,token,expectedVersion:version(field)}).catch(()=>{});return false;}
      leases.set(field,{token,expiresAt:data.lease.expiresAt});cards.get(field).conflict=false;cards.get(field).error.textContent='';return true;
    }catch(error){if(!disposed){cards.get(field).conflict=true;cards.get(field).error.textContent=error.message||'Reserveren is niet gelukt. Je invoer is behouden.';leases.delete(field);}return false;}
    finally{pending.delete(field);if(!disposed)refresh();}})();pending.set(field,task);return task;
  }
  function refresh(){
    for(const [field,card]of cards){const final=Boolean(stored(field)?.completed_at);card.badge.textContent=final?'Beoordeeld':'Nog niet beoordeeld';card.badge.dataset.status=final?'completed':'pending';card.button.textContent=final?'Opnieuw bewerken':field==='ticket_sales'?'Aantal bevestigen':'Gegevens bevestigen';
      card.button.disabled=!ready||busy||(field!=='ticket_sales'&&Boolean(workflow.visitors.completed_at))||(!final&&(locked(field)||!held(field)||!validTicketContent(field,card.content(),shows)));
      card.retry.hidden=!card.conflict;card.reload.hidden=!card.conflict;for(const input of card.inputs)input.readOnly=locked(field);for(const combo of card.combos)combo.refresh();
    }
    back.disabled=busy;
  }
  async function save(field){
    const card=cards.get(field),final=Boolean(stored(field)?.completed_at);if(busy||card.button.disabled)return;
    if(final&&!await reserve(field))return;
    const lease=leases.get(field);if(!lease||!held(field))return;
    busy=true;refresh();card.error.textContent='';
    try{const data=await request({operation:final?'reopen':'review',field,token:lease.token,expectedVersion:version(field),...(final?{}:{content:field==='ticket_sales'?normalizedTicketSales(card.content(),shows):card.content()})});if(disposed)return;workflow=data.workflow;delete state.drafts[field];delete state.base[field];leases.delete(field);buildCards();}
    catch(error){if(!disposed)card.error.textContent=error.message||'Opslaan is niet gelukt. Je invoer is behouden.';}
    finally{busy=false;if(!disposed)refresh();}
  }
  function draft(field,value){if(locked(field))return;base(field);state.drafts[field]=value;void reserve(field);cards.get(field).error.textContent='';refresh();}
  const back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=()=>{if(!busy)onBack();};
  const title=node('h2','ticket-page-title','Aantallen en herkomst');title.tabIndex=-1;
  const intro=node('p','ticket-page-intro','Vul de gegevens in en bevestig ieder blok afzonderlijk.');
  const grid=node('div','ticket-grid'),error=node('p','profile-message');error.setAttribute('role','alert');section.replaceChildren(back,title,intro,error,grid);
  title.focus({preventScroll:true});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  function buildCards(){cards.clear();grid.replaceChildren();
    for(const[field,label]of fields){
      const card=node('section','ticket-card'),head=node('button','ticket-heading'),badge=node('span','analysis-status'),chevron=node('span','ticket-chevron',expanded?'⌃':'⌄');head.type='button';
      head.append(node('span','ticket-heading-title',label),badge,chevron);const body=node('div','ticket-body');body.id='ticket-body-'+field;head.setAttribute('aria-controls',body.id);head.setAttribute('aria-expanded',String(expanded));body.hidden=!expanded;
      head.onclick=()=>{expanded=!expanded;for(const c of cards.values()){c.body.hidden=!expanded;c.head.setAttribute('aria-expanded',String(expanded));c.chevron.textContent=expanded?'⌃':'⌄';}};
      const area=node('div','ticket-fields'),footer=node('footer','ticket-footer'),button=node('button','analysis-complete'),message=node('p','ticket-error'),retry=node('button','secondary-button','Opnieuw reserveren'),reload=node('button','secondary-button','Opgeslagen gegevens laden');
      message.setAttribute('role','alert');button.type=retry.type=reload.type='button';button.onclick=()=>save(field);retry.onclick=()=>reserve(field);reload.onclick=()=>{delete state.drafts[field];delete state.base[field];void load();};
      const inputs=[],combos=[];let getContent=()=>'';
      cards.set(field,{head,badge,chevron,body,button,error:message,retry,reload,inputs,combos,conflict:false,content:()=>getContent()});
      area.addEventListener('focusin',()=>{if(!locked(field))void reserve(field);});area.addEventListener('pointerdown',()=>{if(!locked(field))void reserve(field);},{passive:true});
      const raw=field==='ticket_sales'&&stored(field)?.completed_at?stored(field).content:state.drafts[field]??stored(field)?.content??'';
      function row(left,input,label,percentage=false){const r=node('div','ticket-row');if(left instanceof HTMLElement)r.append(left);else r.append(node('span','ticket-fixed',left));const wrap=node('label','ticket-value');input.setAttribute('aria-label',label);wrap.append(input);if(percentage)wrap.append(node('span','','%'));r.append(wrap);area.append(r);inputs.push(input);}
      function percent(value,change){const input=node('input','');input.type='text';input.inputMode='decimal';input.value=value;let previous=value;input.oninput=()=>{if(input.value===''||/^\d{0,3}(?:[.,]\d{0,2})?$/.test(input.value)){previous=input.value;change(input.value);}else input.value=previous;};return input;}
      if(field==='ticket_sales'){
        const parsed=parseTicketSales(raw,true),rows=shows.map(s=>({...s,count:parsed?.find(r=>r.date===s.date&&r.time===s.time)?.count??(shows.length===1&&validSaleCount(raw)?raw:'')}));
        getContent=()=>shows.length===1?rows[0]?.count||'':JSON.stringify(rows);
        const labels=node('div','ticket-column-headings');labels.append(node('span','','Showdatum'),node('span','','Verkoopstand'));area.append(labels);
        rows.forEach((r,i)=>{const date=fullShowDate(r.date)+(shows.filter(s=>s.date===r.date).length>1?' · '+r.time:'');const input=node('input','');input.type='text';input.inputMode='numeric';input.pattern='[0-9]*';input.maxLength=9;input.value=r.count;input.oninput=()=>{if(input.value!==''&&!validSaleCount(input.value)){input.value=rows[i].count;return;}rows[i].count=input.value;draft(field,getContent());};row(date,input,'Verkoopstand '+date);});
        if(shows.length>5)area.append(node('p','','Er kunnen maximaal vijf shows per showprofiel worden vastgelegd.'));
        if(shows.length>1&&validSaleCount(raw))area.append(node('p','','Bestaande verkoopstand: '+raw+'. Vul per show de juiste stand in.'));
      }else{
        let value=field==='visitor_origins'?emptyVisitorOrigins():emptyDomesticOrigins();try{const parsed=JSON.parse(raw);if(field==='visitor_origins'&&parsed?.foreign?.length===3&&typeof parsed.netherlands==='string')value=parsed;else if(field==='domestic_origins'&&Array.isArray(parsed)&&parsed.length===3)value=parsed;}catch{/* Nieuw formulier. */}
        getContent=()=>JSON.stringify(value);const foreign=field==='visitor_origins',rows=foreign?value.foreign:value;
        const labels=node('div','ticket-column-headings');labels.append(node('span','',foreign?'Herkomst':'Provincie'),node('span','','Percentage'));area.append(labels);
        rows.forEach((r,i)=>{const prop=foreign?'country':'province',name=(foreign?'Land ':'Provincie ')+(i+1);const combo=suggestionInput({value:r[prop],label:name,options:foreign?foreignCountries:provinces,emptyMessage:foreign?'Geen land gevonden':'Geen provincie gevonden',locked:()=>locked(field),change:v=>{r[prop]=v;draft(field,getContent());}});combos.push(combo);inputs.push(combo.input);let current=r.percentage;const input=percent(current,v=>{r.percentage=v;current=v;draft(field,getContent());});row(combo.root,input,'Percentage '+name.toLowerCase(),true);});
        if(foreign){const input=percent(value.netherlands,v=>{value.netherlands=v;draft(field,getContent());});row('Nederland',input,'Percentage Nederland',true);area.lastElementChild.classList.add('ticket-netherlands');}
        area.append(node('p','ticket-help',foreign?'Vul percentages van 0 tot en met 100 in. Nederland en de top 3 mogen samen maximaal 100% zijn.':'Kies drie verschillende provincies. Vul percentages van 0 tot en met 100 in; de top 3 mag samen maximaal 100% zijn.'));
      }
      footer.append(button);body.append(area,message,retry,reload,footer);card.append(head,body);grid.append(card);
      if(state.drafts[field]!==undefined&&state.base[field]!==undefined&&state.base[field]!==stored(field)?.version&&state.base[field]!== (stored(field)?.version||0)){cards.get(field).conflict=true;message.textContent='De opgeslagen gegevens zijn gewijzigd. Je lokale invoer is behouden.';}
    }refresh();
  }
  async function load(){ready=false;if(cards.size)refresh();error.textContent='';const finish=loading?.start();try{const data=await request({operation:'read'});if(disposed)return;workflow=data.workflow;shows=data.shows;ready=true;buildCards();}catch{if(!disposed){error.textContent='Aantallen en herkomst laden is niet gelukt.';const retry=node('button','secondary-button','Opnieuw laden');retry.type='button';retry.onclick=()=>{retry.remove();void load();};error.after(retry);}}finally{finish?.();}}
  const timer=setInterval(()=>{for(const field of leases.keys())void reserve(field,true);if(!disposed)refresh();},40000);
  void load();
  return()=>{disposed=true;clearInterval(timer);loading?.dispose();for(const[field,lease]of leases)void request({operation:'release',field,token:lease.token,expectedVersion:version(field)}).catch(()=>{});leases.clear();};
}
