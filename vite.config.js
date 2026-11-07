import {defineConfig,loadEnv} from 'vite';
import {validateSupabaseConfig} from './src/lib/supabase.js';

export function checkPublicEnv(env){
 // Vercel voegt deze gedocumenteerde publieke frameworkvelden zelf toe.
 const platform=['ENV','TARGET_ENV','URL','BRANCH_URL','PROJECT_PRODUCTION_URL','HASH_SALT','GIT_PROVIDER','GIT_REPO_SLUG','GIT_REPO_OWNER','GIT_REPO_ID','GIT_COMMIT_REF','GIT_COMMIT_SHA','GIT_COMMIT_MESSAGE','GIT_COMMIT_AUTHOR_LOGIN','GIT_COMMIT_AUTHOR_NAME','GIT_PULL_REQUEST_ID'];
 const allowed=new Set(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY',...platform.map(name=>'VITE_VERCEL_'+name)]);
 if(Object.keys(env).some(name=>name.startsWith('VITE_')&&!allowed.has(name)))throw Error('Onbekende publieke Vite-variabele. Bewaar backendgeheimen zonder VITE_-prefix.');
 if(env.VITE_SUPABASE_URL||env.VITE_SUPABASE_PUBLISHABLE_KEY)validateSupabaseConfig(env);
}

const enabled=process.env.VERCEL_ENV==='preview'||(process.env.VERCEL_ENV!=='production'&&process.env.ESMOJO_FLUID_PREVIEW==='1');
export default defineConfig(({mode})=>{checkPublicEnv({...loadEnv(mode,process.cwd(),'VITE_'),...process.env});return{envPrefix:['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'],define:{__ESMOJO_FLUID_PREVIEW__:JSON.stringify(enabled)},plugins:[{
  name:'fluid-preview-noindex',transformIndexHtml(){if(enabled)return[{tag:'meta',attrs:{name:'robots',content:'noindex, nofollow, noarchive'},injectTo:'head'}];},
}]};});
