import test from 'node:test'
import assert from 'node:assert/strict'
import {paginateReport} from '../server/report-pagination.ts'
type Block={height:number;id:string;keepWithNext?:boolean;split?:(available:number)=>[Block,Block]|undefined}
const card=(id:string,height:number):Block=>({id,height})
test('pagination includes gaps, accepts exact fits and moves intact cards without empty trailing pages',()=>{
 const a=card('a',200),b=card('b',268.25),c=card('c',100)
 assert.deepEqual(paginateReport([a,b],269.75,756).map(p=>p.items.map(i=>i.id)),[['a','b']])
 assert.deepEqual(paginateReport([a,b,c],269.75,756).map(p=>p.items.map(i=>i.id)),[['a','b'],['c']])
 assert.equal(paginateReport([a,b,c],269.75,756)[1].top,86)
})
test('ticket figures stay with the conclusion when the pair fits a continuation page',()=>{
 const a=card('analysis',300),b={...card('figures',114),keepWithNext:true},c=card('conclusion',128)
 assert.deepEqual(paginateReport([a,b,c],269.75,756).map(p=>p.items.map(i=>i.id)),[['analysis'],['figures','conclusion']])
})
test('oversized blocks split with content preserved and all planned pages remain within their bounds',()=>{
 function lines(values:number[]):Block{return {height:54+values.length*14.16,id:values.join(','),split(space){const take=Math.min(values.length-2,Math.floor((space-54)/14.16));if(take<2)return;return [lines(values.slice(0,take)),lines(values.slice(take))]}}}
 const input=Array.from({length:150},(_,i)=>i),pages=paginateReport([lines(input),card('last',128)],269.75,756)
 assert.ok(pages.length>3)
 assert.deepEqual(pages.flatMap(p=>p.items).filter(i=>i.id!=='last').flatMap(i=>i.id.split(',').map(Number)),input)
 for(const p of pages)assert.ok(p.items.reduce((sum,i)=>sum+i.height,0)+18*(p.items.length-1)<=p.bottom-p.top+.001)
 assert.equal(pages.at(-1)?.items.at(-1)?.id,'last')
})
test('unbreakable oversized content fails instead of looping or silently dropping data',()=>{
 assert.throws(()=>paginateReport([card('too tall',900)],269.75,756),/lege pagina/)
})
test('a header-only first page remains in the plan so continuation content cannot overlap its header',()=>{
 const pages=paginateReport([card('large but unbreakable',600)],269.75,756)
 assert.equal(pages.length,2);assert.equal(pages[0].items.length,0);assert.equal(pages[0].top,269.75);assert.equal(pages[1].top,86);assert.equal(pages[1].items[0].height,600)
 assert.deepEqual(paginateReport([],269.75,756),[])
})
