import { matchingSuggestions, suggestionKey } from '../../shared/ticket-data.js';
let sequence = 0;
export function suggestionInput({ value, label, options, emptyMessage, change, locked }) {
  const root = document.createElement('div'); root.className = 'ticket-combobox';
  const input = document.createElement('input'), list = document.createElement('ul'), id = `ticket-options-${++sequence}`;
  input.value = value; input.maxLength = 80; input.autocomplete = 'off'; input.placeholder = label;
  input.setAttribute('role','combobox');input.setAttribute('aria-label',label);input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',id);
  list.id=id;list.setAttribute('role','listbox');list.setAttribute('aria-label',label+' suggesties');list.hidden=true;
  let open=false,active=-1;
  const matches=()=>matchingSuggestions(options,input.value);
  function render(){input.readOnly=locked();list.hidden=!open||locked();input.setAttribute('aria-expanded',String(!list.hidden));input.removeAttribute('aria-activedescendant');list.replaceChildren();
    if(list.hidden)return;
    const found=matches();
    found.forEach((value,index)=>{const li=document.createElement('li');li.id=id+'-'+index;li.textContent=value;li.setAttribute('role','option');li.setAttribute('aria-selected',String(active===index));li.onmousedown=e=>e.preventDefault();li.onclick=()=>choose(value);list.append(li);});
    if(!found.length){const li=document.createElement('li');li.textContent=emptyMessage;list.append(li);}
    if(active>=0&&found[active]){input.setAttribute('aria-activedescendant',id+'-'+active);list.children[active]?.scrollIntoView({block:'nearest'});}
  }
  function choose(value){if(locked())return;input.value=value;change(value);open=false;active=-1;render();}
  input.onfocus=()=>{if(!locked())open=true;render();};
  input.oninput=()=>{if(locked())return;change(input.value);open=true;active=-1;render();};
  input.onkeydown=e=>{if(locked())return;const found=matches();
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open=true;active=found.length?(active<0?(e.key==='ArrowDown'?0:found.length-1):(active+(e.key==='ArrowDown'?1:-1)+found.length)%found.length):-1;render();}
    else if(e.key==='Enter'&&open&&(active>=0||found.length===1)&&found[active>=0?active:0]){e.preventDefault();choose(found[active>=0?active:0]);}
    else if(e.key==='Escape'){e.stopPropagation();open=false;active=-1;render();}
  };
  root.onfocusout=e=>{if(!root.contains(e.relatedTarget)){const match=options.find(option=>suggestionKey(option)===suggestionKey(input.value));if(!locked()&&match){input.value=match;change(match);}open=false;active=-1;render();}};
  root.append(input,list);render();return { root, input, refresh:render };
}
