// Risico-PDF per beheersmaatregel. Zelfde huisstijl als het Showprofiel-PDF (server/report-original, ongewijzigd):
// dezelfde fonts, watermerk, kleuren, kaarten, blauwe kop en vertrouwelijke voettekst. Eigen inhoud en opmaakversie.
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
export const RISK_PDF_LAYOUT='risk-v1-showprofile-style';
const W=595.2,H=841.92,BLUE=rgb(0,71/255,186/255),NAVY=rgb(8/255,24/255,48/255),LIGHT=rgb(.96,.97,.98),BORDER=rgb(.85,.88,.91),WHITE=rgb(1,1,1),TEXT=rgb(.12,.16,.22),MUTED=rgb(.36,.41,.48);
const levelColor={high:rgb(.74,.13,.13),medium:rgb(.72,.40,.04),low:rgb(.60,.45,.04),none:rgb(.12,.50,.28)};
const levelLabel={none:'Geen risico',low:'Laag',medium:'Midden',high:'Hoog'};
const SIZE=12,LEADING=SIZE*1.18,PAD=54,TITLE_TOP=24,TEXT_TOP=38,NEXT_TOP=86,NEXT_BOTTOM=746,GAP=18;
export class RiskPdfError extends Error{}
let assetsPromise;
export function riskPdfAssets(){return assetsPromise??=(async()=>Object.fromEntries(await Promise.all(Object.entries({watermark:'watermark.png',body:'body-font.ttf',heading:'heading-font.otf'}).map(async([key,name])=>[key,(await readFile(new URL('../report-original/assets/'+name,import.meta.url))).toString('base64')]))))().catch(error=>{assetsPromise=null;throw error;});}
const dutchDate=value=>{const [y,m,d]=String(value).split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString('nl-NL',{timeZone:'Europe/Amsterdam',day:'numeric',month:'long',year:'numeric'});};
const stamp=value=>value?new Date(value).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):null;
export function riskPdfFileName(data){return 'RISICO_'+[data.show.artist,data.show.venue,data.show.date,data.risk.id.split(':').at(-1)].join('_').normalize('NFKD').replace(/[^\w.-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')+'.pdf';}
export async function createRiskPdf(data,assets,{now=new Date()}={}){
 const {show,risk,measure}=data;
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const body=await pdf.embedFont(Buffer.from(assets.body,'base64'),{subset:true}),head=await pdf.embedFont(Buffer.from(assets.heading,'base64'),{subset:false}),mark=await pdf.embedPng(Buffer.from(assets.watermark,'base64'));
 const headingInk=fontkit.create(Buffer.from(assets.heading,'base64')),bodyInk=fontkit.create(Buffer.from(assets.body,'base64'));
 const line=(page,value,x,baseline,size=SIZE,font=body,color=TEXT)=>page.drawText(value,{x,y:H-baseline,size,font,color});
 function wrap(value,width,font=body,size=SIZE){
  const result=[];
  for(const paragraph of String(value).replace(/\r/g,'').split('\n')){
   let current='';
   for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
    if(font.widthOfTextAtSize(word,width<0?0:size)>width){if(current){result.push(current);current='';}for(const character of word){if(current&&font.widthOfTextAtSize(current+character,size)>width){result.push(current);current='';}current+=character;}continue;}
    const next=current?current+' '+word:word;
    if(font.widthOfTextAtSize(next,size)>width){result.push(current);current=word;}else current=next;
   }
   result.push(current);
  }
  return result;
 }
 function panel(page,top,height,fill=LIGHT,x=50,w=495){
  const y=H-top-height,r=6;
  page.drawRectangle({x:x+r,y,width:w-2*r,height,color:fill});page.drawRectangle({x,y:y+r,width:w,height:height-2*r,color:fill});
  for(const [cx,cy] of [[x+r,y+r],[x+w-r,y+r],[x+r,y+height-r],[x+w-r,y+height-r]])page.drawCircle({x:cx,y:cy,size:r,color:fill});
 }
 // Rijen met optionele opsommingstekens: regels die met •, -, * of – beginnen worden netjes ingesprongen.
 const bulletPattern=/^\s*[•\-*–·]\s+(.*)$/;
 function rowsOf(value,width){
  const rows=[];
  for(const paragraph of String(value).replace(/\r/g,'').split('\n')){
   const match=bulletPattern.exec(paragraph);
   if(match){wrap(match[1],width-14).forEach((text,i)=>rows.push({text,x:80,bullet:i===0}));}
   else wrap(paragraph,width).forEach(text=>rows.push({text,x:66}));
  }
  return rows;
 }
 function card(title,rows,color=TEXT,font=body){
  return{height:PAD+rows.length*LEADING,split(available){const take=Math.min(rows.length-2,Math.floor((available-PAD)/LEADING));if(take<2||rows.length-take<2)return null;return[card(title,rows.slice(0,take),color,font),card(title+' (vervolg)',rows.slice(take),color,font)];},
   draw(page,top,height){panel(page,top,height);line(page,title,66,top+TITLE_TOP,12,head,NAVY);rows.forEach((row,i)=>{const baseline=top+TEXT_TOP+SIZE+i*LEADING;if(row.bullet)line(page,'•',68,baseline,SIZE,body,BLUE);line(page,row.text,row.x,baseline,SIZE,font,color);});}};
 }
 const full=(title,value,color,font)=>card(title,rowsOf(value,463),color,font);
 function pair(leftTitle,left,rightTitle,right,colors=[TEXT,TEXT]){
  const a=wrap(left,215.5),b=wrap(right,215.5),count=Math.max(a.length,b.length);
  return{height:PAD+count*LEADING,draw(page,top,height){panel(page,top,height);page.drawLine({start:{x:297.5,y:H-top-16},end:{x:297.5,y:H-top-height+16},color:BORDER,thickness:.7});
   [[leftTitle,a,66,colors[0]],[rightTitle,b,313.5,colors[1]]].forEach(([title,lines,x,color])=>{line(page,title,x,top+TITLE_TOP,12,head,NAVY);lines.forEach((value,i)=>line(page,value,x,top+TEXT_TOP+SIZE+i*LEADING,SIZE,body,color));});}};
 }
 const titleLines=wrap(risk.title,425,head,23.76);
 if(titleLines.length>3)throw new RiskPdfError('De risiconaam is te lang voor de kop.');
 const headerHeight=Math.max(150,76+(titleLines.length-1)*28+70),firstTop=headerHeight+22;
 // Inhoud: risico, mogelijk gevolg, beheersmaatregel en daarna de classificatie voor en na de maatregel.
 const blocks=[];
 blocks.push(full('Risico',risk.description||risk.title));
 if(risk.consequence)blocks.push(full('Mogelijk gevolg',risk.consequence));
 blocks.push(full('Beheersmaatregel',measure.text));
 // Classificatie voor en na de maatregel: twee gelijke kleurvakken.
 const tint={high:rgb(.99,.91,.91),medium:rgb(1,.94,.86),low:rgb(1,.97,.85),none:rgb(.90,.97,.92)};
 const classBox=(page,x,top,height,title,value,note,level)=>{
  panel(page,top,height,level?tint[level]:LIGHT,x,239.5);
  line(page,title,x+16,top+TITLE_TOP,11,head,NAVY);
  let size=22;while(size>13&&head.widthOfTextAtSize(value,size)>207.5)size--;
  line(page,value,x+16,top+TITLE_TOP+34,size,head,level?levelColor[level]:MUTED);
  if(note)line(page,note,x+16,top+TITLE_TOP+54,9,body,MUTED);
 };
 const afterLevel=measure.implemented&&measure.riskLevelAfter?measure.riskLevelAfter:null;
 blocks.push({height:96,draw(page,top,height){
  classBox(page,50,top,height,'Risicoklasse vóór beheersmaatregel',levelLabel[risk.riskLevel]||'Niet vermeld',risk.assessedAt?'Beoordeeld op '+stamp(risk.assessedAt):'Beoordeling door de event safety manager',risk.riskLevel);
  classBox(page,305.5,top,height,'Risicoklasse na beheersmaatregel',afterLevel?levelLabel[afterLevel]:'Nog niet beoordeeld',afterLevel?(measure.completedAt?'Geïmplementeerd op '+stamp(measure.completedAt):'Geïmplementeerd'):'Maatregel nog niet geïmplementeerd',afterLevel);
 }});
 // Paginering (vooraf, zodat de voet het totale aantal pagina's kent).
 const pages=[{items:[],top:firstTop,bottom:NEXT_BOTTOM}];
 const pending=[...blocks];let used=0;
 while(pending.length){
  const item=pending.shift(),page=pages.at(-1),space=page.bottom-page.top-used-(page.items.length?GAP:0);
  if(item.height<=space+.001){page.items.push(item);used+=item.height+(page.items.length>1?GAP:0);continue;}
  const capacity=NEXT_BOTTOM-NEXT_TOP;
  if(item.height<=capacity&&page.items.length){pages.push({items:[],top:NEXT_TOP,bottom:NEXT_BOTTOM});used=0;pending.unshift(item);continue;}
  const parts=item.split?.(space);
  if(parts){page.items.push(parts[0]);pages.push({items:[],top:NEXT_TOP,bottom:NEXT_BOTTOM});used=0;pending.unshift(parts[1]);continue;}
  if(page.items.length){pages.push({items:[],top:NEXT_TOP,bottom:NEXT_BOTTOM});used=0;pending.unshift(item);continue;}
  throw new RiskPdfError('Een tekst past niet in de PDF.');
 }
 const total=pages.length,shortDate=show.date.split('-').reverse().join('-');
 function footer(page,number,contentBottom){
  const label=wrap(show.artist.toUpperCase(),375,head,9);
  if(label.length>2)throw new RiskPdfError('De artiestnaam is te lang voor de paginavoet.');
  const rows=label.map((value,index)=>({value,baseline:791-(label.length-1-index)*11,font:head,color:NAVY}));
  rows.push({value:`${show.venue} · ${shortDate} · risico-v1 · ${number} / ${total}`,baseline:807,font:body,color:MUTED});
  rows.push(...wrap('Dit document is strikt vertrouwelijk en mag niet verspreid worden zonder nadrukkelijke toestemming van MOJO Concerts.',315,body,9).map((value,index)=>({value,baseline:819+index*10.62,font:body,color:MUTED})));
  const bounds=rows.map(row=>{const ink=row.font===head?headingInk:bodyInk,boxes=ink.layout(row.value).glyphs.map(glyph=>glyph.bbox),scale=9/ink.unitsPerEm;return{top:row.baseline-Math.max(...boxes.map(box=>box.maxY))*scale,bottom:row.baseline-Math.min(...boxes.map(box=>box.minY))*scale};});
  const shift=(contentBottom+H-Math.min(...bounds.map(box=>box.top))-Math.max(...bounds.map(box=>box.bottom)))/2;
  rows.forEach(row=>line(page,row.value,50,row.baseline+shift,9,row.font,row.color));
 }
 pages.forEach((plan,index)=>{
  const page=pdf.addPage([W,H]);page.drawImage(mark,{x:0,y:0,width:W,height:91.92});footer(page,index+1,index===0?756:NEXT_BOTTOM+10);
  if(index===0){
   page.drawRectangle({x:0,y:H-headerHeight,width:W,height:headerHeight,color:BLUE});
   line(page,'Risico en beheersmaatregel',50,44,11,head,WHITE);
   titleLines.forEach((value,i)=>line(page,value,50,76+i*28,23.76,head,WHITE));
   const base=76+(titleLines.length-1)*28;
   line(page,`${show.artist} - ${show.dates.map(dutchDate).join(' · ')} - ${show.venue}${show.city?', '+show.city:''}`,50,base+26,10.5,body,WHITE);
   line(page,`Opgesteld op ${stamp(now)} · gebaseerd op de actuele bevestigde gegevens`,50,base+46,9,body,WHITE);
  }
  let top=plan.top;for(const item of plan.items){item.draw(page,top,item.height);top+=item.height+GAP;}
 });
 return Buffer.from(await pdf.save());
}
