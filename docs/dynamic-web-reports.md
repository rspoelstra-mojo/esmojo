# Dynamische rapportagewebsite

Vanaf V1.41 is Rapportages geen vaste Jungle-voorbeeldlijst meer. Eén beveiligde
inventaris publiceert geldige OnTrack-CSV's uit de bestaande private OnTrack-map.
De bestaande renderer, parser, KPI's, grafieken, filters, NL-prioriteiten en
tijdschema-tussenkoppen blijven gedeeld. Geen CSV/incidentinhoud in Git, CI,
Supabase, logs of persistente browseropslag.

## Bron, koppeling en validatie

WebReports.gs leest uitsluitend directe CSV-bestanden in de aangewezen map,
controleert de echte parentketen, MIME, UTF-8/17-kolommen en maximaal 2 MB.
Canonical concertgegevens komen uit de bestaande Gashouder-/OnTrack-catalogi.
Een reeds bevestigde source.showKey in het bestaande OnTrack-register gaat voor.
Dat behoudt onder andere de bestaande juiste Jungle-koppeling, ondanks het
verouderde bestandslabel. Anders geldt de bestaande exacte of unieke casing-/
scheidingstekenmatch op het concert-ID in de incidents-bestandsnaam. Geen fuzzy
artiestkeuze, willekeurige eerste datum of verzonnen historisch concert.

De parser controleert dezelfde CSV-showdatumregel als de bestaande PDF-flow:
incidenten op de gekoppelde showdatum of een uitsluitend vroege volgende
showavond-nacht. De gehele CSV blijft bij het gekoppelde concert, niet per
incidentkalenderdag opgesplitst. Alle berekeningen gebruiken calculateReport.

Op 5 november heeft de gebruiker expliciet de historische fallback bevestigd:
wanneer geen catalogusrecord of opgeslagen koppeling bestaat, haal artiest, zaal
en datum uit het concert-ID in de bestandsnaam, mits de CSV-datums aansluiten.
report-filename.js gebruikt uitsluitend de centrale zes ondersteunde zalen en
valideert de volledige kalenderdatum. Ziggo-Dome wordt Ziggo Dome, AFAS-Live wordt
AFAS Live en Johan-Cruijff-Arena wordt Johan Cruijff Arena. De bekende artiestnaam
mag alleen bij één unieke normalisatiematch worden hergebruikt; anders blijft de
schrijfwijze uit de bestandsnaam leidend. De tijdelijke fallback-identiteit is
stabiel voor casing/scheidingstekens. Een ambigue bestaande catalogusmatch wordt
niet met fallback omzeild. Geen nieuw Shows-/mailconcert, geen wijziging aan
esmojo_ontrack_v1.json. De bestaande SCOOTER-CSV wordt hierdoor ook bruikbaar op de
website, zonder hem aan de mailflow toe te voegen.

De aparte achtergrondworker kan een historische MOJO-pagina opzoeken. Een
geprobeerde URL is geen feitelijke bron: alleen bij een overeenkomende H1-artiest,
exacte Nederlandse datum en zaal/stad in de echte MOJO-beschrijving wordt die
pagina als fotobron geaccepteerd. Redirects blijven op dezelfde vaste HTTPS-host.
De index bewaart alleen de bevestigde URL/foto-URL en zoekstatus, nooit HTML.
Dit zoekwerk blokkeert geen interactieve menuvalidatie. Historische tijdschema's
worden hiermee nadrukkelijk niet achteraf gereconstrueerd.

## Afzonderlijke webinventaris, ongewijzigde mailflow

Alleen `_esmojo_web_reports_v1.json` wordt aangemaakt/bijgewerkt, Vertrouwelijk
in dezelfde map. Dit bevat uitsluitend bron-ID, metadata-/contexthash, bronhash,
validatiestatus/-code en controletijd, plus uitsluitend bevestigde openbare MOJO-foto-URL’s. Geen
CSV-inhoud of ontvangers. Bronbestanden,
PDF's en `_esmojo_ontrack_v1.json` blijven door webacties byte-identiek. Bestaande
PDF/mail-jobs, ontvangers, triggers en aflevering worden niet aangeroepen of
veranderd. Webbeschikbaarheid vereist geen bestaande PDF of mailaflevering.

De aparte workflow web-reports.yml controleert iedere vijf minuten en verwerkt
maximaal vijf nieuwe/gewijzigde CSV's per beurt. Hij gebruikt eigen OIDC-audience,
vaste workflow/repository/main en HMAC. GitHub kan geplande runs vertragen.
Openen/verversen van Rapportages controleert ook op nieuwe bronnen en valideert
maximaal vijf nog onbekende exports; geen mail of PDF-generatie. Reeds gevalideerde
bestanden worden niet opnieuw geparsed voor het menu. Ongeldige bronnen krijgen
alleen veilige foutcodes en worden na bron-/contextwijziging opnieuw bekeken.

web-commit controleert actuele metadata, context en bronhash vóór publicatie,
onder een korte UserLock. Lezers houden geen globaal account-/mail-Schrijfslot
vast. Op iedere read wordt de bron opnieuw aan dezelfde map en hash gebonden.
Een bron die wordt gewijzigd, verwijderd, verplaatst of opnieuw gekoppeld kan
niet stilzwijgend de oude actuele dataset opleveren. Meerdere exports van hetzelfde
concert leveren één datum, met de meest recent gewijzigde geldige export; een
stabiel bron-ID breekt gelijke wijzigingstijden. Nooit CSV's samenvoegen.

## Routes, menu en tabbladen

