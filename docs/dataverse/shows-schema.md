# Dataverse Shows: concreet aanmaakschema

Versie 12 november 2026. **30 tabellen: 29 nieuw, 1 bestaand.** Dit is het
concrete schema voor Shows met noodzakelijke gedeelde afhankelijkheden, niet
het oude applicatiebrede ontwerp van 36 tabellen. Er zijn geen tabellen aangemaakt
of gegevens verplaatst met het samenstellen van dit pakket.

Het besluit van vandaag is leidend: **alle applicatiebestanden, inclusief PDF’s,
komen in Dataverse File.** De ESMOJO Bibliotheek in SharePoint is alleen voor
ChatGPT-uitwisseling. Een daarvoor benodigde kopie is niet de canonieke PDF.
Geen SharePoint-locatiekolommen nodig om gewone ESMOJO-documenten te bewaren.

## Wat je downloadt en hoe je het gebruikt

- Het Excel-werkboek heeft Begin hier, Tabellen, Alle kolommen, Keuzelijsten,
  Relaties, Sleutels en een apart tabblad per tabel.
- CSV’s zijn **kolomspecificaties**, geen gegevensimport. Upload ze niet via
  ‘Een Excel- of .CSV-bestand’: dan krijg je rijen met schema-uitleg in plaats van
  de bedoelde tabelstructuur. Die optie importeert gegevens en raadt kolommen;
  zij installeert geen betrouwbaar Dataverse-schema.
- De map Copilot bevat per nieuwe tabel drie kopieerbare opdrachten: A gewone
  kolommen, B lookups, C unieke sleutels. Voor de bestaande onderzoekstabel alleen
  een behoud-/aanvulopdracht. Daarnaast staan er opdrachten voor globale keuzes.
- De aanbevolen versnelde route uit het getoonde scherm is **Beginnen met Copilot**,
  gevolgd door controle in de tabelontwerper. Copilot kan eigenschappen niet altijd
  instellen; alleen een daadwerkelijk gecontroleerde tabel is klaar.
- De volledige machineleesbare referentie is shows-schema.json. Een latere
  metadata-controle moet dit contract vergelijken vóór we importcode omschakelen.
- Als jouw Copilot-invoerveld een lange opdracht weigert: gebruik de genummerde
  bestanden in Copilot/Korte-blokken. Die blijven onder 1800 tekens per plakbeurt.

## Aanmaakvolgorde: vier rondes

1. Open of maak één eigen solution **ESMOJO Shows**, met de bestaande publisher
   met prefix **esmojo**. Controleer dit vóór aanmaken. Copilot of de standaard-
   solution kan anders een cr...-prefix gebruiken die achteraf niet te hernoemen is.
2. Maak de **24 nieuwe globale keuzelijsten** volgens het tabblad Keuzelijsten.
   De bestaande lokale Opruimstatus is de 25e lijst in het overzicht: niet veranderen.
3. Maak de 29 nieuwe tabellen in de aangegeven tabelvolgorde, met hun niet-lookup-
   kolommen. De bestaande Onderzoeksresultaat blijft staan. Per nieuwe tabel:
   standaard Dataverse-tabel (geen virtuele/elastic tabel), organisatie-eigendom,
   primaire naamkolom **Naam**, logische naam **esmojo_naam**, lengte 200.
   Laat systeem-ID en createdon/modifiedon automatisch door Dataverse aanmaken.
4. Als alle tabellen bestaan: voeg de lookups en daarna alternatieve sleutels toe.
   Dit voorkomt problemen met voorwaartse/circulaire relaties. Controleer dat elke
   nieuwe alternatieve sleutel de status Actief heeft. De bestaande onderzoekstabel
   krijgt alleen de optionele lookup esmojo_concertreeks; geen dubbele AI-tabel.

De publisher voegt de prefix vaak zelf toe. Als het scherm al **esmojo_** toont,
vul dan het deel erachter in. Controleer de uiteindelijke logische naam; voorkom
esmojo_esmojo_... . Tabelnamen en kolomnamen zijn bewust definitief gespecificeerd.
EntitySetName (API-meervoud) later altijd uit metadata lezen, nooit raden.

## Algemene kolommen op iedere NIEUWE tabel

Deze staan in elk tabeltabblad al volledig herhaald; je hoeft ze niet dubbel toe
te voegen. Op de bestaande onderzoekstabel voeg je ze NIET toe.

- esmojo_naam: primaire naam, één tekstregel 200; leesbaar label, geen identiteit.
- esmojo_sleutel: tekst 64, stabiele SHA-256-applicatiesleutel, uniek. De importcode
  gaat die berekenen. Namen, straatnamen en mutable labels zijn geen primaire sleutel.
- esmojo_revisie: geheel getal 0..2147483647, standaard 0; eigen domeinrevisie.
- esmojo_classificatie: globale keuze Openbaar/Vertrouwelijk, per tabel aangegeven.
- esmojo_vastgelegdop: oorspronkelijke zakelijke datum/tijd indien bekend; geen
  nieuw verzonnen auteur of tijd. Native createdon blijft werkelijke importtijd.
- esmojo_gewijzigddoor: lookup Medewerker; de echte ESMOJO-auteur indien bekend.
  Native CreatedBy is de technische app en vervangt de oorspronkelijke auteur niet.
- esmojo_bronidentiteit: oorspronkelijke niet-geheime bron-/recordidentiteit.

Native GUID, statecode/statuscode, createdon, modifiedon en RowVersion zijn
systeemvelden. Maak daarvan geen tweede kopie. Maak geen eigen ‘ETag’-kolom ter
vervanging van native optimistic concurrency.

## Belangrijke type- en instellingsregels

- **Ja bij Verplicht** betekent Bedrijfsvereist in de ontwerper en verplichte
  servervalidatie bij migratie/opslag. Business Required alleen garandeert niet
  dat alle API-schrijvers het afdwingen. Een beschreven conditionele verplichting
  vereist applicatieregels; die is niet door een losse kolominstelling opgelost.
- Meerdere tekstregels: **platte tekst**. De genoemde limiet is tekens, geen bytes.
  JSON is platte tekst met een expliciet gevalideerd contract; geen HTML of base64-
  bestandsbytes. Bestaande versleutelde Showbeheer-ciphertext is expliciet een
  tekstwaarde en wordt ongewijzigd behouden.
- Keuzes: één optie, met exact de gegeven numerieke waarden en labels. Oude
  stringcodes worden door de migratiecode gemapt; ze zijn geen losse extra kolom.
  **Geen standaard** betekent echt leeg. Geen risico, Nee en 0 zijn geen Onbekend.
- Concertdatum: Dataverse-type Datum en tijd, **gedrag Alleen datum**, notatie
  Alleen datum. Tijdstippen: **Gebruiker lokaal**, opslag via API in UTC.
- Decimalen: netto oppervlakte krijgt 10 decimalen. Waarden die niet exact binnen
  het afgesproken bereik passen worden als migratie-uitzondering gemeld; niet
  automatisch afronden. De bestaande dichtheidsberekening blijft leidend.
- Lookup is een echte N:1-relatie, geen tekst met een ID. Verwijderen van een
  gebruikte parent beperken (Restrict); geen cascade delete op historie/bestanden.
- File is een echte **Bestand-kolom**, maximaal 131072 KB (128 MiB). Niet ‘Afbeelding’,
  niet een bestandsnaamtekst, niet een Notes-bijlage. De huidige appgrenzen voor
  uploads blijven gelden totdat ze afzonderlijk worden aangepast.
- Documentrij eerst als pending aanmaken, bytes uploaden, hash/grootte teruglezen,
  daarna verified. Definitieve versies niet overschrijven; iedere versie een rij.
  Eén bestand per Document-rij; meerdere bijlagen via Documentkoppeling.
- Bewerkbare gewone rol is Gebruiker of Beheerder. Superbeheerder blijft in de
  vaste bestaande codepolicy. Geen Microsoft-gebruiker aanmaken voor elke ESMOJO-
  medewerker en geen nieuwe Supabase-accounts maken voor historische auteurs.
- Showbeheer houdt hash/ciphertext en oorspronkelijke AAD-ID. Nooit een PIN,
  linkgeheim of encryptiesleutel als platte tekstkolom opslaan.
- Velden-/broncontrole over meerdere rijen is nog niet automatisch atomair omdat
  de tabellen bestaan. De gecoördineerde save-/transactiecode volgt bij aansluiten.
- Dit schema bevat geen nieuwe zaalformulieren en geen volledige OnTrack-/TSC-
  incidenten-, rapportmail-, OAuth- of artiestenscoremigratie. Auth en MFA blijven.

## Aanvullingen op het eerdere globale ontwerp

- Ticketverkoop: getypeerd aantal per uitvoering, met één gedeelde veldcontrole
  in Bezoekersgegeven. Bestaande datum/tijd-slots en reeksacties blijven bewaard.
- Risicoanalysebron: bronstatus en beperkingen blijven bestaan, ook bij nul
  gevonden risico’s; de eigen beoordelingen staan bij de afzonderlijke risico’s.
- Documentkoppeling: meerdere bijlagen per maatregel, versiegebonden relaties en
  expliciete eigenaars; geen N:N-relatie waarbij rol/versie verloren gaat.

## Afspraken die bij het aansluiten worden afgedwongen

Precies-één-eigenaar bij Projectteam/Documentkoppeling/Routealias; dezelfde reeks
bij Ticketverkoop en Concert; maximaal één actuele analyse per vraag; bestaande
Ja/Nee-productiecodes; originele bronversies bij afronding; maximum over reeksdagen
voor vloerdruk; geen gedeeltelijke commit van gekoppelde versies. Deze regels
staan in de betreffende tabelbeschrijving. Unieke sleutels ondersteunen dit, maar
vervangen de servervalidatie en atomaire broncontrole niet.

Voor grote oorspronkelijke snapshots past niet alles in een tekstkolom van
1048576 tekens. Historieversie en Opdracht hebben daarom een Document-lookup voor
exacte JSON-bronbestanden. Geen stille afkapping, geen loslaten van de classificatie.

**Klaar met aanmaken betekent: schema klaar voor controle.** De website blijft
intussen de huidige opslag gebruiken. Het aanmaken van tabellen migreert geen
gegevens en schakelt geen lees-/schrijfroutes om.


## Tabellenoverzicht

