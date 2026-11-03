import fontkit from '@pdf-lib/fontkit';
import {PDFDocument,PDFName,PDFDict,PDFArray,PDFString,rgb,pushGraphicsState,popGraphicsState,moveTo,lineTo,appendBezierCurve,closePath,clip,endPath} from 'pdf-lib';
import {displayValue,REPORT_TIMEZONE} from './data.js';
import {emailContext} from '../email-template.js';
import {SHOW_REPORT_LAYOUT,ONTRACK_LOGIN} from './contract.js';
import {showReportAssets} from './assets.js';
export {SHOW_REPORT_LAYOUT,ONTRACK_LOGIN} from './contract.js';
export {showReportAssets} from './assets.js';
const W=595.2,H=841.92,M=50,GAP=12,CW=(W-2*M-GAP)/2;
const color=hex=>rgb(...hex.match(/\w\w/g).map(v=>parseInt(v,16)/255));
const BLUE=color('0047BA'),NAVY=color('081830'),TEXT=color('1F2938'),MUTED=color('5C697A'),LIGHT=color('F5F7FA'),BORDER=color('D9E0E8'),RED=color('FFF0F0'),WHITE=rgb(1,1,1);
const rounded=(w,h,r)=>{const k=r*.5522847498;return`M ${r} 0 L ${w-r} 0 C ${w-r+k} 0 ${w} ${r-k} ${w} ${r} L ${w} ${h-r} C ${w} ${h-r+k} ${w-r+k} ${h} ${w-r} ${h} L ${r} ${h} C ${r-k} ${h} 0 ${h-r+k} 0 ${h-r} L 0 ${r} C 0 ${r-k} ${r-k} 0 ${r} 0 Z`;};
export function wrapPdfText(value,width,font,size){
 const lines=[];for(const paragraph of String(value).replace(/\r\n?/g,'\n').split('\n')){let line='';for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
   if(font.widthOfTextAtSize(word,size)>width){if(line){lines.push(line);line='';}for(const character of word){if(line&&font.widthOfTextAtSize(line+character,size)>width){lines.push(line);line='';}line+=character;}continue;}
   const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word;}else line=next;
 }lines.push(line);}return lines;
}
export async function createShowReportPdf(data,{show,version='1.0',status='Definitief afgerond'}={}, {assets:providedAssets,allowMissingIcon=false}={}){
 emailContext({kind:'show',show});if(show.dates.length!==1||!/^\d+\.\d+$/.test(version)||typeof status!=='string'||status.length>100||!Number.isFinite(Date.parse(data.exportGeneratedAt)))throw Error('REPORT_CONTEXT');
 const assets=providedAssets||await showReportAssets();if(!assets.icon&&!allowMissingIcon)throw Error('ONTRACK_ICON_MISSING');
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const body=await doc.embedFont(assets.body,{subset:true}),head=await doc.embedFont(assets.heading,{subset:false}),footerImage=await doc.embedPng(assets.footer),icon=assets.icon?await doc.embedPng(assets.icon):null;
 const geometry={dashboard:[],incidents:[],pages:[],iconLink:null},date=show.dates[0],shortDate=date.split('-').reverse().join('-'),longDate=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:REPORT_TIMEZONE}).format(new Date(date+'T12:00:00Z'));
 const generated=new Intl.DateTimeFormat('nl-NL',{timeZone:REPORT_TIMEZONE,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(data.exportGeneratedAt));
 const headInk=fontkit.create(assets.heading),bodyInk=fontkit.create(assets.body);
 const charsets=new Map([[body,new Set(body.getCharacterSet())],[head,new Set(head.getCharacterSet())]]);
 function line(page,value,x,baseline,size=9,font=body,fill=TEXT){if([...String(value)].some(character=>!charsets.get(font).has(character.codePointAt(0))))throw Error('REPORT_GLYPH');page.drawText(String(value),{x,y:H-baseline,size,font,color:fill});}
 function right(page,value,x,baseline,size=9,font=body,fill=TEXT){line(page,value,x-font.widthOfTextAtSize(String(value),size),baseline,size,font,fill);}
 function lines(page,values,x,top,{size=9,font=body,fill=TEXT,leading=size*1.2}={}){values.forEach((value,i)=>line(page,value,x,top+size+i*leading,size,font,fill));}
 function card(page,x,top,width,height,fill=LIGHT){page.drawSvgPath(rounded(width,height,11.5),{x,y:H-top,color:fill});}
 function rule(page,x,y,width){page.drawLine({start:{x,y:H-y},end:{x:x+width,y:H-y},thickness:.5,color:BORDER});}
 const footerArtist=wrapPdfText(show.name.toUpperCase(),315,head,9),footerMeta=number=>wrapPdfText(`${show.venue} · ${shortDate} · v${version} · ${number}`,345,body,9);
 const notice=['Dit document is strikt vertrouwelijk en mag niet verspreid worden zonder','nadrukkelijke toestemming van MOJO Concerts.'];
 const footerHeight=(footerArtist.length-1)*11+(footerMeta('9999 / 9999').length-1)*10.62+49;
 const bodyEnd=Math.min(746,H-footerHeight-30);
 if(bodyEnd<600)throw Error('REPORT_METADATA_LAYOUT');
 function page(){const p=doc.addPage([W,H]);geometry.pages.push({number:doc.getPageCount(),bodyEnd});return p;}
 function footer(p,index,total){
  p.drawImage(footerImage,{x:0,y:0,width:W,height:91.92});
  const rows=footerArtist.map((value,i)=>({value,baseline:791-(footerArtist.length-1-i)*11,font:head,fill:NAVY})),meta=footerMeta(`${index} / ${total}`);
  meta.forEach((value,i)=>rows.push({value,baseline:807+i*10.62,font:body,fill:MUTED}));notice.forEach((value,i)=>rows.push({value,baseline:819+(meta.length-1+i)*10.62,font:body,fill:MUTED}));
  const bounds=rows.map(row=>{const ink=row.font===head?headInk:bodyInk,boxes=ink.layout(row.value).glyphs.map(g=>g.bbox),scale=9/ink.unitsPerEm;return{top:row.baseline-Math.max(...boxes.map(b=>b.maxY))*scale,bottom:row.baseline-Math.min(...boxes.map(b=>b.minY))*scale};});
  const shift=(756+H-Math.min(...bounds.map(b=>b.top))-Math.max(...bounds.map(b=>b.bottom)))/2;
  rows.forEach(row=>line(p,row.value,50,row.baseline+shift,9,row.font,row.fill));
 }
 const first=page(),artistLines=wrapPdfText(show.name,420,head,25),dateLines=wrapPdfText(`${longDate} - ${show.venue}`,420,body,11);
 const headerHeight=143+(artistLines.length-1)*28+(dateLines.length-1)*13;
 if(headerHeight>190)throw Error('REPORT_HEADER_LAYOUT');
 first.drawRectangle({x:0,y:H-headerHeight,width:W,height:headerHeight,color:BLUE});lines(first,artistLines,M,24,{size:25,font:head,fill:WHITE,leading:28});const dateTop=62+(artistLines.length-1)*28;
 lines(first,dateLines,M,dateTop,{size:11,fill:WHITE,leading:13});const metaTop=dateTop+dateLines.length*13+12;
 line(first,`Documentversie ${version} · ${!icon?'PROEF — ON-icoon ontbreekt':status}`,M,metaTop+9,9,body,WHITE);line(first,`Op basis van geexporteerde gegevens van ${generated}`,M,metaTop+24,8.5,body,WHITE);
 if(icon){const tile={x:W-M-48,top:29,w:48,h:48},x=tile.x,y=H-tile.top-48,r=10.2,k=r*.5522847498;
  // Alleen de presentatie uitsnijden: het originele PNG-bestand blijft intact.
  // De grijze tegel in de aangeleverde 1254px-PNG ligt binnen (60,75,1130,1130).
  first.pushOperators(pushGraphicsState(),moveTo(x+r,y),lineTo(x+48-r,y),appendBezierCurve(x+48-r+k,y,x+48,y+r-k,x+48,y+r),lineTo(x+48,y+48-r),appendBezierCurve(x+48,y+48-r+k,x+48-r+k,y+48,x+48-r,y+48),lineTo(x+r,y+48),appendBezierCurve(x+r-k,y+48,x,y+48-r+k,x,y+48-r),lineTo(x,y+r),appendBezierCurve(x,y+r-k,x+r-k,y,x+r,y),closePath(),clip(),endPath());
  const scale=48/1130;first.drawImage(icon,{x:x-60*scale,y:y-49*scale,width:1254*scale,height:1254*scale});first.pushOperators(popGraphicsState());const annotation=doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[tile.x,H-tile.top-48,tile.x+48,H-tile.top],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(ONTRACK_LOGIN)}});first.node.addAnnot(doc.context.register(annotation));geometry.iconLink=tile;
 }
 const dashboardTop=headerHeight+66,rowHeights=[154,140,190],bottom=dashboardTop+rowHeights.reduce((a,b)=>a+b,0)+2*GAP;
 if(bottom>bodyEnd)throw Error('REPORT_DASHBOARD_LAYOUT');
 const titleRows=[{text:'Showrapportage',baseline:22,size:22,font:head,ink:headInk,fill:NAVY},{text:'Medische en beveiligingsincidenten',baseline:40,size:10,font:body,ink:bodyInk,fill:MUTED}];
 const titleBounds=titleRows.map(row=>{const boxes=row.ink.layout(row.text).glyphs.map(g=>g.bbox),scale=row.size/row.ink.unitsPerEm;return{top:row.baseline-Math.max(...boxes.map(b=>b.maxY))*scale,bottom:row.baseline-Math.min(...boxes.map(b=>b.minY))*scale};}),titleTop=Math.min(...titleBounds.map(b=>b.top)),titleBottom=Math.max(...titleBounds.map(b=>b.bottom)),titleShift=(headerHeight+dashboardTop-titleTop-titleBottom)/2;
 titleRows.forEach(row=>line(first,row.text,M,titleShift+row.baseline,row.size,row.font,row.fill));geometry.titleGroup={top:titleTop+titleShift,bottom:titleBottom+titleShift,headerBottom:headerHeight,cardsTop:dashboardTop};
 function panel(column,row,title){const x=M+column*(CW+GAP),top=dashboardTop+rowHeights.slice(0,row).reduce((a,b)=>a+b,0)+row*GAP,h=rowHeights[row];card(first,x,top,CW,h);line(first,title,x+15,top+25,12,head,NAVY);geometry.dashboard.push({title,x,top,width:CW,height:h});return{x,top,w:CW,h};}
 function kpi(column,title,total,values){const p=panel(column,0,title);right(first,total,p.x+p.w-16,p.top+44,32,head,BLUE);rule(first,p.x+15,p.top+58,p.w-30);const blockHeight=values.length*14,start=p.top+58+(p.h-58-blockHeight)/2;values.forEach(([label,value],i)=>{line(first,label,p.x+15,start+10+i*14,8.5);right(first,value,p.x+p.w-16,start+10+i*14,9,body,NAVY);});}
 const med=data.kpis.medical,sec=data.kpis.security;
 kpi(0,'Medisch',med.total,[['Medische meldingen totaal',med.total],['Behandelingen',med.treatments],['Zelfzorg',med.selfcare],['Onwelwordingen',med.unwell],['Ambulancetransporten',med.ambulance]]);
 kpi(1,'Beveiliging',sec.total,[['Beveiligingsmeldingen totaal',sec.total],['Verbale agressie',sec.verbal],['Fysieke agressie',sec.physical],['Uitzettingen',sec.evictions],['Aanhoudingen',sec.arrests]]);
 function pie(column,title,groups){const p=panel(column,1,title);line(first,'Alleen types met meer dan 1 melding',p.x+15,p.top+40,7,body,MUTED);
  if(!groups.length){first.drawCircle({x:p.x+48,y:H-p.top-87,size:25,borderColor:BORDER,borderWidth:1});lines(first,wrapPdfText('Geen incidenttypes met meerdere meldingen',p.w-94,body,8.5),p.x+84,p.top+66,{size:8.5,fill:MUTED});return;}
  const palette=[BLUE,NAVY,color('5C697A'),color('92ACD6'),color('B9C8DD'),color('42689B'),color('D9E0E8')],sum=groups.reduce((sum,g)=>sum+g.count,0),cx=p.x+48,cy=p.top+88,r=31;let angle=-Math.PI/2;
  for(let i=0;i<groups.length;i++){const next=angle+groups[i].count/sum*2*Math.PI,x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),x2=cx+r*Math.cos(next),y2=cy+r*Math.sin(next);
   if(groups.length===1)first.drawCircle({x:cx,y:H-cy,size:r,color:palette[i%palette.length]});else first.drawSvgPath(`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${next-angle>Math.PI?1:0} 1 ${x2} ${y2} Z`,{x:0,y:H,color:palette[i%palette.length]});angle=next;}
  first.drawCircle({x:cx,y:H-cy,size:17,color:LIGHT});
  let size=8.2,wrapped,height;do{wrapped=groups.map(g=>wrapPdfText(g.name,p.w-112,body,size));height=wrapped.reduce((sum,v)=>sum+v.length*(size*1.17)+4,0);if(height<=p.h-54)break;size-=.2;}while(size>=6.4);
  if(height>p.h-54)throw Error('REPORT_TYPE_LEGEND_LAYOUT');let y=p.top+48+(p.h-54-height)/2;
  groups.forEach((group,i)=>{first.drawRectangle({x:p.x+88,y:H-y-6,width:5,height:5,color:palette[i%palette.length]});lines(first,wrapped[i],p.x+99,y,{size,leading:size*1.17});right(first,group.count,p.x+p.w-12,y+size,size,body,NAVY);y+=wrapped[i].length*size*1.17+4;});
 }
 pie(0,'Medisch · incidenttypes',data.types.medical);pie(1,'Beveiliging · incidenttypes',data.types.security);
 const timeline=panel(0,2,'Showverloop'),points=data.timeline.points;
 if(!points.length)lines(first,wrapPdfText('Geen incidenten binnen de grafiekperiode',timeline.w-30,body,9),timeline.x+15,timeline.top+65,{size:9,fill:MUTED});
 else{const left=timeline.x+29,top=timeline.top+49,width=timeline.w-44,height=91,max=Math.max(1,...points.map(p=>Math.max(p.medical,p.security))),ticks=[...new Set([0,Math.ceil(max/2),max])];
  for(const tick of ticks){const y=top+height-tick/max*height;rule(first,left,y,width);right(first,tick,left-6,y+2,7,body,MUTED);}
  for(const [field,fill]of [['medical',BLUE],['security',MUTED]])for(let i=0;i<points.length;i++){const x=left+(points.length===1?width/2:i/(points.length-1)*width),y=H-top-height+points[i][field]/max*height;if(i){const prior=points[i-1];first.drawLine({start:{x:left+(i-1)/(points.length-1)*width,y:H-top-height+prior[field]/max*height},end:{x,y},thickness:1.3,color:fill});}else if(points.length===1)first.drawCircle({x,y,size:1.5,color:fill});}
  const indexes=[...new Set([0,Math.round((points.length-1)/3),Math.round((points.length-1)*2/3),points.length-1])];for(const index of indexes){const text=points[index].time,x=left+(points.length===1?width/2:index/(points.length-1)*width);line(first,text,x-body.widthOfTextAtSize(text,7)/2,top+height+13,7,body,MUTED);}
 }
 line(first,'Aantal incidenten per half uur',timeline.x+15,timeline.top+165,7,body,MUTED);
 for(const [i,label,fill]of [[0,'Medisch',BLUE],[1,'Beveiliging',MUTED]]){const x=timeline.x+15+i*78;first.drawLine({start:{x,y:H-timeline.top-178},end:{x:x+12,y:H-timeline.top-178},thickness:1.5,color:fill});line(first,label,x+16,timeline.top+180,6.5,body,MUTED);}
 const locations=panel(1,2,'Locaties incidenten');let ly=locations.top+41;
 for(const group of data.locations){const wrapped=wrapPdfText(group.name,locations.w-60,body,8.8),height=Math.max(18,wrapped.length*10.5+4);if(ly+height>locations.top+locations.h-9)throw Error('REPORT_LOCATION_LAYOUT');lines(first,wrapped,locations.x+15,ly,{size:8.8,leading:10.5});right(first,group.count,locations.x+locations.w-15,ly+9,10,head,BLUE);ly+=height;}
 const columns=[80,74,153,45,83],labels=['Locatie & tijd','Incident type','Omschrijving','Priority','Notitie'],padding=12,vPadding=8,columnGap=9,size=8.3,leading=10.4;
 let current,y,bodyStart;function incidentPage(){current=page();line(current,'Incidentenoverzicht',M,68,21,head,NAVY);const subtitle=`${show.name} · ${show.venue} · ${longDate} · ${data.incidents.length} ${data.incidents.length===1?'incident':'incidenten'}`,wrapped=wrapPdfText(subtitle,W-2*M,body,9);lines(current,wrapped,M,79,{size:9,fill:MUTED,leading:11});y=79+wrapped.length*11+19;bodyStart=y;if(bodyStart>bodyEnd-100)throw Error('REPORT_METADATA_LAYOUT');}
 incidentPage();
 for(const row of data.incidents){let cells=[displayValue(row.zone)+'\n'+row.time,displayValue(row.type),displayValue(row.description),displayValue(row.priority),displayValue(row.note)].map((value,i)=>wrapPdfText(value,columns[i],body,size)),fragment=0;
  while(cells.some(lines=>lines.length)){
   const headHeight=9,offset=vPadding+headHeight+5,needed=offset+Math.max(...cells.map(lines=>lines.length))*leading+vPadding,full=bodyEnd-bodyStart;
   if(y+needed>bodyEnd&&needed<=full)incidentPage();
   let capacity=Math.floor((bodyEnd-y-offset-vPadding)/leading);if(capacity<1){incidentPage();capacity=Math.floor((bodyEnd-y-offset-vPadding)/leading);}if(capacity<1)throw Error('REPORT_INCIDENT_LAYOUT');
   const chunk=cells.map(lines=>lines.slice(0,capacity)),height=offset+Math.max(...chunk.map(lines=>lines.length))*leading+vPadding;
   card(current,M,y,W-2*M,height,row.highlight?RED:LIGHT);let x=M+padding;
   for(let i=0;i<columns.length;i++){line(current,labels[i],x,y+vPadding+7.3,7.3,head,NAVY);lines(current,chunk[i],x,y+offset,{size,leading});x+=columns[i]+columnGap;}
   geometry.incidents.push({id:row.id,position:row.position,fragment,page:doc.getPageCount(),top:y,height,highlight:row.highlight});y+=height+7;cells=cells.map(lines=>lines.slice(capacity));fragment++;
  }
 }
 const total=doc.getPageCount();doc.getPages().forEach((p,i)=>footer(p,i+1,total));
 doc.setTitle(`Showrapportage ${show.name}`);doc.setAuthor('Event Safety Mobility Operations');doc.setSubject(`Medische en beveiligingsincidenten · ${REPORT_TIMEZONE} · ${data.exportGeneratedAt}`);doc.setKeywords(['ESMOJO',SHOW_REPORT_LAYOUT,REPORT_TIMEZONE]);doc.setCreationDate(new Date(data.exportGeneratedAt));doc.setModificationDate(new Date(data.exportGeneratedAt));
 await doc.flush();const type0=doc.context.lookup(head.ref,PDFDict),descendant=type0.lookup(PDFName.of('DescendantFonts'),PDFArray).lookup(0,PDFDict),descriptor=descendant.lookup(PDFName.of('FontDescriptor'),PDFDict),fontRef=descriptor.get(PDFName.of('FontFile2'))??descriptor.get(PDFName.of('FontFile3')),stream=doc.context.lookup(fontRef);descriptor.delete(PDFName.of('FontFile2'));descriptor.set(PDFName.of('FontFile3'),fontRef);descendant.set(PDFName.of('Subtype'),PDFName.of('CIDFontType0'));descendant.delete(PDFName.of('CIDToGIDMap'));stream.dict.set(PDFName.of('Subtype'),PDFName.of('OpenType'));
 return{bytes:Buffer.from(await doc.save()),pageCount:total,geometry};
}
