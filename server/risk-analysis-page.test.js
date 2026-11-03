import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function harness(request,saveSelection){
  let focused;
  class Element{
    constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.className='';this.value='';this._text='';}
    append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
    replaceChildren(...items){this.children=[];this._text='';this.append(...items);}
    set textContent(text){this._text=text;this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join(' ');}
    setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}
    querySelectorAll(selector){const children=this.children.flatMap(c=>[c,...c.querySelectorAll(selector)]);return children.filter(c=>selector.startsWith('[data-')?c.dataset[selector.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined:c.tagName===selector);}
    focus(){focused=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  }
  const panel=new Element('section'),menu=new Element('a');
  const openAssessment=(section,{onBack})=>{section.replaceChildren();const back=new Element('button');back.textContent='Terug';back.onclick=onBack;const title=new Element('h2');title.textContent='Barrieropstelling';section.append(back,title);return()=>{};};
  const context=vm.createContext({access:async()=>{throw Error("Unexpected API request");},Promise,createBarrierLayoutPage:openAssessment,createFloorPressurePage:openAssessment,document:{createElement:tag=>new Element(tag),querySelector:()=>menu},window:{scrollTo(){},scrollX:0,matchMedia:()=>({matches:true})}});
  for(const file of ['shared/production-risks.js','src/lib/submenu-loading.js','src/risk-analysis.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''),context);
  const page=context.createRiskAnalysis(panel,{show:{key:'Test'},request,saveSelection});
  return{page,panel,menu,focused:()=>focused,buttons:()=>panel.querySelectorAll('[data-risk-id]'),text:()=>panel.textContent};
}
const risks=[{id:'R01',title:'Eerste risico',description:'Beschrijving één',consequence:'Gevolg één'},{id:'R02',title:'Tweede risico',description:'Beschrijving twee',consequence:'Gevolg twee'}];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('Risico’s laden pas bij tabselectie, krijgen ieder eigen pagina en terugknop zonder extra verzoek',async()=>{
  let calls=0,resolve;const h=harness(body=>{assert.equal(body.concertId,'Test');calls++;return new Promise(done=>resolve=done);});
  assert.match(h.text(),/Productionele risico's/);assert.match(h.text(),/Operationele risico's/);assert.equal(calls,0);
  h.page.activate();h.page.activate();assert.equal(calls,1);assert.equal(h.panel.attributes['aria-busy'],'true');
  resolve({state:'ready',risks,production:{revision:0,choices:{}}});await tick();assert.equal(h.buttons().length,2);assert.equal(h.panel.attributes['aria-busy'],undefined);
  for(const risk of risks){h.buttons().find(b=>b.dataset.riskId===risk.id).onclick();assert.ok(h.text().includes(risk.title));assert.ok(h.text().includes(risk.description));assert.ok(h.text().includes(risk.consequence));assert.equal(h.panel.querySelectorAll('textarea').length,0);h.panel.querySelectorAll('button')[0].onclick();assert.equal(h.buttons().length,2);assert.equal(h.focused().dataset.riskId,risk.id);}
  h.page.activate();assert.equal(calls,1);h.page.dispose();assert.equal(h.text(),'');assert.equal(h.menu.children.length,0);
});
test('Ontbrekende analyse, nul risico’s en laadfout hebben verschillende uitkomsten met veilige herpoging',async()=>{
  for(const [state,text]of [['pending','Nog geen operationele risicoanalyse beschikbaar.'],['not-ready','Nog geen operationele risicoanalyse beschikbaar.'],['ready',"Er zijn geen operationele risico's gedefinieerd."]]){const h=harness(async()=>({state,risks:[],production:{revision:0,choices:{}}}));h.page.activate();await tick();assert.ok(h.text().includes(text));h.page.dispose();}
  let calls=0;const h=harness(async()=>{if(++calls===1)throw Error('private provider body');return{state:'ready',risks,production:{revision:0,choices:{}}};});h.page.activate();await tick();assert.ok(h.text().includes('Opnieuw laden'));assert.ok(!h.text().includes('private provider body'));h.panel.querySelectorAll('button').find(b=>b.textContent==='Opnieuw laden').onclick();await tick();assert.equal(h.buttons().length,2);h.page.dispose();
});
test('Late vertrouwelijke antwoorden na navigatie worden niet gerenderd; risico-inhoud is uitsluitend tekst',async()=>{
  let resolve;const h=harness(()=>new Promise(done=>resolve=done));h.page.activate();h.page.dispose();resolve({state:'ready',risks,production:{revision:0,choices:{}}});await tick();assert.equal(h.text(),'');
  const title='<img src=x onerror=alert(1)>',safe=harness(async()=>({state:'ready',risks:[{...risks[0],title}],production:{revision:0,choices:{}}}));safe.page.activate();await tick();assert.equal(safe.panel.querySelectorAll('img').length,0);assert.ok(safe.text().includes(title));safe.buttons()[0].onclick();assert.equal(safe.panel.querySelectorAll('img').length,0);safe.page.dispose();
});

test('Productionele pagina’s openen direct of uitsluitend na bevestigd Ja; Nee sluit de pagina weer af',async()=>{
  const writes=[];let save;
  const h=harness(async()=>({state:'pending',risks:[],production:{revision:0,choices:{}}}),body=>{writes.push(body);return new Promise(done=>save=done);});
  const button=id=>h.panel.querySelectorAll('[data-production-id]').find(b=>b.dataset.productionId===id);
  const choice=(field,value)=>h.panel.querySelectorAll('[data-field]').find(b=>b.dataset.field===field&&b.dataset.choice===String(value));
  assert.equal(h.panel.querySelectorAll('[data-production-id]').length,7);assert.equal(button('barrier_layout').disabled,false);assert.equal(button('escape_routes').disabled,true);
  h.page.activate();await tick();assert.equal(choice('escape_routes',false).attributes['aria-pressed'],'false');
  choice('escape_routes',true).onclick();assert.equal(button('escape_routes').disabled,true);assert.equal(writes.length,1);assert.equal(writes[0].revision,0);
  save({revision:1,choices:{escape_routes:true}});await tick();assert.equal(button('escape_routes').disabled,false);
  button('escape_routes').onclick();assert.ok(h.text().includes('Vluchtweg beperkingen'));assert.equal(h.panel.querySelectorAll('textarea').length,0);h.panel.querySelectorAll('button')[0].onclick();
  choice('escape_routes',false).onclick();save({revision:2,choices:{escape_routes:false}});await tick();assert.equal(button('escape_routes').disabled,true);button('escape_routes').onclick();assert.ok(h.text().includes("Operationele risico's"));
  for(const id of ['fireworks','open_fire','lasers','drones'])assert.equal(button(id).disabled,true);
  h.page.dispose();
});
test('Bewaarde Ja-keuze wordt hersteld; late laadreactie overschrijft een al geopende productionele pagina niet',async()=>{
  let resolve;const h=harness(()=>new Promise(done=>resolve=done));h.page.activate();h.panel.querySelectorAll('[data-production-id]').find(b=>b.dataset.productionId==='barrier_layout').onclick();
  resolve({state:'pending',risks:[],production:{revision:3,choices:{lasers:true}}});await tick();assert.ok(h.text().includes('Barrieropstelling'));assert.ok(!h.text().includes("Operationele risico's"));
  h.panel.querySelectorAll('button')[0].onclick();assert.equal(h.panel.querySelectorAll('[data-production-id]').find(b=>b.dataset.productionId==='lasers').disabled,true);await tick();resolve({state:'pending',risks:[],production:{revision:3,choices:{lasers:true}}});await tick();assert.equal(h.panel.querySelectorAll('[data-production-id]').find(b=>b.dataset.productionId==='lasers').disabled,false);h.page.dispose();
});
test('Mislukte opslag activeert een productionele pagina niet en vereist opnieuw laden',async()=>{
  const h=harness(async()=>({state:'pending',risks:[],production:{revision:0,choices:{}}}),async()=>{throw Error('CONFLICT private body');});h.page.activate();await tick();
  h.panel.querySelectorAll('[data-field]').find(b=>b.dataset.field==='lasers'&&b.dataset.choice==='true').onclick();await tick();
  assert.equal(h.panel.querySelectorAll('[data-production-id]').find(b=>b.dataset.productionId==='lasers').disabled,true);assert.ok(h.text().includes('De keuze is niet bevestigd'));assert.ok(!h.text().includes('private body'));h.page.dispose();
});
