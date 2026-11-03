import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
test('Alleen-lezen vergrendeling is stabiel en veroorzaakt geen mutatielus op reeds geblokkeerde knoppen',()=>{
 let update,sets=0,disconnected=false;const floor={_disabled:true,get disabled(){return this._disabled;},set disabled(value){sets++;this._disabled=value;}};
 const root={addEventListener(){},removeEventListener(){},contains:()=>false,matches:()=>false,querySelectorAll:()=>[],querySelector:()=>floor};
 const ctx=vm.createContext({document:{activeElement:null,body:{addEventListener(){},removeEventListener(){}},querySelectorAll:()=>[]},MutationObserver:class{constructor(callback){update=callback;}observe(){}disconnect(){disconnected=true;}}});vm.runInContext(readFileSync(new URL('../src/fluid-preview/read-only.js',import.meta.url),'utf8').replace('export function','function'),ctx);const dispose=ctx.protectPreviewInteractions(root);update();update();assert.equal(sets,0);floor._disabled=false;update();assert.equal(sets,1);update();assert.equal(sets,1);dispose();assert.equal(disconnected,true);
});
