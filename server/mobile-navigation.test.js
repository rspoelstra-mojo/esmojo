import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture(narrow=true){
 class Element{
  constructor(){this.children=[];this.dataset={};this.style={overflow:''};this.attrs={};this.listeners=new Map();this.queries=new Map();this.hidden=false;this.scrollTop=0;}
  append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
  prepend(...nodes){for(const node of nodes.reverse()){node.remove();node.parent=this;this.children.unshift(node);}}
  before(node){node.remove();node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
  after(node){node.remove();node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,node);}
  remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
  querySelector(key){return this.queries.get(key)||null;}
  setAttribute(key,value){this.attrs[key]=value;}removeAttribute(key){delete this.attrs[key];}
  focus(){doc.activeElement=this;}
  addEventListener(type,callback,options={}){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(callback);options.signal?.addEventListener('abort',()=>this.listeners.get(type).delete(callback));}
  removeEventListener(type,callback){this.listeners.get(type)?.delete(callback);}
  emit(type,extras={}){for(const callback of this.listeners.get(type)||[])callback({target:this,button:0,preventDefault(){this.defaultPrevented=true;},...extras});}
  showModal(){this.open=true;}close(){this.open=false;this.emit('close');}
  getBoundingClientRect(){return{left:0,right:360,top:0,bottom:800};}
  scrollIntoView(){throw Error('Buitenste scrollancestor mag niet scrollen');}
  scrollTo({top}){this.scrollTop=top;this.scrolled=true;}
 }
 const body=new Element(),workspace=new Element(),rail=new Element(),submenu=new Element(),main=new Element(),bar=new Element(),toggle=new Element(),dialog=new Element(),scroll=new Element(),closeButton=new Element(),title=new Element(),spinner=new Element(),heading=new Element(),head=new Element(),brand=new Element();
 body.append(rail,workspace);rail.append(brand);head.append(closeButton);rail.queries.set('.brand',brand);dialog.queries.set('.mobile-menu-head',head);workspace.append(submenu,main);dialog.queries.set('.mobile-menu-scroll',scroll);dialog.queries.set('.mobile-menu-close',closeButton);bar.queries.set('.mobile-page-title',title);bar.queries.set('.mobile-page-loading',spinner);submenu.queries.set('h2',heading);
 const nodes={'.rail':rail,'.submenu':submenu,'.mobile-menu-bar':bar,'#mobile-menu-toggle':toggle,'#mobile-menu-dialog':dialog,main};const doc={body,documentElement:new Element(),querySelector:key=>nodes[key],createComment:()=>new Element(),activeElement:null};
 const media=new Element();media.matches=narrow;let observer,disconnected=false,scrolled=false;
 const win={location:new URL('https://esmojo.nl/rapportages'),matchMedia:()=>media,scrollTo(){scrolled=true;}};
 const ctx=vm.createContext({document:doc,window:win,AbortController,URL,queueMicrotask,MutationObserver:class{constructor(callback){observer=callback;}observe(){}disconnect(){disconnected=true;}}});
 vm.runInContext(readFileSync('src/mobile-navigation.js','utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),ctx);
 const api=ctx.createMobileNavigation();return{api,doc,body,workspace,rail,submenu,main,bar,toggle,dialog,scroll,closeButton,title,spinner,heading,head,brand,media,Element,observe:()=>observer(),disconnected:()=>disconnected,scrolled:()=>scrolled};
}
test('Telefoon hergebruikt dezelfde menu-elementen; desktop behoudt oorspronkelijke plaats en sessiepoort',()=>{
 const f=fixture(false);assert.equal(f.rail.parent,f.body);assert.equal(f.submenu.parent,f.workspace);assert.equal(f.bar.hidden,true);f.api.setEnabled(true);assert.equal(f.bar.hidden,true);
 f.media.matches=true;f.media.emit('change');assert.equal(f.rail.parent,f.scroll);assert.equal(f.submenu.parent,f.scroll);assert.equal(f.brand.parent,f.head);assert.equal(f.bar.hidden,false);
 f.api.setEnabled(false);f.toggle.emit('click');assert.equal(Boolean(f.dialog.open),false);f.api.dispose();assert.equal(f.rail.parent,f.body);assert.equal(f.submenu.parent,f.workspace);assert.equal(f.disconnected(),true);assert.equal(f.brand.parent,f.rail);
});
test('Sluiten, Escape, sessieverlies en resize herstellen bestaande scroll-lock en focus',()=>{
 for(const action of ['close','cancel','signout','resize']){
  const f=fixture();f.api.setEnabled(true);f.body.style.overflow='clip';f.doc.documentElement.style.overflow='auto';f.toggle.emit('click');assert.equal(f.dialog.open,true);assert.equal(f.body.style.overflow,'clip');assert.equal(f.body.dataset.mobileMenuOpen,'');assert.equal(f.toggle.attrs['aria-expanded'],'true');
  if(action==='close')f.closeButton.emit('click');else if(action==='cancel')f.dialog.emit('cancel');else if(action==='signout')f.api.setEnabled(false);else{f.media.matches=false;f.media.emit('change');}
  assert.equal(f.dialog.open,false);assert.equal(f.body.style.overflow,'clip');assert.equal(f.doc.documentElement.style.overflow,'auto');assert.equal(f.toggle.attrs['aria-expanded'],'false');if(action==='close'||action==='cancel')assert.equal(f.doc.activeElement,f.toggle);f.api.dispose();
 }
});
test('Sectiekeuze houdt menu open; echte submenukeuze sluit en focust inhoud zonder nieuwe gegevenslaag',async()=>{
 const f=fixture();f.api.setEnabled(true);f.toggle.emit('click');
 const section=new f.Element();section.href='https://esmojo.nl/shows';section.dataset.page='shows';section.closest=selector=>selector==='a[href]'?section:selector==='.rail'?f.rail:null;section.hasAttribute=()=>false;
 f.dialog.emit('click',{target:section});await new Promise(done=>queueMicrotask(done));assert.equal(f.dialog.open,true);assert.equal(f.doc.activeElement,f.heading);assert.equal(f.scroll.scrolled,true);
 const link=new f.Element();link.href='https://esmojo.nl/rapportages/Test';link.closest=selector=>selector==='a[href]'?link:null;link.hasAttribute=()=>false;f.dialog.emit('click',{target:link});await new Promise(done=>queueMicrotask(done));assert.equal(f.dialog.open,false);assert.equal(f.doc.activeElement,f.main);assert.equal(f.scrolled(),true);f.api.dispose();
});
test('Lopende paginalading blijft via bestaand aria-busy in mobiele balk zichtbaar',()=>{
 const f=fixture();f.api.setEnabled(true);f.submenu.queries.set('[aria-busy="true"]',f.main);f.observe();assert.equal(f.spinner.hidden,false);assert.equal(f.title.attrs['aria-busy'],'true');f.submenu.queries.delete('[aria-busy="true"]');f.observe();assert.equal(f.spinner.hidden,true);assert.equal(f.title.attrs['aria-busy'],undefined);f.api.dispose();
});

// Een bestaande formulierdialoog kan tijdens sectienavigatie achter het menu sluiten.
test('Sluiten van een onderliggende formulierdialoog laat geen oude scroll-lock achter',()=>{
 const f=fixture();f.api.setEnabled(true);f.body.style.overflow='hidden';f.toggle.emit('click');f.body.style.overflow='';f.api.close();assert.equal(f.body.style.overflow,'');assert.equal(f.body.dataset.mobileMenuOpen,undefined);assert.equal(f.doc.documentElement.dataset.mobileMenuOpen,undefined);f.api.dispose();
});

test('Achterhaalde sectie- en focusacties beïnvloeden een snel heropend menu niet',async()=>{
 const f=fixture();f.api.setEnabled(true);f.toggle.emit('click');
 const section=new f.Element();section.href='https://esmojo.nl/shows';section.dataset.page='shows';section.closest=selector=>selector==='a[href]'?section:selector==='.rail'?f.rail:null;section.hasAttribute=()=>false;
 f.dialog.emit('click',{target:section});f.api.close();f.toggle.emit('click');await new Promise(done=>queueMicrotask(done));assert.equal(f.dialog.open,true);assert.equal(f.scroll.scrolled,undefined);assert.equal(f.doc.activeElement,f.closeButton);
 const link=new f.Element();link.href='https://esmojo.nl/rapportages/Test';link.closest=selector=>selector==='a[href]'?link:null;link.hasAttribute=()=>false;f.dialog.emit('click',{target:link});f.toggle.emit('click');await new Promise(done=>queueMicrotask(done));assert.equal(f.dialog.open,true);assert.equal(f.doc.activeElement,f.closeButton);assert.equal(f.scrolled(),false);f.api.dispose();
});