| Nr | Tabel | Logische naam | Actie | Eenheid |
|---|---|---|---|---|
| 01 | Artiest | `esmojo_artiest` | Nieuw | Eén canonieke artiest. |
| 02 | Locatie | `esmojo_locatie` | Nieuw | Eén zaal/locatie, geen afzonderlijk vak. |
| 03 | Concertreeks | `esmojo_concertreeks` | Nieuw | Eén reeks met gedeelde voorbereiding. |
| 04 | Concert | `esmojo_concert` | Nieuw | Eén daadwerkelijke uitvoering; dezelfde datum kan meerdere uitvoeringen hebben. |
| 05 | Medewerker | `esmojo_medewerker` | Nieuw | Eén medewerker/contact; login-koppeling is optioneel. |
| 06 | Modulerecht | `esmojo_modulerecht` | Nieuw | Eén expliciet recht per medewerker en module. |
| 07 | Projectteamkoppeling | `esmojo_projectteam` | Nieuw | Eén bestaande medewerkerfunctie bij een reeks of concert. |
| 08 | Bezoekersgegeven | `esmojo_bezoekersgegeven` | Nieuw | Eén veld/status per reeks: ticket_sales, visitor_origins of domestic_origins. |
| 09 | Ticketverkoop | `esmojo_ticketverkoop` | Nieuw | Eén ticketverkoopaantal per uitvoering binnen een ticket_sales-veld. |
| 10 | Analyse | `esmojo_analyse` | Nieuw | Eén eigen ESMOJO-samenvatting per reeks en vraagnummer. |
| 11 | Analyseafronding | `esmojo_analyseafronding` | Nieuw | Eén actuele eindbeoordeling per reeks en categorie; oude versies in Historieversie. |
| 12 | Onderzoeksresultaat | `esmojo_onderzoeksresultaat` | BESTAAND behouden | BESTAANDE werkende onderzoekstabel: behouden. |
| 13 | Productiekeuze | `esmojo_productiekeuze` | Nieuw | Eén bestaande zelfstandige Ja/Nee-productiekeuze per reeks en onderwerp. |
| 14 | Barrierbeoordeling | `esmojo_barrierbeoordeling` | Nieuw | Eén actuele barrierbeoordeling per reeks. |
| 15 | Vloerdrukbeoordeling | `esmojo_vloerdrukbeoordeling` | Nieuw | Eén actuele vloerbeoordeling per reeks, met afzonderlijke vakken. |
| 16 | Publieksvak | `esmojo_publieksvak` | Nieuw | Eén vak binnen een vloerdrukbeoordeling. |
| 17 | Risicoanalysebron | `esmojo_risicoanalysebron` | Nieuw | Eén versiegebonden AI-risicoanalyse op een showprofiel-PDF, ook bij nul risico’s. |
| 18 | Operationeel risico | `esmojo_operationeelrisico` | Nieuw | Eén gevonden risico binnen één versiegebonden bron, met eigen ESM-beoordeling. |
| 19 | Beheersmaatregel | `esmojo_beheersmaatregel` | Nieuw | Eén brongebonden maatregel uit productie of operationeel risico. |
| 20 | Document | `esmojo_document` | Nieuw | Eén fysieke bestandsversie in Dataverse; PDF’s ook in Dataverse. |
| 21 | Documentkoppeling | `esmojo_documentkoppeling` | Nieuw | Eén documentversie gekoppeld aan één eigenaar en één rol. |
| 22 | Showbeheer | `esmojo_showbeheer` | Nieuw | Eén bestaande externe showtoegang; PIN en linkgeheim niet in platte tekst. |
| 23 | Zaalbijdrage | `esmojo_zaalbijdrage` | Nieuw | Eén bestaande sectiestatus per Showbeheer-toegang. |
| 24 | Tijdschemaregel | `esmojo_tijdschemaregel` | Nieuw | Eén gepland/feitelijk tijdschemapunt bij een uitvoering. |
| 25 | Integratiestatus | `esmojo_integratiestatus` | Nieuw | Eén status/cursor per integratie/batch/resource. |
| 26 | Historieversie | `esmojo_historie` | Nieuw | Eén append-only oorspronkelijke versie/handeling van een benoemde bron. |
| 27 | Opdracht | `esmojo_opdracht` | Nieuw | Eén idempotent commando/achtergrondopdracht of gecontroleerd afgesloten ontvangstbewijs. |
| 28 | Routealias | `esmojo_routealias` | Nieuw | Eén bestaande openbare/appidentificatie gekoppeld aan een canoniek doel. |
| 29 | Paginaweergave | `esmojo_paginaweergave` | Nieuw | Eén automatisch samengestelde, versiegebonden schermbundel. |
| 30 | Technische status | `esmojo_technischestatus` | Nieuw | Eén gecoördineerde guard/lease/teller per resource. |

## 01. Artiest — `esmojo_artiest`

Eén canonieke artiest.

**Huidige bron:** Drive-artiestenindex, MOJO/OnTrack-metadata en biografiecache.
**Standaardclassificatie:** openbaar.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Openbaar (158620000) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Oorspronkelijk artiest-ID | `esmojo_bronartiestid` | Eén tekstregel; Tekst; maximaal 240 tekens | Nee / geen standaard | — | Bestaand artiest-ID; namen/aliases staan in Routealias. |
| Biografie | `esmojo_biografie` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Laatst goede biografietekst; een mislukte update wist deze niet. |
| Biografiebron | `esmojo_biografiebron` | Eén tekstregel; URL; maximaal 2000 tekens | Nee / geen standaard | — | Openbare bron-URL. |
| Biografie opgehaald op | `esmojo_biografieopgehaaldop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Bestaand ophaalmoment van biografie. |
| Fotobron-URL | `esmojo_fotobronurl` | Eén tekstregel; URL; maximaal 2000 tekens | Nee / geen standaard | — | Bestaande toegestane MOJO-fotobron; een daadwerkelijk opgeslagen foto koppelen via Documentkoppeling. |

**Unieke sleutels:**
- esmojo_ak_artiest_sleutel: esmojo_sleutel

## 02. Locatie — `esmojo_locatie`

Eén zaal/locatie, geen afzonderlijk vak.

**Huidige bron:** MOJO/OnTrack-catalogus en bestaande locatieconfiguratie.
**Standaardclassificatie:** openbaar.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Openbaar (158620000) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Locatiecode | `esmojo_locatiecode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Stabiele code, bijvoorbeeld gashouder, afaslive of ziggodome. |
| Stad | `esmojo_stad` | Eén tekstregel; Tekst; maximaal 120 tekens | Nee / geen standaard | — | Bestaande stad; onbekend blijft leeg. |
| Landcode | `esmojo_landcode` | Eén tekstregel; Tekst; maximaal 2 tekens | Nee / geen standaard | — | ISO-landcode indien bekend, bijvoorbeeld NL. |
| Configuratieversie | `esmojo_configuratieversie` | Geheel getal; Min 0; max 2147483647 | Ja / 1 | — | Versie van bestaande zaal-/referentieregels. |
| Configuratie JSON | `esmojo_configuratie_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Alleen gevalideerde bestaande locatieconfiguratie; geen nieuwe zaalregels afleiden. |

**Unieke sleutels:**
- esmojo_ak_locatie_sleutel: esmojo_sleutel
- esmojo_ak_locatie_locatiecode: esmojo_locatiecode

## 03. Concertreeks — `esmojo_concertreeks`

Eén reeks met gedeelde voorbereiding.

**Huidige bron:** algemeen.json, generalConcertId, Supabase actieve snapshot.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Deze rij bewaart ook de drie oorspronkelijke documentbrede revisies. Individuele vragen krijgen daarnaast eigen revisies.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Artiest | `esmojo_artiest` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_artiest | Canonieke artiest van de reeks. |
| Locatie | `esmojo_locatie` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_locatie | Locatie van de reeks. |
| Oud algemeen concert-ID | `esmojo_oudalgemeenconcertid` | Eén tekstregel; Tekst; maximaal 240 tekens | Nee / geen standaard | — | Oorspronkelijke generalConcertId; herkenning van bestaande gedeelde voorbereiding. |
| Eerste datum | `esmojo_eerstedatum` | Datum en tijd; Gedrag Alleen datum; notatie Alleen datum; geen tijdzoneconversie | Ja / geen standaard | — | Eerste daadwerkelijke reeksdatum. |
| Laatste datum | `esmojo_laatstedatum` | Datum en tijd; Gedrag Alleen datum; notatie Alleen datum; geen tijdzoneconversie | Ja / geen standaard | — | Laatste daadwerkelijke reeksdatum. |
| Profielrevisie | `esmojo_profielrevisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Oorspronkelijke documentrevisie / gecoördineerde generatie voor broncontrole. |
| Afrondrevisie | `esmojo_afrondrevisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Oorspronkelijke documentrevisie / gecoördineerde generatie voor broncontrole. |
| Productierevisie | `esmojo_productierevisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Oorspronkelijke documentrevisie / gecoördineerde generatie voor broncontrole. |
| Voorbereidingsgeneratie | `esmojo_voorbereidingsgeneratie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Oorspronkelijke documentrevisie / gecoördineerde generatie voor broncontrole. |

**Unieke sleutels:**
- esmojo_ak_concertreeks_sleutel: esmojo_sleutel

## 04. Concert — `esmojo_concert`

Eén daadwerkelijke uitvoering; dezelfde datum kan meerdere uitvoeringen hebben.

**Huidige bron:** concert.json, agenda-indexen en geïmporteerde show-sleutels.
**Standaardclassificatie:** openbaar.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Openbaar (158620000) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks waartoe deze uitvoering behoort. |
| Concertdatum | `esmojo_datum` | Datum en tijd; Gedrag Alleen datum; notatie Alleen datum; geen tijdzoneconversie | Ja / geen standaard | — | Werkelijke lokale concertdatum, zonder tijdzoneconversie. |
| Uitvoeringscode | `esmojo_uitvoeringscode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Stabiele uitvoeringscode: bestaand bron-slot/middag/avond; standaard alleen als er geen onderscheiden slot is. |
| Oud concert-ID | `esmojo_oudconcertid` | Eén tekstregel; Tekst; maximaal 240 tekens | Nee / geen standaard | — | Bestaande ESMOJO-concert-ID; oude route daarnaast in Routealias. |
| Show-sleutel | `esmojo_showsleutel` | Eén tekstregel; Tekst; maximaal 200 tekens | Nee / geen standaard | — | Bestaande onderzoeks-/importsleutel, bijvoorbeeld artiest_zaal_jjjjmmdd; geen nieuwe primaire identiteit. |
| Bron-URL | `esmojo_bronurl` | Eén tekstregel; URL; maximaal 2000 tekens | Nee / geen standaard | — | Oorspronkelijke openbare concertaankondiging. |
| Tijdlabel | `esmojo_tijdlabel` | Eén tekstregel; Tekst; maximaal 100 tekens | Nee / geen standaard | — | Oorspronkelijke uitvoeringstijd, inclusief Niet vermeld; niet gebruiken als stabiele identiteit. |
| Tonen in Shows | `esmojo_tooninshows` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Alleen bestaande toegestane Gashouder- of expliciet in Dataverse geïmporteerde shows. Geen volledige MOJO-catalogus publiceren. |
| Tonen in Rapportages | `esmojo_tooninrapportages` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Bestaande module-/catalogusscope; apart van zichtbaarheid in Shows. |

