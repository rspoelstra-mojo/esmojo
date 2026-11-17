import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {placeholderSimilarArtists,resolveSimilarArtists,similarArtistHref,similarScore,similarScoreText,similarPhoto} from './similar-artists.js';
const id=name=>'a_'+createHash('sha256').update(name.normalize('NFKC').trim().toLocaleLowerCase('nl-NL')).digest('hex');
const catalogue=['Skepta','Don Toliver','Ken Carson','New Wave','Andere Artiest'].map(name=>({id:id(name),name}));
test('Placeholders zijn de vier afgesproken artiesten en onveranderlijk',()=>{
 assert.deepEqual([...placeholderSimilarArtists],['Don Toliver','New Wave','Ken Carson','Skepta']);assert.ok(Object.isFrozen(placeholderSimilarArtists));
});
test('Namen worden exact (hoofdletter- en spatieongevoelig) aan de catalogus gekoppeld; onbekend blijft zonder link',()=>{
 const rows=resolveSimilarArtists(['don  TOLIVER','New Wave','Onbekend Persoon'],catalogue);
 assert.equal(rows[0].id,id('Don Toliver'));assert.equal(rows[0].name,'Don Toliver');assert.equal(rows[0].slug,'dontoliver');
 assert.equal(rows[1].slug,'newwave');assert.deepEqual(rows[2],{name:'Onbekend Persoon',id:null,slug:null});
 assert.deepEqual(resolveSimilarArtists(placeholderSimilarArtists,[]).map(row=>row.id),[null,null,null,null]);
 assert.deepEqual(resolveSimilarArtists(['Skepta'],[{id:'ongeldig',name:'Skepta'}].slice(1)),[{name:'Skepta',id:null,slug:null}]);
 assert.equal(similarArtistHref('dontoliver'),'/artiest/dontoliver');assert.equal(similarArtistHref('a b'),'/artiest/a%20b');
});
test('Risicoscore toont alleen een bestaande score als x/100; anders een streepje',()=>{
 const score={status:'complete',level:'Laag risico',concerts:3,parts:{visitors:5,artist:6,operational:4,incidents:5}};
 assert.equal(similarScore(score),'20');assert.equal(similarScoreText(score),'20/100');
 for(const bad of [null,undefined,{},{parts:null}])assert.equal(similarScoreText(bad),'—/100');
});
test('Foto alleen van de openbare MOJO-bron',()=>{
 assert.match(similarPhoto({photo:'https://www.mojo.nl/media/a/b.jpg'}),/^https:\/\/www\.mojo\.nl\/media\/a\/b\.jpg\?/);
 for(const photo of ['https://evil.example/media/a.jpg','http://www.mojo.nl/media/a.jpg','javascript:alert(1)',null,undefined,5])assert.equal(similarPhoto({photo}),null);assert.equal(similarPhoto(null),null);
});
