import {defineConfig} from 'vite';
const enabled=process.env.VERCEL_ENV==='preview'||(process.env.VERCEL_ENV!=='production'&&process.env.ESMOJO_FLUID_PREVIEW==='1');
export default defineConfig({define:{__ESMOJO_FLUID_PREVIEW__:JSON.stringify(enabled)},plugins:[{
  name:'fluid-preview-noindex',transformIndexHtml(){if(enabled)return[{tag:'meta',attrs:{name:'robots',content:'noindex, nofollow, noarchive'},injectTo:'head'}];},
}]});
