// Alleen openbare website/logo controleren; geen account-API of mailaanroep.
import assert from 'node:assert/strict';
import {EMAIL_LOGO_URL} from '../../server/email-template.js';
import {decodeRgbaPng} from './export-logo.mjs';
let result=null;
for(let attempt=0;attempt<30;attempt++){
 try{
  const response=await fetch(EMAIL_LOGO_URL,{signal:AbortSignal.timeout(5000),cache:'no-store'});
  if(response.ok&&response.headers.get('content-type')?.startsWith('image/png')){
   const image=decodeRgbaPng(Buffer.from(await response.arrayBuffer()));assert.equal(image.width,320);
   let transparent=false,visible=false;
   for(let at=0;at<image.pixels.length;at+=4){if(image.pixels[at+3]===0)transparent=true;else{visible=true;assert.equal(image.pixels[at],255);assert.equal(image.pixels[at+1],255);assert.equal(image.pixels[at+2],255);}}
   assert.ok(transparent&&visible);result=image;break;
  }
 }catch{/* Een deployment kan nog onderweg zijn. Geen inhoud of credentials loggen. */}
 await new Promise(done=>setTimeout(done,3000));
}
assert.ok(result,'Het witte transparante PNG-logo is nog niet bereikbaar via de productie-HTTPS-URL.');
console.log('Productielogo via HTTPS gecontroleerd: witte pixels, transparante achtergrond, correct PNG-formaat.');
