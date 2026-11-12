# Datatransitie beheren

Open /beheerder/datatransitie met een actief beheerdersaccount met Shows-toegang
en bestaande tweestapsverificatie. De pagina draait via de bestaande ESMOJO-server
met de bestaande Drive-brug en DATAVERSE_TEST_* configuratie. Geen nieuwe secrets,
tabellen of kolommen nodig. De app moet aanmaakrecht op Onderzoeksresultaten hebben.

## Globale keuzelijsten voorbereiden

Op dezelfde beheerpagina staat **Keuzelijsten aanmaken en controleren**.
Eén bewuste klik verwerkt de 24 nieuwe globale lijsten uit het vastgestelde
[Shows-schema](shows-schema.md). Er is geen voorafgaande showselectie nodig.

De server controleert bestaande Dataverse-configuratie, de onbeheerde oplossing
ESMOJO met publisherprefix esmojo en de basistaal van de omgeving. Daarna wordt
iedere lijst gelezen. Alleen een echte 404 betekent ontbrekend; een lees-/rechten-
fout start geen aanmaak. Nieuwe lijsten gebruiken de exacte namen/labels/waarden.
Bestaande afwijkende of managed lijsten worden als conflict gemeld, zonder hun
inhoud bij te werken. Overeenkomende lijsten en nieuwe lijsten worden aan ESMOJO
gekoppeld en uitsluitend per goedgekeurde lijst gepubliceerd met PublishXml.
De server leest daarna de metadata terug. Er is geen PublishAll en geen bewerking
van tabellen, showgegevens of de bestaande lokale Opruimstatus.

Houd de pagina open. Bij een onderbreking opnieuw dezelfde knop gebruiken:
bestaande definities worden opnieuw vergeleken; er ontstaan geen dubbele namen.
Bij conflicten gaan de overige lijsten door en volgt een telling. Een fout bij
rechte-/netwerk-/publicatiecontrole stopt de huidige ronde. Eerder aangemaakte
lijsten blijven staan en de huidige lijst toont Niet bevestigd.

De app moet metadata mogen lezen, globale keuzes aanmaken, componenten aan de
oplossing toevoegen en die keuzes publiceren. Lezen vooraf bewijst op zichzelf
geen schrijfrecht; Dataverse controleert de benodigde rechten bij iedere actie.
Geen extra geheimen of Graph/Drive-toegang nodig voor deze functie.
De eerste werkelijke setup gebeurt via de ingelogde beheerpagina; lokale tests
gebruiken synthetische Microsoft-antwoorden en maken geen echte opties aan.

## Tabellen automatisch voorbereiden

Op dezelfde pagina staat **Tabellen aanmaken en controleren**. Gebruik deze na
een geslaagde keuzelijstsetup. De knop voert 564 vaste schemastappen uit:

1. De 24 globale keuzelijsten opnieuw vergelijken, zonder ze te wijzigen.
2. 29 nieuwe organisatie-eigendom-tabellen aanmaken of controleren; bestaande
   Onderzoeksresultaat alleen herkennen en behouden.
3. 339 overige gewone kolommen aanmaken/controleren. De 29 primaire naamkolommen
   horen al bij tabelaanmaak. Keuze-, datum-, File-, tekst- en getaltypen blijven echt.
4. 89 N:1-lookups en restrictieve relaties aanmaken/controleren; de onderzoekstabel
   krijgt uitsluitend de optionele lookup naar Concertreeks.
5. Alle vereiste definities per tabel opnieuw server-side controleren en alleen
   de 30 overeengekomen tabellen publiceren. Geen PublishAll.
6. 52 sleuteldefinities controleren: 51 nieuwe, plus de bestaande onderzoekssleutel.
   Nieuwe indexen mogen asynchroon Pending/InProgress zijn, maar tellen pas als
   bevestigd wanneer Dataverse Active meldt. Bestaande onderzoekssleutel niet wijzigen.

Houd de pagina open; de verwerking kan enige tijd duren. Er staat per stap wat
wordt gecontroleerd. Bij een afwijkend type, lengte, verplichting, relatie,
eigendom of sleutel stopt de ronde. Er is geen automatische correctie van een
bestaande definitie. Eerder aangemaakte metadata blijft behouden. Opnieuw klikken
leest alles opnieuw en maakt geen dubbele definities. Sleutelindexen worden na
de aanmaakfase opnieuw gecontroleerd, maximaal drie minuten; daarna kan dezelfde
knop later opnieuw gebruikt worden als Dataverse nog bezig is.

De JSON-schemafile wordt expliciet in de Vercel access-functie meegeleverd.
De app moet de betreffende metadata mogen lezen/aanmaken en gericht publiceren.
Schema-aanmaak voegt geen showrecords toe en verandert geen live opslagprovider.
Getalstandaarden (bijvoorbeeld revisie 0) worden straks door recordschrijvers
gezet; daarvoor bestaat geen native IntegerAttributeMetadata.DefaultValue.
Native defaults voor Ja/Nee en globale keuzekolommen worden wel gecontroleerd.

API-vormen gecontroleerd tegen Microsofts documentatie:
[tabellen](https://learn.microsoft.com/power-apps/developer/data-platform/webapi/create-update-entity-definitions-using-web-api),
[kolommen](https://learn.microsoft.com/power-apps/developer/data-platform/webapi/create-update-column-definitions-using-web-api),
[relaties](https://learn.microsoft.com/power-apps/developer/data-platform/webapi/create-update-entity-relationships-using-web-api),
[File-kolommen](https://learn.microsoft.com/power-apps/developer/data-platform/file-attributes),
[asynchrone sleutels](https://learn.microsoft.com/power-apps/developer/data-platform/define-alternate-keys-entity).
Lokale native-API-simulaties bewijzen niet dat de live setup al is uitgevoerd.

## Alles in één keer

Klik **Alle AI-analyses overzetten**. Geen voorafgaande showselectie nodig.
De pagina laadt de volledige Drive-showcatalogus, ongeacht het zoekfilter,
inventariseert aanwezige analyses en importeert die één voor één. Voortgang toont
show/vraag, bevestigde analyses, nieuwe records, ontbrekende vragen en conflicten.
Conflicten worden per show/vraag gemeld en niet overschreven; andere analyses gaan
door. Afwezige vragen zijn geen fouten en er worden geen nieuwe onderzoeken gestart.

Houd dit tabblad open. Bij een onzekere schrijf-/verbindingsfout stopt de verwerking.
Klik **Alle AI-analyses hervatten** om in hetzelfde tabblad verder te gaan vanaf de
onbevestigde analyse. Na verversen of weggaan kun je de hele knop opnieuw starten;
bestaande identieke inhoud wordt gecontroleerd en niet dubbel aangemaakt. Een
nieuwe ronde na voltooiing haalt de catalogus opnieuw op, inclusief nieuwe shows.

## Eén show controleren

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
