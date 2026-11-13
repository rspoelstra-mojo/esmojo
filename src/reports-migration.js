import {createBackgroundTaskView} from './lib/background-task-view.js';
import './reports-schema-setup.css';
const el=(tag,text='')=>Object.assign(document.createElement(tag),{textContent:text});
export function createReportsMigration(container,{request}={}){
 let disposed=false;container.className='reports-schema-setup reports-migration';
 const title=el('h2','Rapportages overzetten naar Dataverse'),intro=el('p','Kopieer alle bestaande rapportages, incidentgegevens, beschikbare CSV-bronnen, PDF’s en verzend- en openingshistorie naar Dataverse. Bestaande concerten worden hergebruikt. De originelen en de huidige rapportageweergave blijven behouden.'),button=el('button','Alle Rapportages-gegevens overzetten'),hint=el('p','Eén klik start de volledige kopie en terugleescontrole. De inrichting moet klaar zijn. Je mag deze pagina daarna sluiten; de server bewaart de voortgang en hervat automatisch. Gewijzigde bronnen of afwijkende doelgegevens stoppen voor controle. Deze knop schakelt de website nog niet om en verstuurt geen e-mails.'),progress=el('div'),error=el('p');
 button.type='button';button.disabled=true;hint.className='reports-schema-hint';error.setAttribute('role','alert');container.append(title,intro,button,hint,progress,error);
 const controls=createBackgroundTaskView({container:progress,button,type:'reports-migration-v1',request,labels:{unit:'rapportages',start:'Alle Rapportages-gegevens overzetten',repeat:'Rapportages-kopie opnieuw controleren',resume:'Rapportages-migratie veilig hervatten',restart:'Rapportages-migratie opnieuw starten',running:'Rapportages-migratie loopt op de server',completedNote:'Originelen behouden; de website gebruikt nog de bestaande rapportagebron.'},run:async task=>{error.textContent='';try{await task();}catch(failure){if(!disposed)error.textContent=failure.message||'De opdracht is niet bevestigd. Open de pagina opnieuw om de opgeslagen voortgang te controleren.';}}});
 return{dispose(){disposed=true;controls.dispose();}};
}
