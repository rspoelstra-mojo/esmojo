const writers='.analysis-editor-actions button,.analysis-adopt,.assessment-actions button,.assessment-upload-actions button,.production-risk-option,.floor-add,.floor-row-remove,.ticket-footer button';
export function protectPreviewInteractions(root){
  const block=event=>{if(event.type==='submit'||event.target.closest?.(writers)){event.preventDefault();event.stopImmediatePropagation();}};
  root.addEventListener('click',block,true);document.body.addEventListener('submit',block,true);
  function update(){
    for(const scope of [root,...document.querySelectorAll('.analysis-final-overlay')]){
      const hadFocus=scope.contains(document.activeElement);
      for(const input of scope.querySelectorAll('textarea,input')){if(input.type==='radio'||input.type==='file'){if(!input.disabled)input.disabled=true;}else if(!input.readOnly)input.readOnly=true;}
      for(const input of scope.querySelectorAll('select,'+writers)){if(!input.disabled)input.disabled=true;}
      if(scope.matches('.analysis-final-overlay')&&hadFocus){scope.tabIndex=-1;scope.focus({preventScroll:true});}
      const floor=scope.querySelector('[data-production-id="floor_pressure"]');if(floor){if(!floor.disabled)floor.disabled=true;floor.title='Vloerdruk is hier niet te openen: de huidige leesroute kan productiegegevens synchroniseren.';}
    }
  }
  const observer=new MutationObserver(update);observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','readonly']});update();
  return()=>{observer.disconnect();root.removeEventListener('click',block,true);document.body.removeEventListener('submit',block,true);};
}
