# MOJO-tijdschema's in de webrapportage

De gebruiker heeft de geplande showtijden op 5 november 2026 Openbaar verklaard.
Alleen de canonieke MOJO-concertpagina uit de bestaande Productie-/OnTrack-
concertcatalogi is toegestaan. Geen andere bron, client-URL, CSV-tijdstip of
algemene ticket-aanvang als vervanging voor het gepubliceerde tijdschema.

## Middagopname vóórdat de rapportage bestaat

De bestaande mojo-shows.yml plant de taak dagelijks om 12:00 Europe/Amsterdam,
met de bestaande zomer-/wintertijdcontrole. Eerst de tijdschema-opname, daarna
beide bestaande inventarissen, en een tweede idempotente poging voor nieuw
ontdekte concerten of een eerdere tijdelijke fout. Een mislukte eerste poging
wordt door een geslaagde tweede poging hersteld zonder de andere inventarissen
over te slaan. OIDC vereist main, de eigen workflow/repository en eigen audience
https://esmojo.nl/api/timetables-sync. Browser- of previewverzoeken starten niets.

GitHub kan geplande jobs vertragen: de werkelijke opnametijd wordt opgeslagen en
getoond, nooit teruggedateerd naar 12:00. De uitvoer accepteert uitsluitend de
Nederlandse showdag in het middaguur (12:00–12:59); buiten dat uur geen fetch of
schrijfwerk. Er wordt niet een week vooraf of een dag achteraf een schema als
middagopname opgeslagen. Vooraf wordt voor alle relevante catalogusconcerten van
die dag opgenomen, omdat de CSV/rapportage doorgaans pas later beschikbaar komt.

## Parser en bronbinding

server/mojo-timetable.js gebruikt een echte HTML-parser. Hij selecteert de
Tijdschema-sectie, de exacte datumtab en de juiste zaal/stad en controleert de
artiesttitel. Het aantal rijen/acts staat niet vast. Ondersteund: deuren,
meerdere support-/surprise-/hoofdacts, pauzes en verwacht einde, inclusief
punt-/dubbelepunttijden en starttijden uit expliciete intervallen. Alleen echt
gepubliceerde tijden worden opgenomen; onbekende tijden blijven onopgelost.

24:00 wordt volgende dag 00:00. Andere nachtelijke kloktijden volgen de expliciete
avondcontext/deuren of gepubliceerde tab-aanvang, met kalenderdatums in Nederland.
Bij meer dan één niet te onderscheiden uitvoering op dezelfde datum/zaal wordt
niet willekeurig de eerste genomen. Verkeerde datum/zaal/artiest, ongeldige
kloktijden of veranderde bronopmaak leveren geen verzonnen moment op.

## Bewaren en rechten

Opnamen staan per canoniek concert-ID als openbaar geclassificeerd JSON in de
bestaande OnTrack-map, submap Tijdschemas. Elke opname bewaart bron-URL,
werkelijke capturedAt, HTML-bronhash en de oorspronkelijke labels plus tijden.
Een eenmaal beschikbare opname wordt niet vervangen of verwijderd als MOJO de
volgende dag de concertinformatie weghaalt. Herhaling schrijft geen dubbelen.
Een ontbrekend schema mag in hetzelfde middagvenster opnieuw worden geprobeerd;
een eerdere beschikbare opname blijft ook bij fouten intact.

HMAC, nonce, bron-/datum-/tijdvalidatie en bestaande Drive-lock blijven vereist.
Opslag uitsluitend voor bekende catalogus-ID's. De gedeelde validator is exact
gegenereerd naar Apps Script. Lezen vereist actieve Reports-module en MFA via
de bestaande rapportage-API; de Drive-brug controleert de module opnieuw. Geen
vrije bestands-ID of openbare Drive-link. Bestaande CSV/PDF/ontvangersregisters,
incidentberekeningen en e-mail-/PDF-generatie veranderen niet.

## Weergave

De rapportprojectie leest de bewaarde opname tegelijk met de bestaande bron/foto.
De individuele incidentenlijst voegt kleine gecentreerde, afwijkend getinte
blokken in, chronologisch en vóór incidenten op dezelfde minuut. Teksten:
Geplande tijd deuren open; Geplande aanvang [gepubliceerde actnaam]; Geplande
starttijd pauze; Geplande eindtijd show. De werkelijke kloktijd staat ervoor.

Blokken tellen niet mee als incident, KPI of grafiekpunt. Medische/beveiligings-
filters blijven werken; de geplande momenten blijven als context zichtbaar.
Op brede schermen beslaat een tussenkop de volle breedte van de incidentgrid.
De bestaande vijf datumtabs tonen de opname van hun eigen rapportdataset.

Historische rapporten van vóór deze functie hebben geen gereconstrueerd schema.
Wanneer geen op de showdag vastgelegde opname bestaat, toont de pagina dit
expliciet en verzint geen tijden. De huidige Jungle-show is van vóór de opname-
functie; de actuele MOJO-pagina bevat daarvoor geen te archiveren tijdschema.

## Controles

Parser op actuele officiële MOJO-pagina gecontroleerd (uitsluitend lokale
parserproef, geen vervalste middagopname opgeslagen). Synthetische acceptatietests
voor meerdere acts/pauzes, datums/zaalbinding, nachtgrens/24:00, sortering, filters,
noon in zomer/winter, geen vóór-/achterafopslag, immutable archief bij verwijderde
bron, OIDC/HMAC/modules en behoud van bestaande rapportberekeningen.
