import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRichText,stringifyRichText,richTextToPlain} from './rich-text.js';
test('Opmaak: vet, onderstreept, opsomming en nummering worden herkend',()=>{
 const blocks=parseRichText('Intro met **vet** en ++onderstreept++\n- eerste\n• tweede\n1. een\n2) twee');
 assert.deepEqual(blocks.map(block=>[block.type,block.items.length]),[['p',1],['ul',2],['ol',2]]);
 assert.deepEqual(blocks[0].items[0],[{text:'Intro met ',bold:false,underline:false},{text:'vet',bold:true,underline:false},{text:' en ',bold:false,underline:false},{text:'onderstreept',bold:false,underline:true}]);
});
test('Opmaaktekst en gewone tekst: rondreis zonder verlies, ook met speciale tekens',()=>{
 for(const text of ['Gewone tekst','**Vet** en ++onderstreept++ en **beide**','- a\n- b\n\n1. een\n2. twee','Sterretje \\* en plus \\+\\+ en backslash \\\\','\\- geen opsomming\n\\1. geen nummering','Regel\n\nNa witregel']){
  assert.equal(stringifyRichText(parseRichText(text)),text);
 }
});
test('Vet en onderstreept door elkaar geeft na opslaan dezelfde opmaak',()=>{const original=parseRichText('**++beide++** en ++**ook**++');assert.deepEqual(parseRichText(stringifyRichText(original)),original);});
test('Een gewone regel die op een opsomming lijkt, blijft een gewone regel na opslaan',()=>{
 const blocks=[{type:'p',items:[[{text:'- geen opsomming',bold:false,underline:false}]]}];
 assert.equal(stringifyRichText(blocks),'\\- geen opsomming');assert.deepEqual(parseRichText('\\- geen opsomming'),[{type:'p',items:[[{text:'- geen opsomming',bold:false,underline:false}]]}]);
});
test('Nummering wordt opnieuw doorgenummerd en gewone tekst zonder opmaak blijft ongewijzigd leesbaar',()=>{
 assert.equal(stringifyRichText(parseRichText('1. a\n5. b')),'1. a\n2. b');
 assert.equal(richTextToPlain('**Vet** tekst\n- punt'),'Vet tekst\npunt');assert.equal(richTextToPlain(''),'');assert.deepEqual(parseRichText(''),[{type:'p',items:[[]]}]);
});
