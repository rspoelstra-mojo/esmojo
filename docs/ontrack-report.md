# Automatische OnTrack-showrapportage

De opdracht ESMOJO_Codex_overdracht_showrapportage.md is leidend. Geen nieuwe AI-
research of bestaande showprofielgenerator wijzigen. Alle CSV’s, rapporten,
koppelingen, ontvangers en jobstatus zijn Vertrouwelijk, uitsluitend opslag in de
eerder opgegeven OnTrack-map. Verwerking Vercel; verzending bestaande Resend.

## Onderdelen

- `server/ontrack-report/data.js`: zuivere RFC4180-parser, 17 exacte headers én
  volgorde, UTF-8/BOM, strenge datum/tijd, KPI’s, types, verloop, locaties en volledige
  chronologische incidenten. Verplichte ID’s uniek, Affected Person niet-negatief
  geheel getal; ongeldige invoer geeft een code/rij zonder incidentinhoud te loggen.
- `pdf.js`: eigen dynamische A4-master (595.2×841.92), zes kaarten 2×3, originele
  Futura/Aptos-fontassets en MOJO-voetervorm, verkorte kop, optisch gecentreerde
  titelgroep, typeverdelingen >1, tijdgrafiek en volledig incidentenoverzicht.
  Hoog/critical lichtrood, alle overige prioriteiten lichtgrijs. Lange incidenten
  lopen met behoud van tekst door over pagina’s. Pagina i/N pas na paginering.
  Het ON-icoon en de volledige kliktegel-link staan uitsluitend op pagina 1.
- `assets.js`/`contract.js`: statische assets en layoutversie. PDF-/fontlibrary wordt
  pas geladen voor echte rapportgeneratie, zonder alle account-/showrequests te
  verzwaren. Originele fonts/footer uit report-original blijven ongewijzigd.
- `service.js`: actor-/requestvalidatie, signed Drive-verkeer, generatie, hashing,
  idempotente commit, beveiligde download en individuele PDF-mails.
- `google-apps-script/OnTrackReports.gs`: vaste map/register, actuele actorcontrole,
  broncontrole, leases, bronhash, generatie-identiteit, versiereservering,
  PDF-commit/download en individuele afleverregistratie.
- `/api/ontrack-reports-sync` en `ontrack-reports.yml`: uitsluitend eigen GitHub
  OIDC-workflow op main; controle ieder halfuur. Geen CSV/PDF, tellers of afleverdetails in GitHub Actions; alleen een technische
  ok/assetblokkade-bevestiging.
- `/api/access?action=ontrack-report`: uitsluitend actieve beheerder met MFA,
  alleen link/retry/download/send. Geen vrije metadata, ontvanger of bijlage-input.
  De bestaande OnTrack-pagina toont intake, status, koppeling, herpoging en download.

## Berekeningen en data-afspraken

Substringmatching is hoofdletterongevoelig; personen worden opgeteld, niet als
rij geteld. Medische zelfzorg is OR over de afgesproken keywords, eenmaal per rij.
De opgegeven beveiligingssubcategorieën en ambulance hebben geen extra Division-
filter. Taarten gebruiken alleen discipline-types met meer dan één incident,
zonder Overig. KPI’s en incidenten worden door grafiekfilters niet verkleind.

Locaties tellen alle incidenten en tonen maximaal zeven groepen. Tie-break is
**eerste voorkomen in de oorspronkelijke CSV**, ook als de CSV niet chronologisch
was. De overdracht noemt dit als toegestane regel. De concrete voorbeeld-top-7
wijkt daardoor af bij gedeelde plaatsen; niet met verborgen filters naar het
voorbeeld toe rekenen. De gebruiker is expliciet om de voorkeur gevraagd.

Date and Time wordt als Europe/Amsterdam-wandklok geïnterpreteerd, niet als UTC.
AM/PM is strikt. Niet-bestaande tijden tijdens de voorjaarswissel geven een fout.
Een dubbel tijdstip in het najaarsuur kiest deterministisch de vroegste werkelijke
occurrence, met DST_AMBIGUOUS_EARLIEST-waarschuwing. Sortering daarna op werkelijke
tijd en oorspronkelijke positie. De grafiek telt eerste kalenderdatum strikt na
17:00 plus de gehele eerstvolgende kalenderdatum, in halve uren inclusief nulbakken.
Datums na die tweede dag blijven in KPI’s/incidenten maar niet in de grafiek; een
waarschuwing legt dit vast. Geen verborgen uitbreiding naar een derde dag.

Generatie-/exporttijd komt van de feitelijke eerste generatiereservering, wordt
in Europe/Amsterdam op het document getoond en als ISO+zone in metadata opgeslagen.
Een herpoging van dezelfde logische generatie behoudt deze tijd en dezelfde bytes;
een nieuwe inhoud/context/layout krijgt een nieuwe generatie/versie. Geen tijd uit
het CSV-bestandslabel of voorbeeld gebruiken. Gereserveerde versies zijn ook bij
parallelle jobs uniek en kunnen na een mislukte generatie een gat vertonen.

