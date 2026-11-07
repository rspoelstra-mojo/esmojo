import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const appDocuments=['/','/index.html','/shows/:path*','/artiest/:path*','/rapportages/:path*','/statistieken/:path*','/beheerder/:path*','/account/:path*','/activeren/:path*','/test/fluid-layout'];
export const browserHeaders=[{key:'X-Frame-Options',value:'DENY'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}];
export function appCsp(html){
 const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(([,attrs])=>! /\bsrc\s*=/.test(attrs));
 const hashes=inline.map(([, ,source])=>"'sha256-"+createHash('sha256').update(source).digest('base64')+"'");
 return ["default-src 'self'",["script-src 'self'",...hashes].join(' '),"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https://www.mojo.nl","font-src 'self' data:","connect-src 'self' https://*.supabase.co wss://*.supabase.co","object-src 'none'","frame-src 'none'","frame-ancestors 'none'","base-uri 'none'","form-action 'self'","worker-src 'self' blob:","manifest-src 'self'","upgrade-insecure-requests"].join('; ');
}
export function expectedSecurityHeaders(html){return[{source:'/:path*',headers:browserHeaders},...appDocuments.map(source=>({source,headers:[{key:'Content-Security-Policy',value:appCsp(html)}]}))];}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=JSON.parse(readFileSync('vercel.json','utf8')),expected=expectedSecurityHeaders(readFileSync('index.html','utf8'));
 const rest=config.headers.filter(row=>row.source!=='/:path*'&&!appDocuments.includes(row.source)||row.source==='/test/fluid-layout'&&row.headers.some(h=>h.key==='X-Robots-Tag'));
 if(process.argv.includes('--write')){config.headers=[...expected,...rest];writeFileSync('vercel.json',JSON.stringify(config,null,2)+'\n');}
 else for(const row of expected){if(!config.headers.some(item=>JSON.stringify(item)===JSON.stringify(row)))throw Error('Browserheaders/CSP wijken af; voer node tools/security/browser-headers.mjs --write uit.');}
}
