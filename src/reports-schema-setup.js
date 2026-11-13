import {reportsSchemaSummary as counts} from '../shared/reports-schema-summary.js';
import {createBackgroundTaskView} from './lib/background-task-view.js';
import './reports-schema-setup.css';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createReportsSchemaSetup(container,{request}={}){
 let disposed=false;container.className='reports-schema-setup';
 const title=el('h2','Rapportages klaarzetten in Dataverse'),intro=el('p','Maak de benodigde inrichting aan en controleer de onderdelen die al bestaan. Dit bereidt de opslag voor bestaande én toekomstige rapportages voor. Er worden nog geen rapportages overgezet en de website blijft de huidige rapportagebron gebruiken.');
 const summary=el('dl');summary.className='reports-schema-facts';
 for(const [label,value]of [['Nieuwe tabellen',counts.tables],['Nieuwe keuzelijsten',counts.choices],['Kolommen',counts.columns],['Relaties',counts.relationships],['Unieke sleutels',counts.keys],['Gedeelde tabellen controleren',counts.sharedTables]]){const item=el('div');item.append(el('dt',label),el('dd',String(value)));summary.append(item);}
 const button=el('button','Dataverse klaarzetten voor Rapportages');button.type='button';button.disabled=true;
 const hint=el('p','Eén klik start de volledige inrichting en controle. Je mag deze pagina daarna sluiten; de server bewaart de voortgang. Herhalen controleert eerst wat al bestaat. Afwijkende bestaande definities worden niet overschreven.'),progress=el('div'),error=el('p');hint.className='reports-schema-hint';error.setAttribute('role','alert');
 container.append(title,intro,summary,button,hint,progress,error);
 const controls=createBackgroundTaskView({container:progress,button,type:'reports-schema-v1',request,labels:{metadata:true,unit:'inrichtingsstappen',start:'Dataverse klaarzetten voor Rapportages',repeat:'Inrichting opnieuw controleren',resume:'Inrichting veilig hervatten',restart:'Inrichting opnieuw controleren',running:'Inrichting loopt op de server',completedNote:'Dataverse is voorbereid. Er zijn nog geen rapportages overgezet of opslagroutes veranderd.'},run:async task=>{error.textContent='';try{await task();}catch(failure){if(!disposed)error.textContent=failure.message||'De opdracht is nog niet bevestigd. Open de pagina opnieuw om de opgeslagen status te controleren.';}}});
 return{dispose(){disposed=true;controls.dispose();}};
}
