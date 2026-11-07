import {defineConfig,loadEnv} from 'vite';
import {validateSupabaseConfig} from './src/lib/supabase.js';

export function checkPublicEnv(env){
 const allowed=new Set(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']);
 if(Object.keys(env).some(name=>name.startsWith('VITE_')&&!allowed.has(name)))throw Error('Onbekende publieke Vite-variabele. Bewaar backendgeheimen zonder VITE_-prefix.');
 if(env.VITE_SUPABASE_URL||env.VITE_SUPABASE_PUBLISHABLE_KEY)validateSupabaseConfig(env);
}

const enabled=process.env.VERCEL_ENV==='preview'||(process.env.VERCEL_ENV!=='production'&&process.env.ESMOJO_FLUID_PREVIEW==='1');
export default defineConfig(({mode})=>{checkPublicEnv({...loadEnv(mode,process.cwd(),'VITE_'),...process.env});return{define:{__ESMOJO_FLUID_PREVIEW__:JSON.stringify(enabled)},plugins:[{
  name:'fluid-preview-noindex',transformIndexHtml(){if(enabled)return[{tag:'meta',attrs:{name:'robots',content:'noindex, nofollow, noarchive'},injectTo:'head'}];},
}]};});
