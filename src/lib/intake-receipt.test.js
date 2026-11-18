import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeIntakeReceipt} from './intake-receipt.js';
test('Ontvangstregel is leesbaar en bevat geen inhoud',()=>{
 const text=describeIntakeReceipt({filename:'incidents_a_b_16112026.csv',status:'upload-bezig',file:{present:true,bytes:120,complete:true,sha256:'abcdef0123456789'},csv:{valid:true,incidents:3,showDay:true},match:{status:'matched'}});
 assert.match(text,/120 bytes, compleet/);assert.match(text,/CSV geldig, 3 incidenten/);assert.match(text,/Concert gevonden/);
 assert.match(describeIntakeReceipt({filename:'x.csv',status:'a',file:{present:false},match:{status:'not-found'}}),/bestand ontbreekt/);
 assert.match(describeIntakeReceipt({filename:'x.csv',status:'a',file:{present:true,bytes:5,complete:false,sha256:'1'},csv:{valid:false,code:'CSV_HEADERS'},match:{status:'ambiguous'}}),/onvolledig.*CSV ongeldig \(CSV_HEADERS\).*Meerdere/);
});
