# Historische rapportages in de bestaande weergave

De gebruiker heeft na de liveproef de correcties en vervolgens de volledige
gecontroleerde collectie geautoriseerd. Incidentinhoud, ticketcijfers, private
Drive-IDs, bronhashes en importpakketten blijven buiten Git en CI-logs.

Historische incidents_<concert-ID>.csv staan op expliciet verzoek centraal in de
bestaande private OnTrack-map. Productie / artiest / concert-ID bevat de bestaande
bezoekersdata.json en een vertrouwelijk importcontrole.json. Het concert-ID volgt
server/mojo-agenda.js; twee voorstellingen gebruiken _S1 (middag) en _S2 (avond).
Bestaande IDs/links blijven gelijk bij een verbeterde zichtbare artiestnaam.
Bouke-formaties delen één artiest; identityArtist bewaart zo nodig de oorspronkelijke
ID-opbouw. Geen nieuwe rapportagecomponent, kaart of CSS.

Verwijder vóór opslag alle CSV-rijen met ‘Schoonmaak’ in Division, inclusief
combinaties en ongeacht hoofdletters. Genre en LOGINID worden niet overgenomen.
Bezoekers is verkochte kaarten, één keer per voorstelling; bestaande
workflow_json.visitors.fields.ticket_sales wordt ook door de artiestshow gelezen.
Geen ontbrekende profielen, herkomst, tijden of aantallen verzinnen. Rapportages-
submenu toont alleen datums tot en met 45 kalenderdagen terug, Nederlandse tijd.
Oudere rapporten blijven in de catalogus, artiestgeschiedenis en directe links.
Middag/avond hebben eigen selectie/cache/tab. Een rechtstreeks geopend oud rapport
blijft geselecteerd, ook wanneer het buiten de vijf nieuwste tabdatums ligt.

Productie/_esmojo_historical_reports_v1.json blijft Vertrouwelijk, met managedBy
ESMOJO/HistoricalReports-v1, version 1, entries. Per entry: concertId, artist,
optioneel identityArtist, venue, city, date, performance, seriesId, ticket_sales,
concertFolderId en source {id,folderId,name,size,modifiedAt,sha256}. De reader
accepteert oude concertmap-bronnen tijdens migratie, maar nieuwe bronnen moeten
centraal staan. Verifieer bronhash, bestandsnaam, mtime en private parentketen.

Beide gewone OnTrack-workers slaan ALLE geregistreerde historische bron-IDs over,
ook pending imports. Historische onlinemail heeft onafhankelijk daarvan geen
ontvangers; de import roept geen mail-, PDF-, onderzoeks- of voorbereidingstaken aan.
Normale bronnen houden hun bestaande verwerking.

Import verloopt uitsluitend via de bestaande ondertekende Apps Script-brug en de
exacte GitHub OIDC-identiteit main/web-reports.yml. Geen browseractie, nieuwe tokens,
vrije bestemming of productiecredentials in Codex. Een vooraf gecontroleerde batch
staat als historical-<technische-naam>.json in private Productie, managedBy
ESMOJO/HistoricalImport-v1, classification vertrouwelijk, version 1. Entries bevatten
canonieke metadata, opgeschoonde CSV-bytes, bronhash, optionele vorige bronhash,
audit en de oorspronkelijke steekproefmarkering. De Node-worker valideert vóór
commit met dezelfde CSV-parser/rapportberekening; Schoonmaak wordt geweigerd.
Apps Script herleest batch/hash vóór schrijven en weigert afwijkende oude bronnen
of ticketcijfers. Bestaande ticketvelden en documentgeschiedenis blijven behouden.

Publiceer eerst geteste code via main én de bestaande Apps Script-deployment.
Dispatch vervolgens Index web reports met historical_import=sample en de technische
batchbestandsnaam. Pas na geslaagde import, native indexering en terugleescontrole
volgt historical_import=all voor de al goedgekeurde collectie. historical_only=true
blijft afzonderlijk beschikbaar zonder import of mailworker. CI toont alleen aantallen.
Elke aanroep verwerkt hoogstens twee shows; verificatie leest vijf shows terug en
controleert centrale parent, CSV-inhoud/hash en daadwerkelijk geprojecteerde tickets.

