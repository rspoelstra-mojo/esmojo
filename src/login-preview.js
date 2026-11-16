import logo from './assets/ESMOJO-logo.svg?raw';
import {paintLoginBackground} from './lib/login-background.js';
import {backgroundGeometry,dragBackground} from '../shared/login-background.js';
// Actual auth classes and dimensions, scaled as a whole rather than a different form.
export function createLoginPreview(container,{onChange=()=>{}}={}){
 const frame=document.createElement('div');frame.className='login-preview-frame';frame.tabIndex=0;frame.setAttribute('role','group');frame.setAttribute('aria-label','Inlogvoorbeeld. Sleep de foto of gebruik de pijltjestoetsen om de uitsnede te verplaatsen.');
 const viewport=document.createElement('div');viewport.className='auth-panel login-preview-viewport';viewport.dataset.screen='login';
 const brand=document.createElement('div');brand.className='auth-logo';brand.innerHTML=logo;brand.setAttribute('aria-hidden','true');
 const card=document.createElement('div');card.className='auth-card';
 const form=document.createElement('div');form.className='auth-form';form.setAttribute('aria-hidden','true');
 for(const name of ['E-mailadres','Wachtwoord']){const label=document.createElement('label');label.textContent=name;const input=document.createElement('div');input.className='login-preview-input';label.append(input);form.append(label);}
 const button=document.createElement('div');button.className='primary-button login-preview-submit';button.textContent='Inloggen';form.append(button);card.append(form);viewport.append(brand,card);frame.append(viewport);container.append(frame);
 let value,device='desktop',size={width:1440,height:900},scale=1,drag=null;
 function render(){if(!value)return;size=device==='desktop'?{width:1440,height:900}:{width:390,height:844};const available=Math.min(container.clientWidth||800,device==='mobile'?330:1200);scale=available/size.width;frame.style.width=available+'px';frame.style.height=size.height*scale+'px';viewport.style.width=size.width+'px';viewport.style.height=size.height+'px';viewport.style.transform=`scale(${scale})`;viewport.style.padding=size.width<=700?'88px 20px 32px':`80px ${size.width*.1}px`;viewport.style.justifyContent=device==='mobile'?'center':'flex-start';card.style.padding=device==='mobile'?'32px 24px':'40px 32px';brand.style.top=device==='mobile'?'16px':'24px';paintLoginBackground(viewport,value,size,device);}
 const observer=new ResizeObserver(render);observer.observe(container);
 function change(dx,dy){const crop=value.framing[device],next=dragBackground(crop,backgroundGeometry(value,size,crop),size,dx,dy);value={...value,framing:{...value.framing,[device]:next}};render();onChange(structuredClone(value.framing),false);}
 frame.addEventListener('pointerdown',event=>{if(event.button!==0||!value)return;drag={x:event.clientX,y:event.clientY,id:event.pointerId};frame.setPointerCapture(event.pointerId);frame.classList.add('is-dragging');event.preventDefault();});
 frame.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;change((event.clientX-drag.x)/scale,(event.clientY-drag.y)/scale);drag.x=event.clientX;drag.y=event.clientY;});
 const end=()=>{if(!drag)return;drag=null;frame.classList.remove('is-dragging');onChange(structuredClone(value.framing),true);};
 frame.addEventListener('pointerup',end);frame.addEventListener('pointercancel',end);frame.addEventListener('lostpointercapture',end);
 frame.addEventListener('keydown',event=>{const move={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];if(!move||!value)return;event.preventDefault();change(...move.map(n=>n*(event.shiftKey?5:1)));onChange(structuredClone(value.framing),true);});
 return{update(next,nextDevice=device){value=structuredClone(next);device=nextDevice;render();},dispose(){observer.disconnect();frame.remove();}};
}
