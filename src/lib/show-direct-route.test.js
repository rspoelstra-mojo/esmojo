import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
function setup(){
 class Element{constructor(){this.children=[];this.dataset={};this.attributes={};this.classList={add(){},remove(){}};}append(...items){for(const item of items){item.parent=this;this.children.push(item);}}replaceChildren(...items){this.children=[];this.append(...items);}querySelectorAll(){return this.children.filter(child=>child.tag==='a');}setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}addEventListener(){}getAttribute(key){return this.attributes[key];}remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}}
 let resolve,reject,notify,rows=[];const pending=new Promise((yes,no)=>{resolve=yes;reject=no;}),requests=[],opened=[];
 const catalogue={current:()=>rows,subscribe:fn=>{notify=fn;return()=>{};},refresh:async()=>{}};
 const heading=new Element();
 const ctx=vm.createContext({document:{createElement:tag=>Object.assign(new Element(),{tag}),querySelector:()=>heading},navigator:{},createShowMenuCache:()=>catalogue,seed:{},access:async(action,options)=>{requests.push({action,options});return pending;},createShowPage:(content,show)=>{opened.push(show);content.replaceChildren({show:show.key});content.setAttribute('aria-busy','true');return()=>{};}});
 vm.runInContext(readFileSync('src/lib/submenu-loading.js','utf8').replaceAll('export ',''),ctx);
 const source=readFileSync('src/shows.js','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');vm.runInContext(source,ctx);
 const content=new Element(),navigation=new Element(),show={key:'Verder_Gashouder_01022027',name:'Verder',dates:['2027-02-01'],venue:'Gashouder',city:'Amsterdam'};
 const dispose=ctx.createShowsSubmenu(navigation,show.key,content);
 return{resolve,reject,requests,opened,content,show,dispose,heading,navigation,publish(items=[show]){rows=items;notify(rows);}};
}
const flush=()=>new Promise(done=>setImmediate(done));
test('Directe show buiten het 90-dagenmenu opent de bestaande showcomponent; late reactie na verlaten doet niets',async()=>{
 const h=setup();assert.equal(h.requests[0].action,'home-metadata');assert.equal(h.heading.attributes['aria-busy'],'true');h.resolve({show:h.show});await flush();assert.equal(h.opened.length,1);assert.equal(h.heading.children.length,0);assert.equal(h.content.children[0].show,h.show.key);assert.equal(h.content.attributes['aria-busy'],'true','showcomponent beheert verdere laadstatus');h.dispose();
 const late=setup();late.dispose();late.resolve({show:late.show});await flush();assert.equal(late.opened.length,0);
});
test('Laatst vernieuwde gewone menubron gaat voor; mislukte metadata mag een inmiddels geopende show niet vervangen',async()=>{
 const h=setup();h.publish();assert.equal(h.opened.length,1);h.reject(Error('Tijdelijk onbeschikbaar'));await flush();assert.equal(h.content.children[0].show,h.show.key);assert.equal(h.content.attributes['aria-busy'],'true');assert.equal(h.opened.length,1);h.dispose();
});
test('Canonieke eerste reeksdag blijft gekoppeld aan resterende menudagen zonder tweede show-opening',async()=>{
 const h=setup();h.show.dates.push('2027-02-02','2027-02-03');const remaining={...h.show,key:'Verder_Gashouder_02022027',dates:['2027-02-02','2027-02-03']};h.publish([remaining]);h.resolve({show:h.show});await flush();
 const link=h.navigation.children.find(child=>child.tag==='a');assert.equal(link.attributes['aria-current'],'page');assert.equal(h.opened[0].key,h.show.key);
 h.publish([{...remaining,key:'Verder_Gashouder_03022027',dates:['2027-02-03']}]);assert.equal(h.navigation.children.find(child=>child.tag==='a'),link);assert.equal(link.attributes['aria-current'],'page');assert.equal(h.opened.length,1);h.dispose();
});
