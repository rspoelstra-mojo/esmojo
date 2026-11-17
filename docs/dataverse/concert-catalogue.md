# Eén concertcatalogus en vaste agenda-import

De bestaande Dataverse-tabellen Concert en Artiest zijn de centrale catalogus.
Concert verwijst naar Artiest en Locatie; Concertreeks groepeert opeenvolgende
dagen. Shows, Rapportages en hun keuzes gebruiken dezelfde ConcertID's en relaties.
Bestaande IDs en routealiassen blijven behouden. Losse onderzoeksresultaten maken
geen virtuele concerten meer aan; een onbekende koppeling wordt geweigerd.

De vaste main/OIDC-workflow mojo-shows.yml voert dagelijks om 05:00
Europe/Amsterdam de openbare MOJO-agenda-import uit, 45 dagen vooruit, voor:
Johan Cruijff ArenA, GelreDome, Ziggo Dome, AFAS Live, Rotterdam AHOY,
Brabanthallen, Gashouder, AFAS Stadion, Malieveld en Goffertpark.
Zomer-/wintertijd worden in de workflow én server gecontroleerd. Nieuwe concerten
krijgen een ConcertID en showpagina; ontbrekende artiesten worden aangemaakt.
Bestaande exacte koppelingen worden hergebruikt. Conflicten worden niet samengevoegd.
Ahoy, AHOY Rotterdam en Rotterdam Ahoy worden Rotterdam AHOY; bestaande IDs blijven.

Bij deze import wordt voor elke artiest zonder vastgelegde foto éénmaal de
MOJO-artiestpagina gelezen (sinds 17 november 2026 voor alle artiesten in ESMOJO, ook zonder
concert in de komende 45 dagen, bijvoorbeeld mojo.nl/thekidlaroi). De geselecteerde openbare foto-URL wordt bij de
artiest bewaard en hergebruikt op de website. Dit is een vastgelegde URL, geen
kopie van de afbeeldingsbytes. Een bestaande keuze wordt niet dagelijks opnieuw
opgehaald of vervangen. Ook een ontbrekende foto wordt als poging geregistreerd.
De backlog wordt in batches van 24 met een cursor (`photoAfter`) afgewerkt, maximaal honderd
batches of ca. 35 minuten per run; wat dan nog openstaat volgt bij de volgende import en laat de
run niet falen. Alleen een duidelijk MOJO-antwoord (foto, geen foto of pagina bestaat niet) wordt
vastgelegd. Een tijdelijke fout (netwerk, time-out, 429, 5xx) wordt niet vastgelegd: die artiest
blijft kandidaat voor de volgende run.

Sinds 17 november 2026 controleert de 05:00-import dagelijks, voor alle shows in de
komende 45 dagen, of MOJO een tijdschema publiceert (stap `timetables`, batches van 12 met
cursor `timetablesAfter`). Een beschikbaar schema wordt per concert bewaard in de bestaande
Integratiestatus (`show-timetable-advance-v1`, openbare gegevens, geen nieuw schema); de meest
recente versie wint en een later verdwenen bron wist niets. Een fout bij één concert (alleen
veilige foutcodes geteld) stopt de overige concerten niet, maar laat de run wel falen. De opname
op de showdag om 12:00 en het eindpunt timetables-sync zijn gestopt. Andere MOJO-ophaalautomatiseringen
en pagina-fallbacks zijn uitgezet. Registratie van agenda, foto en tijdschema schrijft niet naar Drive.

MCP, OAuth/discovery voor MCP en het aparte OnTrack-concertregister zijn verwijderd.
De korte artiesttekst toont op zijn bestaande plek [Description placeholder].
De Drive CSV-mapscan en import zijn verwijderd, zonder vervangend aanleverpad.
Een toekomstige Power Automate-aanlevering rechtstreeks in Dataverse wordt later
gebouwd. Bestaande oorspronkelijke bestanden en migratiebewijzen blijven behouden.

De bestaande native Rapportages-uitlezing, parser, berekeningen, filters, tabs,
bronversies, bestanden, PDF's en mailhistorie blijven behouden. Bestaande native
CSV-bestanden blijven beschikbaar voor de bestaande PDF/mailverwerking; dit is
geen importbron. Reguliere aflevering van bestaande rapportages blijft volgens
haar bestaande regels actief. Auth/MFA blijft Supabase; overige accountautoriteiten
veranderen niet door deze taak.

Publicatiecontrole gebruikt verifyOnly: actuele centrale catalogus en openbare
agenda lezen, zonder concerten, foto's, tijdschema's of mails te schrijven. Een
geslaagde controle bewijst geen uitgevoerde 05:00-import; controleer daarvoor de
eerstvolgende geplande run en zijn teruggelezen resultaten.

## Handmatige run en foutdiagnose (17 november 2026)

De agenda-import schrijft alleen in het 05-uur Europe/Amsterdam. Voor een eenmalige run op een ander
moment heeft mojo-shows.yml bij `workflow_dispatch` de input `run_now` (standaard uit, vereist dat
`verify_only` uit staat). De server laat het gesloten venster alleen toe als de OIDC-claims bevestigen
dat de aanvraag van een `workflow_dispatch` op main komt én de aanvraag `manualRun: true` bevat. De
geplande 05:00-run en de 12:00-tijdschemarun veranderen niet. Er is geen andere weg om het venster te openen.

Bij een onbekende fout geeft de server naast de code en stap uitsluitend de foutklasse (`kind`) en een
code-achtige foutcode (`detail`, alleen hoofdletters/underscores) terug; nooit berichttekst of gegevens.
De alleen-lezen verificatie (`verify_only`, ook bij elke push van de workflow) controleert nu ook de
fotokandidaten en meldt het aantal (`photoCandidates`), zonder iets te schrijven.
