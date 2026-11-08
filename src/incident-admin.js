import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {createPageFeedback} from './lib/page-feedback.js';
import {incidentIndicators} from '../shared/artist-risk-score.js';
import './incident-admin.css';
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const count=new Intl.NumberFormat('nl-NL'),rate=new Intl.NumberFormat('nl-NL',{minimumFractionDigits:3,maximumFractionDigits:3});
export function renderIncidentReferenceCards(data){
 const grid=node('div','incident-reference-grid'),overview=node('section','incident-admin-card incident-overview');overview.append(node('h2','','Overzicht'));
 const stats=node('dl','incident-overview-stats');for(const [label,value]of [['Concerten',data.references?.concerts??data.progress?.eligible],['Bezoekers totaal',data.references?.visitors??data.progress?.visitors]]){const row=node('div','');row.append(node('dt','',label),node('dd','',value===undefined?'—':count.format(value)));stats.append(row);}overview.append(stats);
 overview.append(node('p','incident-muted',data.updatedAt?'Laatste actualisatie: '+new Intl.DateTimeFormat('nl-NL',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(data.updatedAt)):'Nog geen geschikte registraties.'));
 if(data.status==='not-ready')overview.append(node('p','incident-muted','De eerste dagstand is nog niet beschikbaar. Zodra deze gereed is, blijven de cijfers de hele dag gelijk.'));
 overview.append(node('p','incident-muted','Vaste dagstand · dagelijks bijgewerkt rond 00.00 uur Nederlandse tijd.'));
 const progress=data.progress;if(data.pending){const status=node('p','incident-muted','Referenties worden bijgewerkt'+(progress?': '+count.format(progress.processed)+' van '+count.format(progress.eligible)+' rapportages verwerkt.':'.'));status.setAttribute('role','status');overview.append(status);}else if(progress?.available>0&&progress.eligible===0)overview.append(node('p','incident-muted',count.format(progress.available)+' rapportages beschikbaar; er ontbreekt nog een bruikbare bezoekersbasis.'));
 grid.append(overview);
 for(const [group,title]of [['security','Beveiliging'],['medical','Medisch']]){
  const card=node('section','incident-admin-card');card.append(node('h2','',title));
  for(const [key,label]of incidentIndicators[group]){
   const value=data.references?.indicators[group][key],details=node('details','incident-indicator'),summary=node('summary','');summary.append(node('span','',label),node('strong','',!value&&data.pending?'Nog niet berekend':value?.rate===null||!value?'—':rate.format(value.rate)));details.append(summary);
   if(value){const dl=node('dl','incident-formula');for(const [term,result]of [['Incidenten',count.format(value.incidents)],['Gebruikte bezoekers',count.format(value.visitors)],['Berekening',value.visitors?'('+count.format(value.incidents)+' / '+count.format(value.visitors)+') × 1.000 = '+rate.format(value.rate):'Geen geschikte concerten beschikbaar'],['Per 1.000 bezoekers',value.rate===null?'Niet beschikbaar':rate.format(value.rate)]]){const row=node('div','');row.append(node('dt','',term),node('dd','',result));dl.append(row);}details.append(dl);}
   if(!value&&data.pending)details.append(node('p','incident-muted','Deze referentiewaarde is nog niet beschikbaar.'));
   card.append(details);
  }
  grid.append(card);
 }
 return grid;
}
export function createIncidentAdminView(content,link,{request=access}={}){
 let disposed=false,busy=false;const controller=new AbortController(),loading=createSubmenuLoading(link,content),feedback=createPageFeedback({key:'incident-admin',label:'Incidenten',route:'/beheerder/incidenten'}),view=node('section','incident-admin-page');content.replaceChildren(view);
 const title=node('h1','','Incidenten'),cards=node('div','');view.append(title,cards);
 function registrations(shows){
  const details=node('details','incident-registration'),select=node('select',''),facts=node('dl','incident-formula');
  details.append(node('summary','','Concertgegevens bekijken'),node('p','incident-muted','Bezoekersaantallen en volledige CSV-registraties worden automatisch verwerkt.'));
  select.setAttribute('aria-label','Concert');const empty=node('option','','Kies een concert');empty.value='';select.append(empty);
  for(const row of shows){const option=node('option','',row.name+' · '+row.date+' · '+row.venue+(row.performance?' · '+row.performance:''));option.value=row.concertId;select.append(option);}
  const field=node('label','incident-field');field.append(node('span','','Concert'),select);details.append(field,facts);
  select.onchange=()=>{facts.replaceChildren();const row=shows.find(item=>item.concertId===select.value);if(!row)return;
   const basis=row.visitorBasis==='historical-attendance'?'Historisch bezoekersaantal':'97,5% van verkochte tickets';
   for(const [label,value]of [['Verkochte tickets',row.soldTickets==null?'Niet beschikbaar':count.format(row.soldTickets)],['Bezoekers',row.visitors==null?'Niet beschikbaar':count.format(row.visitors)],['Berekeningsbasis',basis],['Beveiligingsregistratie',row.securityComplete?'Volledig':'Geen CSV beschikbaar'],['Medische registratie',row.medicalComplete?'Volledig':'Geen CSV beschikbaar'],['Rapportage',!row.hasSource?'Niet beschikbaar':row.sourceReady?row.countsReady?'Verwerkt':'Wordt automatisch verwerkt':'Bron wordt gecontroleerd']]){const entry=node('div','');entry.append(node('dt','',label),node('dd','',value));facts.append(entry);}
  };return details;
 }
 async function load(){if(disposed||busy)return;busy=true;const finish=loading.start();const previous=cards.querySelector('select')?.value,open=cards.querySelector('.incident-registration')?.open;
  try{const data=await request('incidents',{signal:controller.signal});if(disposed)return;cards.replaceChildren(renderIncidentReferenceCards(data));const details=registrations(data.shows);cards.querySelector('.incident-overview').append(details);details.open=Boolean(open);const select=details.querySelector('select');select.value=previous||'';select.onchange();feedback.resolved();}
  catch{if(!disposed)feedback.show('Incidentgegevens konden niet worden bijgewerkt.',async()=>{await load();return Boolean(cards.children.length);},'Opnieuw laden');}
  finally{busy=false;finish();}
 }
 void load();return()=>{disposed=true;controller.abort();loading.dispose();feedback.dispose();content.replaceChildren();};
}
