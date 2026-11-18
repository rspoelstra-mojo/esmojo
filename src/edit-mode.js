import './edit-mode.css';
// Gedeelde bewerkmodus voor de showpagina's: één knop Bewerken rechtsboven (links van het statuslabel) die wisselt naar Annuleren + Opslaan.
// De pagina zet data-edit-mode="read|edit" op de .edit-page-container; alle overgangen zijn CSS (transform/opacity/breedte, 380 ms, prefers-reduced-motion respecteerd).
const make=(tag,className,text)=>{const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element;};
const icon=path=>`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const pencil='<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',check='<path d="m5 12.5 4.5 4.5L19 7.5"/>';
function button(className,label,svgPath,type='button'){const element=make('button','edit-action '+className);element.type=type;if(svgPath)element.insertAdjacentHTML('beforeend',icon(svgPath));element.append(make('span','',label));return element;}
export function createEditActions({onEdit,onCancel,onSave}){
  const root=make('div','edit-actions'),edit=button('edit-action-edit','Bewerken',pencil),cancel=button('edit-action-cancel','Annuleren'),save=button('edit-action-save','Opslaan',check);
  root.append(edit,cancel,save);edit.onclick=()=>onEdit?.();cancel.onclick=()=>onCancel?.();save.onclick=()=>onSave?.();
  return{
    element:root,edit,cancel,save,
    // busy: opslaan loopt; beide actieknoppen uit zodat niets dubbel wordt opgeslagen of verworpen. editable=false verbergt de knop Bewerken (geen rechten of bron).
    update({busy=false,canSave=true,editable=true}={}){edit.disabled=!editable;root.hidden=!editable;cancel.disabled=busy;save.disabled=busy||!canSave;save.setAttribute('aria-busy',String(busy));},
  };
}
// Leeslaag en invoerlaag liggen over elkaar in dezelfde cel, zodat de overgang geen layoutsprong geeft.
export function editSwap(read,edit){const wrapper=make('div','edit-swap');read.classList.add('edit-swap-read');edit.classList.add('edit-swap-edit');wrapper.append(read,edit);return wrapper;}
export function createEditPage(){const page=make('div','edit-page');page.dataset.editMode='read';return page;}
export function setEditMode(page,mode){page.dataset.editMode=mode==='edit'?'edit':'read';}
export const editMode=page=>page.dataset.editMode==='edit'?'edit':'read';
// Rechterkant van de header: [Bewerken | Annuleren Opslaan] [statuslabel]; het label blijft op dezelfde plek.
export function editHeaderRight(actions,badge){const right=make('div','edit-header-right');if(badge)badge.classList.add('edit-header-badge');right.append(actions.element,...badge?[badge]:[]);return right;}
// Inhoudsovergang bij het wisselen van modus: zachte fade en 9 px omhoog (380 ms); met prefers-reduced-motion geen animatie (CSS).
export function playEditTransition(element){element.classList.remove('edit-enter');void element.offsetWidth;element.classList.add('edit-enter');element.addEventListener('animationend',()=>element.classList.remove('edit-enter'),{once:true});}
