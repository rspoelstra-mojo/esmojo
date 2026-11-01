import {fitReportText} from './report-text-fit.ts'
import {paginateReport} from './report-pagination.ts'
import {addArtistMusicLinks} from './artist-music-links.ts'
import {proofMusicIcons} from './proof-music-icons.ts'
import {reportCoverDate} from '../src/report-show.ts'
import {parseVisitorOrigins} from '../src/visitor-origins.ts'
import {parseDomesticOrigins} from '../src/domestic-origins.ts'
import {parseTicketSales,ticketSalesMatch,saleShows,fullShowDate} from '../src/ticket-sales.ts'
import {validTicketCount} from '../src/review-fields.ts'
import type {ReportShow} from '../src/report-show.ts'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createDecipheriv} from 'node:crypto'
import {PDFDocument,PDFRawStream,PDFName,PDFDict,PDFArray,rgb} from 'pdf-lib'
import type {PDFPage,PDFFont,Color} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type {OperationRecord} from '../src/operations.ts'
export class ReportError extends Error{}
type Assets={cover:string;watermark:string;body:string;heading:string}
export async function reportAssets(key:string):Promise<Assets>{
 if(!/^[a-f0-9]{64}$/.test(key))throw new ReportError('De PDF-opmaak is nog niet geactiveerd. Neem contact op met de beheerder.')
 let encrypted:Buffer
 try{encrypted=await readFile(join(process.cwd(),'server/assets/report-resources.enc'))}catch{throw new ReportError('Het PDF-opmaakbestand is niet beschikbaar op de server. De website moet opnieuw worden gepubliceerd; je analyse is behouden.')}
 try{
  const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),encrypted.subarray(0,12));decipher.setAAD(Buffer.from('ESMORE:report-resources:v1'));decipher.setAuthTag(encrypted.subarray(-16))
  const data=JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(12,-16)),decipher.final()]).toString()) as Assets
  if(!['cover','watermark','body','heading'].every(field=>typeof data[field as keyof Assets]==='string'))throw new Error()
  return data
 }catch{throw new ReportError('De PDF-lettertypes konden niet worden geopend. Gebruik de volledige activeringslink opnieuw.')}
}
const W=595.2,H=841.92,BLUE=rgb(0,71/255,186/255),NAVY=rgb(8/255,24/255,48/255),LIGHT=rgb(.96,.97,.98),BORDER=rgb(.85,.88,.91),WHITE=rgb(1,1,1),TEXT=rgb(.12,.16,.22),MUTED=rgb(.36,.41,.48)
export async function createReportPdf(record:OperationRecord,assets:Assets,version:number,show:ReportShow,options:{visitorDataProof?:boolean;twoPageProof?:boolean;compactProof?:boolean;flowProof?:boolean;fitText?:boolean}={}){
 const flow=Boolean(options.flowProof)
 const twoPageLayout=show.venue==='Gashouder'||Boolean(options.twoPageProof)
 // Tighter spacing is an opt-in proof only; saved showprofiles retain the approved layout.
 const compact=Boolean(options.compactProof),leading=compact?1.1:1.18
 let analysisSize=12,bodyLeading=analysisSize*leading
 const blockPadding=compact?42:54,blockTitleTop=compact?20:24,blockTextTop=compact?32:38,dividerInset=compact?12:16
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit)
 const body=await pdf.embedFont(Buffer.from(assets.body,'base64'),{subset:true}),head=await pdf.embedFont(Buffer.from(assets.heading,'base64'),{subset:false})
 const mark=await pdf.embedPng(Buffer.from(assets.watermark,'base64'))
 const {artist,venue}=show
 const date=reportCoverDate(record.concert,show.date),shortDate=show.date.split('-').reverse().join('-'),sourceDate=new Date(record.updated_at).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
 function line(page:PDFPage,text:string,x:number,baseline:number,size=12,font:PDFFont=body,color:Color=TEXT){page.drawText(text,{x,y:H-baseline,size,font,color})}
 function wrap(text:string,width:number,font:PDFFont=body,size=12){
  const result:string[]=[]
  for(const paragraph of text.replace(/\r/g,'').split('\n')){
   let current=''
   for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
    if(font.widthOfTextAtSize(word,size)>width){
     if(!flow)throw new ReportError('Een woord of URL in de analyse is te lang voor de PDF. Pas de opgeslagen tekst aan.')
     if(current){result.push(current);current=''}
     for(const character of word){if(current&&font.widthOfTextAtSize(current+character,size)>width){result.push(current);current=''}current+=character}
     continue
    }
    const next=current?current+' '+word:word
    if(font.widthOfTextAtSize(next,size)>width){result.push(current);current=word}else current=next
   }
   result.push(current)
  }
  return result
 }
 function text(page:PDFPage,value:string,x:number,top:number,width:number,color:Color=TEXT,size=12,font:PDFFont=body){const lines=wrap(value,width,font,size);lines.forEach((v,i)=>line(page,v,x,top+size+i*size*leading,size,font,color));return lines.length*size*leading}
 function panel(page:PDFPage,top:number,height:number,fill:Color=LIGHT,x=50,w=495){
  // Flat rounded cards, matching the approved proof.
  const y=H-top-height,r=6
  page.drawRectangle({x:x+r,y,width:w-2*r,height,color:fill});page.drawRectangle({x,y:y+r,width:w,height:height-2*r,color:fill})
  for(const [cx,cy] of [[x+r,y+r],[x+w-r,y+r],[x+r,y+height-r],[x+w-r,y+height-r]])page.drawCircle({x:cx,y:cy,size:r,color:fill})
 }
 const field=(factor:'visitors'|'artist',id:string)=>{const value=record.workflow[factor]?.fields?.[id]?.content;if(typeof value!=='string'){if(options.visitorDataProof)return 'Nog niet ingevuld.';throw new ReportError('Een opgeslagen analyseonderwerp ontbreekt.')}return value.trim()}
 // Source content is never replaced with AI text, lorem ipsum, or silently truncated.
 if(!twoPageLayout){
 const source=await PDFDocument.load(Buffer.from(assets.cover,'base64'));const [cover]=await pdf.copyPages(source,[0]);pdf.addPage(cover)
 line(cover,'Showprofiel',70.8,121.63,47.527,head,WHITE)
 const artistLines=wrap(artist,455,head,47.5)
 if(artistLines.length>6)throw new ReportError('De artiestnaam is te lang voor het voorblad.')
 artistLines.forEach((value,index)=>line(cover,value,70.8,185.23+index*60,47.5,head,WHITE))
 const dateLines=wrap(date,455,body,24)
 if(dateLines.length>3)throw new ReportError('De showdatums passen niet op het voorblad.')
 const dateOffset=(dateLines.length-1)*31.68
 line(cover,venue+',',70.8,670.32-dateOffset,24,body,WHITE)
 dateLines.forEach((value,index)=>line(cover,value,70.8,702-dateOffset+index*31.68,24,body,WHITE))
 line(cover,options.visitorDataProof?`Proefversie ${version}.0 · Opgesteld door ${record.manager}`:`Documentversie ${version}.0 · Definitief afgerond door ${record.manager}`,70.8,739,9,body,WHITE)
 line(cover,`Op basis van opgeslagen gegevens van ${sourceDate}`,70.8,751,9,body,WHITE)
 const coverFooter=wrap(`Showprofiel ${artist}, door ${record.manager}`,355,body,10.2);if(coverFooter.length>3)throw new ReportError('De artiest- of managernaam is te lang voor de paginavoet.');coverFooter.forEach((value,index)=>line(cover,value,70.8,802.58-(coverFooter.length-1-index)*12,10.2,body,WHITE))
 }
 const footerPages:{page:PDFPage;number:number;bottom:number}[]=[]
 function newPage(number:number,contentBottom:number){
  const p=pdf.addPage([W,H]);p.drawImage(mark,{x:0,y:0,width:W,height:91.92})
  if(flow)footerPages.push({page:p,number,bottom:contentBottom});else footer(p,number,contentBottom,twoPageLayout?2:3)
  return p
 }
 function footer(p:PDFPage,number:number,contentBottom:number,total:number){
  const label=wrap(artist.toUpperCase(),375,head,9)
  if(label.length>2)throw new ReportError('De artiestnaam is te lang voor de paginavoet.')
  const rows=label.map((value,index)=>({value,baseline:791-(label.length-1-index)*11,font:head,color:NAVY}))
  rows.push({value:`${venue} · ${shortDate} · ${options.visitorDataProof?'PROEF · ':''}v${version}.0 · ${number} / ${total}`,baseline:807,font:body,color:MUTED})
  let shift=0
  {
   const notice='Dit document is strikt vertrouwelijk en mag niet verspreid worden zonder nadrukkelijke toestemming van MOJO Concerts.'
   rows.push(...wrap(notice,315,body,9).map((value,index)=>({value,baseline:819+index*10.62,font:body,color:MUTED})))
   type FontInk={unitsPerEm:number;layout:(value:string)=>{glyphs:{bbox:{minY:number;maxY:number}}[]}}
   const headingInk=fontkit.create(Buffer.from(assets.heading,'base64')) as FontInk,bodyInk=fontkit.create(Buffer.from(assets.body,'base64')) as FontInk
   const bounds=rows.map(row=>{
    const ink=row.font===head?headingInk:bodyInk,boxes=ink.layout(row.value).glyphs.map(glyph=>glyph.bbox),scale=9/ink.unitsPerEm
    return {top:row.baseline-Math.max(...boxes.map(box=>box.maxY))*scale,bottom:row.baseline-Math.min(...boxes.map(box=>box.minY))*scale}
   })
   const top=Math.min(...bounds.map(box=>box.top)),bottom=Math.max(...bounds.map(box=>box.bottom))
   // Centre the visible letter outlines, keeping every internal gap and content block intact.
   shift=(contentBottom+H-top-bottom)/2
  }
  rows.forEach(row=>line(p,row.value,50,row.baseline+shift,9,row.font,row.color))
 }

 type Block={height:number;fixed?:boolean;keepWithNext?:boolean;split?:(available:number)=>[Block,Block]|undefined;draw:(p:PDFPage,top:number,height:number)=>void}
 function card(titles:string[],columns:string[][]):Block{
  const count=Math.max(...columns.map(lines=>lines.length)),height=blockPadding+count*bodyLeading
  return {height,split(available){
   const take=Math.min(count-2,Math.floor((available-blockPadding)/bodyLeading))
   if(take<2||count-take<2)return
   return [card(titles,columns.map(lines=>lines.slice(0,take))),card(titles,columns.map(lines=>lines.slice(take)))]
  },draw(p,top,h){
   panel(p,top,h)
   if(columns.length===2)p.drawLine({start:{x:297.5,y:H-top-dividerInset},end:{x:297.5,y:H-top-h+dividerInset},color:BORDER,thickness:.7})
   columns.forEach((lines,index)=>{const x=index?313.5:66;line(p,titles[index],x,top+blockTitleTop,12,head,NAVY);lines.forEach((value,i)=>line(p,value,x,top+blockTextTop+analysisSize+i*bodyLeading,analysisSize))})
  }}
 }
 function pair(leftTitle:string,left:string,rightTitle:string,right:string):Block{return card([leftTitle,rightTitle],[wrap(left,215.5,body,analysisSize),wrap(right,215.5,body,analysisSize)])}
 function full(title:string,value:string):Block{return card([title],[wrap(value,463,body,analysisSize)])}
 const proofLegendSize=8.5
 const proofLegend=(factor:'visitors'|'artist')=>factor==='visitors'?'1 = Rustig publiek met hoge naleving van instructies.\n10 = Extreem energiek publiek met verhoogde kans op ongehoorzaamheid en incidenten.':'1 = Statische, voorspelbare productie.\n10 = Intensieve show met veel dynamiek en onvoorspelbaar artiestgedrag.'
 const conclusionHeight=()=>twoPageLayout?Math.max(compact?104:128,...(['visitors','artist'] as const).map(factor=>{
  const reason=record.workflow[factor]?.score_review?.reason||'Nog geen bevestigde samenvatting opgeslagen.'
  return (compact?34:40)+wrap(reason,463,body,analysisSize).length*bodyLeading+(compact?8:14)+wrap(proofLegend(factor),463,body,proofLegendSize).length*proofLegendSize*leading+(compact?10:14)
 })):0
 function conclusion(title:string,factor:'visitors'|'artist'):Block{
  const review=record.workflow[factor]!.score_review
  if(!review&&!options.visitorDataProof)throw new ReportError('De analyse mist een bevestigde conclusie.')
  const reason=review?.reason||'Nog geen bevestigde samenvatting opgeslagen.'
  if(twoPageLayout){
   const proofConclusionHeight=conclusionHeight()
   const legendSize=proofLegendSize,legend=proofLegend(factor)
   const legendHeight=wrap(legend,463,body,legendSize).length*legendSize*leading
   if(flow){
    const fragment=(lines:string[],last:boolean,minimum=0):Block=>{
     const height=Math.max(minimum,40+lines.length*bodyLeading+14+(last?legendHeight+14:0))
     return {height,fixed:true,split(available){
      const take=Math.min(lines.length-2,Math.floor((available-54)/bodyLeading))
      if(take<2||lines.length-take<2)return
      return [fragment(lines.slice(0,take),false),fragment(lines.slice(take),last)]
     },draw(p,top,h){
      panel(p,top,h,BLUE);line(p,title,65,top+23,13,head,WHITE);line(p,`${review?.score??'—'} / 10`,468,top+24,18,head,WHITE)
      lines.forEach((value,i)=>line(p,value,65,top+52+i*bodyLeading,12,body,WHITE))
      if(last)text(p,legend,65,top+h-14-legendHeight,463,rgb(.87,.91,1),legendSize)
     }}
    }
    return fragment(wrap(reason,463),true,proofConclusionHeight<=660?proofConclusionHeight:128)
   }
   return {height:proofConclusionHeight,fixed:true,draw(p,top,h){
    panel(p,top,h,BLUE)
    line(p,title,65,top+23,13,head,WHITE);line(p,`${review?.score??'—'} / 10`,468,top+24,18,head,WHITE)
    text(p,reason,65,top+(compact?34:40),463,WHITE,analysisSize)
    text(p,legend,65,top+h-(compact?10:14)-legendHeight,463,rgb(.87,.91,1),legendSize)
   }}
  }
  return {height:54+wrap(reason,463).length*14.16,draw(p,top,h){panel(p,top,h,BLUE);line(p,title,65,top+23,13,head,WHITE);line(p,`${review?.score??'—'} / 10`,468,top+24,18,head,WHITE);text(p,reason,65,top+40,463,WHITE)}}
 }
 function visitorData():Block{
  const fields=record.workflow.visitors?.fields
  const sales=fields?.ticket_sales?.content,foreign=parseVisitorOrigins(fields?.visitor_origins?.content||''),domestic=parseDomesticOrigins(fields?.domestic_origins?.content||'')
  const saleRows=parseTicketSales(sales)?.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)),multiple=Boolean(saleRows&&saleRows.length>1)
  if((!validTicketCount(sales)&&!saleRows)||record.concert&&!ticketSalesMatch(sales,saleShows(record.concert))||!foreign||!domestic)throw new ReportError('Sla eerst de kaartverkoopstand, buitenlandse bezoekers en binnenlandse herkomst van deze show op voordat je de PDF maakt.')
  const number=(value:number)=>value.toLocaleString('nl-NL',{maximumFractionDigits:2})
  const percentage=(value:string)=>number(Number(value.replace(',','.')))+'%'
  const foreignPercent=(10000-Math.round(Number(foreign.netherlands.replace(',','.'))*100))/100
  const tables=[{x:231,title:'Top 3 landen',rows:foreign.foreign.map(row=>({label:row.country,percentage:percentage(row.percentage)}))},{x:396,title:'Top 3 provincies',rows:domestic.map(row=>({label:row.province,percentage:percentage(row.percentage)}))}]
  const size=9.5,labelWidth=98,rowGap=5
  const dimensions=tables.map(table=>table.rows.map(row=>wrap(row.label,labelWidth,body,size)))
  const saleLabels=multiple?saleRows!.map(row=>fullShowDate(row.date)+(saleRows!.filter(item=>item.date===row.date).length>1?` · ${row.time}`:'')):[]
  const saleWidths=multiple?saleRows!.map(row=>Math.min(96,133-body.widthOfTextAtSize(number(Number(row.count)),9.5)-8)):[]
  const rowHeights=Array.from({length:Math.max(3,saleLabels.length)},(_,index)=>Math.max(15,...dimensions.map(rows=>(rows[index]?.length??0)*size*1.18),saleLabels[index]?wrap(saleLabels[index],saleWidths[index],body,8.5).length*8.5*1.18:0)+rowGap)
  const height=Math.max(compact?96:110,(compact?34:42)+rowHeights.reduce((sum,height)=>sum+height,0)+(compact?10:12))
  return {height,fixed:true,keepWithNext:flow,draw(p,top,h){
   panel(p,top,h)
   line(p,'Verkochte tickets',66,top+blockTitleTop,11,head,NAVY)
   if(multiple){
    let rowTop=top+blockTextTop
    saleRows!.forEach((row,index)=>{text(p,saleLabels[index],66,rowTop,saleWidths[index],TEXT,8.5);const count=number(Number(row.count));line(p,count,199-body.widthOfTextAtSize(count,9.5),rowTop+9.5,9.5,body,BLUE);rowTop+=rowHeights[index]})
    line(p,number(foreignPercent)+'% buitenlands',66,top+blockTextTop+rowHeights.reduce((sum,height)=>sum+height,0)+8.5,8.5,body,MUTED)
   }else{
    const value=number(Number(saleRows?.[0].count??sales)),valueSize=Math.min(26,133/head.widthOfTextAtSize(value,26)*26)
    line(p,value,66,top+(compact?53:59),valueSize,head,BLUE)
    line(p,number(foreignPercent)+'% buitenlands',66,top+blockTextTop+rowHeights[0]+rowHeights[1]+size,size,body,MUTED)
   }
   for(const x of [215,380])p.drawLine({start:{x,y:H-top-dividerInset},end:{x,y:H-top-h+dividerInset},color:BORDER,thickness:.7})
   tables.forEach(table=>{
    line(p,table.title,table.x,top+blockTitleTop,11,head,NAVY)
    let rowTop=top+blockTextTop
    table.rows.forEach((row,i)=>{
     text(p,row.label,table.x,rowTop,labelWidth,TEXT,size)
     line(p,row.percentage,table.x+133-body.widthOfTextAtSize(row.percentage,size),rowTop+size,size,body,TEXT)
     rowTop+=rowHeights[i]
    })
   })
  }}
 }

 function blocks(page:PDFPage,items:Block[],top:number,bottom:number){const gap=compact?10:18,available=bottom-top-gap*(items.length-1),minimum=items.reduce((sum,item)=>sum+item.height,0);if(minimum>available)throw new ReportError(`De opgeslagen teksten zijn te lang voor het afgesproken document van ${twoPageLayout?'twee':'drie'} A4-pagina’s. Kort de teksten of samenvattingen in; er is niets afgerond.`);const extra=compact?0:(available-minimum)/Math.max(1,items.filter(item=>!item.fixed).length);for(const item of items){const height=item.height+(item.fixed?0:extra);item.draw(page,top,height);top+=height+gap}}
 function flowBlocks(first:PDFPage,items:Block[],top:number,bottom:number,title:string){
  const pages=paginateReport(items,top,bottom)
  pages.forEach((plan,index)=>{
   const page=index?newPage(pdf.getPageCount()+1,plan.bottom):first
   if(index)line(page,title+' (vervolg)',50,63,23,head,NAVY)
   if(pages.length===1)blocks(page,plan.items,plan.top,plan.bottom)
   else{
    // Continuation pages use natural card heights; never inflate a small card to fill a page.
    let at=plan.top
    for(const item of plan.items){item.draw(page,at,item.height);at+=item.height+18}
   }
  })
 }
 function analysisBlocks(){
 const demographics=pair('Man/vrouw verhouding',field('visitors','gender_ratio'),'Leeftijdscategorie',field('visitors','age_range'))
 if((parseTicketSales(record.workflow.visitors?.fields?.ticket_sales?.content)?.length??0)>3)demographics.fixed=true
 const visitorBlocks=[demographics,pair('Aankomstprofiel',field('visitors','arrival'),'Typische kenmerken',field('visitors','typical_traits')),visitorData(),conclusion('Conclusie bezoekersanalyse','visitors')]
 const artistBlocks=[pair('Artiest',field('artist','artist_description'),'Routing',field('artist','tour_route')),pair('Show karakter',field('artist','movement'),'Curfew',field('artist','punctuality')),twoPageLayout?pair('Populariteit',record.workflow.artist?.fields?.popularity?.content?.trim()||'','Maatschappelijke gevoeligheid',field('artist','social_sensitivity')):full('Maatschappelijke gevoeligheid',field('artist','social_sensitivity')),full('Bijzonderheden',field('artist','special_notes')),conclusion('Conclusie artiestanalyse','artist')]
  return {visitors:visitorBlocks,artist:artistBlocks}
 }
 let content=analysisBlocks()
 if(options.fitText){
  fitReportText(size=>{
   analysisSize=size;bodyLeading=size*leading;content=analysisBlocks()
   return content.visitors.reduce((sum,item)=>sum+item.height,0)+18*(content.visitors.length-1)<=756-269.75&&content.artist.reduce((sum,item)=>sum+item.height,0)+18*(content.artist.length-1)<=746-86
  })
 }
 const p2=newPage(twoPageLayout?1:2,756);p2.drawRectangle({x:0,y:H-204.75,width:W,height:204.75,color:BLUE})
 if(twoPageLayout){
 const titleLines=wrap(artist,425,head,23.76)
 if(titleLines.length>2)throw new ReportError('De concertnaam past niet in het showprofiel.')
 type FontInk={unitsPerEm:number;layout:(value:string)=>{glyphs:{bbox:{minY:number;maxY:number}}[]}}
 const headingInk=fontkit.create(Buffer.from(assets.heading,'base64')) as FontInk,bodyInk=fontkit.create(Buffer.from(assets.body,'base64')) as FontInk
 const intro=`Dit showprofiel is naar alle zorgvuldigheid opgesteld door ${record.manager},\nals Event Safety manager betrokken bij de voorbereiding van deze show.`
 const headerBlocks=[
  {lines:titleLines,size:23.76,font:head,ink:headingInk,gap:28},
  {lines:wrap(`${date} - ${venue}`,425,body,10.5),size:10.5,font:body,ink:bodyInk,gap:12.39},
  {lines:wrap(intro,425,body,11),size:11,font:body,ink:bodyInk,gap:12.98},
  {lines:[`Documentversie ${version}.0 · Definitief afgerond`,`Op basis van opgeslagen gegevens van ${sourceDate}`],size:9,font:body,ink:bodyInk,gap:14},
 ].map(block=>{
  const bounds=block.lines.map((value,index)=>{
   const boxes=block.ink.layout(value).glyphs.map(glyph=>glyph.bbox),scale=block.size/block.ink.unitsPerEm
   return {top:index*block.gap-Math.max(...boxes.map(box=>box.maxY))*scale,bottom:index*block.gap-Math.min(...boxes.map(box=>box.minY))*scale}
  }),top=Math.min(...bounds.map(box=>box.top)),bottom=Math.max(...bounds.map(box=>box.bottom))
  return {...block,baseline:-top,height:bottom-top}
 })
 const spacing=(145-headerBlocks.reduce((sum,block)=>sum+block.height,0))/3
 if(!Number.isFinite(spacing)||spacing<8)throw new ReportError('De kop past niet in het vaste toelichtingsblok.')
 let headerTop=32
 for(const block of headerBlocks){block.lines.forEach((value,index)=>line(p2,value,50,headerTop+block.baseline+index*block.gap,block.size,block.font,WHITE));headerTop+=block.height+spacing}
 // A single closed cubic contour avoids antialiasing seams between overlapping shapes.
 const rounded=(width:number,height:number,radius:number)=>{
  const k=radius*0.5522847498307936,w=width,h=height,r=radius
  return `M ${r} 0 L ${w-r} 0 C ${w-r+k} 0 ${w} ${r-k} ${w} ${r} L ${w} ${h-r} C ${w} ${h-r+k} ${w-r+k} ${h} ${w-r} ${h} L ${r} ${h} C ${r-k} ${h} 0 ${h-r+k} 0 ${h-r} L 0 ${r} C 0 ${r-k} ${r-k} 0 ${r} 0 Z`
 }
 p2.drawSvgPath(rounded(52,145,8),{x:493,y:H-32,color:WHITE})
 proofMusicIcons.forEach(({name,path},index)=>{
  const top=40+index*48
  p2.drawSvgPath(rounded(32,32,6.4),{x:503,y:H-top,color:rgb(.935,.935,.935)})
  // The supplied examples use pale square tiles with monochrome brand silhouettes.
  const symbolSize=name==='applemusic'?32:24,padding=(32-symbolSize)/2
  const silhouette=name==='applemusic'?path.slice(path.indexOf('Z')+1):path
  p2.drawSvgPath(silhouette,{x:503+padding,y:H-(top+padding),scale:symbolSize/24,color:rgb(.775,.775,.775)})
 })
 addArtistMusicLinks(pdf,p2,artist)
 }else{
 line(p2,'Toelichting',50,63,23.76,head,WHITE)
 const firstName=record.manager.split(/\s+/)[0]
 const intro=`Dit showprofiel is naar alle zorgvuldigheid opgesteld door ${record.manager}, als Event Safety manager betrokken bij de voorbereiding van deze show.\nIn deze analyse schetst ${firstName} een beeld over deze show op basis van ervaringen met deze en vergelijkbare artiesten en deep-research onderzoek naar de artiest en het publiek.\nAlle informatie in deze analyse is samengesteld en gecontroleerd door de event safety manager van de show. De analyse is enkel vormgegeven met behulp van AI.`
 if(wrap(intro,495).length*14.16>116)throw new ReportError('De naam van de manager past niet in het toelichtingsblok. Controleer de opgeslagen naam.')
 text(p2,intro,50,85,495,WHITE)
 }
 line(p2,'Bezoekersanalyse',50,compact?238.75:246.75,23,head,NAVY)

 const visitorBlocks=content.visitors
 if(flow)flowBlocks(p2,visitorBlocks,269.75,756,'Bezoekersanalyse');else blocks(p2,visitorBlocks,compact?255.75:269.75,756)
 const p3=newPage(flow?pdf.getPageCount()+1:twoPageLayout?2:3,746);line(p3,'Artiestanalyse',50,compact?59:63,23,head,NAVY)
 const artistBlocks=content.artist
 if(flow){flowBlocks(p3,artistBlocks,86,746,'Artiestanalyse');footerPages.forEach(({page,number,bottom})=>footer(page,number,bottom,pdf.getPageCount()))}else blocks(p3,artistBlocks,compact?78:86,746)
 pdf.setTitle(`Showprofiel ${artist} — ${options.visitorDataProof?'proefontwerp':'versie '+version+'.0'}`);pdf.setAuthor(record.manager);pdf.setSubject(`Op basis van opgeslagen gegevens van ${sourceDate}`);pdf.setCreationDate(new Date(record.updated_at));pdf.setModificationDate(new Date(record.updated_at))
 await pdf.flush()
 // Full OpenType/CFF fonts use the OpenType stream subtype, preserving the supplied outlines.
 const type0=pdf.context.lookup(head.ref,PDFDict),descendant=type0.lookup(PDFName.of('DescendantFonts'),PDFArray).lookup(0,PDFDict),descriptor=descendant.lookup(PDFName.of('FontDescriptor'),PDFDict)
 const fontRef=descriptor.get(PDFName.of('FontFile2'))??descriptor.get(PDFName.of('FontFile3'))
 const stream=pdf.context.lookup(fontRef) as PDFRawStream
 descriptor.delete(PDFName.of('FontFile2'));descriptor.set(PDFName.of('FontFile3'),fontRef!)
 descendant.set(PDFName.of('Subtype'),PDFName.of('CIDFontType0'));descendant.delete(PDFName.of('CIDToGIDMap'))
 stream.dict.set(PDFName.of('Subtype'),PDFName.of('OpenType'))
 return Buffer.from(await pdf.save())
}