Nieuwe CSV's starten met .historical-pending, worden geregistreerd voordat ze .csv
heten, en pas na terugleescontrole complete. De registermarkering voorkomt een
mail/PDF-race. Afgebroken verplaatsingen hervatten dezelfde batch en hetzelfde
bron-ID; geen dubbel concert of extra CSV. Bronwijzigingen of andere conflicten
stoppen de batch. Hervatten na analyse is veilig; niet blind nieuwe batches maken.

De voorgestelde incidentkalenderdatums uit de voorbereiding blijven traceerbaar
in het private controlebestand. Bronkloktijden blijven gelijk; geen generieke
06:00-regel. Reeksen blijven per artiest/locatie binnen maximaal 31 dagen gegroepeerd,
met behoud van een eigen rapportage en kaartverkoop per voorstelling.

Controles: server/historical-reports.test.js, shared/report-catalogue.test.js,
shared/artist-names.test.js, src/lib/report-menu.test.js, artiestshow-/browsercontroles
en de gewone CI/publicatiecontroles. Gebruik uitsluitend synthetische CI-fixtures.


## TSC historisch: afwijkende bronregels (10 november 2026)

Drie bronvarianten: OnTrack geautomatiseerd, OnTrack historisch (bestaande import),
TSC historisch (`sourceType: tsc-historical`). Oudere bronnen blijven compatibel;
geen herclassificatie of herbouw van bestaande broncontexten.

TSC begint met zes velden: werkelijke bezoekers, uitzettingen, aanhoudingen,
Deuren open HH:MM, Aanvang show HH:MM, Einde show HH:MM. Leeg/label zonder tijd
wordt null; nul is een geldige telling. Incidentkop: Date and Time, Discipline,
Type, Priority, Description, Resolution Note. Discipline→Division en EHBO→Medisch;
overige bronwaarden blijven gelijk. Ontbrekende native kolommen blijven leeg,
incident-ID's zijn deterministisch per concert en oorspronkelijke rijpositie.
Schoonmaak wordt volgens de bestaande regel verwijderd. Originele bytes blijven
in de private batch; native parser/rapportdagcontrole valideren de conversie.

TSC `ticket_sales` blijft null: aanwezigen worden niet als verkoop voorgesteld.
De zes bronwaarden staan in `showgegevens-tsc.json` in de concertmap en het
bestaande register. Import schrijft/controleert showgegevens vóór de CSV wordt
opgeslagen/gepubliceerd. Uitzettingen en aanhoudingen uit de bronrij zijn leidend
in web-/artiest-KPI's en incidentreferenties. Geen berekende terugval wanneer ze
ontbreken; zo'n registratie telt niet mee als volledige beveiligingsregistratie.
De aanwezigen worden exact gebruikt, zonder 2,5%-correctie. De oorspronkelijke
OnTrack-berekeningen blijven gelijk. Tijden krijgen historische bronlabels.

Voorbereiding: pak de ZIP privé uit in `<privéwerkmap>/originals`, zonder bestanden
te overschrijven. `node tools/tsc-historical/prepare.mjs <privéwerkmap>` maakt de
gecontroleerde private batch en een status per bestand. De expliciet goedgekeurde
identieke Stereophonics-S2 wordt alleen bij exacte bytegelijkheid overgeslagen.
Bestaande bestanden/bronhashes worden niet blind vervangen. Plaats de gecontroleerde
batch uitsluitend via een bevoegde private verbinding in Productie en gebruik
vervolgens de bestaande OIDC-import en terugleesverificatie. Voorbereid is niet
geïmporteerd: zonder bevestigde opslag blijft de bestandsstatus niet-geïmporteerd.