**Unieke sleutels:**
- esmojo_ak_concert_sleutel: esmojo_sleutel
- esmojo_ak_concert_uitvoering: esmojo_concertreeks, esmojo_datum, esmojo_uitvoeringscode

## 05. Medewerker — `esmojo_medewerker`

Eén medewerker/contact; login-koppeling is optioneel.

**Huidige bron:** _esmojo_accounts_v1.json en bestaande oorspronkelijke actorverwijzingen.
**Standaardclassificatie:** vertrouwelijk.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Supabase Auth user-ID | `esmojo_authuserid` | Eén tekstregel; Tekst; maximaal 36 tekens | Nee / geen standaard | — | Bestaand UUID als tekst; uniek indien ingevuld. Geen wachtwoord/MFA/refresh-token. |
| Voornaam | `esmojo_voornaam` | Eén tekstregel; Tekst; maximaal 80 tekens | Nee / geen standaard | — | Bestaande voornaam. |
| Achternaam | `esmojo_achternaam` | Eén tekstregel; Tekst; maximaal 80 tekens | Nee / geen standaard | — | Bestaande achternaam. |
| E-mailadres | `esmojo_email` | Eén tekstregel; E-mail; maximaal 320 tekens | Nee / geen standaard | — | Bestaand e-mailadres; verplicht in de app voor een actief Auth-gekoppeld account. |
| Bedrijf | `esmojo_bedrijf` | Eén tekstregel; Tekst; maximaal 200 tekens | Nee / geen standaard | — | Bestaande bedrijfsnaam. |
| Functie | `esmojo_functie` | Eén tekstregel; Tekst; maximaal 200 tekens | Nee / geen standaard | — | Bestaande functieomschrijving. |
| Rol | `esmojo_rol` | Keuze; Eén waarde; geen meerkeuze | Ja / Gebruiker (158620000) | esmojo_keuze_medewerkerrol | Gewone approl; superbeheerder blijft uitsluitend de bestaande vaste codepolicy, nooit een bewerkbare keuze. |
| Geactiveerd | `esmojo_geactiveerd` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Bestaande activatiestatus. |
| Geblokkeerd | `esmojo_geblokkeerd` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Bestaande blokkering. |

**Unieke sleutels:**
- esmojo_ak_medewerker_sleutel: esmojo_sleutel
- esmojo_ak_medewerker_authuserid: esmojo_authuserid

## 06. Modulerecht — `esmojo_modulerecht`

Eén expliciet recht per medewerker en module.

**Huidige bron:** Actuele modules in Drive-accountprofiel.
**Standaardclassificatie:** vertrouwelijk.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Medewerker | `esmojo_medewerker` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_medewerker | Medewerker voor wie het recht geldt. |
| Module | `esmojo_module` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_module | Bestaande modulecode. |
| Toegestaan | `esmojo_toegestaan` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Expliciet toegestaan of geweigerd; ontbrekende rij verleent geen toegang. |

**Unieke sleutels:**
- esmojo_ak_modulerecht_sleutel: esmojo_sleutel
- esmojo_ak_modulerecht_medewerkermodule: esmojo_medewerker, esmojo_module

## 07. Projectteamkoppeling — `esmojo_projectteam`

Eén bestaande medewerkerfunctie bij een reeks of concert.

**Huidige bron:** _esmojo_show_assignments_v1.json.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Precies één van Concertreeks of Concert invullen; bij concert is de reeks via Concert bekend. Geen nieuwe teameditor.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Medewerker | `esmojo_medewerker` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_medewerker | Bestaande gekoppelde medewerker/contact. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Scope als de toewijzing voor de hele reeks geldt. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concert | Scope als de toewijzing voor één uitvoering geldt. |
| Functiecode | `esmojo_functiecode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Bestaande toewijzingsfunctie, bijvoorbeeld event-safety-manager. |
| Geldig vanaf | `esmojo_geldigvan` | Datum en tijd; Gedrag Alleen datum; notatie Alleen datum; geen tijdzoneconversie | Nee / geen standaard | — | Alleen indien al in de bron vastgelegd. |
| Geldig tot | `esmojo_geldigtot` | Datum en tijd; Gedrag Alleen datum; notatie Alleen datum; geen tijdzoneconversie | Nee / geen standaard | — | Alleen indien al in de bron vastgelegd. |

**Unieke sleutels:**
- esmojo_ak_projectteam_sleutel: esmojo_sleutel

## 08. Bezoekersgegeven — `esmojo_bezoekersgegeven`

Eén veld/status per reeks: ticket_sales, visitor_origins of domestic_origins.

**Huidige bron:** bezoekersdata.json → workflow_json.visitors.fields; technische ticketBasis uit actieve snapshot.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Ticketverkoopbedragen staan in Ticketverkoop; deze rij houdt de gedeelde veldversie en controle. Herkomst blijft begrensde gevalideerde JSON.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks waartoe het gecontroleerde veld behoort. |
| Veldsoort | `esmojo_veldsoort` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_bezoekersveld | De drie bestaande veldcodes. |
| Veldstatus | `esmojo_veldstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Leeg (158620000) | esmojo_keuze_veldstatus | Leeg/concept/gecontroleerd; originele reviewstatus mappen. |
| Herkomst JSON | `esmojo_herkomst_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Alleen visitor_origins/domestic_origins: bestaande percentages, landen/steden en volgorde. Geen AI-bronnen. |
| Veldversie | `esmojo_veldversie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Oorspronkelijke ticket-/herkomstveldversie voor afrondbasis. |
| Gecontroleerd op | `esmojo_gecontroleerdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijke veldcontrole indien bekend. |
| Gecontroleerd door | `esmojo_gecontroleerddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke oorspronkelijke controleur, indien bekend. |

**Unieke sleutels:**
- esmojo_ak_bezoekersgegeven_sleutel: esmojo_sleutel
- esmojo_ak_bezoekersgegeven_reeksveld: esmojo_concertreeks, esmojo_veldsoort

## 09. Ticketverkoop — `esmojo_ticketverkoop`

Eén ticketverkoopaantal per uitvoering binnen een ticket_sales-veld.

**Huidige bron:** Bestaande ticket_sales-inhoud met één getal of datum/tijd/aantal-array.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Extra tabel ten opzichte van globaal ontwerp: houdt aantallen getypeerd per uitvoering, met één gedeelde veldversie in Bezoekersgegeven. Geen dubbele vrije ticket-JSON als actuele bron.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Bezoekersgegeven | `esmojo_bezoekersgegeven` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_bezoekersgegeven | Parent met veldsoort ticket_sales; dezelfde reeks als Concert. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concert | Exacte uitvoering, inclusief middag/avond/slot. |
| Verkochte tickets | `esmojo_aantal` | Geheel getal; Min 0; max 999999999 | Nee / geen standaard | — | Aangeleverd aantal; null is onbekend, 0 is geldige nul. |
| Oorspronkelijk tijdlabel | `esmojo_oorspronkelijklabel` | Eén tekstregel; Tekst; maximaal 100 tekens | Nee / geen standaard | — | Oorspronkelijke tijd-/slottekst uit de meerdaagse ticketinvoer. |

**Unieke sleutels:**
- esmojo_ak_ticketverkoop_sleutel: esmojo_sleutel
- esmojo_ak_ticketverkoop_verkoopuitvoering: esmojo_bezoekersgegeven, esmojo_concert

## 10. Analyse — `esmojo_analyse`

Eén eigen ESMOJO-samenvatting per reeks en vraagnummer.

