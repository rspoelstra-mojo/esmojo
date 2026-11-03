# E-mail

Alle uitgaande e-mails lopen via `sendEmail(message)` uit `server/email.js`.
De module rendert HTML en plain text centraal met `server/email-template.js` en
`server/email/template.html`. De HTML is gebaseerd op de aangeleverde vormgeving;
variabele inhoud is uitsluitend gestructureerde tekst, geen vrije HTML.

Het bestaande mailtype staat in `server/email-templates/account-activation.js`;
`server/account-email.js` blijft de compatibiliteitsexport voor de accountflow. De accounts-handler
gebruikt dit zowel bij aanmaken als opnieuw uitnodigen, met de voornaam van het
ontvangende account. Beide bestaande triggers doen precies één verzendaanroep.
Afzender blijft `ESMOJO <no-reply@esmojo.nl>`; reply-to wordt niet gewijzigd.
Activatielink, Supabase-token/TTL en MFA-vereisten blijven ongewijzigd.

## Nieuwe mailtypen

Maak `server/email-templates/<stabiel-id>.js` met een default-export:
`{id, label, requiresShow, build, buildTest}`. De id is exact de bestandsnaam zonder
.js; beide builders leveren gestructureerde inhoud. `buildTest({recipient, show})`
mag geen echte activatietokens maken of accounts wijzigen. Het register in
`server/email-template-registry.js` ontdekt alle geldige modules automatisch; de
Vercel-include neemt de hele map mee. Na publicatie verschijnt ieder nieuw template
zonder wijziging van de UI of een handmatig bijgehouden lijst.

Maak een kleine builder die subject, preheader, title, context, recipient,
paragraphs, optionele information/actions/closing en senderName invult; geef die
inhoud aan sendEmail. Niet zelf HTML, text of afzenderheaders maken.

Gebruik context `{kind:'show',show}` met het werkelijk gekoppelde canonieke
showobject uit de bestaande showstore: key, name, venue en alle relevante dates.
De renderer valideert en formatteert die gegevens zelf. Bouw nu geen extra
mailflows. De enige bevestigde niet-showcontext is account: Account activeren.
Voor een toekomstige andere niet-showcontext eerst de tekst laten bevestigen.

recipient gebruikt uitsluitend een afzonderlijke betrouwbare firstName. Een
ontbrekende naam of kind shared/group geeft Beste collega,. Geen namen splitsen
of uit e-mailadressen afleiden. Eén ontvanger per persoonlijke verzendaanroep;
voor meerdere personen per persoon renderen en verzenden.

Acties accepteren uitsluitend HTTPS-links naar esmojo.nl. Nieuwe doelorigins
vereisen een bewuste wijziging in de centrale linkvalidatie. Accountlinks worden
extra gecontroleerd op de bestaande activatiefragmentroute en token/type-velden.

## Logo en veilige preview

De oorspronkelijke transparante PNG blijft intact. tools/email/export-logo.mjs
maakt bij npm run build een witte proportionele PNG met transparant masker en
zonder blauw vlak. De verzonden HTML gebruikt uitsluitend de HTTPS-URL
https://esmojo.nl/brand/ESMOJO-logo-wit-email.png.

`npm run preview:email` schrijft uitsluitend fictieve HTML/plain-textvoorbeelden
naar /tmp/esmojo-email-preview; de tool importeert geen verzendmodule.
`node tools/email/check-preview.mjs` controleert met de aanwezige Chrome de
weergave op 320/390/640/1024px. De CI bewaart deze testvoorbeelden en screenshots
zeven dagen als artifact esmojo-email-preview. Er worden geen echte mails gestuurd.
Dit is een browsercontrole, geen claim van een test in echte Outlook/Gmail-clients.

RESEND_API_KEY blijft uitsluitend op de server beschikbaar, nooit onder VITE_.
Aanhef/inhoud/tokens niet loggen. Andere Resend-applicaties vallen buiten dit project.

## Beheerder → Email

`/beheerder/email` gebruikt GET/POST `api/access?action=email`. Alleen een actieve
beheerder met geldige sessie/MFA heeft toegang. GET leest het automatische register;
POST accepteert uitsluitend templateId, requestId en eventueel concertId. Het
ontvangeradres en de voornaam komen serverzijdig uit het eigen Drive-profiel,
nooit uit het verzoek. Showtemplates gebruiken het werkelijk geselecteerde
canonieke concert inclusief alle relevante datums. De read-only preview laat
deze route niet toe.

Alleen de bewuste knop Testmail versturen verzendt via de bestaande Resend-route,
met [TEST] voor het onderwerp. Geen nieuwe accountuitnodiging of extra trigger.
Tijdens verzending is de knop geblokkeerd; een bewuste herpoging hergebruikt de
UUID als Resend Idempotency-Key om dubbele verwerking te voorkomen. Er is geen
automatische herpoging, opslag van mailinhoud of vrije ontvangerkeuze.
Ontwikkeltests mocken de verzendmodule; er wordt niet zelfstandig echt verzonden.
