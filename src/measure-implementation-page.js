import './production-assessment.css';
import {createRiskReviewCard} from './risk-review-card.js';
import {assessmentNode as node,createAssessmentQueue} from './production-assessment-ui.js';
import {operationalRiskLabels} from '../shared/operational-risk.js';
import {measureLevels,measureUploadLimit,measureUploadTypes,measureFileSignature} from '../shared/measure-workflow.js';
import {showMeasures} from './lib/show-planning.js';
const suggestions=[['Afstemming','Stem de voorgestelde maatregel af met de betrokken productie-, veiligheids- en locatieverantwoordelijken.'],['Verantwoordelijkheid','Spreek af wie de maatregel uitvoert, wie toezicht houdt en wanneer de uitvoering gereed moet zijn.'],['Controle en communicatie','Controleer de uitvoerbaarheid en bespreek hoe betrokken teams signalen, afwijkingen en vervolgacties doorgeven.']];
const glyph=(operational)=>{const el=node('span','profile-category-icon');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(operational?'<path d="m12 3 10 18H2L12 3ZM12 9v5m0 3h.01"/>':'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>')+'</svg>';return el;};
export function createMeasureImplementationPage(root,{show,data,row:initial,onBack,readOnly=false,request=body=>data.request('measure',{method:'POST',body})}){
 let row=initial,record=initial,disposed=false,reading=false,preparing=false,blocked=false;const urls=new Set(),drafts=data.measureDrafts||new Map();
 let draft=drafts.get(row.id);if(!draft||draft.basis!==row.basis){draft={basis:row.basis,riskLevelAfter:row.riskLevelAfter,briefing:row.briefing,text:row.text,editingText:false,error:''};drafts.set(row.id,draft);}
 root.replaceChildren();const back=node('button','profile-back','← Terug naar overzicht');back.type='button';back.onclick=()=>onBack();
 const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',row.title),original=node('span','analysis-status measure-original-risk');title.tabIndex=-1;intro.append(title,node('p','',row.origin));header.append(glyph(row.sourceType==='operational'),intro,original);
 const layout=node('div','barrier-assessment-layout measure-implementation-layout'),content=node('div','measure-implementation-content'),aside=node('aside','measure-implementation-aside');
 const definition=node('section','analysis-editor-card');definition.append(node('h3','','Gedefinieerd risico'));const description=node('p','measure-text');definition.append(description);
 const proposal=node('section','analysis-editor-card'),proposalHeader=node('div','measure-block-header'),edit=node('button','secondary-button','Bewerken');edit.type='button';proposalHeader.append(node('h3','','Voorgestelde beheersmaatregel'),edit);const proposed=node('p','measure-text'),editor=node('div','assessment-field measure-text-editor'),text=node('textarea',''),textLabel=node('label','','Voorgestelde beheersmaatregel');text.id='measure-proposal';text.rows=5;text.maxLength=4000;textLabel.htmlFor=text.id;text.value=draft.text;const saveText=node('button','analysis-complete','Opslaan'),cancelText=node('button','secondary-button','Annuleren');saveText.type=cancelText.type='button';editor.append(textLabel,text,saveText,cancelText);proposal.append(proposalHeader,proposed,editor);
 const suggestionBox=node('section','analysis-editor-card');suggestionBox.append(node('h3','','Suggesties'),node('p','measure-suggestion-intro','Algemene aandachtspunten bij de uitvoering van deze maatregel.'));
 const grid=node('div','measure-suggestion-grid'),uploadCard=node('section','measure-suggestion-card'),upload=node('input','');upload.type='file';upload.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';upload.id='measure-document';upload.hidden=true;const choose=node('button','secondary-button','Document kiezen');choose.type='button';choose.onclick=()=>upload.click();uploadCard.append(node('h4','','Document uploaden'),node('p','','Voeg bijvoorbeeld een specifieke RI&E of een relevant plan toe. PDF, PNG of JPG, maximaal 2 MB.'),upload,choose);const documents=node('div','measure-documents');uploadCard.append(documents);grid.append(uploadCard);
 for(const [heading,copy]of suggestions){const card=node('section','measure-suggestion-card');card.append(node('h4','',heading),node('p','',copy));grid.append(card);}suggestionBox.append(grid);content.append(definition,proposal,suggestionBox);
 const briefing=node('button','measure-briefing secondary-button');briefing.type='button';briefing.append(node('span','','Meenemen in briefing'));const tick=node('span','measure-briefing-check','✓');tick.setAttribute('aria-hidden','true');briefing.append(tick);
 const complete=node('button','analysis-complete measure-finish','Beheersmaatregel afronden');complete.type='button';const status=node('p','risk-review-status');status.setAttribute('aria-live','polite');const error=node('p','profile-message');error.setAttribute('role','alert');const reload=node('button','secondary-button','Actuele maatregel laden');reload.type='button';
 const snapshot=()=>({riskLevelAfter:draft.riskLevelAfter,briefing:draft.briefing});
 const review=createRiskReviewCard({name:'measure-after',title:'Risicobeoordeling na implementatie',withNote:false,showSave:false,onChange:value=>{draft.riskLevelAfter=value;queue.save();update();},onSave:()=>{},onEdit:()=>void queue.action('reopen'),editLabel:'Beoordeling wijzigen'});
 aside.append(review.element,briefing,complete,status,error,reload);layout.append(content,aside);root.append(back,header,layout);
 function update(){
  if(disposed)return;const locked=readOnly||reading||preparing||blocked||queue.exclusive;
  original.textContent=operationalRiskLabels[row.originalRiskLevel];original.dataset.status=row.originalRiskLevel;original.setAttribute('aria-label','Oorspronkelijke risicobeoordeling: '+original.textContent);original.title='Oorspronkelijke risicobeoordeling';
  description.textContent=row.description||'Voor dit productieonderdeel is nog geen afzonderlijke risicobeschrijving vastgelegd.';proposed.textContent=row.text;
  proposed.hidden=draft.editingText;editor.hidden=!draft.editingText;edit.hidden=readOnly||draft.editingText;edit.disabled=locked||queue.busy||queue.failed;
  text.disabled=locked;saveText.disabled=locked||queue.busy||queue.failed||!draft.text.trim();cancelText.disabled=locked||queue.busy;
  review.update({riskLevel:draft.riskLevelAfter,disabled:locked||record.implemented,completed:record.implemented,busy:queue.busy,canEdit:!locked&&!queue.failed,canSave:false});
  briefing.setAttribute('aria-pressed',String(draft.briefing));tick.hidden=!draft.briefing;briefing.disabled=locked||queue.failed;
  complete.hidden=record.implemented;complete.disabled=locked||queue.busy||queue.failed||draft.editingText||!measureLevels.includes(draft.riskLevelAfter);
  choose.disabled=locked||queue.busy||queue.failed;upload.disabled=choose.disabled;choose.hidden=readOnly;
  status.textContent=record.implemented?'✓ Geïmplementeerd':preparing?'Document voorbereiden…':queue.busy?'Wordt opgeslagen…':!draft.riskLevelAfter?'Kies de risicobeoordeling na implementatie om af te ronden.':'Nog te implementeren';
  error.textContent=draft.error;error.hidden=!draft.error;reload.hidden=!draft.error;reload.disabled=queue.busy||reading;back.disabled=preparing||queue.exclusive;
  documents.replaceChildren();for(const attachment of record.attachments||[]){const file=node('div','measure-document');file.append(node('span','',attachment.fileName));const download=node('button','secondary-button','Downloaden');download.type='button';download.onclick=()=>void downloadFile(attachment);file.append(download);if(!readOnly){const remove=node('button','secondary-button','Verwijderen');remove.type='button';remove.disabled=locked||queue.busy||queue.failed;remove.onclick=()=>void queue.action('remove',{uploadId:attachment.uploadId});file.append(remove);}documents.append(file);}
 }
 function accept(result,replace){
  const latest=showMeasures(show,{risks:result?.overview}).rows.find(item=>item.id===row.id);
  if(!latest||!Number.isSafeInteger(result.record?.revision)||result.record.basis!==latest.basis||result.record.originalRiskLevel!==latest.originalRiskLevel)throw Error('UNVERIFIED');
  row=latest;record=result.record;draft.basis=row.basis;draft.error='';
  if(replace){draft.riskLevelAfter=record.riskLevelAfter;draft.briefing=record.briefing;draft.text=row.text;draft.editingText=false;if(!disposed)text.value=draft.text;}
  update();
 }
 async function send(operation,payload={}){
  try{return await request({operation,concertId:show.key,measureId:row.id,revision:record.revision,basis:record.basis,...payload});}
  catch(failure){draft.error='Opslag niet bevestigd. Je invoer is behouden. Laad de actuele maatregel om opnieuw te proberen.';throw failure;}
 }
 const makeQueue=()=>createAssessmentQueue({snapshot,send,stored:accept,changed:update,error:()=>{draft.error='Opslag niet bevestigd. Je invoer is behouden. Laad de actuele maatregel om opnieuw te proberen.';update();}});let queue=makeQueue();
 edit.onclick=()=>{draft.editingText=true;text.value=draft.text;update();text.focus();};text.oninput=()=>{draft.text=text.value;update();};
 saveText.onclick=()=>void queue.action('edit-text',{text:draft.text});cancelText.onclick=()=>{draft.editingText=false;draft.text=row.text;text.value=draft.text;update();};
 briefing.onclick=()=>{draft.briefing=!draft.briefing;queue.save();update();};
 complete.onclick=async()=>{if(complete.disabled)return;const result=await queue.action('complete',{data:snapshot()});if(result&&!disposed)onBack();};
 reload.onclick=async()=>{
  if(queue.busy||reading)return;reading=true;const wanted={...draft};update();
  try{const result=await request({operation:'read',concertId:show.key,measureId:row.id});queue.dispose();accept(result,true);blocked=false;
   if(wanted.editingText&&wanted.text!==row.text){draft.text=wanted.text;draft.editingText=true;text.value=draft.text;}
   if(wanted.basis===row.basis&&!record.implemented){draft.riskLevelAfter=wanted.riskLevelAfter;draft.briefing=wanted.briefing;}
   queue=makeQueue();draft.error='';
  }catch{draft.error='De actuele maatregel kon niet worden geladen. Je invoer is behouden.';}finally{reading=false;update();}
 };
 upload.onchange=async()=>{
  const file=upload.files?.[0];if(!file||choose.disabled)return;
  if(file.size>measureUploadLimit||!Object.hasOwn(measureUploadTypes,file.type)||!(file.type==='application/pdf'?/\.pdf$/i:file.type==='image/png'?/\.png$/i:/\.jpe?g$/i).test(file.name)){draft.error='Kies een PDF, PNG of JPG van maximaal 2 MB.';upload.value='';update();return;}
  preparing=true;draft.error='';update();try{const bytes=new Uint8Array(await file.arrayBuffer());if(!measureFileSignature(bytes,file.type))throw Error('VALIDATION');const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),sha256=[...hash].map(value=>value.toString(16).padStart(2,'0')).join(''),chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));preparing=false;await queue.action('upload',{uploadId:crypto.randomUUID(),fileName:file.name,mime:file.type,base64:btoa(chunks.join('')),sha256});}catch{draft.error='Het document is niet opgeslagen. Kies een geldige PDF, PNG of JPG van maximaal 2 MB.';}finally{preparing=false;upload.value='';update();}
 };
 async function downloadFile(attachment){
  try{const result=await request({operation:'download',concertId:show.key,measureId:row.id,uploadId:attachment.uploadId});if(disposed)return;if(result.attachment?.uploadId!==attachment.uploadId||result.attachment.mime!==attachment.mime||typeof result.base64!=='string'||result.base64.length>Math.ceil(measureUploadLimit/3)*4)throw Error('INVALID');const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:attachment.mime}));urls.add(url);const link=node('a','');link.href=url;link.download=attachment.fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},5000);}catch{if(!disposed){draft.error='Het document kon niet veilig worden gedownload. Probeer opnieuw.';update();}}
 }
 update();return{sync(latest){if(disposed||queue.busy||reading)return;if(latest.basis!==record.basis||latest.revision!==record.revision){blocked=true;draft.error='Het risico of de maatregel is elders gewijzigd. Je invoer is behouden; laad de actuele maatregel.';update();}},dispose(){disposed=true;const pending=queue.dispose();for(const url of urls)URL.revokeObjectURL(url);urls.clear();return pending;}};
}
