import {backgroundGeometry,defaultLoginBackground,validateFraming} from '../../shared/login-background.js';
let current=defaultLoginBackground(),refreshing;
const listeners=new Set();
export function rememberLoginBackground(value){if(value.revision<current.revision)return;current=structuredClone(value);for(const listener of listeners)listener(current);}
export function paintLoginBackground(panel,value,viewport={width:panel.clientWidth,height:panel.clientHeight},device=viewport.width<=700?'mobile':'desktop'){
 const geometry=backgroundGeometry(value,viewport,value.framing[device]);
 panel.style.setProperty('--login-image',`url("${value.imageUrl}")`);
 panel.style.setProperty('--login-size',`${geometry.width}px ${geometry.height}px`);
 panel.style.setProperty('--login-position',`${geometry.left}px ${geometry.top}px`);
}
export function attachLoginBackground(panel){
 let alive=true;
 const paint=()=>{if(alive)paintLoginBackground(panel,current,{width:window.innerWidth,height:window.innerHeight});};
 paint();listeners.add(paint);window.addEventListener('resize',paint);
 // Public appearance only. Login, restoration and MFA never await this request.
 if(!refreshing)refreshing=fetch('/api/login-background',{signal:AbortSignal.timeout(10000)}).then(response=>{if(!response.ok)throw Error();return response.json();}).then(async value=>{
  if(!Number.isSafeInteger(value.revision)||value.revision<0||!Number.isSafeInteger(value.width)||!Number.isSafeInteger(value.height)||!value.framing||!(/^\/api\/login-background\?image=[a-f0-9]{64}$/.test(value.imageUrl)||value.imageUrl==='/login-background-initial.jpg'))return;
  validateFraming(value.framing);if(value.width<1||value.height<1||value.width>3840||value.height>3840)return;
  const image=new Image();image.src=value.imageUrl;await image.decode();rememberLoginBackground(value);
 }).catch(()=>{/* A missing optional background must never block signing in. */}).finally(()=>{refreshing=null;});
 return()=>{alive=false;listeners.delete(paint);window.removeEventListener('resize',paint);};
}
