import {emailContext,EMAIL_BRAND} from '../email-template.js';
import {emailAttachments} from '../email-attachments.js';

export function showReportEmail({to,firstName,show,pdf}){
  emailContext({kind:'show',show}); // Alle gekoppelde metadata vóór verzending valideren.
  const dates=[...new Set(show.dates)].sort().map(date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'))).join(' en ');
  const message={to,subject:'Showrapportage',preheader:'De showrapportage is als PDF bijgevoegd.',title:'Showrapportage',context:{kind:'show',show},recipient:{kind:'individual',firstName},paragraphs:[`Hierbij ontvang je de showrapportage van ${show.name.trim()} op ${dates} in de ${show.venue.trim()}.`],senderName:EMAIL_BRAND,requirePdfAttachment:true,attachments:pdf?[{filename:pdf.filename,content:pdf.content,contentType:'application/pdf'}]:[]};
  emailAttachments(message);return message;
}
export default {
  id:'show-report',label:'Showrapportage',requiresShow:true,concertCatalog:'ontrack',build:showReportEmail,
  async buildTest({recipient,show}){
    // Uitsluitend de expliciete mailtest: geen echte showrapportage of opslag.
    const {PDFDocument,StandardFonts}=await import('pdf-lib');
    const doc=await PDFDocument.create(),page=doc.addPage([595,842]),font=await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('ESMOJO - TESTBIJLAGE',{x:48,y:780,size:20,font});
    page.drawText('Dit is geen echte showrapportage.',{x:48,y:742,size:12,font});
    page.drawText('Alleen bedoeld om de PDF-bijlage van de testmail te controleren.',{x:48,y:718,size:12,font});
    return showReportEmail({to:recipient.email,firstName:recipient.firstName,show,pdf:{filename:'TEST-Showrapportage.pdf',content:await doc.save()}});
  },
};