report-menu en report-web vereisen actuele Rapportages-module, activatie, MFA en
sessie, opnieuw gecontroleerd in Drive, ook voor gewone gebruikers. Geen vrije
Drive-ID, bron-URL, actor of bestandspad vanuit de browser. Alleen het bekende
canonieke concert-ID. Responses zijn no-store en bevatten uitsluitend benodigde
projecties, nooit de bronbytes of mail-/accountgegevens.

Het submenu groepeert op de werkelijke artiestnaam (NFC, casing en witruimte),
met nieuwste beschikbare rapportdatum voor sortering en de 7/8-daggrens in
Nederland: Afgelopen week / Afgelopen periode. Meerdere zalen op verschillende
datums blijven bij dezelfde artiest. Twee verschillende concerten op dezelfde
artiestdatum worden niet willekeurig samengevoegd: die conflictdatum is niet
beschikbaar als één datumtab. Gewone dubbele CSV-exports zijn geen nieuwe show.

De URL blijft /rapportages/<canoniek-concert-ID>. /rapportages opent dynamisch de
nieuwste beschikbare artiest/show. Oude statistieken-/jungle-links blijven als
compatibiliteitsaliases bestaan, zonder vaste dataset of vast menu.

De header toont maximaal vijf nieuwste echte showdatums, geen aanvulling of
extra archiefknop. Eén CSV geeft één tab. Elke datum haalt pas bij selectie zijn
eigen CSV-projectie op; al geladen dagen blijven alleen in componentgeheugen.
De juiste zaal/foto en het voor dat concert bewaarde MOJO-tijdschema wisselen mee.
Laat aangekomen reacties mogen geen andere datum of verlaten pagina overschrijven.
Een lopende fetch houdt de eerdere weergave zichtbaar met een klein rondje in de
datumtab. De compacte header, lichte/donkere thema's en alle acht filters blijven.

Foto's komen uitsluitend van de canonieke MOJO-concertpagina. Een tijdschema is
alleen beschikbaar wanneer het op de eigen showdag rond 12:00 is vastgelegd.
Historische ontbrekende foto's/tijden worden niet gereconstrueerd of verzonnen.

## Geheugen en controleren

Vanaf V1.62 heeft de gebruiker lokaal bewaren van uitsluitend artiest, concert-ID,
zaal en beschikbare rapportdatums expliciet toegestaan. report-catalogue-cache.js
whitelist deze velden; geen revisie-/bronhashes, accountgegevens, rechten, foto's,
aantallen, CSV of incidentinhoud in deze cache. De lijst blijft na afmelden bewaard,
maar wordt uitsluitend na actuele sessie-/modulecontrole getoond. Geblokkeerde of
corrupte opslag blokkeert de normale beveiligde laadroute niet.

De bekende lijst verschijnt synchroon. Eén gedeeld achtergrondverzoek controleert
bij openen/focus/zichtbaarheid altijd opnieuw, zonder wachttijdvenster. Zolang het
submenu zichtbaar is controleert het iedere 30 seconden. De oude lijst blijft bij
vertraging/fouten staan; een bevestigde lege lijst vervangt de oude cache. Nieuwe
rapportages verschijnen zonder de gekozen rapportage te wisselen. Account-, rol-
of modulewissel wist sessiedata en negeert late reacties, ook bij lokaal bewaren.
Incidentdata blijft uitsluitend in de actieve rapportpagina. Op een apparaat
zonder eerder opgeslagen lijst is de eerste beveiligde laadbeurt nog nodig.

Tests gebruiken synthetische CSV's voor meerdere artiesten/dagen/zalen, hashes,
wijziging/verplaatsing, foutieve CSV/MIME/datum, duplicaten, ambigue ID's, actuele
moduleweigering, onafhankelijke mailregisters, juiste tijdschema's en eigen OIDC.
De bestaande echte Jungle-bronhash en bevestigde koppeling zijn lokaal gecontroleerd
met de nieuwe code; cijfers blijven ongewijzigd. Browsercontrole gebruikt dezelfde
renderer met drie synthetische showdagen en de echte bestaande Jungle-rapportage:
luie tabselectie, late reacties, caching, filters, photo/header en beide thema's.


Rapportagekoppeling V1.42: concert-ID's vergelijken hoofdletterongevoelig met
spaties, underscores en koppeltekens als equivalente scheidingstekens, plus de
centrale zaalaliassen. Een exacte of unieke match behoudt het bestaande concert;
ambiguïteit wordt niet als nieuwe filenamefallback omzeild. Bij filenamefallback
wordt ook buiten de catalogus het bestaande Tijdschemas-archief gelezen: dezelfde
artiest, canonieke zaal en datum, unieke match en ongewijzigde noonvalidatie.
Geen archief herschrijven of ontbrekende tijden reconstrueren. Alleen de webflow;
PDF-/mailregister, ontvangers en verzendmomenten blijven ongewijzigd.

V1.54: beide incidenttypekaarten begrenzen de webselectie tot de top vijf echte
types, met dezelfde caption en oorspronkelijke telling/tie-break. Showverloop
heeft een tijd-only tooltip (21.00) in hoofdmenu-stijl en keyboardbediening.
`shared/report-timeline.js` gebruikt alleen een geldig opgeslagen MOJO-tijdschema
met unieke deuren-open- en eindgrens voor de as. Ontbrekende/ambigue/ongeldige
grenzen behouden exact de bestaande tijdlijn. De nieuwe webas kan middernacht
passeren en rekent kalenderhalfuurvakken binnen het geplande venster, inclusief
eventuele gedeeltelijke randvakken. KPI's, bronincidenten, PDF-selectie/grafiek en
mailflow veranderen niet. Geen nieuw scrape- of opslagmoment.
