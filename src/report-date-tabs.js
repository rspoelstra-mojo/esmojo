import './show-tabs.css';
const formatDate=date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
export function createReportDateTabs(dates,onSelect){
 const element=document.createElement('div');element.className='show-tabs report-date-tabs';element.setAttribute('role','tablist');element.setAttribute('aria-label','Showdatum');
 const indicator=document.createElement('span');indicator.className='show-tab-indicator';indicator.setAttribute('aria-hidden','true');let active=null,frame=0,disposed=false;
 const buttons=dates.map((date,index)=>{
  const button=document.createElement('button');button.type='button';button.className='show-tab';button.id='report-date-'+date;button.textContent=formatDate(date);button.setAttribute('role','tab');button.setAttribute('aria-controls','report-date-panel');button.setAttribute('aria-selected','false');button.tabIndex=-1;
  button.onclick=()=>select(date);button.onkeydown=event=>{let next;if(event.key==='ArrowRight')next=(index+1)%dates.length;else if(event.key==='ArrowLeft')next=(index+dates.length-1)%dates.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=dates.length-1;else return;event.preventDefault();select(dates[next]);buttons[next].focus();};element.append(button);return button;
 });element.append(indicator);
 function position(){if(disposed||!active)return;indicator.style.width=active.offsetWidth+'px';indicator.style.transform=`translate(${active.offsetLeft}px,${active.offsetTop+active.offsetHeight-3}px)`;}
 function select(date){const index=dates.indexOf(date);if(index<0||active===buttons[index])return;active=buttons[index];buttons.forEach(button=>{button.setAttribute('aria-selected',String(button===active));button.tabIndex=button===active?0:-1;});onSelect(date,index,active.id);cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{position();element.classList.add('show-tabs-ready');});}
 const observer=new ResizeObserver(position);observer.observe(element);
 return{element,select,dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();}};
}