**Huidige bron:** Actieve Supabase snapshot.profile.analyses of Drive showprofiel.json.
**Standaardclassificatie:** openbaar.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Openbaar (158620000) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Eigenaar van de gedeelde voorbereiding. |
| Vraagnummer | `esmojo_vraagnummer` | Geheel getal; Min 1; max 11 | Ja / geen standaard | — | Bestaande nummers 1 t/m 11. |
| Categorie | `esmojo_categorie` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_categorie | Vragen 1–4 bezoekers; 5–11 artiest. |
| Samenvatting | `esmojo_samenvatting` | Eén tekstregel; Tekst; maximaal 400 tekens | Nee / geen standaard | — | Zelfgeschreven tekst; nooit automatisch de volledige AI-analyse kopiëren. |
| Analysestatus | `esmojo_analysestatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Concept (158620000) | esmojo_keuze_analysestatus | Bestaand concept/afgerond. |

**Unieke sleutels:**
- esmojo_ak_analyse_sleutel: esmojo_sleutel
- esmojo_ak_analyse_reeksvraag: esmojo_concertreeks, esmojo_vraagnummer

## 11. Analyseafronding — `esmojo_analyseafronding`

Eén actuele eindbeoordeling per reeks en categorie; oude versies in Historieversie.

**Huidige bron:** Actieve snapshot.final en Drive analyseafronding.json.
**Standaardclassificatie:** openbaar.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Openbaar (158620000) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks van de eindbeoordeling. |
| Categorie | `esmojo_categorie` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_categorie | Bezoekersanalyse of artiestanalyse. |
| Eindcijfer | `esmojo_cijfer` | Geheel getal; Min 1; max 10 | Nee / geen standaard | — | Bestaand cijfer; alleen verplicht bij geldige afronding. |
| Toelichting | `esmojo_toelichting` | Meerdere tekstregels; Platte tekst; maximaal 2000 tekens; geen rich text | Nee / geen standaard | — | Bestaande eindtoelichting. |
| Afrondstatus | `esmojo_afrondstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Concept (158620000) | esmojo_keuze_afrondstatus | Geen impliciete definitieve goedkeuring. |
| Profielbasisrevisie | `esmojo_profielbasisrevisie` | Geheel getal; Min 0; max 2147483647 | Nee / geen standaard | — | Profielrevisie waarop het cijfer berust. |
| Ticketbasis JSON | `esmojo_ticketbasis_json` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Nee / geen standaard | — | Exacte versies ticket_sales, visitor_origins en domestic_origins. |
| Afgerond op | `esmojo_afgerondop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijke afrondtijd. |
| Afgerond door | `esmojo_afgeronddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Oorspronkelijke ESMOJO-actor, indien bekend. |
| Ingetrokken op | `esmojo_ingetrokkenop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Intrekkingsmoment als de bron ongeldig is geworden. |
| Intrekkingsreden | `esmojo_intrekkingsreden` | Eén tekstregel; Tekst; maximaal 2000 tekens | Nee / geen standaard | — | Bestaande reden / bronwijziging. |

**Unieke sleutels:**
- esmojo_ak_analyseafronding_sleutel: esmojo_sleutel
- esmojo_ak_analyseafronding_reekscategorie: esmojo_concertreeks, esmojo_categorie

## 12. Onderzoeksresultaat — `esmojo_onderzoeksresultaat`

BESTAANDE werkende onderzoekstabel: behouden.

**Huidige bron:** SharePoint-import en bevestigde Drive → Dataverse-import.
**Standaardclassificatie:** openbaar.

**Regel:** Geen nieuwe algemene kolommen, geen aparte bronnenkolom en geen onderzoeksdatum toevoegen. Alleen de optionele Reeks-lookup komt erbij nadat Reeks bestaat. Bestaande naamkolom Titel en primary-ID ongewijzigd; technische naam van Titel via metadata vaststellen, niet raden.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Show-sleutel | `esmojo_showsleutel` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | BESTAAND: exacte bestaande showsleutel. |
| Vraagnummer | `esmojo_vraagnummer` | Geheel getal; Min 1; max 11 | Ja / geen standaard | — | BESTAAND: 1–11; bestaande minimum/maximum controleren, geen bestaande data verliezen. |
| Markdowninhoud | `esmojo_markdowninhoud` | Meerdere tekstregels; Platte tekst; maximaal 1048576 tekens; geen rich text | Ja / geen standaard | — | BESTAAND: volledige Markdown inclusief bronnen in één kolom. |
| Bronbibliotheek-ID | `esmojo_bronbibliotheekid` | Eén tekstregel; Tekst; maximaal 36 tekens | Ja / geen standaard | — | BESTAAND: oorspronkelijke SharePoint-bibliotheek of aparte logische Drive-importnamespace. |
| Bronbestanditemnummer | `esmojo_bronbestanditemnummer` | Geheel getal; Min 1; max 2147483647 | Ja / geen standaard | — | BESTAAND: oorspronkelijke SharePoint-item-ID of het bestaande logische Drive-importnummer. |
| Bronversie | `esmojo_bronversie` | Eén tekstregel; Tekst; maximaal 100 tekens | Ja / geen standaard | — | BESTAAND: bestaande versie, bijvoorbeeld 1.0. |
| Bronbestandpad | `esmojo_bronbestandpad` | Eén tekstregel; Tekst; maximaal 2000 tekens | Nee / geen standaard | — | BESTAAND: bestaand bron-/logisch importpad. De huidige reader vereist een passend pad. |
| Opruimstatus | `esmojo_opruimstatus` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | Bestaande lokale Opruimstatus | BESTAAND: huidige opties/waarden blijven exact behouden. Geen omzetting naar nieuwe globale keuze. |
| Bronbestand ETag | `esmojo_bronbestandetag` | Eén tekstregel; Tekst; maximaal 200 tekens | Nee / geen standaard | — | BESTAAND: alleen bestaande SharePoint-opruimcontrole. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | NIEUW, optioneel: later gecontroleerd koppelen; bestaande imports blijven werken zonder lookup. |

**Unieke sleutels:**
- BESTAANDE_ALTERNATIEVE_SLEUTEL_BEHOUDEN: esmojo_bronbibliotheekid, esmojo_bronbestanditemnummer, esmojo_bronversie

## 13. Productiekeuze — `esmojo_productiekeuze`

Eén bestaande zelfstandige Ja/Nee-productiekeuze per reeks en onderwerp.

**Huidige bron:** productionele-risicos.json / actieve production.choices.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Alleen de vijf bestaande conditionele codes escape_routes, fireworks, open_fire, lasers, drones. Entree/barrier/vloer zijn geen losse Ja/Nee-keuze. NVT wordt niet nieuw ingevoerd. Geen rij betekent nog niet ingevuld.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks van de productiekeuze. |
| Onderwerp | `esmojo_onderwerp` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_productieonderwerp | Alleen de vijf bestaande conditionele onderwerpen in deze tabel. |
| Waarde | `esmojo_waarde` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_janee | Expliciete Ja of Nee; geen standaardwaarde invullen. |

**Unieke sleutels:**
- esmojo_ak_productiekeuze_sleutel: esmojo_sleutel
- esmojo_ak_productiekeuze_reeksonderwerp: esmojo_concertreeks, esmojo_onderwerp

## 14. Barrierbeoordeling — `esmojo_barrierbeoordeling`

Eén actuele barrierbeoordeling per reeks.

**Huidige bron:** Actieve production.barrier en Drive productionele-risicos.json.
**Standaardclassificatie:** vertrouwelijk.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks van de opstelling. |
| Barriertype | `esmojo_barriertype` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_barriertype | Bestaande zes opstellingscodes. |
| Risiconiveau | `esmojo_risiconiveau` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_risiconiveau | Eigen ESM-beoordeling; niet afleiden uit zaaltype. |
| Ontwerptoelichting | `esmojo_ontwerptoelichting` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Nee / geen standaard | — | Bestaande custom notes voor afwijkend ontwerp. |
| Risicotoelichting / maatregel | `esmojo_risicotoelichting` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Nee / geen standaard | — | Bestaande riskNote met bestaande verplichte-toelichtingsregels. |
| Beoordelingsstatus | `esmojo_beoordelingsstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Concept (158620000) | esmojo_keuze_beoordelingsstatus | Concept/afgerond/ongeldig. |
| Barriersignatuur | `esmojo_signatuur` | Eén tekstregel; Tekst; maximaal 500 tekens | Nee / geen standaard | — | Exacte bestaande barrierSignature(JSON van type en afbeeldinghash); geen eigen variant verzinnen. |
| Actief ontwerpdocument | `esmojo_actiefdocument` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | Geselecteerde vaste referentie of actuele custom-bijlage; aanvullende/historische links via Documentkoppeling. |
| Afgerond op | `esmojo_afgerondop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Bestaand afrondmoment. |
| Afgerond door | `esmojo_afgeronddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Bestaande afrondende actor, indien bekend. |

**Unieke sleutels:**
- esmojo_ak_barrierbeoordeling_sleutel: esmojo_sleutel
- esmojo_ak_barrierbeoordeling_reeksbarrier: esmojo_concertreeks

## 15. Vloerdrukbeoordeling — `esmojo_vloerdrukbeoordeling`

Eén actuele vloerbeoordeling per reeks, met afzonderlijke vakken.

**Huidige bron:** Drive productionele-risicos.json.floorPressure; beperkte actieve floor-summary.
**Standaardclassificatie:** vertrouwelijk.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks van de beoordeling. |
| Barrierbeoordeling | `esmojo_barrierbeoordeling` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_barrierbeoordeling | De gebruikte opstelling; afgeronde versie vereist bij definitieve beoordeling. |
| Barrierbasisrevisie | `esmojo_barrierbasisrevisie` | Geheel getal; Min 0; max 2147483647 | Nee / geen standaard | — | Domeinrevisie van de gebruikte barrier. |
| Barrierbasissignatuur | `esmojo_barrierbasissignatuur` | Eén tekstregel; Tekst; maximaal 500 tekens | Nee / geen standaard | — | Bestaande barriersignatuur bij deze vloerbeoordeling. |
| Ticketbasis JSON | `esmojo_ticketbasis_json` | Meerdere tekstregels; Platte tekst; maximaal 16000 tekens; geen rich text | Nee / geen standaard | — | Bestaande ticketversievector en gebruikte dag-/uitvoeringswaarden; maximum over relevante dagen, geen som. |
| Ticketreferentie | `esmojo_ticketreferentie` | Geheel getal; Min 0; max 999999999 | Nee / geen standaard | — | Gebruikt bezoekersmaximum; null blijft onbekend. |
| Risiconiveau | `esmojo_risiconiveau` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_risiconiveau | Eigen beoordeling, geen automatisch risico uit bezoekers/m². |
| Toelichting / maatregel | `esmojo_toelichting` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Nee / geen standaard | — | Bestaande handmatige floor note. |
| Beoordelingsstatus | `esmojo_beoordelingsstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Concept (158620000) | esmojo_keuze_beoordelingsstatus | Seated blijft volgens bestaande regels afgehandeld zonder sta-vakken. |
| Afgerond op | `esmojo_afgerondop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Bestaande afrondtijd. |
| Afgerond door | `esmojo_afgeronddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke actor. |

**Unieke sleutels:**
- esmojo_ak_vloerdrukbeoordeling_sleutel: esmojo_sleutel
- esmojo_ak_vloerdrukbeoordeling_reeksvloer: esmojo_concertreeks

## 16. Publieksvak — `esmojo_publieksvak`

Eén vak binnen een vloerdrukbeoordeling.

**Huidige bron:** Bestaande floorPressure.rows, vaste en afwijkende vakken.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Geen automatisch risiconiveau opslaan. Dichtheid berekenen met bestaande centrale formule. Bij niet exact representabele brongetallen: migratie blokkeren, niet afronden.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Vloerdrukbeoordeling | `esmojo_vloerdrukbeoordeling` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_vloerdrukbeoordeling | Parent-beoordeling. |
| Vakcode | `esmojo_vakcode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Bestaande stabiele row.id, bijvoorbeeld standing, gc, gc_left. |
| Volgorde | `esmojo_volgorde` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Bestaande weergavevolgorde. |
| Bezoekers | `esmojo_bezoekers` | Geheel getal; Min 0; max 2147483647 | Nee / geen standaard | — | Bestaande bezoekers in dit vak; null onbekend, 0 geldig. |
| Netto oppervlakte m² | `esmojo_nettooppervlakte` | Decimaal getal; 10 decimalen; min 0; max 1000000000; geen valuta of floating point | Nee / geen standaard | — | Bestaande netto oppervlakte; concept kan null/0 bevatten, afronding vereist >0. |

