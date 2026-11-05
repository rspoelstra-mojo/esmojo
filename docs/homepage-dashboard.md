# Homepage planningdashboard

## Bronnen en afbakening

De aangeleverde overdracht bepaalt functionaliteit, de HTML bepaalt het uiterlijk.
De homepage `/` heeft uitsluitend het bestaande hoofdmenu en geen submenu.
De eigen `.home-*` componenten gebruiken het lichte schema uit de referentie,
ook als het hoofdmenu het bestaande donkere systeemthema volgt. De expliciet
gevraagde cqw-tekstverhoudingen zijn alleen op de linker concertkaarten toegepast.
Andere pagina's, lettergroottes en het hoofdmenu blijven ongewijzigd.

`_esmojo_shows_v1.json` in de bestaande Drive-map Productie is de bron. Het
canonieke Gashouder-ID is `gashouder` uit server/mojo-venues.js. Bestaande records
hebben geen apart zaal-ID: importvalidatie vereist exact Gashouder/Amsterdam.
De dashboardprojectie controleert diezelfde canonieke combinatie en geeft het
code-ID mee. OnTrack-concerten en hun aparte register worden nooit gebruikt.

De bestaande shows zijn reeksen, met generalConcertId als sleutel. Alle
reeksdatums blijven de deadlinebasis bepalen; active bepaalt welke groepen nog
actueel in de geïmporteerde catalogus staan. Verdwenen groepen worden niet als
actieve planning verzonnen. Onderliggende historie wordt niet gewijzigd.

De vijf linkerkaarten gebruiken echte afzonderlijke showdagen, chronologisch
op datum, bekende tijd en stabiel concert-ID. Reeksen delen hun bestaande pagina
en voorbereiding; de rechter lijst en Mijn shows tellen alle gekoppelde showdagen,
terwijl gedeelde reeksdeadlines één keer tellen. Vandaag blijft
zichtbaar; een onbekende starttijd blijft leeg. Er is geen nieuwe tijdscrape.
Alle gekoppelde actieve showdagen blijven voor de rechterlijst meetellen,
met hun gedeelde voorbereiding voor het deadlineoverzicht,
ook buiten vijf kaarten of het 90-dagenvenster van het gewone Shows-submenu.

## Bestaande planning hergebruiken

shared/home-planning.js hergebruikt src/lib/show-planning.js: 31/14/7/1
kalenderdagen vóór de eerste reeksdatum plus Showdag. Geen vijf fictieve
records per concertdatum en geen eigen deadline-intervallen.

Showprofiel is alleen af als de huidige PDF-revisie via de bestaande
report-status klaar en downloadbaar is. Productionele afronding gebruikt de
bestaande choices en bevestigde barrier/floor-statussen, inclusief NVT/Nee.
Operationeel en maatregelen blijven voorlopig open, conform bestaande planning.
Showdag is een mijlpaal; hij wordt niet meegenomen in de voorbereidingsstatus.

Achterstallige vereiste voorbereiding betekent Aandacht nodig. Zonder achterstand
betekent Op schema; ontbrekende/onleesbare bron betekent Planning ontbreekt,
met waarschuwing dat de betreffende deadlines niet kunnen worden meegeteld.
Er bestaat geen bevestigde voorsprongregel of algemene showafronding.
Op 5 november 2026 bevestigd: geen Voor op schema en Afgerond als — met uitleg.
Account-showkoppelingen zijn bevestigd Vertrouwelijk in Drive, via de bestaande Vercel-route.
Geen verlopen datum automatisch als afgeronde show behandelen.

Lijstgroepen: verlopen, vandaag en resterend tot zondag; oudere achterstand telt
in totaal maar alleen maandag–zondag telt als deze week. Kalender heeft vorige/
volgende maand en alle open mijlpalen. Nederlandse kalenderdagen gebruiken
Europe/Amsterdam; geen datumverschuiving door UTC/zomertijd. Maandraster start
maandag. Deadline-items wijzigen geen afrondstatus.

## Minimale beveiligde gegevensroute

`home-dashboard` vereist dezelfde actuele Shows-module, activatie, MFA en sessie
als de bestaande showroutes. De getekende Drive-brug controleert de actieve
accountmodule nogmaals. Zij bundelt uitsluitend canonieke metadata en noodzakelijke
statusvlaggen; geen analyses, ticketinhoud, historie, manager-ID, PDF-bytes of
Drive-ID's naar de browser. Statuslezing schrijft niets en genereert geen PDF.
Snapshotfouten worden expliciet onbekend en niet stilzwijgend onafgerond/groen.

Foto's komen via de bestaande beveiligde show-photo-route en openbare MOJO-bron.
Alleen zichtbare foto's worden op de achtergrond opgehaald; ontbrekende foto
blijft een neutraal vlak met dezelfde verhouding. Geen Unsplash of andere foto.

Beide lijsten linken naar `/shows/<generalConcertId>`. De beveiligde
home-metadata-read maakt ook de bestaande showpagina bereikbaar voor een
canonieke actuele reeks buiten het 90-dagenmenu, zonder dat menu uit te breiden.
Late reacties mogen een reeds geopende show of een nieuwe pagina niet vervangen.

Gegevens uitsluitend in componentgeheugen, niet in localStorage/IndexedDB.
Verversen bij navigatie, focus/zichtbaar worden en periodiek; ongewijzigde
snapshots vervangen de DOM niet. Dag-/weekgrenzen worden ook zonder nieuwe read
opnieuw berekend. Wissel Lijst/Kalender en de gekozen maand blijven behouden bij
verversen. Opruimen bij verlaten, afmelden en modulewijziging.

## Verificatie en status

Echte index, exacte accountmatch en bestaande statusdocumenten via de toegestane
Drive-koppeling gelezen. Alleen lokaal buiten Git verwerkt. De nieuwe readprojectie
is lokaal met die echte documenten en officiële MOJO-foto's uitgevoerd. De backfill is op 5 november uitgevoerd in het aparte vertrouwelijke register
_esmojo_show_assignments_v1.json in Productie en via Drive teruggelezen. Geen
manager-ID of relatie wordt in de openbare concertindex opgeslagen.

Unit-/integratiecontroles voor scope, volledige versus vijfshowsselectie,
reeksidentiteit, echte afrondingen, ontbrekende data, kalender-/weekgrenzen,
MFA/moduleweigering op server en Drive, directe showroutes en late reacties.
Browsercontrole op 320, 700, 900, 1100, 1280, 1440, 1920 en 2560 px, met beide
systeemthema's: lichte dashboardstijl, 1/2/3 kolommen, 320:213-fotoverhouding,
uitlijning, rechter cijferblok gelijk aan eerste kaart, geen paginaoverflow,
kalendernavigatie/refreshbehoud en lege/fout/herlaadstatus.

De centrale tijdelijke regel staat in google-apps-script/ShowAssignments.gs.
Zij zoekt het bestaande account op exacte mail, gebruikt diens stabiele ID en
voegt ontbrekende concert/user/rol-combinaties toe. Bestaande relaties/rollen
blijven behouden. Herhaling schrijft niets; ontbrekend/ambigu account blokkeert
uitsluitend toewijzing en geeft een veilige importstatus. De normale getekende
shows-import gebruikt dezelfde regel voor alle bestaande en nieuwe showdagen.
Uitschakelen/vervangen van die beleidsfunctie bereidt echte managerkeuzes voor.
Alle overige accounts blijven zonder persoonlijke toewijzing tenzij er een echte
relatie bestaat; beheerder/superrol maakt iemand niet automatisch eigenaar.

De gepubliceerde versie en workflowresultaten staan in de taaknotitie.
