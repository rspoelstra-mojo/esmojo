# Gereedheid voor Shows-omschakeling

Status 13 november 2026: **niet vrijgegeven**. De gebruiker autoriseert eerst een
onafhankelijke eindvalidatie en daarna de omschakeling. Dat is geen bewijs dat de
bestaande website al een volledige native Dataverse-runtime heeft.

## Wat aantoonbaar bestaat

- Afgeronde kopie: beheerpagina meldt 33 shows, 810 records en 16 bestanden.
- Afzonderlijke read-only hercontrole: shows-validation.yml. Het eindresultaat
  moet apart worden bevestigd; een lopende of groene technische ronde is niet
  automatisch een volledig gevalideerde collectie.
- Bestaande Dataverse-onderzoekstekst, broncatalogus en schema-/kopieerfuncties.
- Native record-/documentleesprimitieven in de taakbranch, nog niet aangesloten
  op de website; de beveiligde API-poort blijft verplicht.

## Runtimeblokkade

server/shows-store.js routeert zakelijke Shows-operaties nog naar Apps Script
of createActiveShowService. Die actieve service gebruikt Supabase en voor
onder meer tickets, vloer, bestanden en PDF's de Drive-brug. Er is geen complete
Dataverse-provider die deze contracten vervangt. Geen generieke vlag kan dit
veilig veranderen; ontbrekende functies mogen niet stil terugvallen op Drive.

Voor activering zijn minimaal deze native contracten nodig:

| Gebied | Vereiste dekking |
|---|---|
| Catalogus en oude URLs | Identiteit, reeks/uitvoering, datumgroepen, nieuwe agenda-imports en aliases |
| Gezamenlijke showopening | Profiel, ticketbasis, risico's, barrier/vloer en toepasselijke PDF-status in één consistente laadronde |
| Eigen analyses | Lezen/schrijven, exacte revisies, historie, categorieafronding en invalidatie |
| Tickets en herkomst | Bestaande inhoud, afzonderlijke uitvoeringen, reserveren/vernieuwen/vrijgeven, review/heropenen |
| Productionele/operationele risico's | Bronversies, beoordelingen en afhankelijke maatregelen behouden |
| Barrier, vloer en maatregelen | Concept/afronden/heropenen, nul/ontbrekend, basishashes, bijlagen en briefing |
| PDF en documenten | Versiegebonden jobs, native File-upload/download, hash/omvang, actuele revisie en bronanalyse |
| Showbeheer | Bestaande link/PIN/AAD, voortgang en atomaire pogingbeperking; geen toegang tot andere modules |
| Achtergrondwerk | Nieuwe Shows-autoriteit voor agenda, AI/PDF-koppeling en planning; oude zakelijke mirror-/archivewriters gecontroleerd stoppen |
| Gedeelde afhankelijkheden | Huidige accounts/rechten behouden en aangrenzende artiest-/rapportageroutes niet verouderen |

## Activeringsvolgorde

1. Bevestig de volledige onafhankelijke bron/doelcontrole inclusief relaties en
   bestandsbytes; leg technische run en aantallen vast zonder inhoud in Git/logs.
2. Bewijs native lees-/schrijfpariteit, autorisatie en concurrency met synthetische
   tests en gecontroleerde productie-reads. Geen fictieve zakelijke productie-writes.
3. Sluit nieuwe legacy writes tijdelijk, laat bestaande leases/commando's uitlopen,
   controleer laatste bronwatermarks/delta en vergelijk opnieuw. Niet half omschakelen.
4. Publiceer één autoriteit voor alle Shows-lees- én schrijfproviders en workers.
   Geen parallelle bedrijfswriters of stille bronfallback. Behoud Auth en andere modules.
5. Voer ingelogde rookproeven en een eerste normale opslag met de echte bevoegde
   gebruiker uit; controleer native teruglezing en oude URLs. Pas daarna gereed melden.
6. Bewaar originelen. Na nieuwe native writes is blind terugzetten van een vlag
   geen herstelplan: eerst de native delta bewaren/verzoenen of fail-forward herstellen.

Het ontbreken van deze dekking is een blokkade voor cutover, geen toestemming om
gegevens te verwijderen of de productiegebruikers met ontbrekende functies te laten werken.