**Unieke sleutels:**
- esmojo_ak_publieksvak_sleutel: esmojo_sleutel
- esmojo_ak_publieksvak_beoordelingvak: esmojo_vloerdrukbeoordeling, esmojo_vakcode

## 17. Risicoanalysebron — `esmojo_risicoanalysebron`

Eén versiegebonden AI-risicoanalyse op een showprofiel-PDF, ook bij nul risico’s.

**Huidige bron:** showprofiel_risicos_v1_<revision>.json en PDF-register.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Aanvulling op globaal ontwerp: bronstatus en beperkingen moeten ook bij nul risico’s bewaard blijven. Dit is niet de bestaande tabel met de elf Markdown-onderzoeken.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks van de analyse. |
| Bron-PDF | `esmojo_brondocument` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_document | Exacte immutable showprofiel-PDF-versie. |
| Bronrevisie | `esmojo_bronrevisie` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Bestaande source.revision: 64-tekens fingerprint, GEEN geheel revisienummer. |
| Bron SHA-256 | `esmojo_bronsha256` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Bestaande hash van exacte PDF-bytes. |
| Promptversie | `esmojo_promptversie` | Geheel getal; Min 1; max 2147483647 | Ja / 1 | — | Bestaande RISK_PROMPT_VERSION; geen nieuw onderzoek starten. |
| PDF-versie | `esmojo_pdfversie` | Geheel getal; Min 1; max 2147483647 | Ja / geen standaard | — | Bestaand PDF-versienummer. |
| Bronstatus | `esmojo_bronstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / In afwachting (158620000) | esmojo_keuze_bronstatus | Conceptbron beschikbaar/gecontroleerd betekent geen ESM-goedkeuring. |
| Beperkingen JSON | `esmojo_beperkingen_json` | Meerdere tekstregels; Platte tekst; maximaal 32000 tekens; geen rich text | Nee / geen standaard | — | Exacte bestaande limitations-array; bewaren ook als risks leeg is. |

**Unieke sleutels:**
- esmojo_ak_risicoanalysebron_sleutel: esmojo_sleutel
- esmojo_ak_risicoanalysebron_reeksbron: esmojo_concertreeks, esmojo_bronrevisie

## 18. Operationeel risico — `esmojo_operationeelrisico`

Eén gevonden risico binnen één versiegebonden bron, met eigen ESM-beoordeling.

**Huidige bron:** AI-risicoresultaat + production.operationalReviews[source.revision].assessments.
**Standaardclassificatie:** vertrouwelijk.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Risicoanalysebron | `esmojo_risicoanalysebron` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_risicoanalysebron | Exacte bronrun; via deze relatie is de reeks bekend. |
| Risicocode | `esmojo_risicocode` | Eén tekstregel; Tekst; maximaal 3 tekens | Ja / geen standaard | — | Bestaande R01 t/m R30. |
| Omschrijving | `esmojo_omschrijving` | Meerdere tekstregels; Platte tekst; maximaal 800 tekens; geen rich text | Nee / geen standaard | — | Bestaande AI-description; nooit overschrijven met eigen beoordeling. |
| Gevolg | `esmojo_gevolg` | Meerdere tekstregels; Platte tekst; maximaal 600 tekens; geen rich text | Nee / geen standaard | — | Bestaande consequence. |
| Risicobasis | `esmojo_risicobasis` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_risicobasis | Bestaand explicit/inferred. |
| Bewijs JSON | `esmojo_bewijs_json` | Meerdere tekstregels; Platte tekst; maximaal 16000 tekens; geen rich text | Nee / geen standaard | — | Bestaande maximaal drie pagina/quote-verwijzingen naar de bron-PDF. |
| Eigen risiconiveau | `esmojo_risiconiveau` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_risiconiveau | Eigen ESM-beoordeling, null indien nog niet beoordeeld. |
| Eigen toelichting / maatregel | `esmojo_risicotoelichting` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Nee / geen standaard | — | Bestaande handmatige riskNote; bestaande toelichtingsregels behouden. |
| Beoordelingsstatus | `esmojo_beoordelingsstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Concept (158620000) | esmojo_keuze_beoordelingsstatus | Bronwijziging maakt oude beoordeling herkenbaar ongeldig. |
| Beoordeeld op | `esmojo_beoordeeldop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk ESM-beoordelingsmoment. |

**Unieke sleutels:**
- esmojo_ak_operationeelrisico_sleutel: esmojo_sleutel
- esmojo_ak_operationeelrisico_bronrisico: esmojo_risicoanalysebron, esmojo_risicocode

## 19. Beheersmaatregel — `esmojo_beheersmaatregel`

Eén brongebonden maatregel uit productie of operationeel risico.

**Huidige bron:** Bestaande measureDefinitions / production.measureImplementations.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Bij operationele bron is Operationeel risico verplicht en Productieonderwerp leeg; bij productiebron omgekeerd. Briefing leeg betekent nog niet expliciet gekozen.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Reeks van de maatregel. |
| Bronsoort | `esmojo_bronsoort` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_maatregelbron | Productie of operationeel. |
| Productieonderwerp | `esmojo_productieonderwerp` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_productieonderwerp | Bestaande production:<id>, alleen bij productiebron. |
| Operationeel risico | `esmojo_operationeelrisico` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_operationeelrisico | Bronrisico bij operationele maatregel. |
| Oud maatregel-ID | `esmojo_oudmaatregelid` | Eén tekstregel; Tekst; maximaal 180 tekens | Nee / geen standaard | — | Bestaande production:<id> of operational:<bronrevision>:Rxx. |
| Maatregeltekst | `esmojo_tekst` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Nee / geen standaard | — | Actuele ESM-maatregeltekst. |
| Bronbasis JSON | `esmojo_basis_json` | Meerdere tekstregels; Platte tekst; maximaal 25000 tekens; geen rich text | Nee / geen standaard | — | Exacte bestaande basis-string; bron, oorspronkelijk niveau en tekst. Niet vervangen door modifiedon. |
| Oorspronkelijk risiconiveau | `esmojo_oorspronkelijkrisico` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_risiconiveau | Bestaand originalRiskLevel. |
| Risico na implementatie | `esmojo_risiconaimplementatie` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_risiconiveau | Eigen beoordeling na uitvoering, null zolang niet gekozen. |
| Briefing | `esmojo_briefing` | Keuze; Eén waarde; geen meerkeuze | Nee / geen standaard | esmojo_keuze_janee | Expliciete keuze Ja/Nee. Geen standaard; null blijft onbekend. |
| Implementatiestatus | `esmojo_implementatiestatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Concept (158620000) | esmojo_keuze_beoordelingsstatus | Afgerond alleen met actuele basis, niveau en expliciete briefingkeuze. |
| Geïmplementeerd op | `esmojo_afgerondop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Bestaand completedAt. |
| Geïmplementeerd door | `esmojo_afgeronddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Bestaande actor. |
| Laatste mutatie-ID | `esmojo_laatstemutatie` | Eén tekstregel; Tekst; maximaal 64 tekens | Nee / geen standaard | — | Bestaande idempotentie-/mutatievingerafdruk, indien aanwezig; geen geheim. |

**Unieke sleutels:**
- esmojo_ak_beheersmaatregel_sleutel: esmojo_sleutel

## 20. Document — `esmojo_document`

Eén fysieke bestandsversie in Dataverse; PDF’s ook in Dataverse.

**Huidige bron:** Drive-PDF’s, barrierbeelden/bijlagen, maatregelbijlagen en relevante showbestanden.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Één rij per versie; geverifieerde definitieve bestanden niet overschrijven. File-upload is apart van rij aanmaken. Status verified pas na upload, grootte/hash en terugleescontrole. Geen SharePoint-opslagkolommen als canonieke bestemming.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Bestand | `esmojo_bestand` | Bestand (File); MaxSizeInKB 131072 (128 MiB); app-uploadlimieten blijven voorlopig zoals nu; conditioneel verplicht bij status verified | Nee / geen standaard | — | Werkelijke PDF-/afbeelding-/bronbytes in Dataverse File-opslag. Geen base64 in tekst. |
| Bestandsnaam | `esmojo_bestandsnaam` | Eén tekstregel; Tekst; maximaal 255 tekens | Ja / geen standaard | — | Oorspronkelijke of bestaande gegenereerde bestandsnaam. |
| MIME-type | `esmojo_mimetype` | Eén tekstregel; Tekst; maximaal 100 tekens | Ja / geen standaard | — | Bijvoorbeeld application/pdf, image/png of image/jpeg. |
| Bestandsgrootte in bytes | `esmojo_bestandsgrootte` | Geheel getal; Min 0; max 2147483647 | Nee / geen standaard | — | Verwachte/geverifieerde grootte van de fysieke bytes. |
| SHA-256 | `esmojo_sha256` | Eén tekstregel; Tekst; maximaal 64 tekens | Nee / geen standaard | — | Hash van volledige originele bytes; verplicht vóór vrijgeven voor download. |
| Documentsoort | `esmojo_documentsoort` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_documentsoort | Bestaande functie van het document. |
| Documentgroep | `esmojo_documentgroep` | Eén tekstregel; Tekst; maximaal 100 tekens | Ja / geen standaard | — | Stabiele groep voor alle versies van hetzelfde logische document. |
| Versienummer | `esmojo_versienummer` | Geheel getal; Min 1; max 2147483647 | Ja / 1 | — | Bestaande versie; nieuw document start op 1. |
| Documentstatus | `esmojo_documentstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / In afwachting (158620000) | esmojo_keuze_bronstatus | Bestand beschikbaar/gecontroleerd, in afwachting of fout. |
| Bronfingerprint | `esmojo_bronfingerprint` | Eén tekstregel; Tekst; maximaal 64 tekens | Nee / geen standaard | — | Voor showprofiel-PDF: exacte bestaande snapshot-revision/hash van generatiebasis. |
| Bronbasis JSON | `esmojo_bronbasis_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Exacte analyse-, afrond-, ticket- en productieversies die bij deze PDF/documentversie horen. |
| Template-/layoutversie | `esmojo_templateversie` | Eén tekstregel; Tekst; maximaal 100 tekens | Nee / geen standaard | — | Bestaande renderer-/layoutversie. |

