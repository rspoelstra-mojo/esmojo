# MCP verwijderen en artiestbeschrijvingen vervangen

Eigenaar huidige Codex-sessie, eigen branch vanaf actuele main 1da53a8.
Gebruiker vraagt MCP volledig uit ESMOJO te verwijderen en de korte
artiestbeschrijving op dezelfde plek te vervangen door [Description placeholder].
De beschrijvingen niet meenemen in volgende migraties.

Scope: MCP API/OAuth/discovery, uitsluitend MCP-servercode en Apps Script
MCP-authdispatch, tests/CI/documentatie. Onderzoeksgegevens en gewone website-
onderzoeksfuncties behouden. Artiestbeschrijving in UI/API uitschakelen en
bijbehorende automatische capture stoppen. Geen bestaande bedrijfsgegevens,
onderzoeken of oude technische registers verwijderen; geen geheimen wijzigen.
Publicatie via bestaande GitHub/Vercel/Apps Script toegestaan, daarna verifiëren.
Registratie vóór implementatie.

Aanvullende gebruikersinstructies tijdens deze taak: verwijder de huidige CSV-
aanlevering via Drive zonder vervangende import te bouwen. Verwijder alle
MOJO-ophaalautomatiseringen, behalve het tijdschema om 12:00 op de showdag.
Neem agenda/concertregister/foto/biografie- en paginalaadfallbacks mee. Bestaande
Dataverse-rapportages/Files blijven leesbaar; verwerk uitsluitend bestaande native
CSV-bestanden voor bestaande PDF/mailfuncties. Geen oude brongegevens verwijderen.

Laatste aanvulling/uitzondering: één centrale Dataverse Concert/Artiest-catalogus,
geen modulespecifieke concertregisters. Agenda-import blijft om 05:00 Nederlandse
tijd met 45 dagen vooruit, voor Johan Cruijff ArenA, GelreDome, Ziggo Dome,
AFAS Live, Rotterdam Ahoy, Brabanthallen en Gashouder. Native ConcertID/showpagina
en ontbrekende artiest aanmaken. Tijdens die import éénmalig de foto ophalen op
de MOJO-artiestpagina; bij de artiest vastleggen en overal hergebruiken. Een
vastgelegde foto niet dagelijks controleren/vervangen. Alle nieuwe registratie
uitsluitend Dataverse; het tijdschema om 12:00 op de showdag blijft de andere
MOJO-ophaaluitzondering. Deze instructie vervangt de aanvankelijke volledige
agenda-stop. Bestaande zakelijke gegevens en oorspronkelijke bewijzen behouden.

Aanvullende locaties: AFAS Stadion (Alkmaar), Malieveld (Den Haag), Goffertpark
(Nijmegen). Canonieke naam Rotterdam AHOY voor Ahoy-varianten, zonder bestaande
ConcertID's te wijzigen of dubbel aan te maken. Definitieve scope: tien locaties.

Implementatie gereed voor publicatiecontrole: centrale native catalogus, tien
locaties, vaste 05:00/12:00-routes, fotoselectie bij artiest, CSV-intake/MCP verwijderd.
889 tests geslaagd, één bestaande skip; tokenvernieuwing twee regressietests,
Apps Script 54 bronnen ES2020 en zeven publicatietests geslaagd. Build geslaagd.
Synthetische Artiesten- en TSC/MOJO-rapportbrowsercontroles: desktop/mobiel,
licht/donker geslaagd. Geen productieconcerten of mails voor tests aangemaakt.
Publicatie en actuele bronprobe nog afzonderlijk te bevestigen.
