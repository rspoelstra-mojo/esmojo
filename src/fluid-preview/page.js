import {loadShowPhoto} from '../show-photo.js';
import {createSubmenuLoading} from '../lib/submenu-loading.js';
import {access} from '../auth.js';
import {createShowPage} from '../show-page.js';
import {enableFluidLayout} from '../layouts/fluid-layout.js';
import {protectPreviewInteractions} from './read-only.js';
export function createFluidPreviewPage(content,{onShow,request=access,loadPhoto=loadShowPhoto}){
  let disposed=false,disposeShow=()=>{},snapshot=null;
  const menu=document.querySelector('#submenu-navigation [aria-current="page"]'),loading=menu?createSubmenuLoading(menu,content):null;
  const disableLayout=enableFluidLayout(content),unprotect=protectPreviewInteractions(content);
  const requestPreview=body=>request('fluid-preview',{method:'POST',body});
  async function load(){
    const finish=loading?.start();
    try{
      snapshot=await requestPreview({operation:'snapshot'});if(disposed){snapshot=null;return;}
      const {show,data}=snapshot;onShow(show);
      const requestAccess=async(action,options)=>{
        if(disposed)throw Error('Testpagina gesloten.');const op=options.body?.operation;
        const map={'show-profile':data.profile,'analysis-finalization':data.profile,'ticket-data':data.tickets,'barrier-layout':data.barrier,'show-risks':data.risks};
        if((op==='read'||action==='show-risks')&&map[action])return structuredClone(map[action]);
        if(action==='show-profile-pdf'&&op==='status')return structuredClone(data.pdf||{state:'not-ready'});
        if(action==='show-profile-pdf'&&op==='download')return requestPreview({operation:'download'});
        if(action==='barrier-layout'&&op==='download')return requestPreview({operation:'attachment',uploadId:options.body.uploadId});
        throw Error('Deze layouttest is alleen-lezen; productiegegevens worden niet gewijzigd.');
      };
      const view={tab:1};const memory={acquire:()=>({view,ready:Promise.resolve({request:requestAccess,version:()=>0}),release(){}})};
      disposeShow=createShowPage(content,show,{memory,request:requestAccess,loadPhoto,readOnly:true});
      const note=document.createElement('p');note.className='fluid-preview-note';note.textContent='Fluid-layouttest · Alleen-lezen';
      const observer=new MutationObserver(()=>{if(content.querySelector('.show-page')&&!content.querySelector('.fluid-preview-note'))content.prepend(note);});observer.observe(content,{childList:true});
      const stop=disposeShow;disposeShow=()=>{observer.disconnect();stop();};
    }catch{if(!disposed){const error=document.createElement('p');error.className='profile-message';error.textContent='De afgeschermde Puscifer-testpagina kon niet worden geladen.';const retry=document.createElement('button');retry.className='secondary-button';retry.textContent='Opnieuw laden';retry.onclick=()=>{content.replaceChildren();void load();};content.replaceChildren(error,retry);}}finally{finish?.();}
  }
  void load();return()=>{disposed=true;disposeShow();loading?.dispose();unprotect();disableLayout();snapshot=null;};
}