**Unieke sleutels:**
- esmojo_ak_document_sleutel: esmojo_sleutel
- esmojo_ak_document_documentversie: esmojo_documentgroep, esmojo_versienummer

## 21. Documentkoppeling — `esmojo_documentkoppeling`

Eén documentversie gekoppeld aan één eigenaar en één rol.

**Huidige bron:** Bestaande fileId/uploadId/verwijzingen in registers en voorbereiding.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Extra koppeltabel: precies één eigenaar-lookup invullen. Zo kunnen meerdere bijlagen aan één maatregel hangen en kan één document meerdere expliciete koppelingen hebben. Geen vrije doel-ID zonder lookup.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Document | `esmojo_document` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_document | De fysieke documentversie. |
| Rolcode | `esmojo_rolcode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Bijvoorbeeld showprofile-pdf, barrier-reference:end_stage_gc, attachment, avatar, photo. |
| Oorspronkelijk upload-ID | `esmojo_bronuploadid` | Eén tekstregel; Tekst; maximaal 36 tekens | Nee / geen standaard | — | Bestaand UUID uploadId; behouden voor retries en historische verwijzingen. |
| Koppelstatus | `esmojo_koppelstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Actief (158620000) | esmojo_keuze_koppelstatus | Bestaande actieve/verwijderde/vervangen koppeling; geen automatische fysieke verwijdering. |
| Volgorde | `esmojo_volgorde` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Bestaande bijlage-/weergavevolgorde. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concert | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Beheersmaatregel | `esmojo_beheersmaatregel` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_beheersmaatregel | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Barrierbeoordeling | `esmojo_barrierbeoordeling` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_barrierbeoordeling | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Locatie | `esmojo_locatie` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_locatie | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Artiest | `esmojo_artiest` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_artiest | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Medewerker | `esmojo_medewerker` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Risicoanalysebron | `esmojo_risicoanalysebron` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_risicoanalysebron | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |
| Onderzoeksresultaat | `esmojo_onderzoeksresultaat` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_onderzoeksresultaat | Eén van de eigenaar-lookups; alle andere eigenaar-lookups blijven leeg. |

**Unieke sleutels:**
- esmojo_ak_documentkoppeling_sleutel: esmojo_sleutel

## 22. Showbeheer — `esmojo_showbeheer`

Eén bestaande externe showtoegang; PIN en linkgeheim niet in platte tekst.

**Huidige bron:** Supabase esmojo_show_management.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Huidige scope blijft Gashouder. Bestaande record-UUID, cryptografische AAD en sleutelafleiding behouden. Native nieuwe tabel alleen aanmaken is geen migratie van de cryptografie.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concertreeks | Canonieke bestaande show-/reeks-scope. |
| Oud concert-ID | `esmojo_oudconcertid` | Eén tekstregel; Tekst; maximaal 240 tekens | Ja / geen standaard | — | Exacte huidige concert_id voor bestaande linkscope. |
| Cryptografisch AAD-ID | `esmojo_cryptoaadid` | Eén tekstregel; Tekst; maximaal 36 tekens | Ja / geen standaard | — | Exacte oude record-UUID die AES-GCM en PIN-binding gebruiken. Nieuwe migratierecords gebruiken dezelfde primaire GUID waar mogelijk. |
| Toegangshash | `esmojo_toegangshash` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Bestaande access_hash; nooit het onversleutelde linkgeheim. |
| PIN-hash | `esmojo_pinhash` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Bestaande HMAC pin_hash. Geen platte PIN. |
| Versleutelde toeganggegevens | `esmojo_versleuteldegegevens` | Meerdere tekstregels; Platte tekst; maximaal 4000 tekens; geen rich text | Ja / geen standaard | — | Exacte bestaande sealed_credentials. Encryptiesleutel blijft serverconfiguratie. |
| Ingeschakeld | `esmojo_ingeschakeld` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Bestaande enabled-status. |

**Unieke sleutels:**
- esmojo_ak_showbeheer_sleutel: esmojo_sleutel
- esmojo_ak_showbeheer_toegangshash: esmojo_toegangshash
- esmojo_ak_showbeheer_showbeheerscope: esmojo_concertreeks

## 23. Zaalbijdrage — `esmojo_zaalbijdrage`

Eén bestaande sectiestatus per Showbeheer-toegang.

**Huidige bron:** esmojo_show_management.progress; formulieren zijn nu nog leeg.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Geen nieuwe zaalformulieren of persoonsgegevens ontwerpen. Voor nu alleen bestaande secties/statussen.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Showbeheer | `esmojo_showbeheer` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_showbeheer | Eigenaar van de externe sectie. |
| Sectie | `esmojo_sectie` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_zaalsectie | Vier bestaande secties. |
| Sectiestatus | `esmojo_sectiestatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Leeg (158620000) | esmojo_keuze_zaalstatus | Bestaande leeg/concept/afgerond-status. |
| Inhoud JSON | `esmojo_inhoud_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Gereserveerd voor reeds bestaande inhoud; blijft nu leeg. Nieuwe formulierinhoud vereist eigen ontwerp/validatie. |

**Unieke sleutels:**
- esmojo_ak_zaalbijdrage_sleutel: esmojo_sleutel
- esmojo_ak_zaalbijdrage_toegangsectie: esmojo_showbeheer, esmojo_sectie

## 24. Tijdschemaregel — `esmojo_tijdschemaregel`

Eén gepland/feitelijk tijdschemapunt bij een uitvoering.

**Huidige bron:** Tijdschema_*.json; alleen bestaande Shows-afhankelijkheid, geen volledige rapportmigratie.
**Standaardclassificatie:** vertrouwelijk.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Ja / geen standaard | N:1 → esmojo_concert | Exacte uitvoering. |
| Regelcode | `esmojo_regelcode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Bestaande bron-/regelidentiteit, bijvoorbeeld doors, support of start; geen nieuwe labels verzinnen. |
| Label | `esmojo_label` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Oorspronkelijk zichtbare label. |
| Volgorde | `esmojo_volgorde` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Bestaande bron-/presentatievolgorde. |
| Tijdsoort | `esmojo_tijdsoort` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_tijdsoort | Gepland of feitelijk; geen feitelijke tijden uit geplande tijden raden. |
| Oorspronkelijke tijdtekst | `esmojo_tijdtekst` | Eén tekstregel; Tekst; maximaal 200 tekens | Nee / geen standaard | — | Oorspronkelijke tekst inclusief onbekend/afwijkend label. |
| Genormaliseerde tijd | `esmojo_tijd` | Eén tekstregel; Tekst; maximaal 5 tekens | Nee / geen standaard | — | Alleen geldig HH:mm indien daadwerkelijk bekend; anders null. |
| Dagoffset | `esmojo_dagoffset` | Geheel getal; Min 0; max 7 | Nee / geen standaard | — | 0 = concertdatum, 1 = volgende kalenderdag; alleen bepalen uit expliciete chronologie, geen gok. |
| Expliciete brondatum | `esmojo_brondatum` | Datum en tijd; Gedrag Alleen datum; notatie Alleen datum; geen tijdzoneconversie | Nee / geen standaard | — | Alleen als de bron de datum expliciet geeft. |
| Brondocument | `esmojo_brondocument` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | Eventueel exact bronbestand. |

**Unieke sleutels:**
- esmojo_ak_tijdschemaregel_sleutel: esmojo_sleutel

## 25. Integratiestatus — `esmojo_integratiestatus`

Eén status/cursor per integratie/batch/resource.

**Huidige bron:** Agenda-/AI-/importregisters en de komende migratiecontrole.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Veilige configuratie zonder secrets. Status is geen tweede canonieke bron van showinhoud.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Integratiecode | `esmojo_integratiecode` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Bijvoorbeeld mojo-shows, research-import, show-inventory. |
| Scopecode | `esmojo_scopecode` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Bestaande resource/batch/locatie-scope. |
| Integratiestatus | `esmojo_integratiestatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Niet gestart (158620000) | esmojo_keuze_integratiestatus | Bestaande of nieuwe gecontroleerde voortgang. |
| Cursor JSON | `esmojo_cursor_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Laatste paginacursor, bronwatermark of bestaand importmanifest-deel, zonder tokens. |
| Configuratie JSON | `esmojo_configuratie_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Alleen toegestane technische instellingen; geen appcredentials. |
| Aantal gelezen | `esmojo_aantalgelezen` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Gecontroleerde aantallen. |
| Aantal bevestigd | `esmojo_aantalbevestigd` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Teruggelezen/bevestigde doelen. |
| Aantal conflicten | `esmojo_aantalconflicten` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Niet overschreven afwijkende doelen. |
| Laatste start op | `esmojo_laatstestartop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Laatste daadwerkelijke start. |
| Laatst geslaagd op | `esmojo_laatstgeslaagdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Laatste bevestigde volledige uitvoering. |
| Foutcode | `esmojo_foutcode` | Eén tekstregel; Tekst; maximaal 80 tekens | Nee / geen standaard | — | Vaste veilige code; geen ruwe providerfout of gevoelige broninhoud. |
| Manifestdocument | `esmojo_manifestdocument` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | Afgeschermd manifestbestand als de gestructureerde manifestinhoud te groot is. |

**Unieke sleutels:**
- esmojo_ak_integratiestatus_sleutel: esmojo_sleutel
- esmojo_ak_integratiestatus_integratiescope: esmojo_integratiecode, esmojo_scopecode

## 26. Historieversie — `esmojo_historie`

Eén append-only oorspronkelijke versie/handeling van een benoemde bron.

