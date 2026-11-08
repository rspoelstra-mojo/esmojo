import {parse} from 'acorn';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';

export const scriptSource = fileURLToPath(new URL('../../google-apps-script/',import.meta.url));
// Node supports newer grammar than Apps Script. This conservative deployment
// baseline intentionally rejects logical assignments (||=, &&=, ??=) and newer
// grammar. Runtime Google-service behaviour is covered by separate tests.
export function checkScriptSyntax(source,filename){
 try{parse(source,{ecmaVersion:2020,sourceType:'script'});}
 catch(error){
  const safeFile=/^[A-Za-z0-9_-]+\.gs$/.test(filename)?filename:'script.gs';
  const line=Number.isInteger(error.loc?.line)?error.loc.line:0;
  const column=Number.isInteger(error.loc?.column)?error.loc.column+1:0;
  throw Error(`APPS_SCRIPT_SYNTAX: ${safeFile}:${line}:${column}; gebruik Apps Script-compatibele syntaxis (ES2020).`);
 }
}
export async function checkSources(directory=scriptSource){
 let count=0;
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(entry.isSymbolicLink()||entry.isDirectory())throw Error('APPS_SCRIPT_SOURCE: alleen reguliere bronbestanden toegestaan.');
  if(entry.isFile()&&entry.name.endsWith('.gs')){checkScriptSyntax(await readFile(join(directory,entry.name),'utf8'),entry.name);count++;}
 }
 if(!count)throw Error('APPS_SCRIPT_SOURCE: geen scriptbron gevonden.');
 return count;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 checkSources().then(count=>console.log(`Apps Script-syntaxis gecontroleerd: ${count} bestanden (ES2020).`)).catch(error=>{console.error(error.message);process.exitCode=1;});
}
