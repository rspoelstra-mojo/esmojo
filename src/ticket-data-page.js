import {createPageFeedback} from './lib/page-feedback.js';
import {backgroundSaves,saveRequestInfo} from './lib/background-saves.js';
import {detailBackButton} from './detail-back.js';
import './ticket-data.css';
import { access } from './auth.js';
import { createSubmenuLoading } from './lib/submenu-loading.js';
import { suggestionInput } from './lib/suggestion-input.js';
import { foreignCountries, provinces, emptyVisitorOrigins, emptyDomesticOrigins, parseTicketSales, validSaleCount, validTicketContent, normalizedTicketSales } from '../shared/ticket-data.js';
const fields=[['ticket_sales','Huidige kaartverkoopstand'],['visitor_origins','Top 3 buitenlandse bezoekers'],['domestic_origins','Top 3 binnenlandse herkomst']];
const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
export function createTicketDataPage(section,{show,state,onBack,categoryIcon,requestAccess=access,readOnly=false,onStored=()=>{}}) {
  let disposed=false,workflow={visitors:{fields:{}}},shows=[],busy=false,expanded=true,ready=false,loadSequence=0;
  state.saving ||= new Set();state.session ??= backgroundSaves.session;if(!state.unwatch)state.unwatch=backgroundSaves.watch(()=>state.saving.size>0);state.listeners ||= new Set();state.errors ||= {};const leases=new Map(),pending=new Map(),cards=new Map();
  const feedbacks=new Map(fields.map(([field])=>[field,createPageFeedback(saveRequestInfo('ticket-data',{concertId:show.key,field}))]));const readFeedback=createPageFeedback({key:'tickets-read:'+show.key,label:'Aantallen en herkomst laden',route:'/shows/'+encodeURIComponent(show.key)+'?tab=showprofiel'});
  const fieldError=field=>feedbacks.get(field).show('De gegevens zijn niet bevestigd. Je invoer is behouden.',async()=>{if(disposed)return false;if(!await reserve(field))return false;await save(field);return !state.errors[field]&&!cards.get(field)?.conflict;},'Opnieuw proberen',[{label:'Opgeslagen gegevens laden',run:async()=>{if(disposed)return false;delete state.drafts[field];delete state.base[field];await load();return ready;}}]);
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,section):null;
  const request=body=>requestAccess('ticket-data',{method:'POST',body:{concertId:show.key,...body}});
  const stored=field=>workflow.visitors.fields[field];
  const version=field=>state.base[field]??stored(field)?.version??0;
  function base(field){if(state.base[field]===undefined)state.base[field]=stored(field)?.version||0;}
  const locked=field=>readOnly||!ready||state.saving.has(field)||Boolean(stored(field)?.completed_at)||Boolean(workflow.visitors.completed_at)||Boolean(cards.get(field)?.conflict);
  const held=field=>leases.get(field)?.expiresAt>Date.now();
  async function reserve(field,renew=false){
    if(readOnly||disposed||!ready)return false;
    if(pending.has(field))return pending.get(field);
    if(!renew&&held(field))return true;
    base(field);const token=leases.get(field)?.token||crypto.randomUUID();
    const task=(async()=>{try{
      const data=await request({operation:renew?'renew':'reserve',field,token,expectedVersion:version(field)});
      if(disposed){void request({operation:'release',field,token,expectedVersion:version(field)}).catch(()=>{});return false;}
      leases.set(field,{token,expiresAt:data.lease.expiresAt});cards.get(field).conflict=false;cards.get(field).error.textContent='';return true;
    }catch(error){if(!disposed){cards.get(field).conflict=true;fieldError(field);leases.delete(field);}return false;}
    finally{pending.delete(field);if(!disposed)refresh();}})();pending.set(field,task);return task;
  }
  function refresh(){
    for(const [field,card]of cards){const final=Boolean(stored(field)?.completed_at);card.badge.textContent=final?'Afgerond':'Nog niet afgerond';card.badge.dataset.status=final?'completed':'pending';card.button.textContent=final?'Opnieuw bewerken':field==='ticket_sales'?'Aantal bevestigen':'Gegevens bevestigen';
      card.button.disabled=readOnly||!ready||state.saving.has(field)||(field!=='ticket_sales'&&Boolean(workflow.visitors.completed_at))||(!final&&(locked(field)||!held(field)||!validTicketContent(field,card.content(),shows)));
      card.retry.hidden=!card.conflict;card.reload.hidden=!card.conflict;for(const input of card.inputs)input.readOnly=locked(field);for(const combo of card.combos)combo.refresh();
    }
    const allDone=fields.every(([field])=>Boolean(stored(field)?.completed_at));headerBadge.textContent=allDone?'Afgerond':'Handmatig invoeren';headerBadge.dataset.status=allDone?'completed':'pending';
    back.disabled=false;
  }
  async function save(field){
    const card=cards.get(field),final=Boolean(stored(field)?.completed_at);if(state.saving.has(field)||card.button.disabled)return;
    if(final&&!await reserve(field))return;
    const lease=leases.get(field);if(!lease||!held(field))return;
    state.saving.add(field);state.errors[field]='';refresh();card.error.textContent='';
    const payload={operation:final?'reopen':'review',field,token:lease.token,expectedVersion:version(field),...(final?{}:{content:field==='ticket_sales'?normalizedTicketSales(card.content(),shows):card.content()})};
    const task=(state.tail||Promise.resolve()).catch(()=>{}).then(()=>{if(state.session!==backgroundSaves.session)throw Error('Opslag geannuleerd bij afmelden.');return request(payload);});state.tail=task.catch(()=>{});
    try{const data=await task;workflow=data.workflow;state.changed=true;delete state.drafts[field];delete state.base[field];leases.delete(field);onStored();if(!disposed){feedbacks.get(field).resolved();buildCards(field);}}
    catch(error){if(state.session===backgroundSaves.session)backgroundSaves.fail(saveRequestInfo('ticket-data',{concertId:show.key,field}));state.errors[field]=error.message||'Opslaan is niet bevestigd. Je invoer is behouden.';if(!disposed)fieldError(field);}
    finally{state.saving.delete(field);for(const listener of state.listeners)listener(settled,field);backgroundSaves.changed();if(disposed)void request({operation:'release',field,token:lease.token,expectedVersion:version(field)}).catch(()=>{});else refresh();}
  }
  function draft(field,value){if(locked(field))return;base(field);state.drafts[field]=value;void reserve(field);cards.get(field).error.textContent='';refresh();}
  const back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=()=>onBack();
  const header=node('div','analysis-editor-header'),glyph=node('span','profile-category-icon');glyph.innerHTML=categoryIcon;
  const intro=node('div','analysis-editor-intro'),title=node('h2','','Aantallen en herkomst');title.tabIndex=-1;
  const headerBadge=node('span','analysis-status','Handmatig invoeren');intro.append(title,node('p','','Bezoekersanalyse'));header.append(glyph,intro,headerBadge);
  const grid=node('div','ticket-grid'),error=node('p','profile-message');error.setAttribute('role','alert');header.prepend(back);section.replaceChildren(header,grid);
  title.focus({preventScroll:true});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  function buildCards(only=null){const previous=only?cards.get(only)?.element:null;if(!only){cards.clear();grid.replaceChildren();}
    for(const[field,label]of fields){if(only&&field!==only)continue;
      const card=node('section','ticket-card'),head=node('button','ticket-heading'),badge=node('span','analysis-status'),chevron=node('span','ticket-chevron',expanded?'⌃':'⌄');head.type='button';
      head.append(node('span','ticket-heading-title',label),badge,chevron);const body=node('div','ticket-body');body.id='ticket-body-'+field;head.setAttribute('aria-controls',body.id);head.setAttribute('aria-expanded',String(expanded));body.hidden=!expanded;
      head.onclick=()=>{expanded=!expanded;for(const c of cards.values()){c.body.hidden=!expanded;c.head.setAttribute('aria-expanded',String(expanded));c.chevron.textContent=expanded?'⌃':'⌄';}};
      const area=node('div','ticket-fields'),footer=node('footer','ticket-footer'),button=node('button','analysis-complete'),message=node('p','ticket-error'),retry=node('button','secondary-button','Opnieuw reserveren'),reload=node('button','secondary-button','Opgeslagen gegevens laden');
      message.setAttribute('role','alert');if(state.errors[field])fieldError(field);button.type=retry.type=reload.type='button';button.onclick=()=>save(field);retry.onclick=()=>reserve(field);reload.onclick=()=>{delete state.drafts[field];delete state.base[field];void load();};
      const inputs=[],combos=[];let getContent=()=>'';
      cards.set(field,{element:card,head,badge,chevron,body,button,error:message,retry,reload,inputs,combos,conflict:false,content:()=>getContent()});
      area.addEventListener('focusin',()=>{if(!locked(field))void reserve(field);});area.addEventListener('pointerdown',()=>{if(!locked(field))void reserve(field);},{passive:true});
      const raw=field==='ticket_sales'&&stored(field)?.completed_at?stored(field).content:state.drafts[field]??stored(field)?.content??'';
      function row(left,input,label,percentage=false){const r=node('div','ticket-row');if(left instanceof HTMLElement)r.append(left);else r.append(node('span','ticket-fixed',left));const wrap=node('label','ticket-value');input.setAttribute('aria-label',label);wrap.append(input);if(percentage)wrap.append(node('span','','%'));r.append(wrap);area.append(r);inputs.push(input);}
      function percent(value,change){const input=node('input','');input.type='text';input.inputMode='decimal';input.value=value;let previous=value;input.oninput=()=>{if(input.value===''||/^\d{0,3}(?:[.,]\d{0,2})?$/.test(input.value)){previous=input.value;change(input.value);}else input.value=previous;};return input;}
      if(field==='ticket_sales'){
        const parsed=parseTicketSales(raw,true),rows=shows.map(s=>({...s,count:parsed?.find(r=>r.date===s.date&&r.time===s.time)?.count??(shows.length===1&&validSaleCount(raw)?raw:'')}));
        getContent=()=>shows.length===1?rows[0]?.count||'':JSON.stringify(rows);
        const labels=node('div','ticket-column-headings');labels.append(node('span','','Showdatum'),node('span','','Verkoopstand'));area.append(labels);
        rows.forEach((r,i)=>{const date=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',timeZone:'Europe/Amsterdam'}).format(new Date(r.date+'T12:00:00Z'))+(shows.filter(s=>s.date===r.date).length>1?' · '+r.time:'');const input=node('input','');input.type='text';input.inputMode='numeric';input.pattern='[0-9]*';input.maxLength=9;input.value=r.count;input.oninput=()=>{if(input.value!==''&&!validSaleCount(input.value)){input.value=rows[i].count;return;}rows[i].count=input.value;draft(field,getContent());};row(date,input,'Verkoopstand '+date);});
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
      footer.append(button);body.append(area,footer);card.append(head,body);if(previous)grid.replaceChild(card,previous);else grid.append(card);
      if(state.drafts[field]!==undefined&&state.base[field]!==undefined&&state.base[field]!==stored(field)?.version&&state.base[field]!== (stored(field)?.version||0)){cards.get(field).conflict=true;fieldError(field);}
    }refresh();
  }
  async function load(only=null){only=ready?only:null;const sequence=++loadSequence;ready=false;if(cards.size)refresh();error.textContent='';const finish=loading?.start();try{const data=await request({operation:'read'});if(disposed||sequence!==loadSequence)return;workflow=data.workflow;shows=data.shows;ready=true;readFeedback.resolved();buildCards(only);}catch{if(!disposed){readFeedback.show('Aantallen en herkomst laden is niet gelukt.',async()=>{await load();return ready;},'Opnieuw laden');}}finally{finish?.();}}
  const timer=setInterval(()=>{for(const field of leases.keys())void reserve(field,true);if(!disposed)refresh();},40000);
  const settled=(source,field)=>{if(source!==settled&&!disposed)void load(field);};state.listeners.add(settled);
  void load();
  return()=>{disposed=true;for(const item of feedbacks.values())item.dispose();readFeedback.dispose();state.listeners.delete(settled);clearInterval(timer);loading?.dispose();for(const[field,lease]of leases)if(!state.saving.has(field))void request({operation:'release',field,token:lease.token,expectedVersion:version(field)}).catch(()=>{});for(const field of [...leases.keys()])if(!state.saving.has(field))leases.delete(field);};
}
