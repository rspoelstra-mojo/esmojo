import {readdir} from 'node:fs/promises';

// Alleen vertrouwde modules uit de vaste servermap, nooit een pad uit een verzoek.
export function createEmailTemplateRegistry({directory=new URL('./email-templates/',import.meta.url)}={}){
  async function load(){
      const entries=await readdir(directory,{withFileTypes:true}),templates=[];
      for(const file of entries.filter(file=>file.isFile()&&/^[a-z0-9][a-z0-9-]{0,79}\.js$/.test(file.name)).sort((a,b)=>a.name.localeCompare(b.name))){
        const module=await import(new URL(file.name,directory).href),template=module.default;
        if(!template||template.id!==file.name.slice(0,-3)||typeof template.label!=='string'||!template.label.trim()||template.label.length>120||typeof template.requiresShow!=='boolean'||typeof template.build!=='function'||typeof template.buildTest!=='function')throw Error('INVALID_EMAIL_TEMPLATE');
        templates.push(Object.freeze(template));
      }
      return templates;
  }
  return{
    async list(){return(await load()).map(({id,label,requiresShow})=>({id,label,requiresShow}));},
    async get(id){return(await load()).find(template=>template.id===id)||null;},
  };
}
export const emailTemplates=createEmailTemplateRegistry();
