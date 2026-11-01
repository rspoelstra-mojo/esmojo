# Aantallen en herkomst

Onder Showprofiel opent dit handmatige onderdeel inline onder de tabjes, met Terug naar overzicht. Vier bezoekers- en zeven artiest-AI-onderwerpen en hun nummers blijven intact.

## Hergebruik
Bron: ESMOJO_Bezoekersblokken_Overdracht.zip, broncommit eb2fa1a532267d7963f3d2358308c04b3bf8cfe6. De landenlijst, provincies, percentages en rekenparsers uit countries.ts, domestic-origins.ts, visitor-origins.ts en ticket-sales.ts zijn naar vanilla JavaScript overgezet in shared/ticket-data.js. TicketValidators.gs is een kopie zonder export-keywords; een test controleert dat de parsers identiek blijven. Gedrag uit SuggestionInput.tsx en de drie kaartcomponenten is overgenomen.

Op expliciet verzoek zijn alle vormgevingsinstructies en bron-CSS genegeerd: bestaande ESMOJO-tokens, typografie, box en licht/donker worden gebruikt. Geen React-dependency.

## Opslag en bescherming
De huidige app heeft geen workflow_json-databasekolom of spreadsheetworkflow. Dezelfde velden/contentstrings worden als workflow_json opgeslagen in een apart Vertrouwelijk bezoekersdata.json in de geverifieerde canonieke reeksmap in Drive. Een toegevoegde eerdere showdatum verplaatst uitsluitend dit eigen bestand mee, met behoud van inhoud/historie. Openbare analyses worden niet aangepast. Tijden komen uit de bestaande showindex, anders Niet vermeld; er worden geen tijden verzonnen.

Alle routes vereisen de bestaande geactiveerde account/MFA en sessiecontrole. De server bepaalt actor en bestemming. Een veldreservering is 120 seconden geldig en wordt tijdens bewerken iedere 40 seconden vernieuwd. Geen vrije Drive-ID's, geen inhoud in logs of persistente browseropslag. Reserveren en schrijven gebruiken de gedeelde ownerlock. Bevestigen vereist eigen geldige reservering én actuele veldversie; conflicten behouden de lokale invoer. Alleen Drive-opslag bepaalt completed_at en badges. Heropenen behoudt content en voegt historie toe.

Er bestaan in deze app nog geen bezoekersscore- of PDF-afrondingsroutes. Die zijn niet toegevoegd; beschikbare workflow-afrondvelden worden bij heropenen ongeldig gemaakt. Er worden geen PDF-versies gewijzigd. De drie velden zijn inhoudelijk verplicht voordat een toekomstige bezoekersafronding mag slagen; die toekomstige route moet serverzijdig validTicketContent én completed_at voor alle drie controleren.

## Suggesties en harde validatie
Landen/provincies zijn statische zoeksuggesties. Accentongevoelige substringmatching, lijstvolgorde en toetsenbordgedrag blijven behouden. Landen mogen buiten de suggestielijst vallen; dubbele landen worden met trim en nl-NL-kleine letters gecontroleerd, zonder accentverwijdering. Nederland/netherlands/nl is verboden in de buitenlandse top 3. Provincies moeten exact één van de twaalf vaste namen zijn en uniek zijn.

Server en browser controleren percentages als strings (0–100, maximaal twee decimalen), sommen in integerhonderdsten maximaal 100%, afzonderlijke echte showdagen, verkoopstanden van 1–9 cijfers en maximaal 3200 UTF-16-tekens per veld. Minder dan 100% is toegestaan. Nederland blijft handmatig. Geen automatische top 3, sortering, procentberekening, ticketomrekening, landenbeheer of nieuw populatierekenmodel.

Tests gebruiken uitsluitend gesimuleerde concerten/Drive. Er worden geen echte concerten ingevuld of gewijzigd.
