# Actuele projectcontext voor alle agents

Momentopname: 17 november 2026, na PR213/V1.153. Haal altijd actuele origin/main
op: nieuwere code, taaknotities, PR's en gebruikersbesluiten kunnen dit aanvullen.
Dit is dezelfde context voor account A, andere Codex-sessies en Claude Code.

## Product en technische basis

ESMOJO ondersteunt concertvoorbereiding, Shows, Artiesten, Rapportages en beheer.
Repository: rspoelstra-mojo/esmojo. Productie: https://esmojo.nl.
GitHub-main publiceert automatisch via het bestaande zakelijke Vercel-project
(team esmojo, project esmojo). Vite, vanilla JavaScript/CSS, Node.js 24,
serverless API's. Bestaande vormgeving en functionele berekeningen behouden.

## Opslag en toegang — huidige besluiten

- Dataverse is de actieve bedrijfsopslag: centrale concertcatalogus, artiesten,
  Shows, rapportages, accounts/rechten/foto's/instellingen, File en technische status.
- Supabase Auth blijft: inloggen, wachtwoorden, identiteiten, MFA en sessies.
  Geen oude Supabase-bedrijfstabellen of opslagroutes heropenen.
- Google Drive/Apps Script zijn geen runtime- of publicatiebron meer. Lokale
  Shows-regels staan in server/dataverse-shows/rules/native.js. Oude .gs-bronnen
  dienen alleen offline tests/historie; de publisher weigert onvoorwaardelijk.
- Redis-bedrijfsfuncties zijn native. Verwar native activering of lege credentials
  niet met een bewezen fysieke verwijdering van de externe provider.
- Behoud GOOGLE_DRIVE_SHARED_SECRET en SUPABASE_SECRET_KEY: hun historische namen
  betekenen niet dat ze weg kunnen; native encryptie, sessies en bewijzen gebruiken
  ze nog. Geen waarden uitlezen/loggen/roteren om op te schonen.
- Nieuwe gegevens uitsluitend in Dataverse. Nieuwe tabellen/kolommen/relaties
  vereisen een beveiligde inrichtingsknop bij Datatransitie, volgens bestaande setup.
  Actuele serverrechten en modulegrenzen gelden per bewerking. Geen authbypass.

## Recente functionaliteit

Showbeheer is alleen voor Gashouder. Eén geheime fragmentlink plus zescijferige
PIN geeft een beperkte sessie. Blok E biedt uitsluitend de actuele gereedstaande
Showprofiel-PDF. Externe PDF-toegang stopt op Nederlandse middernacht na de laatste
canonieke showdag van de reeks; ingelogde toegang blijft. Reeksdatums delen één
toegang, zonder het 45-dagenmenu als autorisatie te gebruiken.

De ESM krijgt Showbeheer verzenden zodra PDF/profiel gereed is, ook ver voor de
show. Voorlopige mailto-body is uitsluitend PIN en link, geen onderwerp/ontvangers.
Geen automatische verzending; andere Resend-stromen blijven actief zoals eerder.
Beheerder/Showbeheer toont anonieme bezoeken per sessie, laatste opening en
PDF-uitgiften. Alles in Dataverse; geen IP's, namen/e-mailadressen of apparaatdata.

Andere recente onderdelen: beheerdersinstellingen voor loginachtergrond met
uitsnede/blur in Dataverse; native Rapportages; stille rapportagelading op artiest-
pagina's; afgeschermde voorbeeldafbeeldingen voor barrieropstelling/vloerdruk.

De 05:00-agenda-import (Europe/Amsterdam) kijkt 45 dagen vooruit voor de tien
vastgelegde MOJO-locaties. Tijdschema-opname om 12:00 op showdagen blijft behouden.
Artiestfoto wordt bij de eerste relevante import vastgelegd, niet dagelijks vernieuwd.
MCP in ESMOJO is verwijderd; geen routes/consent/publicatie daarvan herstellen.
De korte artiesttekst is bewust [Description placeholder], geen migratiebacklog.

## Open punten — geen opdracht om ze automatisch uit te voeren

- CSV-aanlevering door Power Automate rechtstreeks naar Dataverse; Drive-mapimport
  is verwijderd en mag niet terugkomen.
- Verdere invulling van de Showbeheer-mailto en eventuele vervanging van andere
  Resend-mailstromen vereisen een eigen opdracht; bestaande mails niet stil stoppen.
- Projectteam-kaart; Showbeheer-blokken A–D (E is nu PDF); Gashouder-statusvakken.
- Detailformulieren voor Entreeproces (Gashouder=NVT), Vluchtweg beperkingen,
  Vuurwerk, Open vuur, Lasers en Drones. De bestaande Ja/Nee-keuzes werken al.
- Productiemanager, projectleider TSC/The Firm en ingangsconstructie bij Artiesten.
- Werkelijke Showprofiel-mailflow/openingshistorie; het beheerblok is voorbereid.
- Overige MOJO-automatiseringen opnieuw ontwerpen; genoemde agenda/tijdschema-
  uitzonderingen behouden. Geen nieuwe scrape/import starten op basis van deze lijst.
- De gebruiker doet de ingelogde acceptatietest; ontbrekend bewijs niet invullen.

Artiesten binnen 1 seconde is niet bewezen. Gebruiker heeft verdere optimalisatie
na V1.149 expliciet laten stoppen. Geen nieuwe performancewerkzaamheden zonder
opdracht. Metingen van backend, synthetische browser en echte sessie onderscheiden.

## Relevante bronnen per taak

- docs/samenwerken.md: registratie, overlap, branches, tests, publicatie.
- docs/claude-code.md: Claude-toegang en concrete startprompt.
- docs/dataverse/concert-catalogue.md, shows-native-runtime.md,
  reports-native-runtime.md, artist-native-runtime.md: native contracten.
- docs/dataverse/google-detachment.md: Google-afsluiting en bewijsgrenzen.
- docs/showbeheer.md en taaknotities showbeheer-pdf-sharing-20261117 en
  showbeheer-series-scope-20261117: actuele Showbeheer-afspraken.
- docs/dataverse/website-settings.md: loginachtergrond en beveiligde schema-setup.
- .github/workflows/check.yml: actuele regressies/browserchecks.
- docs/tasks/: taakdoelen/overdracht; controleer PR/commit/uitkomst, een oude
  geplande of onvolledige notitie bewijst niet de huidige productiestatus.
