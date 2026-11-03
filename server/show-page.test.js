import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};const tick=()=>new Promise(done=>setImmediate(done));
function fixture(){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.classList={add(){}};this.offsetWidth=100;this.offsetHeight=40;this.offsetLeft=0;this.offsetTop=0;}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}addEventListener(){}focus(){}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 }
 const content=new Element('main'),menu=new Element('a'),network=deferred(),profile=deferred(),risks=deferred();let cleaned=0,calls=0;
 const context=vm.createContext({document:{createElement:tag=>new Element(tag),querySelector:()=>menu},Intl,Date,URL,Promise,setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},access(){},createShowPlanning:()=>()=>{},loadShowPhoto(){},createShowData:()=>({request(){},version:()=>0,dispose(){cleaned++;}}),createShowProfile:()=>{const dispose=()=>{cleaned++;};dispose.ready=profile.promise;return dispose;},createRiskAnalysis:()=>({prepare:()=>risks.promise,activate(){},dispose(){cleaned++;}})});
 for(const name of ['src/lib/submenu-loading.js','src/show-page.js'])vm.runInContext(readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''),context);
 const memory={acquire(){calls++;let released=false;return{view:{tab:0},ready:network.promise.then(()=>({request(){},version:()=>0})),release(){if(!released){released=true;cleaned++;}}};}};
  const dispose=context.createShowPage(content,{key:'Fixture',name:'Testshow',dates:['2026-11-06'],venue:'Gashouder',city:'Amsterdam'},{memory,request:()=>network.promise,loadPhoto:async()=>null});
 return{content,menu,network,profile,risks,dispose,calls:()=>calls,cleaned:()=>cleaned};
}
test('Show verschijnt één keer, pas na bundel én beide gereedmeldingen; submenu blijft tot dan bezig',async()=>{
 const h=fixture();assert.equal(h.calls(),1);assert.equal(h.content.children.length,0);assert.equal(h.menu.attributes['aria-busy'],'true');h.network.resolve({});await tick();assert.equal(h.content.children.length,0);h.profile.resolve();await tick();assert.equal(h.content.children.length,0);h.risks.resolve();await tick();assert.equal(h.content.children.length,1);assert.equal(h.content.children[0].className,'show-page');assert.equal(h.menu.attributes['aria-busy'],undefined);h.dispose();assert.equal(h.cleaned(),3);assert.equal(h.menu.children.length,0);
});
test('Navigatie tijdens laden voorkomt oude inhoud en ruimt het rondje op, ook bij een late reactie',async()=>{
 const h=fixture();h.dispose();assert.equal(h.menu.children.length,0);h.network.resolve({});h.profile.resolve();h.risks.resolve();await tick();assert.equal(h.content.children.length,0);assert.equal(h.menu.attributes['aria-busy'],undefined);
 const built=fixture();built.network.resolve({});await tick();built.dispose();built.profile.resolve();built.risks.resolve();await tick();assert.equal(built.content.children.length,0);assert.equal(built.cleaned(),3);
});
test('Fout in bundel of voorbereiding toont uitsluitend een herlaadmogelijkheid',async()=>{
 for(const failChild of [false,true]){const h=fixture();if(failChild){h.network.resolve({});await tick();h.profile.reject(Error('private fixture'));h.risks.resolve();}else h.network.reject(Error('private fixture'));await tick();assert.equal(h.content.children.length,2);assert.equal(h.content.children[0].attributes.role,'alert');assert.equal(h.content.children[1].textContent,'Opnieuw laden');assert.equal(h.menu.attributes['aria-busy'],undefined);h.dispose();}
});
