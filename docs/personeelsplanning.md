# Personeelsplanning

Pagina `/beheerder/personeelsplanning` (src/staff-planning.js): titelblok met tabjesmenu (Totaalplanning) en een paginabrede tabel.

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
