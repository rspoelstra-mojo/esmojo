import './rich-text-editor.css';
import {parseRichText,stringifyRichText} from '../shared/rich-text.js';
// Eenvoudige rich text editor (vet, onderstrepen, opsomming, nummering) die gewone tekst met lichte opmaaktekens bewaart.
// De inhoud wordt uitsluitend met DOM-knopen opgebouwd (nooit via innerHTML) en alleen als platte tekst geplakt.
const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
function renderRuns(parent,runs){
 if(!runs.length){parent.append(document.createElement('br'));return;}
 for(const run of runs){let node=document.createTextNode(run.text);if(run.underline){const u=document.createElement('u');u.append(node);node=u;}if(run.bold){const b=document.createElement('b');b.append(node);node=b;}parent.append(node);}
}
function render(root,text){
 root.replaceChildren();
 for(const block of parseRichText(text)){
  if(block.type==='p'){for(const runs of block.items){const p=document.createElement('div');renderRuns(p,runs);root.append(p);}}
  else{const list=document.createElement(block.type);for(const runs of block.items){const li=document.createElement('li');renderRuns(li,runs);list.append(li);}root.append(list);}
 }
}
// Loopt door de DOM van de editor en bouwt dezelfde blokken als parseRichText.
function collectRuns(node,state,runs){
 for(const child of node.childNodes){
  if(child.nodeType===3){if(child.nodeValue)runs.push({text:child.nodeValue.replace(/ /g,' '),bold:state.bold,underline:state.underline});continue;}
  if(child.nodeType!==1)continue;
  const tag=child.tagName,style=child.style||{};
  if(tag==='BR')continue;
  const next={bold:state.bold||tag==='B'||tag==='STRONG'||/^(bold|[6-9]00)$/.test(style.fontWeight||''),underline:state.underline||tag==='U'||/underline/.test(style.textDecorationLine||style.textDecoration||'')};
  collectRuns(child,next,runs);
 }
 return runs;
}
const merge=runs=>runs.reduce((all,run)=>{const last=all.at(-1);if(last&&last.bold===run.bold&&last.underline===run.underline)last.text+=run.text;else all.push({...run});return all;},[]);
const isList=node=>node.nodeType===1&&(node.tagName==='UL'||node.tagName==='OL');
const hasBlocks=node=>[...node.childNodes].some(child=>child.nodeType===1&&(isList(child)||child.tagName==='DIV'||child.tagName==='P'));
function serialize(root){
 const blocks=[],plain={bold:false,underline:false};
 const push=(type,runs)=>{const last=blocks.at(-1),item=merge(runs);if(type!=='p'&&last?.type===type)last.items.push(item);else blocks.push({type,items:[item]});};
 // Loopt recursief door blokken (Chrome nest lijsten vaak in div's): lijsten, alinea's en regels met <br>.
 function walk(node){
  let group=[];
  const flush=()=>{if(group.length){push('p',collectRuns({childNodes:group},plain,[]));group=[];}};
  for(const child of node.childNodes){
   if(child.nodeType===3){group.push(child);continue;}
   if(child.nodeType!==1)continue;
   if(child.tagName==='BR'){flush();continue;}
   if(isList(child)){flush();for(const li of child.children)push(child.tagName==='UL'?'ul':'ol',collectRuns(li,plain,[]));continue;}
   if(child.tagName==='DIV'||child.tagName==='P'){flush();if(hasBlocks(child))walk(child);else{const lines=[[]];for(const inner of child.childNodes){if(inner.nodeType===1&&inner.tagName==='BR')lines.push([]);else lines.at(-1).push(inner);}lines.forEach((nodes,index)=>{if(nodes.length||lines.length===1||index===0&&lines.length>1&&false)push('p',collectRuns({childNodes:nodes},plain,[]));});}continue;}
   group.push(child);
  }
  flush();
 }
 walk(root);
 return stringifyRichText(blocks);
}
export function createRichTextEditor({id,labelledBy,value='',maxLength=4000}={}){
 const wrapper=make('div','rich-text-editor'),toolbar=make('div','rich-text-toolbar'),area=make('div','rich-text-area');
 toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Opmaak');
 area.contentEditable='true';area.setAttribute('role','textbox');area.setAttribute('aria-multiline','true');if(id)area.id=id;if(labelledBy)area.setAttribute('aria-labelledby',labelledBy);area.spellcheck=true;
 const buttons=[];
 const command=(label,title,name,html)=>{const button=make('button','rich-text-button');button.type='button';button.title=title;button.setAttribute('aria-label',title);button.innerHTML=html;button.dataset.command=name;
  // mousedown voorkomt dat de selectie uit het tekstvak verdwijnt.
  button.onmousedown=event=>event.preventDefault();
  button.onclick=()=>{if(area.contentEditable!=='true')return;area.focus();document.execCommand(name,false,null);change();refresh();};
  toolbar.append(button);buttons.push(button);return button;};
 command('Vet','Vet (Ctrl+B)','bold','<b>B</b>');command('Onderstrepen','Onderstrepen (Ctrl+U)','underline','<u>U</u>');
 command('Opsomming','Opsomming met punten','insertUnorderedList','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>');
 command('Nummering','Genummerde opsomming','insertOrderedList','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5.5 5.5 5v3M4 11.5h2.5L4 14h2.5M4 17.5h2.5L5 19l1.5 1H4" stroke-width="1.3"/></svg>');
 wrapper.append(toolbar,area);
 let current=String(value);render(area,current);
 const api={element:wrapper,area,onchange:null,get value(){return current;},set value(next){next=String(next??'');if(next===current)return;current=next;render(area,current);},
  set readOnly(flag){area.contentEditable=flag?'false':'true';wrapper.classList.toggle('is-readonly',Boolean(flag));for(const b of buttons)b.disabled=Boolean(flag);},get readOnly(){return area.contentEditable!=='true';},
  focus(){area.focus();},setCustomValidity(){}};
 function refresh(){for(const b of buttons){let on=false;try{on=document.queryCommandState(b.dataset.command);}catch{}b.setAttribute('aria-pressed',String(on));}}
 function change(){const text=serialize(area);if(text.length>maxLength){area.dataset.tooLong='true';}else delete area.dataset.tooLong;current=text;api.onchange?.(text);}
 area.addEventListener('input',change);
 area.addEventListener('keyup',refresh);area.addEventListener('mouseup',refresh);area.addEventListener('focus',refresh);
 area.addEventListener('blur',()=>api.onblur?.());
 // Alleen platte tekst plakken: geen vreemde opmaak of HTML.
 area.addEventListener('paste',event=>{event.preventDefault();const text=(event.clipboardData?.getData('text/plain')||'').replace(/\r/g,'');document.execCommand('insertText',false,text);});
 return api;
}
