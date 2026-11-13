// Only the already-public MOJO image, with one stable responsive CDN variant.
export function publicShowPhoto(photo){
 try{
  const image=new URL(photo.imageUrl),source=new URL(photo.sourceUrl);
  if(image.origin!=='https://www.mojo.nl'||image.username||image.password||image.hash||!/^\/media\/[\w/.-]+\.(?:jpe?g|png|webp)$/i.test(image.pathname)||source.origin!=='https://www.mojo.nl'||source.username||source.password||source.hash)return null;
  for(const [name,value]of [['width','600'],['height','338'],['quality','80'],['format','webp']])image.searchParams.set(name,value);image.searchParams.sort();
  return{imageUrl:image.href,sourceUrl:source.href};
 }catch{return null;}
}
