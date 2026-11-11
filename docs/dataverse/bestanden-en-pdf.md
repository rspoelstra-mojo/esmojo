# PDF's, documenten en downloads

Status: opslag- en prestatieontwerp; nog geen Microsoft-bestand geüpload of echte
downloadmeting uitgevoerd. Een succesvolle Dataverse-CRUD-proef bewijst geen SharePoint-rechten, file-API of streaming.

## Exacte voorgestelde opslag

Alle PDF's krijgen een centrale plek in **SharePoint**. Definitieve showprofiel-
PDF's staan in de map **SHOWPROFIELEN** van een nog vast te stellen afgeschermde
ESMOJO-documentbibliotheek. Dit is de expliciete aanvulling van de gebruiker op
het eerdere Dataverse-only voorstel. Andere PDF-bijlagen worden niet automatisch
in de skill-bronmap gepubliceerd; hun afgeschermde bestemming binnen SharePoint
wordt bij de broninventarisatie vastgesteld.

De tabel **Document** (`esmojo_document`) bewaart alleen de metadata, koppeling,
bronfingerprint en SharePoint site-/drive-/item-/versie-ID. De PDF-bytes worden
niet ook blijvend in Dataverse bewaard. Dezelfde SharePoint-PDF wordt gebruikt
voor ESMOJO-download, eventuele mailbijlage en de toekomstige ChatGPT-skill.
Overige bestanden, zoals incident-CSV's, kunnen een Dataverse File-kolom gebruiken;
foto’s een Image-kolom. Geen grote base64 in tekst-/paginaweergaven.

Voorbeeld zonder echte gegevens:

| Veld | Voorbeeld / functie |
|---|---|
| documentsoort | showprofiel-pdf |
| concertreeks/concert | Lookup naar de juiste bestaande scope |
| documentgroep | Stabiele groep voor alle versies van hetzelfde showprofiel |
| versienummer | 1, 2, …; oorspronkelijke versies behouden |
| bronfingerprint | Versies van analyses, tickets, keuzes en vereiste bronnen |
| template-/layoutversie | Exacte PDF-renderer/assetversie |
| bestandsnaam | Bestaande naam of veilig gegenereerde naam |
| MIME / omvang / SHA-256 | application/pdf; werkelijke bytes; integriteitsbewijs |
| status | voorbereiden / genereren / verifiëren / beschikbaar / vervangen / fout |
| SharePoint-verwijzing | Site, drive, item en vastgestelde bestandsversie; PDF-bytes daar |
| oorspronkelijke herkomst | Oude bron-ID/hash/tijd alleen in beschermd manifest/record |

SharePoint-versiegeschiedenis moet ingeschakeld en op retentie gecontroleerd
worden. **Iedere definitieve applicatieversie krijgt een eigen Documentrecord**
met concrete file-/versieverwijzing en hash. Voor de skill toont SHOWPROFIELEN
alleen gepubliceerde actuele showprofielen; historische versies blijven expliciet
opvraagbaar. Het publicatie-/versiepatroon staat in [sharepoint-en-skill.md](sharepoint-en-skill.md).
Geen native historie aannemen zonder een echte herstel-/versiedownloadproef.

## Aanmaak van een showprofiel-PDF

1. Canonieke analyses/afrondingen en juiste bronbasis zijn bevestigd.
2. Eén versiegebonden PDF-opdracht, idempotent op scope + bronfingerprint + layout.
3. Worker haalt benodigde bronnen uit Dataverse en rendert met de bestaande
   gevalideerde lay-out en assets. Geen generatie bij iedere pagina-open/download.
4. Documentrecord in voorbereidingsstatus; upload naar een niet voor de skill
   zichtbare SharePoint-conceptlocatie via Microsoft Graph.
5. Werkelijke omvang/hash en bronbasis controleren. SharePoint en Dataverse
   vormen geen gezamenlijke transactie; verificatie, publicatie en herstel
   moeten expliciet door een idempotente opdracht worden gecoördineerd.
6. Pas na verificatie de beschikbaarstatus en actuele verwijzing publiceren.
   Een gewijzigde bron vóór publicatie maakt de opdracht verouderd; die mag niet
   stil het nieuwe actuele PDF worden.

De PDF-status/naam/grootte/verwijzing zitten al in de showbundel. Normale showtabs
wachten niet op generatie, upload of PDF-download. Als de actuele bron nog geen
PDF heeft, toon de echte bestaande generatiestatus. Een oude PDF mag alleen als
oude versie herkenbaar worden aangeboden, niet als actuele afgeronde versie.

## Beveiligde downloadroute

1. Gebruiker kiest een concrete beschikbare documentversie.
2. Vercel valideert de bestaande Supabase-sessie/MFA, actuele rechten en de echte
   documentkoppeling. Het kennen van een Document-ID geeft geen toestemming.
3. De Microsoft-app haalt de binary uit SharePoint via Microsoft Graph op. De browser
   krijgt geen client secret, Microsoft-token of openbare/pre-authenticated SharePoint-bestandslink.
