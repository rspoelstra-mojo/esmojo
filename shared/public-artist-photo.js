// The selected public artist image, with a stable CDN variant for its existing box.
export function publicArtistPhoto(value){
 try{const image=new URL(value);if(image.origin!=='https://www.mojo.nl'||image.username||image.password||image.hash||!/^\/media\/[\w/.-]+\.(?:jpe?g|png|webp)$/i.test(image.pathname))return null;for(const [key,value]of [['width','750'],['height','338'],['quality','80'],['format','webp']])image.searchParams.set(key,value);image.searchParams.sort();return image.href;}catch{return null;}
}
