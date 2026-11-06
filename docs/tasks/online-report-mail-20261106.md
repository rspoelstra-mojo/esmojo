# Rapportagemail na online publicatie

Eigenaar Codex, branch task/online-report-mail-20261106. Mail wordt onafhankelijk
van PDF-generatie zodra de webrapportage geldig beschikbaar is. Bestaande beveiligde
Drive/Vercel/Resend-route, ontvangers, managerondertekening en idempotentie behouden.
Bestaande verzonden/onzekere leveringen niet dubbel of met andere inhoud versturen.
Nieuwe PDF-foutmeldingen via de bestaande subtiele melding na inloggen, uitsluitend
beveiligd voor toegestane Rapportages-gebruikers. Geen vertrouwelijke browseropslag.

De gebruiker autoriseert expliciet de nog ontbrekende Don Toliver-rapportagemail
alsnog te versturen na implementatie en verificatie. Geen overige historische
ongekoppelde archieven spontaan terugmailen; toekomstige publicaties automatisch.
Onderzoek/implementatie in server, Apps Script, bestaande workers, loginfeedback,
tests en documentatie. Gebruik synthetische tests; alleen de expliciet gevraagde
inhaalmail en de bestaande automatische productiestroom mogen echt verzenden.

Implementatie V1.57: eigen private online-afleveringen op basis van huidige
webvalidatie/bronhash; publicatiehook en beide bestaande workers starten die
onafhankelijk van PDF. Veilige legacy-adoptie, callbacks/leases/idempotentie,
begrensde herpogingen en geen historische archiefspam. Oude v3 kan zonder PDF;
v1/v2 behouden bestaande bytes. Na omschakeling geen dubbele PDF-mailqueue.
Adminstatus/manual send volgen dezelfde online levering. Loginread toont PDF-
fout via bestaande centrale melding, alleen na sessie/MFA/module/ontvangercontrole.

Lokale suite, build en diff-check; nieuwe signed Drive-tests voor PDF-falen na
verzenden, ontbrekende assets/bestand, zichtbaarheid, gewijzigde bron, migratie,
parallel werk, verloren provider-/commitbevestiging, rechtenintrekking, review-
termijn en handmatige send zonder dubbele mail. Unit/API-tests voor loginread,
metadata/linkvalidatie en sessiewissel. Chromium test echte onReady: pagina direct
zichtbaar, melding na achtergrondread, herhaald inloggen, afmelden/late response,
link en licht/donker op 390/1440px. Tot publicatie uitsluitend synthetische mails.
Na livegang de geautoriseerde Don Toliver-mail via bestaande OIDC-worker starten
en de werkelijke afleverbevestiging in Drive controleren.

Aanvullend gecontroleerd: PDF vóór webpublicatie verstuurt niets en wordt via
mailChannel=online niet als oude afleverregistratie geadopteerd; pas webpublicatie
maakt de ene online levering. Ambigue datasets die buiten de rapportagecatalogus
vallen activeren geen mail. Handmatig mailen bij een nieuwe PDF-generatie blijft
aan de oude levering gekoppeld. Publicatie blijft geldig als de mailhook faalt.
