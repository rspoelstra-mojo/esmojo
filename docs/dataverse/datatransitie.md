# Datatransitie beheren

Open /beheerder/datatransitie met een actief beheerdersaccount met Shows-toegang
en bestaande tweestapsverificatie. De pagina draait via de bestaande ESMOJO-server
met de bestaande Drive-brug en DATAVERSE_TEST_* configuratie. Geen nieuwe secrets,
tabellen of kolommen nodig. De app moet aanmaakrecht op Onderzoeksresultaten hebben.

1. Klik **Shows laden**. De bestaande Drive-index levert ook historische shows.
   Opeenvolgende reeksdatums delen onderzoek: alleen de primaire datum staat hier.
2. Zoek bijvoorbeeld **Antoon** en kies de juiste zaal/datum.
3. Klik **Voorbeeld bekijken**. Elf analyses worden één voor één gelezen;
   afwezige bestanden worden als afwezig gemeld. Klap de teksten open en controleer.
4. Klik **Importeren en controleren**. Elke aanwezige analyse wordt opnieuw uit
   Drive gelezen. Gewijzigde bronnen vereisen een nieuw voorbeeld. De server voegt
   ontbrekende bronlinks onder elkaar aan de volledige Markdown toe.
5. Alleen na teruglezen meldt de pagina de analyse als bevestigd. Open vervolgens
   de showpagina. Eigen ESM-teksten en beoordelingen worden niet overgenomen.

Bij een onderbreking blijven eerder bevestigde imports behouden. Klik opnieuw op
importeren om de resterende te proberen. Na een paginaverversing laad je hetzelfde
voorbeeld opnieuw: identieke bestaande inhoud wordt herkend, zonder nieuwe rij.
Afwijkende bestaande Dataverse-inhoud wordt nooit overschreven. Er is geen rollback
van reeds bevestigde analyses: ze blijven leesbaar en de Drive-originelen blijven staan.
De pagina maakt geen nieuwe onderzoeken en verwijdert geen bestanden.

## Herkomst en opruiming

De bronnamespace `8d4b3512-7f82-4d51-a98a-a0c67d629184` staat voor deze logische
Drive-import, niet voor een SharePoint-bibliotheek. `bronbestanditemnummer` is een
stabiel logisch importnummer uit de show-sleutel/vraag; geen native bestands-ID.
`bronbestandpad` is `drive-research/<show-sleutel>/onderzoek_NN.md`, een logisch
importpad; geen downloadlink. Bronversie is `1.0`. `createdon` is importtijd.
Record-ID is deterministisch per show/vraag en writes gebruiken If-None-Match:*.
Een zeldzame alternatieve-sleutelbotsing veroorzaakt een fout, geen overschrijving.
De primaire naamkolom wordt via tabelmetadata opgezocht.

Opruimstatus blijft `158610000` (Nog niet vrijgegeven), zonder bron-ETag.
De bestaande SharePoint-flow filtert op haar eigen bibliotheek-ID en raakt deze
records niet. De website leest beide expliciet toegestane bronnamespace-waarden.
Geen extra onderzoeksdatum of gestructureerde bronnenkolom.

De eerste echte Antoon-import moet vanuit de ingelogde beheerpagina gestart
worden. Lokale tests gebruiken uitsluitend synthetische analyses en bewijzen
geen geslaagde productie-import of actuele Microsoft-schrijfrechten.
