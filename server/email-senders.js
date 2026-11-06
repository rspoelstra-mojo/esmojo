// Vaste serverzijdige afzenders, nooit een vrij adres uit een request.
export const EMAIL_FROM='ESMOJO <no-reply@esmojo.nl>';
export const SHOW_REPORT_EMAIL_FROM='ESMOJO <showrapportage@esmojo.nl>';
export function emailSender(id='default'){
 if(id==='default')return EMAIL_FROM;
 if(id==='show-report')return SHOW_REPORT_EMAIL_FROM;
 throw Error('Ongeldige e-mailafzender.');
}
