import {emailContext,EMAIL_BRAND,EMAIL_CONFIDENTIAL_FOOTER} from '../email-template.js';
import {reportHref} from '../../shared/report-routes.js';
import {emailAttachments} from '../email-attachments.js';

export function showReportEmail({to,firstName,show,pdf,managerName,senderId='show-report',legacyHeader=false,includePdf=false}){
  emailContext({kind:'show',show}); // Alle gekoppelde metadata vóór verzending valideren.
  const dates=[...new Set(show.dates)].sort().map(date=>new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Amsterdam'}).format(new Date(date+'T12:00:00Z'))).join(' en ');
  const subject=`Showrapportage ${show.name.trim()} - ${dates}`;
  const message={to,senderId,subject,preheader:includePdf?'Bekijk de showrapportage online. De PDF is ook bijgevoegd.':'Bekijk de showrapportage online.',title:legacyHeader?subject:'Showrapportage',context:{kind:'show',show},recipient:{kind:'individual',firstName},paragraphs:[`Hierbij ontvang je de showrapportage van ${show.name.trim()} op ${dates} in de ${show.venue.trim()}.`],senderName:managerName||EMAIL_BRAND,footer:EMAIL_CONFIDENTIAL_FOOTER,actions:[{label:'Showprofiel openen',url:'https://esmojo.nl'+reportHref({concertId:show.key})}],...(includePdf?{requirePdfAttachment:true}:{}),attachments:includePdf&&pdf?[{filename:pdf.filename,content:pdf.content,contentType:'application/pdf'}]:[]};
  emailAttachments(message);return message;
}
export default {
  id:'show-report',label:'Showrapportage',requiresShow:true,concertCatalog:'ontrack',build:showReportEmail,
  async buildTest({recipient,show,managerName}){
    return showReportEmail({to:recipient.email,firstName:recipient.firstName,show,managerName});
  },
};
