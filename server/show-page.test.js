import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};const tick=()=>new Promise(done=>setImmediate(done));
function fixture(options={}){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};this.classList={add(){}};this.offsetWidth=100;this.offsetHeight=40;this.offsetLeft=0;this.offsetTop=0;}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}addEventListener(){}focus(){}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 }
 const content=new Element('main'),menu=new Element('a'),network=deferred(),profile=deferred(),risks=deferred();let cleaned=0,calls=0,managed=0,placed=0;const opened=[],captured={};const view={tab:options.rememberedTab??0};
 const context=vm.createContext({document:{createElement:tag=>new Element(tag),querySelector:()=>menu},Intl,Date,URL,URLSearchParams,Promise,setTimeout,clearTimeout,requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},access(){},createShowManagement:()=>{managed++;return()=>{};},createShowManagementPlaceholder:()=>{placed++;return()=>{};},createShowPlanning:(block,planningOptions)=>{captured.onOpen=planningOptions.onOpen;return()=>{};},createSimilarArtists:()=>({start(){},dispose(){}}),createShowSchedule:()=>({start(){},dispose(){}}),createShowTeam:()=>({start(){},dispose(){}}),createShowInformation:()=>()=>{},createShowMeasures:()=>{const dispose=()=>{};dispose.open=id=>opened.push(['measures',id]);return dispose;},loadShowPhoto(){},createShowData:()=>({request(){},version:()=>0,dispose(){cleaned++;}}),createShowProfile:()=>{const dispose=()=>{cleaned++;};dispose.ready=profile.promise;dispose.open=target=>opened.push(['profile',target]);return dispose;},createRiskAnalysis:()=>({prepare:()=>risks.promise,activate(){},open:target=>opened.push(['risks',target]),dispose(){cleaned++;}})});
 for(const name of ['src/lib/submenu-loading.js','shared/show-navigation.js','src/show-page.js'])vm.runInContext(readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''),context);
 const memory={acquire(){calls++;let released=false;return{view,ready:network.promise.then(()=>({request(){},version:()=>0})),release(){if(!released){released=true;cleaned++;}}};}};
  const dispose=context.createShowPage(content,{key:'Fixture',name:'Testshow',dates:['2026-11-06'],venue:options.venue||'Gashouder',city:'Amsterdam'},{initialTab:options.initialTab,initialTarget:options.initialTarget,memory,request:()=>network.promise,loadPhoto:async()=>null});
 return{content,menu,network,profile,risks,dispose,calls:()=>calls,cleaned:()=>cleaned,managed:()=>managed,placed:()=>placed,opened,captured,view};
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

test('Expliciet deadline-tabblad is geselecteerd bij de eerste zichtbare showweergave en overschrijft eerder showgeheugen',async()=>{
 for(const initialTab of [0,1,2,3]){
  const h=fixture({initialTab,rememberedTab:4});let first;
  const replace=h.content.replaceChildren.bind(h.content);h.content.replaceChildren=(...items)=>{if(items[0]?.className==='show-page')first=items[0].children[0].children[2].children.slice(0,5).map(button=>button.attributes['aria-selected']);replace(...items);};
  h.network.resolve({});h.profile.resolve();h.risks.resolve();await tick();assert.equal(first.filter(value=>value==='true').length,1);assert.equal(first[initialTab],'true');const panels=h.content.children[0].children[1].children;assert.equal(panels[initialTab].hidden,false);assert.ok(panels.every((panel,index)=>index===initialTab||panel.hidden));h.dispose();
 }
});

test('Projectteam is hernoemd; optioneel Showbeheer bestaat uitsluitend bij Gashouder',async()=>{
 for(const venue of ['Gashouder','Ziggo Dome']){const h=fixture({venue});h.network.resolve({});h.profile.resolve();h.risks.resolve();await tick();assert.equal(h.managed(),venue==='Gashouder'?1:0);assert.equal(h.placed(),venue==='Gashouder'?0:1,'andere zalen tonen de Showbeheer-plaatshouder met zaalkaart');const all=[];const collect=node=>{all.push(node);for(const child of node.children||[])collect(child);};collect(h.content);assert.ok(all.some(node=>node.textContent==='Projectteam'));assert.ok(!all.some(node=>node.textContent==='Show team'));for(const title of ['Tijdschema','Show informatie'])assert.ok(all.some(node=>node.textContent===title),title);assert.ok(!all.some(node=>node.textContent==='Actielijst'),'Actielijst is opgegaan in het Planning-blok');h.dispose();}
});

test('Planning-acties: een to-do kiest het tabblad en opent de juiste pagina; een diepe link doet hetzelfde bij het openen',async()=>{
 const h=fixture();h.network.resolve({});h.profile.resolve();h.risks.resolve();await tick();
 assert.equal(typeof h.captured.onOpen,'function','het planningsblok krijgt een opener');
 h.captured.onOpen({tab:'showprofiel',analysis:3});assert.equal(h.view.tab,1);
 h.captured.onOpen({tab:'risicoanalyse',risk:'R02'});assert.equal(h.view.tab,2);
 h.captured.onOpen({tab:'maatregelen',measure:'production:floor_pressure'});assert.equal(h.view.tab,3);
 h.captured.onOpen({tab:'onbekend'});assert.equal(h.view.tab,3,'onbekend tabblad verandert niets');
 assert.deepEqual(h.opened,[['profile',{tab:'showprofiel',analysis:3}],['risks',{tab:'risicoanalyse',risk:'R02'}],['measures','production:floor_pressure']]);
 const direct=fixture({initialTab:1,initialTarget:{tab:'showprofiel',tickets:true}});direct.network.resolve({});direct.profile.resolve();direct.risks.resolve();await tick();
 assert.deepEqual(direct.opened,[['profile',{tab:'showprofiel',tickets:true}]]);
 const plain=fixture({initialTab:1,initialTarget:{tab:'showprofiel'}});plain.network.resolve({});plain.profile.resolve();plain.risks.resolve();await tick();
 assert.deepEqual(plain.opened,[],'alleen een tabblad zonder bestemming opent niets extra');
});
