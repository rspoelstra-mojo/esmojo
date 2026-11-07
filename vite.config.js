import {defineConfig,loadEnv} from 'vite';
import {validateSupabaseConfig} from './src/lib/supabase.js';

export function checkPublicEnv(env){
  if(env.VITE_SUPABASE_URL||env.VITE_SUPABASE_PUBLISHABLE_KEY)validateSupabaseConfig(env);
  // Exporteer uitsluitend deze openbare waarden. Geen automatische export van
  // andere VITE_-velden of door integraties toegevoegde systeemvariabelen.
  return Object.fromEntries(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']
    .map(name=>['import.meta.env.'+name,JSON.stringify(env[name]||'')]));
}
const enabled=process.env.VERCEL_ENV==='preview'||(process.env.VERCEL_ENV!=='production'&&process.env.ESMOJO_FLUID_PREVIEW==='1');
export default defineConfig(({mode})=>({
  envPrefix:[],
  define:{...checkPublicEnv({...loadEnv(mode,process.cwd(),'VITE_'),...process.env}),__ESMOJO_FLUID_PREVIEW__:JSON.stringify(enabled)},
  plugins:[{
    name:'fluid-preview-noindex',
    transformIndexHtml(){if(enabled)return[{tag:'meta',attrs:{name:'robots',content:'noindex, nofollow, noarchive'},injectTo:'head'}];},
  }],
}));
