import {createPageFeedback} from './lib/page-feedback.js';
import {backgroundSaves,saveRequestInfo} from './lib/background-saves.js';
import {detailBackButton} from './detail-back.js';
import './production-assessment.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {barrierTypes,isStandardBarrierType,validateBarrierData,barrierUploadLimit} from '../shared/barrier-layout.js';
import {loadBarrierImage} from './barrier-images.js';
import {createRiskReviewCard} from './risk-review-card.js';
import {assessmentNode as node,createAssessmentQueue} from './production-assessment-ui.js';

export function createBarrierLayoutPage(section,{show,onBack,onStored=()=>{},request=body=>access('barrier-layout',{method:'POST',body})}){
  const feedback=createPageFeedback(saveRequestInfo('barrier-layout',{concertId:show.key}));
  let disposed=false,ready=false,record=null,queue=null,reading=false,preparing=false,previewUrl=null,previewSequence=0,awaitingPreview=false;
  const local=backgroundSaves.form('barrier-edit:'+show.key);const editSession=backgroundSaves.session;let stagedUpload=null;
  let type=null,riskLevel=null,riskNote='',custom={notes:'',attachment:null};
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,section):null;
  section.replaceChildren();const root=node('section','production-assessment');
  const back=node('button','profile-back','← Terug naar overzicht');detailBackButton(back);
  const title=node('h2','assessment-page-title','Barrieropstelling');title.tabIndex=-1;
  const block=node('form','assessment-block'),columns=node('div','barrier-columns'),fields=node('div','assessment-fields'),preview=node('aside','assessment-preview');
  const typeField=node('div','assessment-field'),label=node('label','','Type barrieropstelling'),select=node('select','');select.id='barrier-type';label.htmlFor=select.id;select.required=true;
  preview.dataset.layout='schematic';
  const placeholder=node('option','','Kies een barrieropstelling');placeholder.value='';select.append(placeholder);
  for(const option of barrierTypes){const item=node('option','',option.label);item.value=option.value;select.append(item);}typeField.append(label,select);
  const customFields=node('div','assessment-fields'),uploadField=node('div','assessment-field'),uploadLabel=node('label','','Afwijkende barrieropstelling uploaden'),upload=node('input','');upload.type='file';upload.id='barrier-upload';upload.accept='.png,.pdf,image/png,application/pdf';uploadLabel.htmlFor=upload.id;
  const uploadStatus=node('p','assessment-upload-status','PNG of PDF, maximaal 2 MB.'),uploadActions=node('div','assessment-upload-actions'),remove=node('button','secondary-button','Bestand verwijderen');remove.type='button';uploadActions.append(remove);uploadField.append(uploadLabel,upload,uploadStatus,uploadActions);
  const notesField=node('div','assessment-field'),notesLabel=node('label','','Toelichting en/of beheersmaatregelen'),notes=node('textarea','');notes.id='barrier-notes';notesLabel.htmlFor=notes.id;notes.rows=5;notes.maxLength=4000;notesField.append(notesLabel,notes);customFields.append(uploadField,notesField);
  fields.append(typeField,customFields);
  const previewLabel=node('p','assessment-preview-label','Schematische weergave'),previewBox=node('div','assessment-preview-box');preview.append(previewLabel,previewBox);columns.append(fields,preview);
  const status=node('p','assessment-status'),error=node('p','profile-message');error.setAttribute('role','alert');
  const reload=node('button','secondary-button','Actuele beoordeling laden');reload.type='button';reload.hidden=true;
  const review=createRiskReviewCard({name:'barrier-risk',editLabel:'Barrieropstelling bewerken',
    onChange:(value,note,field)=>{riskLevel=value;riskNote=value==='none'&&isStandardBarrierType(type)?'':note;remember();update();},
    onSave:()=>{if(valid()&&block.reportValidity())save();},
    onEdit:()=>queue.action('reopen'),
  });
  const layout=node('div','barrier-assessment-layout');block.append(columns,status,error,reload);layout.append(block,review.element);const heading=node('div','analysis-editor-header');heading.append(back,title);root.append(heading,layout);section.append(root);
  const snapshot=()=>({barrierType:type,riskLevel,notes:type==='custom'?custom.notes:null,uploadId:type==='custom'?custom.attachment?.uploadId||null:null,riskNote:riskLevel==='low'||(riskLevel==='none'&&isStandardBarrierType(type))?'':riskNote});
  const call=(operation,payload={})=>request({operation,concertId:show.key,...payload});
  const valid=()=>{try{validateBarrierData(snapshot(),true);return true;}catch{return false;}};
  const remember=()=>{local.fields={type,riskLevel,riskNote,custom:structuredClone(custom),stagedUpload,revision:record?.revision||0};};
  function save(){
    const wanted=structuredClone(snapshot()),file=type==='custom'?stagedUpload:null;
    if(file){void queue.action('draft',{data:{...wanted,uploadId:record?.attachment?.uploadId||null}});void queue.action('upload',file);}
    else if(type==='custom'&&record?.attachment&&!custom.attachment)void queue.action('remove-upload',{uploadId:record.attachment.uploadId});
    void queue.action('complete',{data:wanted});onBack();
  }
  const sendAssessment=(operation,payload)=>call(operation,{...payload,revision:record.revision});
  function update(){
    if(disposed)return;const locked=!ready||reading||preparing||queue?.exclusive||record?.completed;
    select.disabled=locked||Boolean(queue?.failed);customFields.hidden=type!=='custom';notes.disabled=locked;notes.required=type==='custom';
    review.update({noRiskNoteRequired:!isStandardBarrierType(type),riskLevel,riskNote:riskLevel==='low'||(riskLevel==='none'&&isStandardBarrierType(type))?'':riskNote,disabled:locked,busy:Boolean(queue?.exclusive),failed:queue?.failed,canSave:valid(),canEdit:ready&&!reading&&!preparing&&!queue?.failed,completed:Boolean(record?.completed)});
    upload.disabled=locked||queue?.busy;remove.hidden=!custom.attachment;remove.disabled=locked||queue?.busy;
    back.disabled=false;
    status.textContent=record?.completed?'✓ Barrieropstelling afgerond':'';status.hidden=!status.textContent;status.classList.toggle('assessment-completed',Boolean(record?.completed));
    if(custom.attachment)uploadStatus.textContent=custom.attachment.fileName;else if(!preparing)uploadStatus.textContent='PNG of PDF, maximaal 2 MB.';
  }
  function resetPreview(){previewSequence++;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}previewBox.replaceChildren();}
  function placeholderPreview(text){previewBox.replaceChildren(node('p','',text));}
  async function renderPreview(){
    resetPreview();awaitingPreview=false;const sequence=previewSequence;
    preview.dataset.layout=type==='custom'?'custom':'schematic';
    if(type!=='custom'){
      if(!type){placeholderPreview('Schematische afbeelding nog niet beschikbaar');return;}
      try{const url=await loadBarrierImage(type);if(disposed||sequence!==previewSequence)return;
       const image=node('img','');image.alt=barrierTypes.find(row=>row.value===type)?.label||'Barrieropstelling';image.src=url;image.onerror=()=>{if(!disposed&&sequence===previewSequence)placeholderPreview('Schematische afbeelding nog niet beschikbaar');};previewBox.append(image);
      }catch{if(!disposed&&sequence===previewSequence)placeholderPreview('Schematische afbeelding nog niet beschikbaar');}return;
    }
    const attachment=custom.attachment;if(!attachment){placeholderPreview('Nog geen afwijkende barrieropstelling geüpload');return;}
    placeholderPreview(attachment.fileName);
    if(stagedUpload?.uploadId===attachment.uploadId){if(attachment.mime==='image/png'){const image=node('img','');image.src='data:image/png;base64,'+stagedUpload.base64;image.alt='Geselecteerde afwijkende barrieropstelling';previewBox.replaceChildren(image);}return;}if(record?.attachment?.uploadId!==attachment.uploadId){awaitingPreview=true;return;}
    try{
      const data=await call('download',{uploadId:attachment.uploadId});if(disposed||sequence!==previewSequence)return;
      if(data.attachment?.uploadId!==attachment.uploadId||typeof data.base64!=='string'||data.base64.length>Math.ceil(barrierUploadLimit/3)*4)throw Error('Bestand niet beschikbaar.');
      const bytes=Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0));previewUrl=URL.createObjectURL(new Blob([bytes],{type:attachment.mime}));previewBox.replaceChildren();
      if(attachment.mime==='image/png'){const image=node('img','');image.src=previewUrl;image.alt='Geüploade afwijkende barrieropstelling';previewBox.append(image);}else previewBox.append(node('span','assessment-pdf-icon','PDF'),node('p','',attachment.fileName));
      const open=node('a','','Bestand openen');open.href=previewUrl;open.target='_blank';open.rel='noopener noreferrer';previewBox.append(open);
    }catch{if(!disposed&&sequence===previewSequence){placeholderPreview('Bestandsweergave niet beschikbaar.');const retry=node('button','secondary-button','Opnieuw laden');retry.type='button';retry.onclick=renderPreview;previewBox.append(retry);}}
  }
  function accept(data,replace,job){
    if(!data?.record||!Number.isSafeInteger(data.record.revision))throw Error('Onvolledige opslagbevestiging.');record=data.record;if(job?.operation==='complete'&&record.completed){local.fields=null;stagedUpload=null;}
    if(!disposed){if(replace&&job?.operation!=='upload'&&job?.operation!=='draft'){type=record.barrierType;riskLevel=record.riskLevel;riskNote=record.riskNote||'';select.value=type||'';if(type==='custom'){custom={notes:record.notes||'',attachment:record.attachment};notes.value=custom.notes;}void renderPreview();}else if(awaitingPreview&&record.attachment?.uploadId===custom.attachment?.uploadId)void renderPreview();if(job)feedback.resolved();onStored(record,data);update();}
  }
  async function load(){
    if(reading)return;reading=true;ready=false;error.textContent='';reload.hidden=true;const finish=loading?.start();update();
    try{const data=await call('read');if(disposed)return;queue?.dispose();accept(data,true);if(local.fields&&!record.completed){const saved=local.fields;type=saved.type;riskLevel=saved.riskLevel;riskNote=saved.riskNote;custom=structuredClone(saved.custom);stagedUpload=saved.stagedUpload;select.value=type||'';notes.value=custom.notes;void renderPreview();}queue=createAssessmentQueue({info:saveRequestInfo('barrier-layout',{concertId:show.key}),snapshot,send:sendAssessment,stored:accept,changed:update,error:message=>{feedback.show('Opslag niet bevestigd. Je invoer is behouden.',async()=>{await load();return false;},'Actuele beoordeling laden');}});ready=true;}
    catch(failure){if(!disposed){feedback.show('De beoordeling kon niet worden geladen. Je invoer is behouden.',async()=>{await load();return ready&&!queue?.failed;},'Opnieuw laden');}}
    finally{reading=false;finish?.();update();}
  }
  select.onchange=()=>{type=select.value||null;riskLevel=isStandardBarrierType(type)?'none':null;riskNote='';if(type==='custom')notes.value=custom.notes;remember();update();void renderPreview();};
  notes.oninput=()=>{custom.notes=notes.value;remember();update();};
  upload.onchange=async()=>{
    const file=upload.files?.[0];if(!file||!ready||queue.busy||queue.failed)return;
    if(file.size>barrierUploadLimit||!['image/png','application/pdf'].includes(file.type)||!(file.type==='image/png'?/\.png$/i:/\.pdf$/i).test(file.name)){feedback.show('Kies een PNG of PDF van maximaal 2 MB.');upload.value='';return;}
    preparing=true;uploadStatus.textContent='';error.textContent='';update();
    try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Bestand lezen is niet gelukt.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});if(backgroundSaves.session!==editSession)return;const uploadId=crypto.randomUUID();stagedUpload={uploadId,fileName:file.name,mime:file.type,base64};custom.attachment={uploadId,fileName:file.name,mime:file.type};remember();preparing=false;if(!disposed)void renderPreview();}
    catch(failure){if(!disposed)feedback.show('Het document kon niet worden voorbereid. Kies een geldige PNG of PDF van maximaal 2 MB.');}
    finally{preparing=false;if(!disposed)upload.value='';update();}
  };
  remove.onclick=()=>{custom.attachment=null;stagedUpload=null;remember();void renderPreview();update();};
  reload.onclick=load;
  block.onsubmit=event=>event.preventDefault();
  back.onclick=()=>{if(!back.disabled)onBack();};placeholderPreview('Schematische afbeelding nog niet beschikbaar');update();void load();title.focus({preventScroll:true});
  return()=>{disposed=true;feedback.dispose();const pending=queue?.dispose();loading?.dispose();resetPreview();return pending;};
}
