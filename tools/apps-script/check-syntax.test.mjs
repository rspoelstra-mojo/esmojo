import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkScriptSyntax,checkSources} from './check-syntax.mjs';

test('Moderne Node-syntaxis die de Apps Script-publicatie kan breken wordt vóór Google-I/O geweigerd',()=>{
 for(const operator of ['||=','&&=','??='])assert.throws(()=>checkScriptSyntax(`function read(){let recent;recent${operator}show;}`,'Artists.gs'),/APPS_SCRIPT_SYNTAX: Artists.gs:1:/);
 assert.throws(()=>checkScriptSyntax('const bad = ; // confidential','Artists.gs'),error=>!error.message.includes('confidential')&&/APPS_SCRIPT_SYNTAX/.test(error.message));
 checkScriptSyntax('function read(){let recent; if(!recent)recent=show;return recent?.date??null;}','Artists.gs');
});
test('Alle huidige Apps Script-bestanden voldoen aan de afgesproken syntaxbasis',async()=>{assert.ok(await checkSources()>40);});
