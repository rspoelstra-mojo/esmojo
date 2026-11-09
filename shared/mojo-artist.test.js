import test from 'node:test';
import assert from 'node:assert/strict';
import {artistBiographyPreview,mojoArtistUrl,mojoArtistPageUrl} from './mojo-artist.js';
test('Zichtbare tekst kapt na 65 woorden af, zonder de oorspronkelijke beschrijving te wijzigen',()=>{
 const source=Array.from({length:70},(_,i)=>'woord'+(i+1)).join(' \n');
 const preview=artistBiographyPreview(source);assert.equal(preview.split(/\s+/).length,65);assert.ok(preview.endsWith('woord65...'));assert.equal(source.split(/\s+/).length,70);
 assert.equal(artistBiographyPreview('  Korte\n beschrijving. '),'Korte beschrijving.');assert.equal(artistBiographyPreview(''), '');
});
test('Foto verwijst uitsluitend naar een canonieke MOJO-artiestpagina',()=>{
 for(const [name,path]of [['BUNT.','bunt'],['The Prodigy','theprodigy'],['U2','u2']])assert.equal(mojoArtistUrl(name),'https://www.mojo.nl/'+path);
 for(const value of ['https://evil.invalid/bunt','https://www.mojo.nl/bunt?redirect=evil','https://evil@www.mojo.nl/bunt','javascript:alert(1)'])assert.equal(mojoArtistPageUrl(value),null);
});
