// Alleen op expliciete klik; URL leeft tijdelijk in geheugen en gebruikersklembord.
export async function copyActivationLink(create,{active=()=>true,clipboard=globalThis.navigator?.clipboard,prompt=globalThis.prompt?.bind(globalThis)}={}){
 if(!clipboard?.writeText&&!prompt)throw Error('Kopiëren is in deze browser niet beschikbaar.');
 const response=await create(),url=response?.activationUrl;
 if(typeof url!=='string'||url.length>4000||!/^https:\/\/esmojo\.nl\/#\/activeren\?token=[^&\s]+&type=(invite|recovery)$/.test(url))throw Error('Activeringslink kon niet worden aangemaakt.');
 if(!active())return false;
 try{if(!clipboard?.writeText)throw Error('CLIPBOARD_UNAVAILABLE');await clipboard.writeText(url);return true;}
 catch{if(!active()||!prompt)throw Error('Activeringslink kon niet worden gekopieerd.');prompt('Kopieer de activeringslink:',url);return false;}
}
