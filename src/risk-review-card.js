import './risk-review-card.css';
import {productionRiskLevels} from '../shared/barrier-layout.js';
import {assessmentNode as node} from './production-assessment-ui.js';

// Herbruikbare presentatie; de aanroepende pagina verzorgt opslag en autorisatie.
export function createRiskReviewCard({name,onChange,onSave,onEdit,editLabel='Bewerken'}){
  let level=null;const drafts={};
  const card=node('form','profile-pdf-card risk-review-card'),title=node('h3','','Risico beoordeling');title.id=name+'-title';
  card.setAttribute('aria-labelledby',title.id);
  const choices=node('fieldset','risk-review-choices'),legend=node('legend','visually-hidden','Risicoklasse'),inputs=[];
  choices.append(legend);
  for(const option of productionRiskLevels){
    const label=node('label','risk-review-option'),input=node('input',''),text=node('span','',option.label);
    label.dataset.level=option.value;input.type='radio';input.name=name;input.value=option.value;input.required=true;label.append(input,text);choices.append(label);inputs.push(input);
    input.onchange=()=>{if(!input.checked)return;if(level)drafts[level]=note.value;onChange(option.value,drafts[option.value]||'','level');};
  }
  const field=node('div','assessment-field risk-review-note'),label=node('label','','Toelichting'),note=node('textarea','');note.id=name+'-note';note.rows=4;note.maxLength=4000;label.htmlFor=note.id;field.append(label,note);
  note.oninput=()=>onChange(level,note.value,'note');
  const save=node('button','analysis-complete','Opslaan');save.type='submit';
  const status=node('p','risk-review-status');status.setAttribute('aria-live','polite');
  const edit=node('button','secondary-button',editLabel);edit.type='button';edit.onclick=()=>onEdit?.();
  card.append(title,choices,field,save,status,edit);
  card.onsubmit=event=>{event.preventDefault();if(!save.disabled&&card.reportValidity())onSave();};
  const view={
    element:card,
    update({riskLevel=null,riskNote='',disabled=false,busy=false,canSave=false,completed=false,failed=false,canEdit=true,noRiskNoteRequired=true}={}){
      level=riskLevel;if(!level)for(const key of Object.keys(drafts))delete drafts[key];
      for(const input of inputs){input.checked=input.value===level;input.disabled=disabled;}
      if(note.value!==riskNote)note.value=riskNote;
      field.hidden=!['none','medium','high'].includes(level)||(level==='none'&&!noRiskNoteRequired);label.textContent=level==='none'?'Toelichting':'Beheersmaatregel';note.required=!field.hidden;note.disabled=disabled;
      save.hidden=!level||completed;save.disabled=disabled||busy||failed||!canSave;
      edit.hidden=!completed||!onEdit;edit.disabled=busy||!canEdit;
      status.textContent=completed?'✓ Opgeslagen':failed?'Opslag niet bevestigd':busy?'Concept wordt opgeslagen…':'';
      status.classList.toggle('assessment-completed',completed);
    },
  };
  view.update();return view;
}
