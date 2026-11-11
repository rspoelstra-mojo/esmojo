# SharePoint en de vier ChatGPT-skillmappen

Aanvulling gebruiker 11 november 2026: PDF's centraal in SharePoint; een toekomstige
skill haalt daar broninformatie op en schrijft onderzoeksresultaten terug.
Dit document maakt geen site, map, connector, skill of Microsoft-recht aan.

## Centrale plek en vier exacte mapnamen

Eén nog te kiezen afgeschermde ESMOJO-site/documentbibliotheek. Technische
site-/drive-/folder-ID's pas na inrichting registreren; geen hardcoded privé-URL
of fictief 'werkend' siteadres in dit plan.

| Map | Inhoud | Richting |
|---|---|---|
| **SHOWPROFIELEN** | Gepubliceerde showprofiel-PDF's, expliciete versies en gecontroleerde actuele-versieverwijzing | ESMOJO publiceert; skill leest |
| **NIEUWE_SHOW** | UTF-8 TXT met minimale basisinformatie voor een expliciete onderzoeksopdracht | ESMOJO publiceert; skill leest |
| **SHOWPROFIEL_RESULTAAT** | Onderzoeksresultaten op basis van showprofiel-opdrachten | Skill schrijft; ESMOJO controleert/importeert |
| **NIEUWE_SHOW_RESULTAAT** | Onderzoeksresultaten op basis van nieuwe-show-opdrachten | Skill schrijft; ESMOJO controleert/importeert |

Andere PDF-bijlagen, bijvoorbeeld een afwijkende barriertekening, worden niet
vanzelf als showprofielbron aan de skill gegeven. Hun afgeschermde SharePoint-
bestemming wordt in de documentinventaris vastgesteld. Vier genoemde mappen
zijn functionele uitwisselmappen, geen toestemming om alle documenten openbaar te delen.

## PDF-publicatie en historie

Voorgesteld basispatroon: immutable PDF-bestand per definitieve versie, bijvoorbeeld
`<stabiele-show-of-reeks-id>__v0001.pdf`, plus een kleine door ESMOJO beheerde
`<id>.current.json`-verwijzing met Document-ID, versie, bronfingerprint, SHA-256 en
publicatiestatus. Bestaande bestandsnamen blijven als metadata/alias behouden.

- De nieuwste versie wordt niet uit bestandsdatum, zoekrangschikking of naam geraden.
- Een oude PDF blijft beschikbaar als expliciete historie; een skill moet vóór
  gebruik de actuele verwijzing controleren. Native SharePoint-versiegeschiedenis
  blijft aanvullend ingeschakeld, maar vervangt deze applicatiecontrole niet.
- Huidig PDF-document en oorspronkelijke binary zijn centraal in SharePoint.
  Dataverse bewaart metadata/versieverwijzing, geen tweede permanente PDF-binary.
- Een bestandsupload eerst buiten de zichtbare bronmap voorbereiden, bytes/hash
  controleren en pas daarna publiceren. Onvolledige uploads horen niet in skillzoekresultaten.
- Dataverse en SharePoint hebben geen gezamenlijke atomaire commit. Een Opdracht
  bewaakt upload → verificatie → publicatie → actuele verwijzing. Herhalen heeft
  dezelfde idempotentiesleutel. De download-/skilltool controleert dat verwijzing,
  metadata en binary overeenkomen; bij verschil geen gemengde versie gebruiken.
- Een losse SharePoint-connector kan eerder of later dan de app indexeren. Een
  site-search-hit is geen bewijs dat de nieuwste PDF al beschikbaar is. Directe
  geautoriseerde Graph-opvraag en een gevalideerde actuele verwijzing zijn de
  controleerbare route; connector-indexeringslag wordt apart gemeten.

Alternatief 'één actuele PDF met SharePoint-major-versionhistory' kan alleen na
bewijs van publicatie-, conceptzichtbaarheids- en versiedownloadgedrag. Dat is
geen reeds gemaakte of technisch bewezen keuze.

## NIEUWE_SHOW: minimaal TXT-contract

Eén TXT per onderzoeksopdracht, niet ongemerkt één nieuwe opdracht per historische
show. Een reeks kan alle betrokken uitvoeringsdatums in hetzelfde bestand bevatten.
Voorgestelde UTF-8 sleutel/waarde-inhoud:

```text
schema_version: 1
research_request_id: <technische-opdracht-id>
research_type: nieuwe_show
show_id: <stabiele-ESMOJO-id>
series_id: <stabiele-reeks-id-indien-van-toepassing>
artist: <artiest>
venue: <zaal>
city: <stad>
show_dates: <expliciete-datumlijst>
public_source_url: <bekende-openbare-bron>
source_version: <versie>
```

Artiest, locatie, stad, datum, concert-ID en openbare bronlink vallen onder de
bestaande Openbaar-classificatie. Geen pincodes, credentials, persoonsgegevens,
kaartverkoop, incidentdetails of vertrouwelijke beoordelingen in deze basisexport.
Aanvullende velden pas na expliciete keuze. De TXT is een afgeleid exportdocument;
wijzigingen in Dataverse blijven de bron. Versie en hash binden het onderzoek aan
het juiste bestand. De instructies voor de skill staan in de skill, niet als
vrij uitvoerbare opdrachten in showtekst of PDF-inhoud.

## Resultaatcontract en verwerkingsgrens

