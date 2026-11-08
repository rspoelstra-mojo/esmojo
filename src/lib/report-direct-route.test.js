import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {groupReportMenu} from './report-menu.js';
function setup({selected=null,reports=[]}={}){
 class Element{
  constructor(tag='section'){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.textContent='';const names=new Set();this.classList={add:name=>names.add(name),remove:name=>names.delete(name),contains:name=>names.has(name)};}
  append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
  replaceChildren(...items){this.children=[];this.append(...items);}
  querySelectorAll(){return this.children.filter(child=>child.tag==='a'&&child.dataset.reportKey);}
  setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 }
 const heading=new Element('h2'),content=new Element(),submenu=new Element('nav'),opens=[],reloads=[];let publish;
 const cache={current:()=>reports,subscribe:callback=>{publish=callback;return()=>{};},refresh:async()=>{},retry(){}};
 const ctx=vm.createContext({AbortController,Intl,Date,JSON,Promise,document:{createElement:tag=>new Element(tag),querySelector:()=>heading,addEventListener(){}},window:{addEventListener(){}},setInterval:()=>1,clearInterval(){},groupReportMenu:rows=>groupReportMenu(rows,new Date('2026-11-08T12:00Z')),reportHref:report=>'/rapportages/'+encodeURIComponent(report.concertId),access:async()=>{},reportCatalogueCache:cache,createWebReportPage:(target,link,options)=>{opens.push({link,options});target.textContent='Bestaande rapportage';const cleanup=()=>{};cleanup.reload=(id,anchor)=>reloads.push({id,anchor});return cleanup;}});
 for(const file of ['src/lib/submenu-loading.js','src/reports-page.js'])vm.runInContext(readFileSync(file,'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''),ctx);
 const dispose=ctx.createReportsPage(content,submenu,{selected,heading,cache});
 return{heading,content,submenu,opens,reloads,publish:rows=>publish(rows),dispose};
}
const item=(concertId,date)=>({concertId,label:concertId,dates:[date],shows:[{concertId,date,venue:'Ziggo Dome'}]});
test('Directe oude rapportage opent buiten het 45-dagenmenu met dezelfde component; menu houdt alleen recente items',()=>{
 const old=item('Synthetisch_archief','2026-02-02'),recent=item('Synthetisch_recent','2026-11-05'),h=setup({selected:old.concertId,reports:[recent,old]});
 assert.equal(h.opens.length,1);assert.equal(h.opens[0].options.concertId,old.concertId);assert.equal(h.opens[0].link,h.heading);assert.equal(h.content.textContent,'Bestaande rapportage');
 assert.deepEqual(h.submenu.querySelectorAll().map(link=>link.dataset.reportKey),[recent.concertId]);
 h.publish([recent,old]);assert.equal(h.opens.length,1);assert.equal(h.reloads.length,0,'Achtergrondverversing opent de oude rapportage niet opnieuw');h.dispose();
});
test('Recente rapportage houdt geselecteerde menuknop; oude dag binnen zichtbare artiestreeks blijft exact geselecteerd',()=>{
 const recent=item('Synthetisch_recent','2026-11-05'),old=item('Synthetisch_oud','2026-02-02');recent.shows.push(old.shows[0]);recent.dates.push(old.dates[0]);
 const h=setup({selected:old.concertId,reports:[recent]});assert.equal(h.opens[0].options.concertId,old.concertId);assert.equal(h.opens[0].link.dataset.reportKey,recent.concertId);assert.equal(h.opens[0].link.attributes['aria-current'],'page');h.dispose();
});
test('Geen selectie opent niets, ook na verversen; een onbekende link geeft geen verzonnen rapportage',()=>{
 const old=item('Synthetisch_archief','2026-02-02'),h=setup({reports:[old]});assert.equal(h.opens.length,0);assert.equal(h.content.children[0].textContent,'Kies eerst een rapportage');h.publish([old]);assert.equal(h.opens.length,0);h.dispose();
 const missing=setup({selected:'unknown',reports:[old]});assert.equal(missing.opens.length,0);assert.equal(missing.content.textContent,'Rapportage niet gevonden.');missing.dispose();
});
