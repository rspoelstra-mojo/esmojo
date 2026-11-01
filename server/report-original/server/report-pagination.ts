/** Plan pages before drawing so footers can use the final page count. */
export type FlowBlock<T>={height:number;keepWithNext?:boolean;split?:(available:number)=>[T,T]|undefined}
export function paginateReport<T extends FlowBlock<T>>(items:T[],firstTop:number,firstBottom:number,nextTop=86,nextBottom=746,gap=18){
 const pages:{items:T[];top:number;bottom:number}[]=[{items:[],top:firstTop,bottom:firstBottom}]
 const pending=[...items],capacity=nextBottom-nextTop
 let used=0
 while(pending.length){
  const item=pending.shift()!,page=pages[pages.length-1],space=page.bottom-page.top-used-(page.items.length?gap:0)
  const group=item.keepWithNext&&pending[0]?item.height+gap+pending[0].height:0
  if(group>space+.001&&group<=capacity&&page.items.length){pending.unshift(item);pages.push({items:[],top:nextTop,bottom:nextBottom});used=0;continue}
  if(item.height<=space+.001){page.items.push(item);used+=item.height+(page.items.length>1?gap:0);continue}
  // Move a complete card to a fresh page whenever it fits there. Split only oversized cards.
  const parts=item.height>capacity?item.split?.(space):undefined
  if(parts&&parts[0].height<=space+.001&&parts[0].height>0&&parts[1].height<item.height){page.items.push(parts[0]);pending.unshift(parts[1])}
  else{
   pending.unshift(item)
   if(!page.items.length&&space>=capacity-.001)throw new Error('Een rapportageblok past niet op een lege pagina.')
  }
  pages.push({items:[],top:nextTop,bottom:nextBottom});used=0
 }
 // Keep an initial header page if the first unbreakable card needs a fresh page.
 return items.length?pages:[]
}
