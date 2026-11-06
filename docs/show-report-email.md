# Showrapportagemail

`server/email-templates/show-report.js` blijft het bestaande mailtype; centraal
ontdekt in Beheerder → Email. Onderwerp en titel worden Showrapportage [artiest]
- [datum], met alle relevante Nederlandse datums uit het gekoppelde showobject.
De persoonlijke aanhef gebruikt de betrouwbare voornaam van elke ontvanger.
De bestaande PDF blijft verplicht als bijlage.

De blauwe knop heet op verzoek exact Showprofiel openen en gaat naar de **online
rapportage**: `https://esmojo.nl` + `reportHref({concertId:show.key})`. Deze gebruikt
dezelfde canonieke routehelper als de website. HTML-links hebben target _blank en
rel noopener noreferrer; plain text bevat dezelfde werkende URL. Hosting, router
en auth behouden die URL bij sessieherstel en na wachtwoord/TOTP. Inzien vereist
onverminderd de Rapportages-module; de link verleent geen toegang.

Voor de ondertekening zoekt signed Apps Script de exacte event-safety-manager-
relatie in Productie/_esmojo_show_assignments_v1.json en het bijbehorende bestaande
actieve accountprofiel. Alleen voornaam + achternaam verlaten deze lookup; geen
ID, email, rol, foto of overige profielvelden. Ontbrekende/inactieve/ambiguë naam:
Event Safety Mobility Operations, expliciet door de gebruiker bevestigd. Er
worden geen accounts of relaties bijgemaakt. Mailtests gebruiken dezelfde lookup
via de bestaande beheerder-/MFA-/Rapportages-route.

De gekozen managernaam en versie online-report-v1 staan vóór de eerste poging
in `delivery.mail` in het bestaande vertrouwelijke OnTrack-register. Herpogingen
gebruiken deze snapshot, dezelfde ontvanger en dezelfde Resend-idempotentiesleutel.
Oude onzekere pogingen zonder deze versie krijgen review/MAIL_TEMPLATE_CHANGED,
om gewijzigde providerinhoud of dubbele mails te vermijden. Verzonden mails
worden niet herhaald. Bestaande lease, poginglimiet en 23-uurscontrole blijven.

Showrapportages krijgen de exact opgegeven MOJO-vertrouwelijkheidstekst als footer,
via veilige gestructureerde `footer` in de centrale renderer. Het accountmailtype
behoudt de bestaande merkfooter. Header/logo/knopstijl blijven gedeeld. Variabele
tekst wordt ge-escaped en URLs blijven beperkt tot HTTPS op esmojo.nl.

Tests: server/email-template.test.js, server/email-tests.test.js, de signed
server/ontrack-report/service.test.js, server/startup-view.test.js en de bestaande
API/routerchecks. tools/email/check-preview.mjs controleert account- én rapportage-
mails op 320/390/640/1024px zonder verzending. Alle fixtures zijn synthetisch.

Vanaf V1.52 is het envelope-adres voor show-report ESMOJO
<showrapportage@esmojo.nl>, inclusief de bewuste testvariant. De centrale
server/email-senders.js kent uitsluitend vaste senderIds default en show-report.
Default blijft no-reply@esmojo.nl voor accountmails. De gekozen senderId wordt
bij de eerste afleverreservering in delivery.mail opgeslagen. Bestaande snapshots
zonder senderId blijven bij herpogingen default gebruiken om geen gewijzigde
providerinhoud op dezelfde idempotentiesleutel te sturen. Geen echte testmail of
nieuwe inbox aangemaakt voor deze wijziging.

V1.55: de zichtbare blauwe mailheader is uitsluitend Showrapportage. Het onderwerp
behoudt artiest en datum. Nieuwe automatische afleveringen bewaren online-report-v2;
v1-herpogingen behouden hun oorspronkelijke lange header op dezelfde providersleutel.
Geen oude verzonden mails opnieuw versturen of nieuwe ontvangers/trigger toevoegen.
