import {PDFString} from 'pdf-lib'
import type {PDFDocument,PDFPage} from 'pdf-lib'
export type ArtistMusicLinks={spotify:string;applemusic:string;youtube:string}
// Verified 2026-10-22: Spotify playlist/oEmbed title, Apple Music artist metadata,
// and the YouTube link on https://puscifer.com. Extend per artist after verification.
const verified:Record<string,ArtistMusicLinks>={
 puscifer:{spotify:'https://open.spotify.com/playlist/37i9dQZF1DZ06evO1nwOPi',applemusic:'https://music.apple.com/nl/artist/puscifer/48261730',youtube:'https://www.youtube.com/@pusciferdotcom'},
}
export function artistMusicLinks(artist:string):ArtistMusicLinks|undefined{
 const name=artist.trim();if(!name)return undefined
 const key=name.toLocaleLowerCase('nl'),known=Object.hasOwn(verified,key)?verified[key]:undefined;if(known)return known
 // A name match alone can identify a different artist. When no destination has
 // been verified, let the reader choose from the service's own search results.
 const query=encodeURIComponent(name)
 return {spotify:`https://open.spotify.com/search/${query}`,applemusic:`https://music.apple.com/nl/search?term=${query}`,youtube:`https://www.youtube.com/results?search_query=${query}`}
}
export function addArtistMusicLinks(pdf:PDFDocument,page:PDFPage,artist:string){
 const links=artistMusicLinks(artist);if(!links)return false
 for(const [index,name] of (['spotify','applemusic','youtube'] as const).entries()){
  const top=40+index*48,annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[503,page.getHeight()-top-32,535,page.getHeight()-top],Border:[0,0,0],H:'N',A:{Type:'Action',S:'URI',URI:PDFString.of(links[name])}})
  page.node.addAnnot(pdf.context.register(annotation))
 }
 return true
}