**Huidige bron:** Bestaande history-arrays, revisies, intrekkingen en vereiste oudere bronbestanden.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Historie wordt niet gewijzigd via gewone editors. Precies één van Snapshot JSON of Snapshotdocument voor een volledige snapshot; geen stille afkapping. Native audit is aanvullend.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Entiteitsoort | `esmojo_entiteitsoort` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Vaste gevalideerde bron-/doelentiteit, bijvoorbeeld analyse of barrierbeoordeling. |
| Doelrecord GUID | `esmojo_recordguid` | Eén tekstregel; Tekst; maximaal 36 tekens | Nee / geen standaard | — | Server-gevalideerde Dataverse-record-ID; polymorfe historische verwijzing, niet door client vrij te kiezen. |
| Oorspronkelijk record-ID | `esmojo_oorspronkelijkrecordid` | Eén tekstregel; Tekst; maximaal 240 tekens | Nee / geen standaard | — | Oorspronkelijke bronidentiteit, ook als het actieve record niet meer bestaat. |
| Versienummer | `esmojo_versienummer` | Geheel getal; Min 0; max 2147483647 | Nee / geen standaard | — | Oorspronkelijke revisie/versie; niet verwarren met importvolgorde. |
| Mutatiesoort | `esmojo_mutatiesoort` | Keuze; Eén waarde; geen meerkeuze | Ja / geen standaard | esmojo_keuze_mutatiesoort | Bestaande handeling / gecontroleerde import. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Bekende reeks als geschiedenis daartoe behoort. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concert | Bekende uitvoering indien van toepassing. |
| Snapshot JSON | `esmojo_snapshot_json` | Meerdere tekstregels; Platte tekst; maximaal 1048576 tekens; geen rich text | Nee / geen standaard | — | Gevalideerde oorspronkelijke voor/na-snapshot of verandering met schema-versie. Geen base64. |
| Snapshotdocument | `esmojo_snapshotdocument` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | JSON-bron als File als de oorspronkelijke snapshot niet in een tekstkolom past. |
| Snapshot SHA-256 | `esmojo_fingerprint` | Eén tekstregel; Tekst; maximaal 64 tekens | Nee / geen standaard | — | Controlehash van exact gekozen snapshot-/broncontract. |
| Oorspronkelijke actorreferentie | `esmojo_oorspronkelijkeactor` | Eén tekstregel; Tekst; maximaal 100 tekens | Nee / geen standaard | — | Bestaande actor-ID als die nog niet aan een Medewerker kan worden gekoppeld. Geen fictieve auteur. |
| Snapshot-schemaversie | `esmojo_schemaversie` | Geheel getal; Min 1; max 2147483647 | Ja / 1 | — | Contract waarmee de historische inhoud gelezen moet worden. |

**Unieke sleutels:**
- esmojo_ak_historie_sleutel: esmojo_sleutel

## 27. Opdracht — `esmojo_opdracht`

Eén idempotent commando/achtergrondopdracht of gecontroleerd afgesloten ontvangstbewijs.

**Huidige bron:** Supabase esmojo_show_receipts, lopende PDF-/importacties en actieve external_command.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Geen onzekere lopende actie blind als geslaagd migreren. Leases afhandelen/verzoenen; writes en receipts gecoördineerd transactief vastleggen.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Commandosleutel | `esmojo_commandosleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Bestaand command-ID/hash of nieuwe stabiele idempotentiesleutel. |
| Opdrachtsoort | `esmojo_opdrachtsoort` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Vaste code, bijvoorbeeld pdf-generate, import of show-save. |
| Resourcecode | `esmojo_resourcecode` | Eén tekstregel; Tekst; maximaal 240 tekens | Ja / geen standaard | — | Gevalideerde scope van de opdracht. |
| Opdrachtstatus | `esmojo_opdrachtstatus` | Keuze; Eén waarde; geen meerkeuze | Ja / Wachtend (158620000) | esmojo_keuze_opdrachtstatus | Bevestigd pas na daadwerkelijk teruglezen/afhandeling. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Relevante reeks indien van toepassing. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concert | Relevante uitvoering indien van toepassing. |
| Document | `esmojo_document` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | Doel-/resultaatbestand indien van toepassing. |
| Bronbasis JSON | `esmojo_bronbasis_json` | Meerdere tekstregels; Platte tekst; maximaal 100000 tekens; geen rich text | Nee / geen standaard | — | Bronversies en afhankelijkheden van de opdracht. |
| Payload JSON | `esmojo_payload_json` | Meerdere tekstregels; Platte tekst; maximaal 1048576 tekens; geen rich text | Nee / geen standaard | — | Alleen gevalideerd noodzakelijke commando-invoer; geen secrets/base64. |
| Ontvangstbewijs JSON | `esmojo_resultaat_json` | Meerdere tekstregels; Platte tekst; maximaal 1048576 tekens; geen rich text | Nee / geen standaard | — | Oorspronkelijk bevestigd resultaat, nodig voor idempotente retries. Grote legacyresultaten via Resultaatdocument. |
| Resultaatdocument | `esmojo_resultaatdocument` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | Exact groot legacyresultaat als tekstgrens wordt overschreden. |
| Pogingen | `esmojo_pogingen` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Aantal uitvoeringspogingen. |
| Lease-ID | `esmojo_leaseid` | Eén tekstregel; Tekst; maximaal 36 tekens | Nee / geen standaard | — | Server-only technische UUID; geen openbaar toegangstoken. |
| Lease verloopt op | `esmojo_leaseverlooptop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Bestaande/geldige technische lease. |
| Gestart op | `esmojo_gestartop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Werkelijke start. |
| Bevestigd op | `esmojo_bevestigdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Werkelijke bevestiging. |
| Foutcode | `esmojo_foutcode` | Eén tekstregel; Tekst; maximaal 80 tekens | Nee / geen standaard | — | Vaste veilige diagnosecode. |

**Unieke sleutels:**
- esmojo_ak_opdracht_sleutel: esmojo_sleutel
- esmojo_ak_opdracht_commando: esmojo_commandosleutel

## 28. Routealias — `esmojo_routealias`

Eén bestaande openbare/appidentificatie gekoppeld aan een canoniek doel.

**Huidige bron:** Bestaande concert-ID’s, artiest-ID’s, slugs en showsleutels.
**Standaardclassificatie:** openbaar.

**Regel:** Precies één van Artiest, Concertreeks, Concert of Document. Geen Showbeheer-linkgeheimen of uitnodigingstokens in deze tabel. Documentalias verleent op zichzelf geen downloadrecht.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Openbaar (158620000) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Aliassoort | `esmojo_aliassoort` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Vaste code, bijvoorbeeld concert-id, artist-id, route-slug of research-show-key. |
| Aliaswaarde | `esmojo_aliaswaarde` | Eén tekstregel; Tekst; maximaal 240 tekens | Ja / geen standaard | — | Exacte oorspronkelijke waarde. |
| Artiest | `esmojo_artiest` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_artiest | Het ene canonieke doel van deze alias. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Het ene canonieke doel van deze alias. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concert | Het ene canonieke doel van deze alias. |
| Document | `esmojo_document` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_document | Het ene canonieke doel van deze alias. |
| Omleiden toegestaan | `esmojo_omleidentoegestaan` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Alleen binnen bestaande geautoriseerde routes; geen bypass van module-/accountcontrole. |

**Unieke sleutels:**
- esmojo_ak_routealias_sleutel: esmojo_sleutel
- esmojo_ak_routealias_soortwaarde: esmojo_aliassoort, esmojo_aliaswaarde

## 29. Paginaweergave — `esmojo_paginaweergave`

Eén automatisch samengestelde, versiegebonden schermbundel.

**Huidige bron:** Showbundle, planning/menuprojecties en afgeleide status.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Afgeleide inhoud, geen handmatig bewerkbare tweede waarheid. Globale menu/homeprojectie mag zonder eigenaar; showspecifieke bundel heeft precies één passende eigenaar.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Weergavesoort | `esmojo_weergavesoort` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Vast contract, bijvoorbeeld show-workspace, shows-menu of home-planning. |
| Rechtenscope | `esmojo_rechtenscope` | Eén tekstregel; Tekst; maximaal 100 tekens | Ja / geen standaard | — | Gevalideerde publicatie-/module-/accountscope; geen privéprojectie publiek maken. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Eigenaar van de gedeelde voorbereidingsbundel. |
| Concert | `esmojo_concert` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concert | Eigenaar van datumgebonden gegevens indien nodig. |
| Artiest | `esmojo_artiest` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_artiest | Alleen indien bestaande gedeelde projectie dit nodig heeft. |
| Contractversie | `esmojo_contractversie` | Geheel getal; Min 1; max 2147483647 | Ja / 1 | — | Versie van het JSON-responsecontract. |
| Generatie | `esmojo_generatie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Gecoördineerde gepubliceerde generatie. |
| Bronfingerprint | `esmojo_bronfingerprint` | Eén tekstregel; Tekst; maximaal 64 tekens | Nee / geen standaard | — | Versiegebonden bronset van deze projectie. |
| Inhoud JSON | `esmojo_inhoud_json` | Meerdere tekstregels; Platte tekst; maximaal 1048576 tekens; geen rich text | Nee / geen standaard | — | Uitsluitend toegestane compacte schermgegevens; geen PDF-bytes, secrets of onnodige historie. |
| Vernieuwen nodig | `esmojo_vernieuwennodig` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Ja | — | Dirty-flag; aanmaak staat op Ja tot de bundel gecontroleerd is gepubliceerd. |
| Gepubliceerd op | `esmojo_gepubliceerdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Publicatiemoment van deze versie. |

**Unieke sleutels:**
- esmojo_ak_paginaweergave_sleutel: esmojo_sleutel

## 30. Technische status — `esmojo_technischestatus`

Eén gecoördineerde guard/lease/teller per resource.

**Huidige bron:** Supabase lease/attempt_count/attempt_until/storage-control en actieve handoffstatus.
**Standaardclassificatie:** vertrouwelijk.

**Regel:** Schema alleen biedt nog geen transactieveiligheid: alle afhankelijke writers moeten dezelfde CAS-/transactieguard gebruiken. MFA/OAuth-caches in Redis vallen buiten deze Shows-schemastap.