## Concertkoppeling en achtergrondwerk

Alleen bestaande canonieke metadata uit de Gashouder-index en de aparte OnTrack-
concertinventaris wordt gebruikt. Een bestandsnaam is slechts een unieke exacte
matchhint tegen deze opgeslagen records. Bij geen/eerdere onbekende/ambigue match
blijft de CSV ongekoppeld tot de beheerder kiest. De bestandsnaam maakt nooit
zelf metadata of nieuwe concertrecords. De gekozen datum moet aansluiten op de
CSV-datums; een vroege volgende-dagmelding kan bij de vorige showavond horen.
Een historische test-CSV is geen toestemming om zijn voorbeeldshow als nieuwe
productieconstante of fictief concert te registreren.

Intake, bron, gegenereerde PDF en audit staan in `_esmojo_ontrack_v1.json` plus
private bestanden in dezelfde OnTrack-map. CSV-inhoud nooit in JSON-records bewaren.
Geen bestanden verplaatsen/verwijderen. Eén hash van CSV+concert+layout bepaalt
het rapport, inclusief duplicaten met andere Drive-ID’s. Herimport hergebruikt
het bestaande bestand; gewijzigde inhoud maakt een nieuwe versie. Oude PDF’s
blijven bewaard. Een bronwijziging vóór commit blokkeert de oude job.

Worker verwerkt maximaal twee CSV-jobs en tien afleveringen per beurt om binnen
de serverlooptijd te blijven. Volgende jobs blijven in de Drive-wachtrij; de pagina
hoeft niet open te blijven. Leases verlopen na vijf minuten, waarna een volgende
beurt of expliciete herpoging kan hervatten. CSV-limiet 2 MB, PDF 3 MB vanwege de
bestaande JSON/Vercel-downloadgrens. Gecontroleerde fout in plaats van afkappen.
Bij onmogelijk passende legenda/metadata of ontbrekend fontteken geen verkeerd
rapport publiceren: zichtbare opmaakfout, bron en eerdere rapporten blijven staan.

## Mailbevestiging en herpogingen

De actuele ontvangerselectie wordt per nieuw rapport als account-ID’s vastgelegd.
Uitgeschakelde accounts worden niet gemaild. Voornaam/e-mailadres komen uit het
werkelijke account; eerste verzendinhoud wordt bevroren voor provider-idempotentie.
Eén geadresseerde per mail, via Showrapportage en verplichte echte PDF-bijlage.
Geen vrij adres of HTML/bijlage vanuit de browser, geen openbare Drive-link.

De aflevering heeft een lease en stabiele Resend-idempotentiesleutel. Verloren
provider-/opslagbevestiging mag geen nieuwe mail opleveren. Maximaal drie pogingen,
met wachttijd; na 23 uur onzekerheid niet automatisch voorbij Resends 24-uursvenster
opnieuw versturen. Dan review tonen. Vinkje uitsluitend als alle vastgelegde
ontvangers bevestigd zijn. Oude/onzekere statussen nooit als verzonden afleiden.

Nieuwe selectie geldt voor nieuwe rapporten. Rapport zonder ontvangers kan na
selectie bewust via Rapport mailen worden aangeboden, zonder nieuwe PDF. Dit is
geen automatische inhaalmail bij een selectiewijziging. Eerder bevestigde
ontvangers worden bij herhaald klikken overgeslagen.

## Referenties, bewijs en nog ontbrekend materiaal

De echte aangeleverde SCOOTER-CSV is via de verbonden Drive-map gevonden en lokaal
getest. Niet opgenomen in Git/CI/artifacts. De lokale acceptatietool
`tools/ontrack/verify-scooter.mjs <csvpad> <uitvoer.pdf>` bevat uitsluitend de door
de gebruiker opgegeven controlewaarden. Hij controleert KPI’s, filters, 34 volledige
incidenten, één rode kaart, vijf pagina’s en aanwezigheid van alle incidentteksten.
Productiecode bevat geen SCOOTER-data. CI gebruikt uitsluitend synthetische fixtures.

Het originele Montell Fish-PDF is visueel geïnspecteerd; productiefonts, kleuren,
MOJO-beeldmerk en compacte footer zijn hergebruikt. `tools/pdf/verify-original.mjs`
bevestigt dat de bestaande showprofielgenerator byte-identiek blijft.

**Nog niet aangeleverd:** de goedgekeurde volledige SCOOTER-referentie-PDF en
`Minimalistisch ON-appicoon in grijs(1).png`. Deze zijn in werkmap/Drive gezocht;
gebruiker is gevraagd ze toe te voegen. De layoutproef zonder icoon is nadrukkelijk
PROEF en geen definitief rapport. Worker/generator blijven geblokkeerd totdat het
originele icoon in `server/ontrack-report/assets/ontrack-icon.png` staat. Geen
vervangend icoon genereren/tekenen/downloaden. De nog ontbrekende goedgekeurde
referentie verhindert de volledige visuele vergelijkingscontrole; claim die niet.
De ON-URI is structureel getest met een testafbeelding, niet als goedgekeurd icoon.
