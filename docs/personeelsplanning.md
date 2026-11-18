# Concertagenda (voorheen Personeelsplanning)

Pagina `/beheerder/concertagenda` (src/staff-planning.js; de oude route `/beheerder/personeelsplanning` verwijst door): titelblok met vier tabs en een
paginabrede tabel. De concertkolommen (Artiestnaam, Locatie, Datum) blijven altijd zichtbaar; de kolommen erachter wisselen per tab (V1.196,
`staffTabs` in shared/staff-planning.js): **Algemeen** (nog geen extra kolommen), **MOJO personeel** (Productie manager, Event Safety manager,
CMT leider MOJO), **Beveiliging** (Projectleider beveiliging) en **Zaal** (Productie manager zaal, Event manager zaal, CMT leider zaal).
Wachtende invoer blijft bij een tabwissel staan en wordt op de achtergrond opgeslagen; opslag, revisies en rechten zijn ongewijzigd.

**Gegevens**
- *Concertlijst* (openbare MOJO-gegevens): de 05:00-import (`staffplanning`-stap in `shows-sync`, `mojo-shows.yml`) leest per zaal de komende 365 dagen
  uit de MOJO-agenda (tien vaste zalen) en bewaart per zaal en maand één rij `staff-planning-list-v1` in de bestaande Integratiestatus.
  Alleen gewijzigde maanden worden herschreven; een lege uitkomst terwijl er een lijst bekend is wordt als verdacht geweigerd.
  Dit staat los van de 45-dagencatalogus (concerten, artiesten, foto's, tijdschema's, Showbeheer).
- *Namen* (Vertrouwelijk): één rij `staff-planning-names-v1` per concert, de zeven functies als AES-GCM-versleutelde JSON met revisie
  (sleutel afgeleid van `GOOGLE_DRIVE_SHARED_SECRET`, domein `esmojo/staff-planning/v1`, AAD per concert). Geen schemawijziging.

**Rechten:** lezen en opslaan alleen voor actuele beheerders (MFA). Het blok Projectteam op de showpagina leest uitsluitend de vier getoonde
functies via de Shows-module (`show-team`, alleen lezen).

**Opslaan:** na een korte typpauze of bij verlaten van het veld, serieel per concert met de laatst bevestigde revisie en teruglezen. Bij een
revisieconflict wordt eenmalig de actuele revisie opgehaald en dezelfde invoer opnieuw opgeslagen; daarna een melding met Opnieuw proberen.
Een herhaalde opdracht na een verloren bevestiging (zelfde waarde al opgeslagen) is geslaagd. Wachtende invoer telt mee voor de afsluitwaarschuwing.

**Projectteam op de showpagina:** Productiemanager = Productie manager, Event Safety manager, Projectleider TSC = Projectleider beveiliging,
CMT leider = CMT leider MOJO; bij een reeks de namen van de eerste datum. Leeg = Nog niet ingevuld.

## Artiestnaam aanpassen (V1.197, tab Algemeen)
In tab Algemeen is de artiestnaam een invoerveld (met suggesties van bestaande artiesten). Een aanpassing geldt voor alle concerten met dezelfde
MOJO-bronnaam en wordt automatisch opgeslagen (revisiecontrole). De oorspronkelijke MOJO-naam blijft klein zichtbaar; leeg of gelijk aan de bronnaam zet
de alias terug. Opslag: Integratiestatus `artist-alias-v1` (Openbaar, geen nieuw schema; `server/dataverse-shows/artist-alias.js`, `shared/artist-alias.js`).
De alias wordt toegepast in de agenda, in de 05:00-import (een nieuw concert onder een afwijkende titel valt onder de gekozen artiest; bestaande concerten
met hetzelfde concert-ID blijven ongewijzigd) en bij het koppelen van CSV-ontvangsten (bestandsnaam met bron- of gekozen naam). Bestaande concerten
verplaatsen en handmatige reeksen volgen in fase 2 en 3 (docs/tasks/claude-concert-agenda-20261118.md).

## Bestaande concerten koppelen aan de gekozen artiest (V1.198)
Na het opslaan van een alias koppelt de server bestaande Shows-concerten onder de bronnaam aan de gekozen artiest (bestaande artiest of, zo nodig,
aangemaakt zoals de 05:00-run). Per reeks, alleen als er geen showgegevens aan hangen: geen documenten, bestanden of bevestigde voorbereidingsstand
en geen gepubliceerde/ontvangen rapportage (een mislukte controle telt als aanwezig). Er worden uitsluitend de bestaande rijen bijgewerkt via ETag-changesets
(artiestkoppeling en naam van reeks en concerten, plus de bijbehorende route-alias), waarna dezelfde Shows-controle als bij elke bewerking de nieuwe stand
bevestigt. Anders blijft alles zoals het was en meldt de Concertagenda dat. Een artiest zonder reeksen blijft bestaan (alleen gemeld); concert-ID's,
foto's en eerdere gegevens worden niet verwijderd. Rapportage-alleen-concerten (historisch of via CSV aangemaakt) en de groepering in het Rapportages-menu
volgen de gekozen naam nog niet; dat is een vervolgstap.

## Inhaalronde en melding (V1.199)
De dagelijkse 05:00-import past aliassen opnieuw toe op bestaande concerten (idempotent, per reeks, een fout stopt de import niet), voor aliassen die zijn
opgeslagen voordat het koppelen bestond of waarvan een concert tijdelijk niet te controleren was. De Concertagenda meldt ook wanneer er geen bestaand
ESMOJO-concert onder de naam staat, of dat het koppelen niet kon worden uitgevoerd; de server logt dan alleen aantallen en vaste redencodes (geen namen).
