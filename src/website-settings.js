import {access} from './auth.js';
import {backgroundSaves} from './lib/background-saves.js';
import {createLoginPreview} from './login-preview.js';
import {rememberLoginBackground} from './lib/login-background.js';
import {defaultFraming,defaultLoginBackground,defaultBackgroundBlur} from '../shared/login-background.js';
import './website-settings.css';
const el=(tag,className='',text='')=>Object.assign(document.createElement(tag),{className,textContent:text});
export function createWebsiteSettingsView(content,{request=access}={}){
 const session=backgroundSaves.session,state=backgroundSaves.form('website-login-background',()=>({value:null,photo:null,photoUrl:null,edit:0,saved:0,pending:null,error:null}));
 let disposed=false,device='desktop',timer,loading=false,readingPhoto=false;
 const view=el('section','website-settings'),title=el('h1','','Instellingen'),card=el('section','website-settings-card');
 const heading=el('h2','','Achtergrondfoto'),intro=el('p','','Upload een foto en sleep hem in het inlogvoorbeeld. Je kunt de uitsnede apart voor desktop en mobiel aanpassen. Wijzigingen worden automatisch opgeslagen.');
 const uploadRow=el('div','website-settings-controls'),upload=el('label','secondary-button website-settings-upload','Foto uploaden'),file=el('input','visually-hidden');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Nieuwe achtergrondfoto uploaden');upload.append(file);
 const note=el('p','','JPG, PNG of WebP · maximaal 3 MB. Het origineel blijft bewaard; het opgeslagen bestand wordt niet kunstmatig vergroot.');uploadRow.append(upload);
 const controls=el('div','website-settings-controls'),deviceLabel=el('label','','Voorbeeld'),deviceSelect=el('select');for(const [value,text]of [['desktop','Desktop'],['mobile','Mobiel']]){const option=el('option','',text);option.value=value;deviceSelect.append(option);}deviceLabel.append(deviceSelect);
 const zoomLabel=el('label','','Zoom'),zoom=el('input'),zoomValue=el('output');zoom.type='range';zoom.min='1';zoom.max='3';zoom.step='.01';zoom.setAttribute('aria-label','Zoom achtergrondfoto');zoomLabel.append(zoom,zoomValue);const reset=el('button','secondary-button','Uitsnede herstellen');reset.type='button';controls.append(deviceLabel,zoomLabel,reset);
 const blurLabel=el('label','','Vervaging'),blur=el('input'),blurValue=el('output');blur.type='range';blur.min='0';blur.max='12';blur.step='.5';blur.setAttribute('aria-label','Vervaging achtergrondfoto');blurLabel.append(blur,blurValue);controls.append(blurLabel);
 const previewContainer=el('div','login-preview-container'),status=el('p','website-settings-status'),error=el('p','website-settings-error'),actions=el('div','website-settings-controls'),retry=el('button','secondary-button','Opnieuw opslaan'),reload=el('button','secondary-button','Actuele achtergrond laden'),setup=el('a','secondary-button','Inlogachtergrond inrichten');setup.href='/beheerder/datatransitie';retry.type=reload.type='button';status.setAttribute('role','status');status.setAttribute('aria-live','polite');error.setAttribute('role','alert');actions.append(retry,reload,setup);
 card.append(heading,intro,uploadRow,note,controls,previewContainer,status,error,actions);view.append(title,card);content.replaceChildren(view);
 const active=()=>session===backgroundSaves.session;
 function render(){if(disposed)return;const value=state.value||defaultLoginBackground();preview.update(value,device);zoom.value=value.framing[device].zoom;zoomValue.textContent=Math.round(Number(zoom.value)*100)+'%';blur.value=value.blur??defaultBackgroundBlur;blurValue.textContent=Number(blur.value)===0?'Uit':blur.value+' px';const disabled=loading||readingPhoto||!state.value||value.setupRequired;file.disabled=zoom.disabled=blur.disabled=reset.disabled=disabled;deviceSelect.disabled=readingPhoto;setup.hidden=!value.setupRequired;retry.hidden=!state.error||value.setupRequired;reload.hidden=!state.error;error.textContent=state.error||'';status.textContent=loading?'Instellingen laden…':readingPhoto?'Foto voorbereiden…':value.setupRequired?'Richt de inlogachtergrond eerst in via Datatransitie.':state.pending||state.edit>state.saved?'Wijzigingen worden opgeslagen…':state.value?.configured?'Opgeslagen in Dataverse.':'De standaardachtergrond is actief.';}
 function edited(){if(!active())return;state.edit++;state.error=null;clearTimeout(timer);render();}
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>{void save();},700);}
 const preview=createLoginPreview(previewContainer,{onChange(framing,finished){if(!state.value||state.value.setupRequired||loading||readingPhoto)return;state.value.framing=framing;edited();if(finished)schedule();}});
 async function save(){
  clearTimeout(timer);if(!active()||!state.value||state.value.setupRequired||state.edit<=state.saved)return;if(state.pending)return state.pending;
  state.pending=(async()=>{
   while(active()&&state.edit>state.saved){
    const version=state.edit,photo=state.photo,snapshot=structuredClone(state.value);
    try{
     const result=await request('website-settings',{method:'POST',body:{operation:'save',revision:snapshot.revision,framing:snapshot.framing,blur:snapshot.blur??defaultBackgroundBlur,...photo?{photo}:{}}});if(!active())return;
     rememberLoginBackground(result);state.saved=version;state.error=null;
     if(state.photo===photo){state.photo=null;if(state.photoUrl){URL.revokeObjectURL(state.photoUrl);state.photoUrl=null;}state.value={...result,framing:state.value.framing,blur:state.value.blur??defaultBackgroundBlur};}else state.value.revision=result.revision;
    }catch(failure){if(active())state.error=failure.message||'Opslaan is niet bevestigd. Probeer opnieuw.';break;}
   }
  })().finally(()=>{state.pending=null;render();});render();return state.pending;
 }
 async function load(){if(loading)return;loading=true;render();try{await state.pending;const value=await request('website-settings');if(!active())return;if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);state.photoUrl=null;state.photo=null;state.value=value;state.saved=state.edit;state.error=null;backgroundSaves.resolve('website-settings||default');}catch(failure){if(active())state.error=failure.message||'Instellingen konden niet worden geladen.';}finally{loading=false;render();}}
 file.addEventListener('change',async()=>{const selected=file.files[0];file.value='';if(!selected||readingPhoto||!state.value)return;if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>3*1024*1024){state.error='Kies een JPG-, PNG- of WebP-foto van maximaal 3 MB.';render();return;}readingPhoto=true;render();let url;
  try{url=URL.createObjectURL(selected);const image=new Image();image.src=url;await image.decode();if(!active()||disposed){URL.revokeObjectURL(url);return;}if(image.naturalWidth*image.naturalHeight>40000000)throw Error();const photo=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(selected);});if(!active()||disposed){URL.revokeObjectURL(url);return;}if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);state.photoUrl=url;state.photo=photo;state.value={...state.value,imageUrl:url,width:image.naturalWidth,height:image.naturalHeight,framing:structuredClone(defaultFraming)};edited();schedule();}
  catch{if(url)URL.revokeObjectURL(url);state.error='Deze foto kon niet worden geopend. Kies een andere afbeelding.';}finally{readingPhoto=false;render();}
 });
 deviceSelect.onchange=()=>{device=deviceSelect.value;render();};zoom.oninput=()=>{state.value.framing[device].zoom=Number(zoom.value);edited();};zoom.onchange=schedule;blur.oninput=()=>{state.value.blur=Number(blur.value);edited();};blur.onchange=schedule;reset.onclick=()=>{state.value.framing[device]=structuredClone(defaultFraming[device]);edited();schedule();};retry.onclick=()=>{state.error=null;void save();};reload.onclick=()=>{void load();};
 const unwatch=backgroundSaves.watch(()=>readingPhoto||Boolean(state.pending)||state.edit>state.saved&&!state.error);
 render();if(state.value&&state.edit>state.saved){render();}else void load();
 return()=>{clearTimeout(timer);void save();disposed=true;unwatch();preview.dispose();};
}
