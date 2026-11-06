import {saveRequestInfo} from './lib/background-saves.js';
import {detailBackButton} from './detail-back.js';
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
 root.replaceChildren();const back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=()=>onBack();
 const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',row.title),original=node('span','analysis-status measure-original-risk');title.tabIndex=-1;intro.append(title,node('p','',row.origin));header.append(glyph(row.sourceType==='operational'),intro,original);
 const layout=node('div','barrier-assessment-layout measure-implementation-layout'),content=node('div','measure-implementation-content'),aside=node('aside','measure-implementation-aside');
 const definition=node('section','analysis-editor-card');definition.append(node('h3','','Gedefinieerd risico'));const description=node('p','measure-text');definition.append(description);
 const proposal=node('section','analysis-editor-card measure-proposal-card');const proposalTitle=node('h3','','Beheersmaatregel');proposalTitle.id='measure-proposal-title';const text=node('textarea','measure-text-input');text.id='measure-proposal';text.setAttribute('aria-labelledby',proposalTitle.id);text.rows=5;text.maxLength=4000;text.value=draft.text;proposal.append(proposalTitle,text);
 const suggestionBox=node('section','analysis-editor-card');suggestionBox.append(node('h3','','Suggesties'),node('p','measure-suggestion-intro','Algemene aandachtspunten bij de uitvoering van deze maatregel.'));
 const grid=node('div','measure-suggestion-grid'),uploadCard=node('section','analysis-editor-card measure-upload-card'),upload=node('input','');upload.type='file';upload.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';upload.id='measure-document';upload.hidden=true;const choose=node('button','secondary-button','Document kiezen');choose.type='button';choose.onclick=()=>upload.click();uploadCard.append(node('h3','','Document uploaden'),node('p','','Voeg bijvoorbeeld een specifieke RI&E of een relevant plan toe. PDF, PNG of JPG, maximaal 2 MB.'),upload,choose);const documents=node('div','measure-documents');uploadCard.append(documents);
 for(const [heading,copy]of suggestions){const card=node('section','measure-suggestion-card');card.append(node('h4','',heading),node('p','',copy));grid.append(card);}suggestionBox.append(grid);const proposalRow=node('div','measure-proposal-row');proposalRow.append(proposal,uploadCard);content.append(definition,proposalRow,suggestionBox);
 const briefing=node('section','profile-pdf-card risk-review-card measure-briefing-card'),briefingTitle=node('h3','','Meenemen in briefing');briefingTitle.id='measure-briefing-title';briefing.setAttribute('aria-labelledby',briefingTitle.id);
 const briefingChoices=node('fieldset','risk-review-choices'),briefingLegend=node('legend','visually-hidden','Meenemen in briefing'),briefingInputs=[];briefingChoices.append(briefingLegend);
 for(const [value,labelText]of [['no','Nee'],['yes','Ja']]){const label=node('label','risk-review-option measure-briefing-option'),input=node('input','');input.type='radio';input.name='measure-briefing';input.value=value;input.required=true;label.dataset.choice=value;label.append(input,node('span','',labelText));briefingChoices.append(label);briefingInputs.push(input);input.onchange=()=>{if(input.checked){draft.briefing=value==='yes';queue.save();update();}};}
 briefing.append(briefingTitle,briefingChoices);
 const complete=node('button','analysis-complete measure-finish','Beheersmaatregel afronden');complete.type='button';const error=node('p','profile-message');error.setAttribute('role','alert');const reload=node('button','secondary-button','Actuele maatregel laden');reload.type='button';
 const snapshot=()=>({riskLevelAfter:draft.riskLevelAfter,briefing:draft.briefing});
 const review=createRiskReviewCard({name:'measure-after',title:'Risicobeoordeling na implementatie',withNote:false,showSave:false,onChange:value=>{draft.riskLevelAfter=value;queue.save();update();},onSave:()=>{},onEdit:()=>void queue.action('reopen'),editLabel:'Beoordeling wijzigen'});
 aside.append(review.element,briefing,complete);content.prepend(error,reload);layout.append(content,aside);header.prepend(back);root.append(header,layout);
 function update(){
  if(disposed)return;const locked=readOnly||reading||preparing||blocked||draft.finishing||[...(draft.work||[])].some(work=>work!==queue);
  original.textContent=operationalRiskLabels[row.originalRiskLevel];original.dataset.status=row.originalRiskLevel;original.setAttribute('aria-label','Oorspronkelijke risicobeoordeling: '+original.textContent);original.title='Oorspronkelijke risicobeoordeling';
  description.textContent=row.description||'Voor dit productieonderdeel is nog geen afzonderlijke risicobeschrijving vastgelegd.';
  text.readOnly=locked||record.implemented;text.disabled=readOnly||reading; if(text.value!==draft.text)text.value=draft.text;
  text.setCustomValidity(draft.text.trim()?'':'Vul een beheersmaatregel in.');
  review.update({riskLevel:draft.riskLevelAfter,disabled:locked||record.implemented,completed:record.implemented,busy:queue.busy,canEdit:!locked&&!queue.failed,canSave:false});
  for(const input of briefingInputs){input.checked=draft.briefing===(input.value==='yes');input.disabled=locked||queue.failed;}
  complete.hidden=record.implemented;complete.disabled=locked||queue.failed||!draft.text.trim()||!measureLevels.includes(draft.riskLevelAfter)||typeof draft.briefing!=='boolean';
  choose.disabled=locked||queue.failed;upload.disabled=choose.disabled;choose.hidden=readOnly;
  error.textContent=draft.error;error.hidden=!draft.error;reload.hidden=!draft.error;reload.disabled=queue.busy||reading;back.disabled=false;
  documents.replaceChildren();for(const attachment of record.attachments||[]){const file=node('div','measure-document');file.append(node('span','',attachment.fileName));const download=node('button','secondary-button','Downloaden');download.type='button';download.onclick=()=>void downloadFile(attachment);file.append(download);if(!readOnly){const remove=node('button','secondary-button','Verwijderen');remove.type='button';remove.disabled=locked||queue.busy||queue.failed;remove.onclick=()=>void queue.action('remove',{uploadId:attachment.uploadId});file.append(remove);}documents.append(file);}
 }
 function accept(result,replace,job){
  const latest=showMeasures(show,{risks:result?.overview}).rows.find(item=>item.id===row.id);
  if(!latest||!Number.isSafeInteger(result.record?.revision)||result.record.basis!==latest.basis||result.record.originalRiskLevel!==latest.originalRiskLevel)throw Error('UNVERIFIED');
  row=latest;record=result.record;draft.confirmed=result;draft.basis=row.basis;draft.error='';
  if(job?.operation==='edit-text'){if(draft.text.trim()===job.payload.text.trim())draft.text=row.text;}else if(replace){draft.riskLevelAfter=record.riskLevelAfter;draft.briefing=record.briefing;draft.text=row.text;}
  update();
 }
 async function send(operation,payload={}){
  try{return await request({operation,concertId:show.key,measureId:row.id,revision:record.revision,basis:record.basis,...payload});}
  catch(failure){draft.error='Opslag niet bevestigd. Je invoer is behouden. Laad de actuele maatregel om opnieuw te proberen.';throw failure;}
 }
 draft.work ||= new Set();
 const makeQueue=()=>createAssessmentQueue({info:saveRequestInfo('measure',{concertId:show.key,measureId:row.id}),snapshot,send,stored:accept,changed:update,activity:()=>{if(queue.busy)draft.work.add(queue);else draft.work.delete(queue);data.notify?.();},error:()=>{draft.error='Opslag niet bevestigd. Je invoer is behouden. Laad de actuele maatregel om opnieuw te proberen.';update();}});let queue=makeQueue();
 text.oninput=()=>{if(text.readOnly)return;draft.text=text.value;draft.riskLevelAfter=null;draft.error='';queue.laterAction('edit-text',()=>draft.text.trim()?{text:draft.text}:null);update();};
 text.onblur=()=>{if(draft.text.trim())queue.flush();};
 complete.onclick=()=>{if(complete.disabled)return;draft.finishing=true;const pending=queue.action('complete',{data:snapshot()});onBack();void pending.finally(()=>{draft.finishing=false;data.notify?.();});};
 reload.onclick=async()=>{
  if(queue.busy||reading)return;reading=true;const wanted={...draft};update();
  try{const result=await request({operation:'read',concertId:show.key,measureId:row.id});queue.dispose();accept(result,true);blocked=false;
   if(wanted.text!==row.text){draft.text=wanted.text;text.value=draft.text;}
   if(wanted.basis===row.basis&&!record.implemented){draft.riskLevelAfter=wanted.riskLevelAfter;draft.briefing=wanted.briefing;}
   queue=makeQueue();draft.error='';
  }catch{draft.error='De actuele maatregel kon niet worden geladen. Je invoer is behouden.';}finally{reading=false;update();}
 };
 upload.onchange=async()=>{
  const file=upload.files?.[0];if(!file||choose.disabled)return;
  if(file.size>measureUploadLimit||!Object.hasOwn(measureUploadTypes,file.type)||!(file.type==='application/pdf'?/\.pdf$/i:file.type==='image/png'?/\.png$/i:/\.jpe?g$/i).test(file.name)){draft.error='Kies een PDF, PNG of JPG van maximaal 2 MB.';upload.value='';update();return;}
  preparing=true;const release=queue.hold();draft.error='';update();try{const bytes=new Uint8Array(await file.arrayBuffer());if(!measureFileSignature(bytes,file.type))throw Error('VALIDATION');const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),sha256=[...hash].map(value=>value.toString(16).padStart(2,'0')).join(''),chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));preparing=false;await queue.action('upload',{uploadId:crypto.randomUUID(),fileName:file.name,mime:file.type,base64:btoa(chunks.join('')),sha256});}catch{draft.error='Het document is niet opgeslagen. Kies een geldige PDF, PNG of JPG van maximaal 2 MB.';}finally{preparing=false;release();upload.value='';update();}
 };
 async function downloadFile(attachment){
  try{const result=await request({operation:'download',concertId:show.key,measureId:row.id,uploadId:attachment.uploadId});if(disposed)return;if(result.attachment?.uploadId!==attachment.uploadId||result.attachment.mime!==attachment.mime||typeof result.base64!=='string'||result.base64.length>Math.ceil(measureUploadLimit/3)*4)throw Error('INVALID');const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:attachment.mime}));urls.add(url);const link=node('a','');link.href=url;link.download=attachment.fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},5000);}catch{if(!disposed){draft.error='Het document kon niet veilig worden gedownload. Probeer opnieuw.';update();}}
 }
 update();return{sync(latest){if(disposed||queue.busy||reading)return;if(draft.confirmed?.record?.revision===latest.revision&&draft.confirmed.record.basis===latest.basis){blocked=false;if(record.revision!==latest.revision)accept(draft.confirmed,true);return;}if(latest.basis!==record.basis||latest.revision!==record.revision){blocked=true;draft.error='Het risico of de maatregel is elders gewijzigd. Je invoer is behouden; laad de actuele maatregel.';update();}},dispose(){disposed=true;const pending=queue.dispose();for(const url of urls)URL.revokeObjectURL(url);urls.clear();return pending;}};
}
