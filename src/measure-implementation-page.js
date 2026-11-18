import {createPageFeedback} from './lib/page-feedback.js';
import {saveRequestInfo} from './lib/background-saves.js';
import {detailBackButton} from './detail-back.js';
import './production-assessment.css';
import {createRiskReviewCard} from './risk-review-card.js';
import {assessmentNode as node,createAssessmentQueue} from './production-assessment-ui.js';
import {operationalRiskLabels} from '../shared/operational-risk.js';
import {measureLevels,measureUploadLimit,measureUploadTypes,measureFileSignature} from '../shared/measure-workflow.js';
import {showMeasures} from './lib/show-planning.js';
import {access} from './auth.js';
import {createRichTextEditor} from './rich-text-editor.js';
import {createEditActions,editHeaderRight,setEditMode,playEditTransition} from './edit-mode.js';
const suggestions=[['Afstemming','Stem de voorgestelde maatregel af met de betrokken productie-, veiligheids- en locatieverantwoordelijken.'],['Verantwoordelijkheid','Spreek af wie de maatregel uitvoert, wie toezicht houdt en wanneer de uitvoering gereed moet zijn.'],['Controle en communicatie','Controleer de uitvoerbaarheid en bespreek hoe betrokken teams signalen, afwijkingen en vervolgacties doorgeven.']];
const glyph=(operational)=>{const el=node('span','profile-category-icon');el.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(operational?'<path d="m12 3 10 18H2L12 3ZM12 9v5m0 3h.01"/>':'<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>')+'</svg>';return el;};
export function createMeasureImplementationPage(root,{show,data,row:initial,onBack,readOnly=false,request=body=>data.request('measure',{method:'POST',body}),exportPdf=body=>access('measure-pdf',{method:'POST',body})}){
 let row=initial,record=initial,disposed=false,reading=false,preparing=false,blocked=false,editing=false,saving=false,keepFields=false;const staged=[],removals=new Set();const urls=new Set(),drafts=data.measureDrafts||new Map();
 let draft=drafts.get(row.id);if(!draft||draft.basis!==row.basis){draft={basis:row.basis,riskLevelAfter:row.riskLevelAfter,briefing:row.briefing,text:row.text,editingText:false,error:''};drafts.set(row.id,draft);}
 const resetDraft=()=>{draft.riskLevelAfter=row.riskLevelAfter;draft.briefing=row.briefing;draft.text=row.text;draft.error='';staged.length=0;removals.clear();};
 if(!draft.finishing&&!(draft.work&&draft.work.size))resetDraft();
 const feedback=createPageFeedback(saveRequestInfo('measure',{concertId:show.key,measureId:row.id}));
 root.replaceChildren();root.classList.add('edit-page');setEditMode(root,'read');const back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);back.onclick=()=>onBack();
 const header=node('div','analysis-editor-header'),intro=node('div','analysis-editor-intro'),title=node('h2','',row.title),original=node('span','analysis-status measure-original-risk');title.tabIndex=-1;intro.append(title,node('p','',row.origin));const actions=createEditActions({onEdit:()=>enter(),onCancel:()=>leave(),onSave:()=>void saveAll()});header.append(glyph(row.sourceType==='operational'),intro,editHeaderRight(actions,original));
 const layout=node('div','barrier-assessment-layout measure-implementation-layout'),content=node('div','measure-implementation-content'),aside=node('aside','measure-implementation-aside');
 const definition=node('section','analysis-editor-card');definition.append(node('h3','','Gedefinieerd risico'));const description=node('p','measure-text');definition.append(description);
 const proposal=node('section','analysis-editor-card measure-proposal-card');const proposalTitle=node('h3','','Beheersmaatregel');proposalTitle.id='measure-proposal-title';const text=createRichTextEditor({id:'measure-proposal',labelledBy:proposalTitle.id,value:draft.text});proposal.append(proposalTitle,text.element);
 const suggestionBox=node('section','analysis-editor-card');suggestionBox.append(node('h3','','Suggesties'),node('p','measure-suggestion-intro','Algemene aandachtspunten bij de uitvoering van deze maatregel.'));
 const grid=node('div','measure-suggestion-grid'),uploadCard=node('section','analysis-editor-card measure-upload-card'),upload=node('input','');upload.type='file';upload.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';upload.id='measure-document';upload.hidden=true;const choose=node('button','secondary-button','Document kiezen');choose.type='button';choose.onclick=()=>upload.click();uploadCard.append(node('h3','','Document uploaden'),node('p','','Voeg bijvoorbeeld een specifieke RI&E of een relevant plan toe. PDF, PNG of JPG, maximaal 2 MB.'),upload,choose);const documents=node('div','measure-documents');uploadCard.append(documents);
 for(const [heading,copy]of suggestions){const card=node('section','measure-suggestion-card');card.append(node('h4','',heading),node('p','',copy));grid.append(card);}suggestionBox.append(grid);content.append(definition,proposal,uploadCard,suggestionBox);
 const briefing=node('section','profile-pdf-card risk-review-card measure-briefing-card'),briefingTitle=node('h3','','Meenemen in briefing');briefingTitle.id='measure-briefing-title';briefing.setAttribute('aria-labelledby',briefingTitle.id);
 const briefingChoices=node('fieldset','risk-review-choices'),briefingLegend=node('legend','visually-hidden','Meenemen in briefing'),briefingInputs=[];briefingChoices.append(briefingLegend);
 for(const [value,labelText]of [['no','Nee'],['yes','Ja']]){const label=node('label','risk-review-option measure-briefing-option'),input=node('input','');input.type='radio';input.name='measure-briefing';input.value=value;input.required=true;label.dataset.choice=value;label.append(input,node('span','',labelText));briefingChoices.append(label);briefingInputs.push(input);input.onchange=()=>{if(input.checked){draft.briefing=value==='yes';draft.error='';update();}};}
 briefing.append(briefingTitle,briefingChoices);
 const exportCard=node('section','profile-pdf-card risk-review-card measure-export-card'),exportTitle=node('h3','','Exporteren'),exportButton=node('button','secondary-button measure-export-button');exportTitle.id='measure-export-title';exportCard.setAttribute('aria-labelledby',exportTitle.id);exportButton.type='button';exportButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg>';exportButton.append(node('span','','PDF exporteren'));exportButton.setAttribute('aria-label','Beheersmaatregel exporteren als PDF');exportCard.append(exportTitle,node('p','measure-export-copy','Risico, mogelijk gevolg, beheersmaatregel en de classificatie voor en na de maatregel in één PDF.'),exportButton);
 const error=node('p','profile-message');error.setAttribute('role','alert');const reload=node('button','secondary-button','Actuele maatregel laden');reload.type='button';
 const snapshot=()=>({riskLevelAfter:draft.riskLevelAfter,briefing:draft.briefing});
 const review=createRiskReviewCard({name:'measure-after',title:'Risicobeoordeling na implementatie',withNote:false,showSave:false,onChange:value=>{draft.riskLevelAfter=value;draft.error='';update();},onSave:()=>{}});
 aside.append(review.element,briefing,exportCard);layout.append(content,aside);header.prepend(back);root.append(header,layout);
 function update(){
  if(disposed)return;const locked=readOnly||reading||preparing||blocked||saving||!editing||draft.finishing||[...(draft.work||[])].some(work=>work!==queue);
  original.textContent=operationalRiskLabels[row.originalRiskLevel];original.dataset.status=row.originalRiskLevel;original.setAttribute('aria-label','Oorspronkelijke risicobeoordeling: '+original.textContent);original.title='Oorspronkelijke risicobeoordeling';
  description.textContent=row.description||'Voor dit productieonderdeel is nog geen afzonderlijke risicobeschrijving vastgelegd.';
  text.readOnly=locked; if(text.value!==draft.text)text.value=draft.text;
  text.setCustomValidity(draft.text.trim()?'':'Vul een beheersmaatregel in.');
  review.update({riskLevel:draft.riskLevelAfter,disabled:locked,completed:false,busy:queue.busy,canEdit:false,canSave:false});
  for(const input of briefingInputs){input.checked=draft.briefing===(input.value==='yes');input.disabled=locked||queue.failed;}
  actions.update({busy:saving||queue.busy,canSave:canSave(),editable:!readOnly&&(!blocked&&!reading&&!queue.failed||editing)});
  choose.disabled=locked||queue.failed;upload.disabled=choose.disabled;choose.hidden=readOnly||!editing;
  if(draft.error)feedback.show(draft.error,()=>reload.onclick(),'Actuele maatregel laden');else feedback.clear();reload.disabled=queue.busy||reading;back.disabled=false;
  documents.replaceChildren();for(const item of staged){const file=node('div','measure-document');file.append(node('span','',item.fileName+' (nog niet opgeslagen)'));const drop=node('button','secondary-button','Verwijderen');drop.type='button';drop.disabled=locked;drop.onclick=()=>{staged.splice(staged.indexOf(item),1);update();};file.append(drop);documents.append(file);}
  for(const attachment of (record.attachments||[]).filter(item=>!removals.has(item.uploadId))){const file=node('div','measure-document');file.append(node('span','',attachment.fileName));const download=node('button','secondary-button','Downloaden');download.type='button';download.onclick=()=>void downloadFile(attachment);file.append(download);if(!readOnly){const remove=node('button','secondary-button','Verwijderen');remove.type='button';remove.disabled=locked||queue.busy||queue.failed;remove.onclick=()=>{removals.add(attachment.uploadId);update();};file.append(remove);}documents.append(file);}
 }
 function accept(result,replace,job){
  const latest=showMeasures(show,{risks:result?.overview}).rows.find(item=>item.id===row.id);
  if(!latest||!Number.isSafeInteger(result.record?.revision)||result.record.basis!==latest.basis||result.record.originalRiskLevel!==latest.originalRiskLevel)throw Error('UNVERIFIED');
  row=latest;record=result.record;draft.confirmed=result;draft.basis=row.basis;draft.error='';feedback.resolved();
  if(job?.operation==='edit-text'){if(draft.text.trim()===job.payload.text.trim())draft.text=row.text;}else if(replace&&!(keepFields&&job?.operation==='reopen')){draft.riskLevelAfter=record.riskLevelAfter;draft.briefing=record.briefing;draft.text=row.text;}
  update();
 }
 async function send(operation,payload={}){
  try{return await request({operation,concertId:show.key,measureId:row.id,revision:record.revision,basis:record.basis,...payload});}
  catch(failure){draft.error='Opslag niet bevestigd. Je invoer is behouden. Laad de actuele maatregel om opnieuw te proberen.';throw failure;}
 }
 draft.work ||= new Set();
 const makeQueue=()=>createAssessmentQueue({info:saveRequestInfo('measure',{concertId:show.key,measureId:row.id}),snapshot,send,stored:accept,changed:update,activity:()=>{if(queue.busy)draft.work.add(queue);else draft.work.delete(queue);data.notify?.();},error:()=>{draft.error='Opslag niet bevestigd. Je invoer is behouden. Laad de actuele maatregel om opnieuw te proberen.';update();}});let queue=makeQueue();
 text.onchange=()=>{if(text.readOnly)return;if(draft.text!==text.value)draft.riskLevelAfter=null;draft.text=text.value;draft.error='';update();};
 const textChanged=()=>draft.text.trim()!==String(row.text||'').trim();
 const changed=()=>!record.implemented||textChanged()||draft.riskLevelAfter!==record.riskLevelAfter||draft.briefing!==record.briefing||staged.length>0||removals.size>0;
 const canSave=()=>editing&&!saving&&!readOnly&&!queue.failed&&Boolean(draft.text.trim())&&measureLevels.includes(draft.riskLevelAfter)&&typeof draft.briefing==='boolean'&&changed();
 function enter(){
  if(editing||readOnly||blocked||reading||saving||queue.failed)return;
  editing=true;resetDraft();setEditMode(root,'edit');playEditTransition(layout);update();requestAnimationFrame(()=>{if(editing)text.element.querySelector?.('[contenteditable],textarea')?.focus?.({preventScroll:true});});
 }
 function leave(){
  if(!editing||saving)return;editing=false;resetDraft();text.value=draft.text;setEditMode(root,'read');playEditTransition(layout);update();actions.edit.focus({preventScroll:true});
 }
 // Eén bevestigde reeks: zo nodig heropenen, tekst, documenten en afronden. Pas na bevestiging terug naar de leesmodus; bij een fout blijft de invoer staan.
 async function saveAll(){
  if(!canSave())return;saving=true;keepFields=true;draft.error='';update();
  const wanted={text:draft.text,riskLevelAfter:draft.riskLevelAfter,briefing:draft.briefing},uploads=staged.slice(),dropped=[...removals];let ok=true;
  try{
   if(record.implemented)ok=Boolean(await queue.action('reopen'));
   if(ok&&wanted.text.trim()!==String(row.text||'').trim())ok=Boolean(await queue.action('edit-text',{text:wanted.text}));
   for(const upload of uploads){if(!ok)break;ok=Boolean(await queue.action('upload',upload));if(ok)staged.splice(staged.indexOf(upload),1);}
   for(const uploadId of dropped){if(!ok)break;ok=Boolean(await queue.action('remove',{uploadId}));if(ok)removals.delete(uploadId);}
   if(ok){draft.riskLevelAfter=wanted.riskLevelAfter;draft.briefing=wanted.briefing;draft.text=wanted.text;ok=Boolean(await queue.action('complete',{data:{riskLevelAfter:wanted.riskLevelAfter,briefing:wanted.briefing}}));}
  }finally{saving=false;keepFields=false;}
  if(disposed)return;
  if(ok&&record.implemented){editing=false;staged.length=0;removals.clear();setEditMode(root,'read');playEditTransition(layout);actions.edit.focus({preventScroll:true});}
  update();
 }
 reload.onclick=async()=>{
  if(disposed||queue.busy||reading)return false;reading=true;const wanted={...draft};update();
  try{const result=await request({operation:'read',concertId:show.key,measureId:row.id});queue.dispose();accept(result,true);blocked=false;
   if(wanted.text!==row.text){draft.text=wanted.text;text.value=draft.text;}
   if(wanted.basis===row.basis&&!record.implemented){draft.riskLevelAfter=wanted.riskLevelAfter;draft.briefing=wanted.briefing;}
   queue=makeQueue();draft.error='';
  }catch{draft.error='De actuele maatregel kon niet worden geladen. Je invoer is behouden.';return false;}finally{reading=false;update();}
 };
 upload.onchange=async()=>{
  const file=upload.files?.[0];if(!file||choose.disabled)return;
  if(file.size>measureUploadLimit||!Object.hasOwn(measureUploadTypes,file.type)||!(file.type==='application/pdf'?/\.pdf$/i:file.type==='image/png'?/\.png$/i:/\.jpe?g$/i).test(file.name)){draft.error='Kies een PDF, PNG of JPG van maximaal 2 MB.';upload.value='';update();return;}
  preparing=true;const release=queue.hold();draft.error='';update();try{const bytes=new Uint8Array(await file.arrayBuffer());if(!measureFileSignature(bytes,file.type))throw Error('VALIDATION');const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),sha256=[...hash].map(value=>value.toString(16).padStart(2,'0')).join(''),chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));preparing=false;staged.push({uploadId:crypto.randomUUID(),fileName:file.name,mime:file.type,base64:btoa(chunks.join('')),sha256});}catch{draft.error='Het document is niet opgeslagen. Kies een geldige PDF, PNG of JPG van maximaal 2 MB.';}finally{preparing=false;release();upload.value='';update();}
 };

 let exporting=false;
 exportButton.onclick=async()=>{
  if(exporting||disposed)return;exporting=true;exportButton.disabled=true;exportButton.setAttribute('aria-busy','true');
  try{
   const result=await exportPdf({concertId:show.key,measureId:row.id});if(disposed)return;
   if(typeof result?.pdfBase64!=='string'||result.pdfBase64.length>2796204||!/^RISICO_[\w.-]+\.pdf$/.test(result.fileName||''))throw Error('INVALID');
   const bytes=Uint8Array.from(atob(result.pdfBase64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));urls.add(url);
   const link=node('a','');link.href=url;link.download=result.fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},5000);
  }catch{if(!disposed){draft.error='De PDF kon niet worden gemaakt. Probeer opnieuw.';update();}}
  finally{exporting=false;if(!disposed){exportButton.disabled=false;exportButton.removeAttribute('aria-busy');}}
 };
 async function downloadFile(attachment){
  try{const result=await request({operation:'download',concertId:show.key,measureId:row.id,uploadId:attachment.uploadId});if(disposed)return;if(result.attachment?.uploadId!==attachment.uploadId||result.attachment.mime!==attachment.mime||typeof result.base64!=='string'||result.base64.length>Math.ceil(measureUploadLimit/3)*4)throw Error('INVALID');const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:attachment.mime}));urls.add(url);const link=node('a','');link.href=url;link.download=attachment.fileName;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},5000);}catch{if(!disposed){draft.error='Het document kon niet veilig worden gedownload. Probeer opnieuw.';update();}}
 }
 update();return{sync(latest){if(disposed||queue.busy||reading)return;if(draft.confirmed?.record?.revision===latest.revision&&draft.confirmed.record.basis===latest.basis){blocked=false;if(record.revision!==latest.revision)accept(draft.confirmed,true);return;}if(latest.basis!==record.basis||latest.revision!==record.revision){blocked=true;draft.error='Het risico of de maatregel is elders gewijzigd. Je invoer is behouden; laad de actuele maatregel.';update();}},dispose(){disposed=true;feedback.dispose();const pending=queue.dispose();for(const url of urls)URL.revokeObjectURL(url);urls.clear();return pending;}};
}