| Kolom | Logische naam | Type / instellingen | Verplicht / standaard | Relatie / keuze | Inhoud |
|---|---|---|---|---|---|
| Naam | `esmojo_naam` | Eén tekstregel; Tekst; maximaal 200 tekens | Ja / geen standaard | — | Primaire naamkolom: leesbare omschrijving; niet de identiteit. |
| Sleutel | `esmojo_sleutel` | Eén tekstregel; Tekst; maximaal 64 tekens | Ja / geen standaard | — | Stabiele applicatiesleutel: lowercase SHA-256 van tabel + canonieke scope + bron-/onderwerpidentiteit. Niet opnieuw berekenen uit een gewijzigde naam. |
| Revisie | `esmojo_revisie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Eigen ESMOJO-domeinrevisie; onafhankelijk van native Dataverse RowVersion. |
| Classificatie | `esmojo_classificatie` | Keuze; Eén waarde; geen meerkeuze | Ja / Vertrouwelijk (158620001) | esmojo_keuze_classificatie | Classificatie van de inhoud; afgeleide records erven de strengste bron. |
| Oorspronkelijk vastgelegd op | `esmojo_vastgelegdop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijk zakelijk vastleggings-/wijzigingsmoment, indien bekend. Native createdon blijft importtijd; onbekend blijft leeg. |
| Gewijzigd door | `esmojo_gewijzigddoor` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_medewerker | Werkelijke ESMOJO-auteur, indien bekend; native CreatedBy is de technische app. Geen huidige beheerder invullen als oorspronkelijke auteur onbekend is. |
| Bronidentiteit | `esmojo_bronidentiteit` | Eén tekstregel; Tekst; maximaal 1000 tekens | Nee / geen standaard | — | Niet-geheime oorspronkelijke bronsoort/record-ID/bestands-ID voor herleidbaarheid. Nooit tokens, PIN, wachtwoord of sleutelmateriaal. |
| Doelsoort | `esmojo_doelsoort` | Eén tekstregel; Tekst; maximaal 80 tekens | Ja / geen standaard | — | Bijvoorbeeld show-write, floor-basis, show-management-attempt of storage-cutover. |
| Resourcecode | `esmojo_resourcecode` | Eén tekstregel; Tekst; maximaal 240 tekens | Ja / geen standaard | — | Gevalideerde stabiele scope, geen losse secrets. |
| Concertreeks | `esmojo_concertreeks` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_concertreeks | Reeks indien relevant. |
| Showbeheer | `esmojo_showbeheer` | Opzoeken; N:1; verwijdergedrag Beperken (Restrict); geen cascade delete | Nee / geen standaard | N:1 → esmojo_showbeheer | Externe toegang bij PIN-pogingslimiet. |
| Generatie | `esmojo_generatie` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Gecoördineerde bron-/guardgeneratie. |
| Lease-ID | `esmojo_leaseid` | Eén tekstregel; Tekst; maximaal 36 tekens | Nee / geen standaard | — | Server-only lease-UUID; niet als browsergeheim exporteren. |
| Lease verloopt op | `esmojo_leaseverlooptop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Technisch verloopmoment. |
| Teller | `esmojo_teller` | Geheel getal; Min 0; max 2147483647 | Ja / 0 | — | Bestaande gedeelde pogingsteller of noodzakelijke technische teller. |
| Venstereinde | `esmojo_venstereinde` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Bestaande attempt_until / rate-limitvenster. |
| Spiegeling nodig | `esmojo_spiegelingnodig` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Oorspronkelijke pending-markering; uitsluitend tijdens gecontroleerde overgang. |
| Archiveringsfout | `esmojo_archiveringsfout` | Ja/Nee; Twee opties; alleen waar onbekend geen afzonderlijke betekenis heeft | Ja / Nee | — | Oorspronkelijke archive_error; niet stil wissen. |
| Extern commando-ID | `esmojo_externcommando` | Eén tekstregel; Tekst; maximaal 64 tekens | Nee / geen standaard | — | Bestaande external_command-hash indien nog niet verzoend. |
| Extern commando gestart op | `esmojo_externcommandoop` | Datum en tijd; Gedrag Gebruiker lokaal; API UTC; weergave Europe/Amsterdam | Nee / geen standaard | — | Oorspronkelijke external_started. |

**Unieke sleutels:**
- esmojo_ak_technischestatus_sleutel: esmojo_sleutel
- esmojo_ak_technischestatus_doelresource: esmojo_doelsoort, esmojo_resourcecode

## Keuzelijsten en exacte waarden

### esmojo_keuze_classificatie

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Openbaar | 158620000 | `openbaar` |
| Vertrouwelijk | 158620001 | `vertrouwelijk` |

### esmojo_keuze_module

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Shows | 158620000 | `shows` |
| Artiesten | 158620001 | `artists` |
| Rapportages | 158620002 | `reports` |

### esmojo_keuze_medewerkerrol

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Gebruiker | 158620000 | `gebruiker` |
| Beheerder | 158620001 | `beheerder` |

### esmojo_keuze_categorie

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Bezoekersanalyse | 158620000 | `visitors` |
| Artiestanalyse | 158620001 | `artist` |

### esmojo_keuze_analysestatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Concept | 158620000 | `draft` |
| Afgerond | 158620001 | `completed` |

### esmojo_keuze_afrondstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Concept | 158620000 | `draft` |
| Afgerond | 158620001 | `completed` |
| Ingetrokken / ongeldig | 158620002 | `invalidated` |

### esmojo_keuze_bezoekersveld

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Ticketverkoop | 158620000 | `ticket_sales` |
| Bezoekersherkomst | 158620001 | `visitor_origins` |
| Binnenlandse herkomst | 158620002 | `domestic_origins` |

### esmojo_keuze_veldstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Leeg | 158620000 | `empty` |
| Concept | 158620001 | `draft` |
| Gecontroleerd | 158620002 | `reviewed` |

### esmojo_keuze_janee

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Nee | 158620000 | `false` |
| Ja | 158620001 | `true` |

### esmojo_keuze_productieonderwerp

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Entreeproces | 158620000 | `entrance_process` |
| Barrieropstelling | 158620001 | `barrier_layout` |
| Vloerdruk | 158620002 | `floor_pressure` |
| Vluchtwegbeperkingen | 158620003 | `escape_routes` |
| Vuurwerk | 158620004 | `fireworks` |
| Open vuur | 158620005 | `open_fire` |
| Lasers | 158620006 | `lasers` |
| Drones | 158620007 | `drones` |

### esmojo_keuze_barriertype

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Seated | 158620000 | `seated` |
| End-stage zonder GC | 158620001 | `end_stage_no_gc` |
| End-stage met GC | 158620002 | `end_stage_gc` |
| End-stage met catwalk zonder GC | 158620003 | `end_stage_catwalk_no_gc` |
| End-stage met catwalk en GC | 158620004 | `end_stage_catwalk_gc` |
| Afwijkend ontwerp | 158620005 | `custom` |

### esmojo_keuze_risiconiveau

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Geen risico | 158620000 | `none` |
| Laag | 158620001 | `low` |
| Midden | 158620002 | `medium` |
| Hoog | 158620003 | `high` |

### esmojo_keuze_beoordelingsstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Concept | 158620000 | `draft` |
| Afgerond | 158620001 | `completed` |
| Ongeldig door bronwijziging | 158620002 | `invalidated` |

### esmojo_keuze_bronstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| In afwachting | 158620000 | `pending` |
| Beschikbaar en gecontroleerd | 158620001 | `verified` |
| Ongeldig / verouderd | 158620002 | `invalidated` |
| Mislukt | 158620003 | `failed` |

### esmojo_keuze_risicobasis

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Expliciet in bron | 158620000 | `explicit` |
| Afgeleid uit bron | 158620001 | `inferred` |

### esmojo_keuze_maatregelbron

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Productie | 158620000 | `production` |
| Operationeel risico | 158620001 | `operational` |

### esmojo_keuze_documentsoort

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Showprofiel PDF | 158620000 | `showprofile-pdf` |
| Barrierreferentie | 158620001 | `barrier-reference` |
| Barrierbijlage | 158620002 | `barrier-attachment` |
| Maatregelbijlage | 158620003 | `measure-attachment` |
| Artiestfoto | 158620004 | `artist-photo` |
| Medewerkeravatar | 158620005 | `employee-avatar` |
| Onderzoeksbron | 158620006 | `research-source` |
| Tijdschemabron | 158620007 | `timetable-source` |
| Migratie / historische bron | 158620008 | `migration-source` |
| Overig showdocument | 158620009 | `other-show-document` |

### esmojo_keuze_koppelstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Actief | 158620000 | `active` |
| Logisch verwijderd / vervangen | 158620001 | `retired` |

### esmojo_keuze_zaalstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Leeg | 158620000 | `empty` |
| Concept | 158620001 | `draft` |
| Afgerond | 158620002 | `completed` |

### esmojo_keuze_zaalsectie

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Personele bezetting | 158620000 | `staff` |
| Omgevingsbeeld | 158620001 | `environment` |
| Veiligheidsbeleid | 158620002 | `policy` |
| Rapportages | 158620003 | `reports` |

### esmojo_keuze_tijdsoort

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Gepland | 158620000 | `planned` |
| Feitelijk | 158620001 | `actual` |

### esmojo_keuze_integratiestatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Niet gestart | 158620000 | `idle` |
| Bezig | 158620001 | `running` |
| Geslaagd | 158620002 | `succeeded` |
| Mislukt | 158620003 | `failed` |
| Geblokkeerd / conflict | 158620004 | `blocked` |

### esmojo_keuze_opdrachtstatus

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Wachtend | 158620000 | `pending` |
| Bezig | 158620001 | `running` |
| Bevestigd | 158620002 | `verified` |
| Mislukt / opnieuw proberen | 158620003 | `failed` |
| Conflict / controle nodig | 158620004 | `conflict` |
| Geannuleerd | 158620005 | `cancelled` |

### esmojo_keuze_mutatiesoort

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Import | 158620000 | `import` |
| Aanmaken | 158620001 | `create` |
| Wijzigen | 158620002 | `update` |
| Afronden | 158620003 | `complete` |
| Heropenen / intrekken | 158620004 | `reopen` |
| Bronwijziging | 158620005 | `source-changed` |
| Logisch verwijderen | 158620006 | `retire` |

### BESTAANDE lokale Opruimstatus: niet veranderen

| Label | Numerieke waarde | Bestaande applicatiecode |
|---|---|---|
| Nog niet vrijgegeven | 158610000 | `not-released` |
| Klaar voor opruimen | 158610001 | `ready` |
| Opgeruimd | 158610002 | `cleaned` |
| Bestand verwijderd | 158610003 | `file-deleted` |

