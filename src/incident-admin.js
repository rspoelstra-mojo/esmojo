import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {createPageFeedback} from './lib/page-feedback.js';
import {incidentIndicators} from '../shared/artist-risk-score.js';
import './incident-admin.css';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const count=new Intl.NumberFormat('nl-NL'),rate=new Intl.NumberFormat('nl-NL',{minimumFractionDigits:3,maximumFractionDigits:3});
export function renderIncidentReferenceCards(data){
 const grid=node('div','incident-reference-grid'),overview=node('section','incident-admin-card incident-overview');overview.append(node('h2','','Overzicht'));
 const stats=node('dl','incident-overview-stats');for(const [label,value]of [['Concerten',data.references?.concerts],['Bezoekers totaal',data.references?.visitors]]){const row=node('div','');row.append(node('dt','',label),node('dd','',value===undefined?'—':count.format(value)));stats.append(row);}overview.append(stats);
 overview.append(node('p','incident-muted',data.updatedAt?'Laatste actualisatie: '+new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(data.updatedAt)):'Nog geen bevestigde registraties.'));grid.append(overview);
 for(const [group,title]of [['security','Beveiliging'],['medical','Medisch']]){
  const card=node('section','incident-admin-card');card.append(node('h2','',title));
  for(const [key,label]of incidentIndicators[group]){
   const value=data.references?.indicators[group][key],details=node('details','incident-indicator'),summary=node('summary','');summary.append(node('span','',label),node('strong','',value?.rate===null||!value?'—':rate.format(value.rate)));details.append(summary);
   if(value){const dl=node('dl','incident-formula');for(const [term,result]of [['Incidenten',count.format(value.incidents)],['Gebruikte bezoekers',count.format(value.visitors)],['Berekening',value.visitors?'('+count.format(value.incidents)+' / '+count.format(value.visitors)+') × 1.000 = '+rate.format(value.rate):'Geen geschikte concerten beschikbaar'],['Per 1.000 bezoekers',value.rate===null?'Niet beschikbaar':rate.format(value.rate)]]){const row=node('div','');row.append(node('dt','',term),node('dd','',result));dl.append(row);}details.append(dl);}
   card.append(details);
  }
  grid.append(card);
 }
 return grid;
}
export function createIncidentAdminView(content,link,{request=access}={}){
 let disposed=false,data=null,busy=false,dirty=false,timer=null,formRevision=0;const controller=new AbortController(),loading=createSubmenuLoading(link,content),feedback=createPageFeedback({key:'incident-admin',label:'Incidenten',route:'/beheerder/incidenten'}),view=node('section','incident-admin-page');content.replaceChildren(view);
 const title=node('h1','','Incidenten'),cards=node('div',''),registration=node('details','incident-registration'),form=node('form','incident-registration-form'),select=node('select',''),visitors=node('input',''),checks={};
 registration.append(node('summary','','Concertregistraties beheren'),node('p','incident-muted','Bevestig het werkelijke bezoekersaantal en de volledigheid van beide disciplines. Verkochte kaarten worden niet overgenomen.'));
 function field(label,input){const wrap=node('label','incident-field');wrap.append(node('span','',label),input);form.append(wrap);}
 select.setAttribute('aria-label','Concert');field('Concert',select);visitors.type='number';visitors.min='0';visitors.max='10000000';visitors.step='1';field('Daadwerkelijk aanwezige bezoekers',visitors);
 for(const [key,label]of [['securityComplete','Beveiligingsregistratie volledig'],['medicalComplete','Medische registratie volledig'],['zeroIncidents','Bevestigde nulregistratie: geen incidenten in beide disciplines']]){const input=node('input','');input.type='checkbox';checks[key]=input;const wrap=node('label','incident-check');wrap.append(input,document.createTextNode(label));form.append(wrap);}
 const hint=node('p','incident-muted'),save=node('button','primary-button','Registratie opslaan');save.type='submit';form.append(hint,save);registration.append(form);view.append(title,cards);
 const selected=()=>data?.shows.find(row=>row.concertId===select.value);
 function updateForm(){const row=selected();formRevision=row?.revision||0;dirty=false;visitors.value=row?.visitors??'';for(const key of Object.keys(checks))checks[key].checked=row?.[key]===true&&(key!=='zeroIncidents'||!row.hasSource);checks.zeroIncidents.disabled=!row||row.hasSource;
  hint.textContent=!row?'Kies een concert.':!row.hasSource?'Zonder rapportage tellen incidenten uitsluitend mee na expliciete bevestiging van een nulregistratie.':!row.sourceReady?'De rapportage is nog niet geldig verwerkt. Dit concert telt nog niet mee.':row.countsReady?'De bronregistratie is beschikbaar.':'De telling wordt na volledige bevestiging automatisch berekend.';save.disabled=!row||busy;}
 function populate(){const previous=select.value;select.replaceChildren();const empty=node('option','','Kies een concert');empty.value='';select.append(empty);for(const row of data.shows){const option=node('option','',row.name+' · '+row.date+' · '+row.venue+(row.performance?' · '+row.performance:''));option.value=row.concertId;select.append(option);}select.value=previous;updateForm();}
 select.onchange=updateForm;form.oninput=()=>{dirty=true;};
 function setSaving(value){for(const input of [select,visitors,...Object.values(checks)])input.disabled=value;checks.zeroIncidents.disabled=value||!selected()||selected().hasSource;}
 async function load(){if(disposed||busy)return;busy=true;const finish=loading.start();try{const result=await request('incidents',{signal:controller.signal});if(disposed)return;data=result;cards.replaceChildren(renderIncidentReferenceCards(data));cards.querySelector('.incident-overview').append(registration);if(!dirty)populate();feedback.resolved();timer=setTimeout(()=>void load(),result.pending?500:60000);}catch{if(!disposed)feedback.show('Incidentgegevens konden niet worden bijgewerkt. Je invoer blijft behouden.',async()=>{await load();return Boolean(data);},'Opnieuw laden');}finally{busy=false;finish();if(!disposed)save.disabled=!selected();}}
 form.onsubmit=async event=>{event.preventDefault();const row=selected();if(busy||!row||disposed||!form.reportValidity())return;const value=visitors.value.trim(),body={concertId:row.concertId,revision:formRevision,visitors:value===''?null:Number(value),...Object.fromEntries(Object.entries(checks).map(([key,input])=>[key,input.checked]))};busy=true;save.disabled=true;setSaving(true);const finish=loading.start();clearTimeout(timer);
  try{await request('incidents',{method:'PATCH',body});if(disposed)return;dirty=false;busy=false;await load();}
  catch{if(!disposed)feedback.show('Opslaan is niet bevestigd. Je invoer blijft behouden. Laad de actuele registratie voordat je opnieuw opslaat.',async()=>{dirty=false;await load();return Boolean(data);},'Actuele registratie laden');}
  finally{busy=false;finish();if(!disposed){setSaving(false);save.disabled=!selected();}}
 };
 void load();return()=>{disposed=true;controller.abort();clearTimeout(timer);loading.dispose();feedback.dispose();content.replaceChildren();};
}
