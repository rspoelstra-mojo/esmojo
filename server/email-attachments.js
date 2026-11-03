// Alleen servergeheugen → Resend; geen Drive-paden/URL’s als vrije bijlagebron.
export function emailAttachments(message){
  if(message.requirePdfAttachment!==undefined&&message.requirePdfAttachment!==true)throw Error('Ongeldige bijlagevoorwaarde.');
  const attachments=message.attachments===undefined?[]:message.attachments;
  if(!Array.isArray(attachments)||(message.requirePdfAttachment&&attachments.length!==1))throw Error('De rapportage-PDF is verplicht.');
  let total=0;
  return attachments.map(file=>{
    if(!file||Object.keys(file).some(key=>!['filename','content','contentType'].includes(key))||typeof file.filename!=='string'||file.filename.length>180||!file.filename.trim()||!file.filename.toLowerCase().endsWith('.pdf')||/[\x00-\x1f\x7f/\\]/.test(file.filename)||file.contentType!=='application/pdf'||!(file.content instanceof Uint8Array))throw Error('Ongeldige PDF-bijlage.');
    const bytes=Buffer.from(file.content);total+=bytes.length;
    if(total>10*1024*1024||bytes.subarray(0,5).toString('ascii')!=='%PDF-'||!bytes.subarray(-1024).includes(Buffer.from('%%EOF')))throw Error('Ongeldige PDF-bijlage of bestand te groot (maximaal 10 MB).');
    return {filename:file.filename,bytes};
  });
}
