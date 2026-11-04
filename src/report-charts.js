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
  svg.append(text('title','Showverloop'),text('desc',points.map(point=>`${point.date} ${point.time}: Medisch ${point.medical}, Beveiliging ${point.security}`).join('. ')));
  if(!points.length){svg.append(text('text','Geen incidenten binnen de grafiekperiode',{x:width/2,y:height/2,'text-anchor':'middle',class:'report-axis'}));container.replaceChildren(svg);return;}
  const max=Math.max(1,...points.flatMap(point=>[point.medical,point.security])),x=i=>left+(points.length===1?.5:i/(points.length-1))*(width-left-right),y=count=>top+(1-count/max)*(height-top-bottom);
  for(const count of [...new Set([0,Math.ceil(max/2),max])]){svg.append(el('line',{x1:left,x2:width-right,y1:y(count),y2:y(count),class:'report-gridline'}),text('text',count,{x:left-8,y:y(count)+4,'text-anchor':'end',class:'report-axis'}));}
  for(const [field,index]of [['medical',0],['security',2]]){
   svg.append(el('polyline',{points:points.map((point,i)=>`${x(i)},${y(point[field])}`).join(' '),fill:'none','stroke-width':2,class:'report-line-series report-series-'+index}));
   points.forEach((point,i)=>{const dot=el('circle',{cx:x(i),cy:y(point[field]),r:points.length===1?3:5,class:(points.length===1?'report-chart-single':'report-chart-hit')+' report-series-'+index});dot.append(text('title',`${point.date} ${point.time} · ${field==='medical'?'Medisch':'Beveiliging'}: ${point[field]}`));svg.append(dot);});
  }
  const count=width<340?3:4,indices=[...new Set(Array.from({length:count},(_,i)=>Math.round(i*(points.length-1)/(count-1))))];
  for(const i of indices)svg.append(text('text',points[i].time,{x:x(i),y:height-12,'text-anchor':i===0?'start':i===points.length-1?'end':'middle',class:'report-axis'}));
  container.replaceChildren(svg);
 }
 const observer=new ResizeObserver(draw);observer.observe(container);draw();
 return()=>{disposed=true;observer.disconnect();container.replaceChildren();};
}