4. Binaire respons naar de browser, waar mogelijk gestreamd. Correcte MIME,
   veilige Content-Disposition, relevante omvang/versie en private/no-store headers.
   Geen base64-JSON en browser-atob/volledige dubbele buffer als standaarddownload.

De huidige route (`server/showprofile-pdf.js` en `src/showprofile-pdf.js`) ontvangt
volledige base64, controleert de hash en maakt daarna een Blob. Base64 heeft circa
33% transportoverhead vóór compressie en veroorzaakt extra buffers. Die route
wordt voor bestanden vervangen door een getoetste beveiligde binary-route.

**Verplichte technische proef:** aantonen hoe browserauthenticatie en native
streamdownload samen werken zonder geheime URL-parameters en zonder publieke
cache. Bestaande Bearer-fetch plus achteraf Blob is niet hetzelfde als een native
progressieve download. Een beperkte HttpOnly downloadautorisatie is een mogelijke
uitwerking; ontwerp daarvan moet sessie-/MFA-/intrekkingsregels behouden en wordt
niet stil als nieuwe onbeveiligde route toegevoegd.

Graph/SharePoint kan voor grotere uploads uploadsessies gebruiken en bij downloads
een tijdelijke redirect leveren. Die URL alleen tijdelijk server-side, nooit
opslaan/loggen, en bestemming strikt valideren. Upload- en downloadchunking zijn
verschillende zaken. Stream- en
Range-ondersteuning eerst end-to-end meten; geen ondersteuning beloven die de
providerroute niet levert. Ook naam, hash, eerste/laatste bytes en volledige
integriteit bij hervatten testen. Geen complete file-download vooraf doen alleen
om een rij metadata op de showpagina te tonen.

## Hoe snel kan een PDF downloaden?

Er zijn drie verschillende tijden:

- **Generatie:** een nieuwe PDF maken. Apart meten; niet inbegrepen bij het downloaden
  van een al beschikbaar bestand. Geen ononderbouwde 1s-generatiebelofte.
- **Downloadstart:** klik → eerste echte bestandsbyte in de browser.
- **Download gereed:** klik → laatste ontvangen byte, met juiste integriteit.

Voorstel: downloadstart P95 ≤500 ms bij warme geauthenticeerde route; koude route
streefdoel ≤1.000 ms. Nog niet gemeten. De volledige downloadtijd blijft afhankelijk
van bestandsgrootte, werkelijke throughput, provider en netwerk. Theoretische
minimumtijd alleen voor bytes, zonder serverwachttijd/TLS/overhead:

| Omvang | 20 Mbit/s | 100 Mbit/s |
|---|---:|---:|
| 1 MiB | 0,42 s | 0,08 s |
| 5 MiB | 2,10 s | 0,42 s |
| 10 MiB | 4,19 s | 0,84 s |
| 25 MiB | 10,49 s | 2,10 s |

Formule: MiB × 1.048.576 × 8 / bits per seconde. Dit zijn rekenvoorbeelden,
geen gemeten SharePoint/Graph-snelheden. Een PDF van 5 MiB bij 20 Mbit/s kan dus niet
volledig in één seconde binnen zijn, ook met een perfecte database.

Praktische winst: generatie vooraf, goede file-metadata, geen base64, minder
onnodige leesrondes, passende regio, geschikte font-/beeldcompressie zonder de
vaste huisstijl/tekstkwaliteit te veranderen. Bestaande PDF-bytes bij migratie
behouden; niet alles opnieuw genereren om de verhuizing te laten slagen.

## Wat de proef moet meten

- Kleine/bestaande typische PDF, grootste huidige PDF en synthetische 1/5/10/25 MiB.
  Bij overschrijding van huidige app-limieten is de grote variant uitsluitend een
  aparte storageproef, geen stilzwijgende verruiming van gebruikersuploads.
- Warme/koude server, lokaal browsergeheugen leeg, verschillende downloadbandbreedtes.
- Tijd metadata/autorisatie, Graph/SharePoint file-open, eerste byte, totale bytes en peak RAM.
- Native download versus huidige buffered-Blob-route; resultaat en tijd afzonderlijk.
- Toegang na account-/moduleblokkering, verkeerde documentkoppeling, oude versie,
  pending upload, beschadigd bestand, time-out en eventueel Range/hervatten.
- Parallelle downloads mogen gewone pagina's en opslagacties niet blokkeren.

PDF's en skillbestanden verbruiken SharePoint-opslag en versiecapaciteit.
CSV's/andere bestanden in Dataverse gebruiken bestandscapaciteit; JSON/metadata,
incidenten en paginaweergaven databasecapaciteit. Audit/historie telt afzonderlijk.
Werkelijke prijzen/capaciteit niet uit de proeflicentie afleiden. Volumeberekening
staat in het migratieplan. De extra Graph/SharePoint-hop hoort nadrukkelijk in de
meting van downloadstart; de warme 500ms-doelstelling is nog onbewezen.