De mapnamen/bestemmingen zijn bevestigd. Exacte onderzoeksvelden en formaat zijn
nog te ontwerpen met de nieuwe skill. Voorstel: een schema-valideerbaar JSON-
resultaat, eventueel met leesbare TXT/Markdown-weergave. Geen verplichting die nu
al aan een bestaande skill of bestand wordt opgelegd.

Minimale envelop: schema-/opdrachtversie, research_request_id, research_type,
stabiele show/reeks-ID, inputfingerprint(s), afgerond-op, bronverwijzingen en het
inhoudelijke resultaat binnen een expliciete veldallowlist. Inhoud niet loggen.

1. Tool schrijft uitsluitend in de passende resultaatmap, met vaste correlatie.
2. Bestand ontvangen en beschikbaarheid/hash controleren; gedeeltelijke uploads
   niet importeren. Alleen bekende bestandstypen, maximale omvang en encoding.
3. Bestaande open Opdracht, soort, scope, inputversie en identiteit controleren.
   Een door de tekst genoemde show-ID is geen autorisatie op zichzelf.
4. Het oorspronkelijke resultaat als Document koppelen; genormaliseerde inhoud
   als Onderzoeksresultaat in Dataverse. Onderzoekstatus en importontvangstbewijs
   apart bijhouden. Een bestand ontvangen betekent niet dat alle inhoud akkoord is.
5. Dezelfde opdracht+hash niet opnieuw importeren. Afwijkende inhoud krijgt een
   nieuwe reviewversie, geen stille overschrijving van een geaccepteerd resultaat.
6. Verouderde input, onbekende show, fout schema, ongeldige bron of verkeerde map:
   afwijzen/quarantaine met vaste code en herstelactie. Bronbestand behouden.
7. Resultaten zijn onderzoeksvoorstellen. Ze worden geen automatische definitieve
   ESM-beoordeling, 1–10-score, afronding, risicopublicatie of verzendactie. Een
   eventuele 'als concept toepassen'-actie krijgt later een expliciet contract.

Brontekst en resultaatbestanden zijn onbetrouwbare inhoud voor tooling: geen
embedded instructies uitvoeren, geen door het bestand gekozen endpoints/paden
benaderen en geen opdrachten aan andere accounts of shows overnemen.

## Toegang: twee afzonderlijke verbindingen

**ESMOJO/Vercel → SharePoint:** Microsoft Graph, geselecteerde site en expliciete
toekenning daarop. De eerder toegevoegde Sites.Selected had nog geen aangetoonde
beheerdersgoedkeuring/sitegrant. Dataverse System Customizer en geslaagde CRUD
verlenen geen SharePoint-rechten. Die verbinding moet afzonderlijk worden bewezen.

**ChatGPT/skill → SharePoint:** goedgekeurde ChatGPT-werkruimte/connector/tool en
passende Microsoft-identiteit. Lezen van bronmappen en schrijven naar resultaat-
mappen zijn afzonderlijke bevoegdheden. Microsoft-/SharePoint-toegang volgt niet automatisch de Supabase-module- of
blokkeerstatus. Vóór aansluiting moet de rollen-/intrekkingsmatrix kloppen; zo
nodig de beperkte tool per aanvraag actuele ESMOJO-rechten laten controleren.
Een directe connector met bredere Microsoft-rechten mag de afgesproken
vertrouwelijke toegang niet ongemerkt verruimen. Een lees-/zoekconnector heeft niet
vanzelf een uploadfunctie; een skill verleent geen extra rechten aan tools.

Als de gekozen connector niet kan schrijven, is een aparte beperkte tool/MCP-
functie nodig. Alleen vaste acties zoals 'opdracht ophalen', 'actueel showprofiel
lezen' en 'resultaat voor bekende opdracht plaatsen'; geen vrij Graph-endpoint,
geen willekeurig bestandspad en geen Dataverse-admincredential voor de skill.
De vertrouwde server controleert map-ID, parentketen, scope en de nog geldige
opdracht. Sites.Selected beperkt de site; fijnere map-/actiegrenzen moeten in de
gekozen SharePoint-identiteit/tool aantoonbaar worden gehandhaafd.

Geen 'iedereen met de link', geen secrets/tijdelijke download-URLs in bestanden,
geen servicecredentials in skilltekst en geen publieke CDN voor vertrouwelijke
PDF's. Definitieve gegevensclassificatie, DLP, ChatGPT-verwerking, retentie en
productieregio vaststellen vóór echte vertrouwelijke documenten worden aangesloten.

## Acceptatie van deze uitwisseling

- Werkelijke Graph-read/upload met beperkte rechten op de testsite; geen andere site.
- Alle vier map-ID's bekend; skill kan broninhoud niet ongemerkt wijzigen of verwijderen.
- Nieuwe PDF detecteerbaar via directe gevalideerde opvraag; indexeringslag apart bekend.
- V1/V2-profiel correct onderscheiden; hash en sourceversion kloppen bij download.
- Eén TXT per expliciete opdracht; reeksdatums behouden; geen onbedoelde privévelden.
- Beide resultaatsoorten in juiste map; idempotente import en herkenbare reviewstatus.
- Verkeerde/afgeronde/verouderde opdracht, onbekende show, dubbele upload, gedeeltelijk
  bestand en kwaadaardige tekst leiden niet tot ongeautoriseerde wijzigingen.
- Connector/tool tijdelijk uitgevallen: opdracht kan veilig hervatten; geen dubbel
  onderzoek of automatische e-mail. Opdrachten worden niet door alleen een nieuwe
  mapinhoud automatisch door ChatGPT gestart zonder ingerichte trigger.
