import {timelineDomain,timelineHoverMinute,timelineTime} from '../shared/report-timeline.js';
const ns='http://www.w3.org/2000/svg';
const el=(tag,attributes={})=>{const node=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));return node;};
const text=(tag,value,attributes={})=>{const node=el(tag,attributes);node.textContent=value;return node;};
export function donutChart(groups,label){
 const svg=el('svg',{viewBox:'0 0 120 120',role:'img','aria-label':label,class:'report-donut'});
 svg.append(text('title',label+': '+groups.map(row=>`${row.name} ${row.count}`).join(', ')));
 const total=groups.reduce((sum,row)=>sum+row.count,0),circumference=2*Math.PI*44;let offset=0;
 if(!total){svg.append(el('circle',{cx:60,cy:60,r:44,class:'report-donut-empty'}));return svg;}
 for(const [index,row]of groups.entries()){
  const length=row.count/total*circumference,circle=el('circle',{cx:60,cy:60,r:44,fill:'none','stroke-width':18,'stroke-dasharray':`${length} ${circumference-length}`,'stroke-dashoffset':-offset,transform:'rotate(-90 60 60)',class:'report-series-'+index%5});
  circle.append(text('title',`${row.name}: ${row.count}`));svg.append(circle);offset+=length;
 }
 return svg;
}
export function timelineChart(container,timeline){
 let previous=0,disposed=false;
 function draw(){
  if(disposed)return;const width=Math.max(220,Math.round(container.clientWidth||360));if(width===previous)return;previous=width;
  const height=190,left=28,right=12,top=14,bottom=36,points=timeline.points;
  const svg=el('svg',{viewBox:`0 0 ${width} ${height}`,width:'100%',height,role:'img','aria-label':'Showverloop: medische en beveiligingsincidenten per halfuur'});
  svg.append(text('desc',points.map(point=>`${point.date} ${point.time}: Medisch ${point.medical}, Beveiliging ${point.security}`).join('. ')));
  if(!points.length){svg.append(text('text','Geen incidenten binnen de grafiekperiode',{x:width/2,y:height/2,'text-anchor':'middle',class:'report-axis'}));container.replaceChildren(svg);return;}
  const domain=timelineDomain(timeline),span=domain.end-domain.start,xMinute=minute=>left+(span?(minute-domain.start)/span:.5)*(width-left-right),x=i=>xMinute(points[i].minute);
  const max=Math.max(1,...points.flatMap(point=>[point.medical,point.security])),y=count=>top+(1-count/max)*(height-top-bottom);
  for(const count of [...new Set([0,Math.ceil(max/2),max])]){svg.append(el('line',{x1:left,x2:width-right,y1:y(count),y2:y(count),class:'report-gridline'}),text('text',count,{x:left-8,y:y(count)+4,'text-anchor':'end',class:'report-axis'}));}
  for(const [field,index]of [['medical',0],['security',2]]){
   svg.append(el('polyline',{points:points.map((point,i)=>`${x(i)},${y(point[field])}`).join(' '),fill:'none','stroke-width':2,class:'report-line-series report-series-'+index}));
   points.forEach((point,i)=>{const dot=el('circle',{cx:x(i),cy:y(point[field]),r:points.length===1?3:5,class:(points.length===1?'report-chart-single':'report-chart-hit')+' report-series-'+index});svg.append(dot);});
  }
  const count=width<340?3:4,indices=[...new Set(Array.from({length:count},(_,i)=>Math.round(i*(points.length-1)/(count-1))))];
  const ticks=timeline.domain?[...new Set([domain.start,...indices.slice(1,-1).map(i=>points[i].minute),domain.end])]:indices.map(i=>points[i].minute);
  for(const [i,minute]of ticks.entries())svg.append(text('text',timelineTime(minute),{x:xMinute(minute),y:height-12,'text-anchor':i===0?'start':i===ticks.length-1?'end':'middle',class:'report-axis'}));
  const tip=document.createElement('div');tip.className='report-chart-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;
  const hit=el('rect',{x:left,y:top,width:width-left-right,height:height-top-bottom,fill:'transparent',class:'report-chart-hover',tabindex:0,role:'slider','aria-label':'Tijd in showverloop','aria-valuemin':domain.start,'aria-valuemax':domain.end,'aria-valuenow':domain.start,'aria-valuetext':timelineTime(domain.start).replace(':','.')});
  let selected=domain.start;
  const show=(minute,vertical=top+30)=>{selected=minute;tip.textContent=timelineTime(minute).replace(':','.');tip.hidden=false;hit.setAttribute('aria-valuenow',String(minute));hit.setAttribute('aria-valuetext',tip.textContent);const half=tip.offsetWidth/2+2;tip.style.left=Math.max(half,Math.min(width-half,xMinute(minute)))+'px';tip.style.top=Math.max(0,vertical-42)+'px';};
  hit.onpointermove=event=>{const rect=svg.getBoundingClientRect(),local=(event.clientX-rect.left)*width/rect.width;show(timelineHoverMinute(timeline,(local-left)/(width-left-right)),(event.clientY-rect.top)*height/rect.height);};
  hit.onpointerleave=()=>{if(document.activeElement!==hit)tip.hidden=true;};hit.onfocus=()=>show(selected);hit.onblur=()=>{tip.hidden=true;};
  hit.onkeydown=event=>{const values=[...new Set([domain.start,...points.map(point=>point.minute),domain.end])].sort((a,b)=>a-b),index=values.indexOf(selected);let next=null;if(event.key==='ArrowLeft')next=values[Math.max(0,index-1)];if(event.key==='ArrowRight')next=values[Math.min(values.length-1,index+1)];if(event.key==='Home')next=values[0];if(event.key==='End')next=values.at(-1);if(next!==null){event.preventDefault();show(next);}};
  svg.append(hit);container.replaceChildren(svg,tip);

 }
 const observer=new ResizeObserver(draw);observer.observe(container);draw();
 return()=>{disposed=true;observer.disconnect();container.replaceChildren();};
}
