import './production-assessment.css';
import {access} from './auth.js';
import {createSubmenuLoading} from './lib/submenu-loading.js';
import {barrierTypes,barrierData,validateBarrierData,barrierUploadLimit} from '../shared/barrier-layout.js';
import {barrierImages} from './barrier-images.js';
import {assessmentNode as node,riskRadioGroup,createAssessmentQueue} from './production-assessment-ui.js';

export function createBarrierLayoutPage(section,{show,onBack,onStored=()=>{},request=body=>access('barrier-layout',{method:'POST',body})}){
  let disposed=false,ready=false,record=null,queue=null,reading=false,preparing=false,previewUrl=null,previewSequence=0,awaitingPreview=false;
  let type=null,riskLevel=null,custom={notes:'',attachment:null};
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,section):null;
  section.replaceChildren();const root=node('section','production-assessment');
  const back=node('button','profile-back','← Terug naar overzicht');back.type='button';
  const title=node('h2','assessment-page-title','Barrieropstelling');title.tabIndex=-1;
  const block=node('form','assessment-block'),columns=node('div','barrier-columns'),fields=node('div','assessment-fields'),preview=node('aside','assessment-preview');
  const typeField=node('div','assessment-field'),label=node('label','','Type barrieropstelling'),select=node('select','');select.id='barrier-type';label.htmlFor=select.id;select.required=true;
  const placeholder=node('option','','Kies een barrieropstelling');placeholder.value='';select.append(placeholder);
  for(const option of barrierTypes){const item=node('option','',option.label);item.value=option.value;select.append(item);}typeField.append(label,select);
  const customFields=node('div','assessment-fields'),uploadField=node('div','assessment-field'),uploadLabel=node('label','','Afwijkende barrieropstelling uploaden'),upload=node('input','');upload.type='file';upload.id='barrier-upload';upload.accept='.png,.pdf,image/png,application/pdf';uploadLabel.htmlFor=upload.id;
  const uploadStatus=node('p','assessment-upload-status','PNG of PDF, maximaal 2 MB.'),uploadActions=node('div','assessment-upload-actions'),remove=node('button','secondary-button','Bestand verwijderen');remove.type='button';uploadActions.append(remove);uploadField.append(uploadLabel,upload,uploadStatus,uploadActions);
  const notesField=node('div','assessment-field'),notesLabel=node('label','','Toelichting en/of beheersmaatregelen'),notes=node('textarea','');notes.id='barrier-notes';notesLabel.htmlFor=notes.id;notes.rows=5;notes.maxLength=4000;notesField.append(notesLabel,notes);customFields.append(uploadField,notesField);
  const risk=riskRadioGroup('barrier-risk',value=>{riskLevel=value;queue.save();update();});fields.append(typeField,customFields,risk.element);
  const previewLabel=node('p','assessment-preview-label','Schematische weergave'),previewBox=node('div','assessment-preview-box');preview.append(previewLabel,previewBox);columns.append(fields,preview);
  const status=node('p','assessment-status'),error=node('p','profile-message');error.setAttribute('role','alert');
  const reload=node('button','secondary-button','Actuele beoordeling laden');reload.type='button';reload.hidden=true;
  const actions=node('div','assessment-actions'),edit=node('button','secondary-button','Barrieropstelling bewerken'),complete=node('button','analysis-complete','Barrieropstelling afronden');edit.type='button';complete.type='submit';actions.append(edit,complete);block.append(columns,status,error,reload,actions);root.append(back,title,block);section.append(root);
  const snapshot=()=>({barrierType:type,riskLevel,notes:type==='custom'?custom.notes:null,uploadId:type==='custom'?custom.attachment?.uploadId||null:null});
  const call=(operation,payload={})=>request({operation,concertId:show.key,...payload});
  const valid=()=>{try{validateBarrierData(snapshot(),true);return true;}catch{return false;}};
  function update(){
    if(disposed)return;const locked=!ready||reading||preparing||queue?.exclusive||record?.completed;
    select.disabled=locked;customFields.hidden=type!=='custom';notes.disabled=locked;notes.required=type==='custom';risk.update(riskLevel,locked);
    upload.disabled=locked||queue?.busy;remove.hidden=!custom.attachment;remove.disabled=locked||queue?.busy;
    back.disabled=preparing||Boolean(queue?.exclusive);complete.hidden=Boolean(record?.completed);complete.disabled=locked||queue?.busy||queue?.failed||!valid();edit.hidden=!record?.completed;edit.disabled=reading||queue?.busy;
    status.textContent=record?.completed?'✓ Barrieropstelling afgerond':queue?.failed?'Opslag niet bevestigd':queue?.busy?'Concept wordt opgeslagen…':record?.revision?'Concept opgeslagen':'';status.classList.toggle('assessment-completed',Boolean(record?.completed));
    if(custom.attachment)uploadStatus.textContent=custom.attachment.fileName+' · Upload opgeslagen in Drive';else if(!preparing)uploadStatus.textContent='PNG of PDF, maximaal 2 MB.';
  }
  function resetPreview(){previewSequence++;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}previewBox.replaceChildren();}
  function placeholderPreview(text){previewBox.replaceChildren(node('p','',text));}
  async function renderPreview(){
    resetPreview();awaitingPreview=false;const sequence=previewSequence;
    if(type!=='custom'){
      const url=barrierImages[type];if(!url){placeholderPreview('Schematische afbeelding nog niet beschikbaar');return;}
      const image=node('img','');image.alt=barrierTypes.find(row=>row.value===type)?.label||'Barrieropstelling';image.src=url;image.onerror=()=>{if(!disposed&&sequence===previewSequence)placeholderPreview('Schematische afbeelding nog niet beschikbaar');};previewBox.append(image);return;
    }
    const attachment=custom.attachment;if(!attachment){placeholderPreview('Nog geen afwijkende barrieropstelling geüpload');return;}
    placeholderPreview(attachment.fileName);
    if(record?.attachment?.uploadId!==attachment.uploadId){awaitingPreview=true;return;}
    try{
      const data=await call('download',{uploadId:attachment.uploadId});if(disposed||sequence!==previewSequence)return;
      if(data.attachment?.uploadId!==attachment.uploadId||typeof data.base64!=='string'||data.base64.length>Math.ceil(barrierUploadLimit/3)*4)throw Error('Bestand niet beschikbaar.');
      const bytes=Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0));previewUrl=URL.createObjectURL(new Blob([bytes],{type:attachment.mime}));previewBox.replaceChildren();
      if(attachment.mime==='image/png'){const image=node('img','');image.src=previewUrl;image.alt='Geüploade afwijkende barrieropstelling';previewBox.append(image);}else previewBox.append(node('span','assessment-pdf-icon','PDF'),node('p','',attachment.fileName));
      const open=node('a','','Bestand openen');open.href=previewUrl;open.target='_blank';open.rel='noopener noreferrer';previewBox.append(open);
    }catch{if(!disposed&&sequence===previewSequence){placeholderPreview('Bestandsweergave niet beschikbaar.');const retry=node('button','secondary-button','Opnieuw laden');retry.type='button';retry.onclick=renderPreview;previewBox.append(retry);}}
  }
  function accept(data,replace){
    if(!data?.record||!Number.isSafeInteger(data.record.revision))throw Error('Onvolledige opslagbevestiging.');record=data.record;
    if(!disposed){if(replace){type=record.barrierType;riskLevel=record.riskLevel;select.value=type||'';if(type==='custom'){custom={notes:record.notes||'',attachment:record.attachment};notes.value=custom.notes;}void renderPreview();}else if(awaitingPreview&&record.attachment?.uploadId===custom.attachment?.uploadId)void renderPreview();onStored(record,data);update();}
  }
  async function load(){
    if(reading)return;reading=true;ready=false;error.textContent='';reload.hidden=true;const finish=loading?.start();update();
    try{const data=await call('read');if(disposed)return;queue?.dispose();accept(data,true);queue=createAssessmentQueue({snapshot,send:(operation,payload)=>call(operation,{...payload,revision:record.revision}),stored:accept,changed:update,error:message=>{error.textContent=message+' Je invoer blijft hier staan. Laad de actuele beoordeling om opnieuw te beginnen.';reload.hidden=false;}});ready=true;}
    catch(failure){if(!disposed){error.textContent=failure.message;reload.hidden=false;}}
    finally{reading=false;finish?.();update();}
  }
  select.onchange=()=>{type=select.value||null;riskLevel=null;if(type==='custom')notes.value=custom.notes;queue.save();void renderPreview();update();};
  notes.oninput=()=>{custom.notes=notes.value;queue.later();update();};notes.onblur=()=>{if(ready&&!record.completed&&!queue.failed)queue.save();};
  upload.onchange=async()=>{
    const file=upload.files?.[0];if(!file||!ready||queue.busy||queue.failed)return;
    if(file.size>barrierUploadLimit||!['image/png','application/pdf'].includes(file.type)||!(file.type==='image/png'?/\.png$/i:/\.pdf$/i).test(file.name)){error.textContent='Kies een PNG of PDF van maximaal 2 MB.';upload.value='';return;}
    preparing=true;uploadStatus.textContent='Bestand voorbereiden…';error.textContent='';update();
    try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Bestand lezen is niet gelukt.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);});preparing=false;uploadStatus.textContent='Uploaden naar Drive…';await queue.action('upload',{uploadId:crypto.randomUUID(),fileName:file.name,mime:file.type,base64});}
    catch(failure){if(!disposed)error.textContent=failure.message;}
    finally{preparing=false;if(!disposed)upload.value='';update();}
  };
  remove.onclick=()=>queue.action('remove-upload',{uploadId:custom.attachment.uploadId});
  edit.onclick=()=>queue.action('reopen');reload.onclick=load;
  block.onsubmit=event=>{event.preventDefault();if(complete.disabled||!block.reportValidity())return;void queue.action('complete',{data:snapshot()});};
  back.onclick=()=>{if(!back.disabled)onBack();};placeholderPreview('Schematische afbeelding nog niet beschikbaar');update();void load();title.focus({preventScroll:true});
  return()=>{disposed=true;const pending=queue?.dispose();loading?.dispose();resetPreview();return pending;};
}
