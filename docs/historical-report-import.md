# Historische rapportages in de bestaande weergave

Uitsluitend door de gebruiker goedgekeurde historische concerten/CSV's. Geen
incidentinhoud, ticketcijfers, Drive-bestandsIDs of importpakketten in Git.
De eerste liveproef omvat de tien eerder willekeurig geselecteerde concerten;
de volledige verzameling is hiermee niet automatisch geautoriseerd voor import.

Bronbestanden staan onder de bestaande private Drive-root in Productie / artiest /
concert-ID. De standaardopbouw komt uit server/mojo-agenda.js. Twee voorstellingen
op één datum gebruiken aanvullend _S1 (middag) en _S2 (avond); die voorstellingen
zitten niet in de eerste steekproef. Geen nieuwe rapportagecomponent of CSS.

Productie/_esmojo_historical_reports_v1.json is een Vertrouwelijk register met
managedBy ESMOJO/HistoricalReports-v1, version 1 en entries. Per entry: concertId,
artist, venue, city, date, performance (null/middag/avond), seriesId, ticket_sales
(het bestaande kaartverkoopveld) en source {id,folderId,name,size,modifiedAt,sha256}.
Alle bronverwijzingen blijven serverzijdig. De CSV wordt pas beschikbaar na
bestaande parser-/datumvalidatie en een bevestigde bronhash in het webregister.
Bronlezing controleert de hele private parentketen en exact concertmap/bestandsnaam.

Bezoekersdata wordt daarnaast als het bestaande bezoekersdata.json-document met
workflow_json.visitors.fields.ticket_sales bewaard. Ontbrekende herkomstgegevens,
profielen, tijden en aantallen worden niet aangevuld. Geen Supabase-import.

Historische bronnen staan NIET in de bewaakte OnTrack-uploadmap. De PDF-worker
scant ze dus niet. Online-mailmarkering historical is onafhankelijk van bootstrap
altijd actief voor deze bronsoort; er worden geen ontvangers gereserveerd. Ook de
publicatiehook verstuurt voor historische bronnen geen notificatie. Normale
rapportages behouden de bestaande automatische mail/PDF-flow.

Publiceren verloopt via de bestaande main- en Apps Script-workflows. De bestaande
Index web reports-workflow heeft historical_only=true voor uitsluitend historische
validatie, zonder de mailworker aan te roepen. Alleen de bestaande exacte GitHub
OIDC-identiteit van web-reports.yml op main mag dit endpoint gebruiken. Geen
nieuwe import-/schrijfroute met eigen tokens of ongeauthenticeerde toegang.
De respons bevat alleen aantallen en openbare concert-ID's, geen broninhoud.

Bij een nieuwe import: code/suppressie eerst publiceren en verifiëren; mappen en
bronbestanden daarna idempotent klaarzetten; register als laatste publiceren.
Controleer vooraf bestaande bestandsnamen/IDs en weiger afwijkende inhoud. Geen
bestaande bronnen overschrijven of dubbele registers maken. Verifieer bronhashes,
native parser en zichtbare concert-ID's. Mutaties lopen via de geverifieerde
zakelijke Drive-verbinding, met behoud van private parent/sharing-instellingen.

De voorgestelde incidentkalenderdatums uit de voorbereiding blijven traceerbaar
in een privaat controlebestand per concert. De oorspronkelijke kloktijd blijft
behouden. De liveproef is bedoeld om ook de tijdgrafiek inhoudelijk te controleren;
er is geen generieke 06:00-regel ingevoerd.

Test: node server/historical-reports.test.js. Deze controleert de bestaande
weergaveprojectie/rechten, hashes/private mappen, geen mail/PDF/taken, behoud van
normale verwerking en de afzonderlijke historische-only worker.
