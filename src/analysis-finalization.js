import { finalCategories } from '../shared/analysis-finalization.js';
const node=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
export function openAnalysisFinalization({category,submit,onClose}) {
  const config=finalCategories[category],main=document.querySelector('main'),previousFocus=document.activeElement;
  const overlay=node('section','analysis-final-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-labelledby','analysis-final-title');
  const box=node('div','analysis-final-box'),title=node('h2','',''+config.title+' afronden');title.id='analysis-final-title';
  const cancel=node('button','profile-back','← Terug naar overzicht');cancel.type='button';
  const form=node('form','analysis-final-form'),group=node('fieldset','analysis-final-score'),legend=node('legend','','Cijfer van 1 tot 10');group.append(legend);
  const scale=node('div','analysis-final-scale');
  for(let value=1;value<=10;value++){const label=node('label','analysis-final-option'),input=node('input','');input.type='radio';input.name='final-score';input.value=String(value);input.required=true;label.append(input,node('span','',String(value)));scale.append(label);}
  group.append(scale);const meaning=node('div','analysis-final-meaning');meaning.append(node('p','','1 = '+config.low),node('p','','10 = '+config.high));
  const label=node('label','analysis-editor-label','Toelichting');label.htmlFor='analysis-final-note';
  const note=node('textarea','analysis-summary');note.id='analysis-final-note';note.rows=6;note.required=true;note.maxLength=2000;
  const error=node('p','profile-message');error.setAttribute('role','alert');
  const actions=node('div','analysis-editor-actions'),complete=node('button','analysis-complete','Definitief afronden');complete.type='submit';actions.append(complete);
  form.append(group,meaning,label,note,error,actions);box.append(cancel,title,form);overlay.append(box);
  let busy=false,disposed=false;
  function update(){complete.disabled=busy||!form.querySelector('input:checked')||!note.value.trim();}
  form.addEventListener('input',update);update();
  const position=()=>{const rect=main.getBoundingClientRect();overlay.style.left=Math.max(0,rect.left)+'px';overlay.style.top=Math.max(0,rect.top)+'px';};
  const oldOverflow=document.body.style.overflow,oldInert=main.inert;main.inert=true;document.body.style.overflow='hidden';document.body.append(overlay);position();
  window.addEventListener('resize',position);const observer=new ResizeObserver(position);observer.observe(main);
  function close(){if(busy)return;dispose();onClose();}
  cancel.onclick=close;overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  form.onsubmit=async event=>{event.preventDefault();if(busy||!form.reportValidity()||!note.value.trim())return;busy=true;error.textContent='';cancel.disabled=true;group.disabled=true;note.readOnly=true;form.setAttribute('aria-busy','true');update();
    try{await submit({score:Number(form.querySelector('input:checked').value),note:note.value});if(!disposed){dispose();onClose(true);}}
    catch(failure){if(!disposed)error.textContent=failure.message||'Afronden is niet gelukt. Je invoer is behouden.';}
    finally{busy=false;if(!disposed){cancel.disabled=false;group.disabled=false;note.readOnly=false;form.removeAttribute('aria-busy');update();}}
  };
  group.querySelector('input').focus();
  function dispose(){if(disposed)return;disposed=true;observer.disconnect();window.removeEventListener('resize',position);overlay.remove();main.inert=oldInert;document.body.style.overflow=oldOverflow;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  return dispose;
}
