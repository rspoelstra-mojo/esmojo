# Risicoanalyse van definitieve showprofielen

De gebruiker heeft op 2 november 2026 gevraagd potentiële risico's voor een
publieksevenement uit het definitieve showprofiel te halen, ieder risico als
afzonderlijk JSON-item. Voorbeelden: moshpits, grote ticketvraag en aankomst
meer dan vier uur vóór deuren. Het resultaat is expliciet Vertrouwelijk.

## Verbinden en rechten

Server-URL blijft https://esmojo.nl/api/mcp, met OAuth. Kies bij opnieuw
verbinden de scopes `esmojo.research esmojo.showprofile_risks`, eventueel met
`offline_access` wanneer de client dat vraagt. De toestemmingspagina benoemt
uitdrukkelijk het lezen van vertrouwelijke PDF-tekst door het gekoppelde
ChatGPT-account en het maken van vertrouwelijke AI-risicoconcepten.
Alle geauthenticeerde actieve beheerders zien dezelfde twaalf toolbeschrijvingen,
ook met een oude grant. De werkelijke acties vereisen afzonderlijk de passende
scope: ontbrekende toestemming geeft een MCP-error-toolresultaat met
`_meta["mcp/www_authenticate"]` en een insufficient_scope-challenge.
ChatGPT kan daarmee de OAuth-toestemming starten. Elke tool vermeldt zijn
OAuth-scope in securitySchemes en de compatibele _meta-kopie.
Een gewone toestemmingsklik voor een tool geeft op zichzelf geen extra OAuth-scope.
De eerste aanmeldchallenge noemt beide ondersteunde scopes.
Een research-only token blijft uitsluitend openbaar onderzoek doen. Refresh
kan geen extra scope toevoegen. Bestaande grants hoeven niet ingetrokken te
worden voor compatibiliteit; voor nieuwe acties is nieuwe toestemming nodig.
De beheerder/MFA-controle, per-verzoek rolcontrole, PKCE, resourcebinding,
tokenhashopslag en bestaande absolute vervaltijden blijven gelden.
Het oudere ESMOJO_RESEARCH_TOKEN krijgt geen PDF- of risicoanalysetoegang.

## Acties en verwerking

| Actie | Doel |
| --- | --- |
| pending_showprofile_analyses | Scan per pagina drie canonieke concert/reeksmappen op huidige definitieve PDF's zonder analyseresultaat. Volg nextAfter tot null, ook als pending leeg is. |
| get_final_showprofile | Lees status en exacte source (revision en sha256), documentversie en aanwezigheid analyse. |
| showprofile_analysis_prompt | Lees de vaste Nederlandse risicoanalyseprompt, promptVersion=1. |
| read_showprofile_pdf | Controleer de exacte huidige PDF en hash; retourneer tekst per pagina. |
| save_showprofile_analysis | Valideer schema en citaten; maak append-only resultaat en lees volledig terug. |
| read_showprofile_analysis | Lees de analyse voor exact de opgegeven geregistreerde PDF-versie. Ook eerdere versies blijven leesbaar. |

De gegevensacties voor risicoanalyse zijn uitsluitend toegankelijk met de nieuwe
OAuth-scope; alleen hun toolbeschrijvingen zijn zichtbaar voor beheerders met
een bestaande onderzoekskoppeling. Geen
vrij aangeleverde Drive-IDs, paden, bestandsnamen, accounts of URL-downloads.
De server resolveert de hele Drive-parentketen via de bestaande index.
Historische geïmporteerde concertmappen blijven in de scan; alleen bij elkaar
horende reeksdatums delen de canonieke eerste-showmap. De queue is afgeleid
van het definitieve PDF-register en de aanwezigheid van het versiegebonden
analysebestand; er is geen apart taakregister of klantdata in Supabase.

Een PDF is pas beschikbaar wanneer beide categorieën geldig afgerond zijn
en de actuele invoerrevisie in het PDF-register een opgeslagen bestand heeft.
Een oude PDF na heropening van een analyse is geen actuele definitieve bron.
Geïmporteerde profielgegevens zonder gegenereerde PDF zijn dus nog niet
analyseerbaar via deze acties. De risicoacties genereren zelf geen PDF.

De PDF blijft in Drive, maximaal 2 MiB. Vercel controleert de bytes/hash en
extraheert tekst in tijdelijk geheugen met de vastgepinde unpdf-parser.
Maximaal twintig pagina's en 80.000 teksttekens. Geen OCR of externe analyse-API.
Geen publieke downloadlink, PDF-base64 of oorspronkelijke PDF in MCP-output;
uitsluitend pagina's met tekst via de geauthenticeerde verbinding/no-store.
Een niet-leesbare of te grote PDF faalt gesloten. De server voert geen AI-analyse
uit: het gekoppelde ChatGPT-account schrijft de inhoud volgens de vaste prompt.

## JSON-contract en bewaring

`result` bevat uitsluitend:

- promptVersion: 1;
- analysedAt: ISO UTC-tijdstip;
- risks: maximaal dertig aparte items met id (R01 enz.), title, description,
  consequence, basis (explicit/inferred) en evidence (page en letterlijk quote);
- limitations: maximaal tien korte beperkingen/onzekerheden.

De server controleert vorm en dat elk citaat op de opgegeven pagina staat
(witruimte wordt genormaliseerd). Dit bewijst niet dat de gevolgtrekking juist
of volledig is. Geen generieke risico's zonder bronaanleiding, geen verzonnen
tijden, geen risicotoekenning uitsluitend op basis van geslacht/leeftijd/
nationaliteit/genre, geen kans- of ernstscore zonder beoordelingsmethode.

Opslag: `showprofiel_risicos_v1_<PDF-invoerrevisie>.json` in de canonieke
Drive-showmap. De server voegt managedBy=ESMOJO/ShowProfileRisks-v1,
schemaVersion=1, classification=vertrouwelijk, status=concept, concertId,
source, pdfVersion en createdAt toe. Een definitieve bron maakt de AI-analyse
niet definitief. Geen automatische weergave of verwerking in de website gebouwd.

Writes delen de bestaande UserLock met PDF/publicatie/concertimport en
controleren de actuele bron opnieuw. Een gelijke retry hergebruikt het bestand;
afwijkende inhoud geeft CONFLICT. SOURCE_CHANGED vereist opnieuw ophalen en
analyseren. Bij een verloren opslagantwoord dezelfde payload herhalen, niet
opnieuw een ander analysedAt genereren. Alleen verified=true betekent dat de
server na opslag het volledige JSON-resultaat heeft teruggelezen en vergeleken.
Bestaande analyses/onderzoek/PDF's worden nooit overschreven. Een latere
reekshergroepering verhuist deze historische brongebonden bestanden niet;
nieuwe actuele PDF's en analyses gebruiken de actuele canonieke bestemming.

## Test in het gekoppelde account

1. Verbind opnieuw met beide scopes en geef toestemming als beheerder met MFA.
2. Laat de client de toollijst vernieuwen: verwacht twaalf acties bij beide scopes.
3. Zoek een exact concert via concerts_on_date; gebruik alleen geretourneerde IDs.
4. Roep get_final_showprofile aan. Bij not-ready stoppen: eerst de huidige PDF
   in ESMOJO laten genereren. Oudere PDF's niet als nieuwe versie presenteren.
5. Lees de prompt en read_showprofile_pdf met de geretourneerde source.
6. Doe een echte risicoanalyse en sla die op; geen fictieve fixture in productie.
7. Eis verified=true, lees daarna ook met read_showprofile_analysis terug.
   Rapporteer in chat alleen concert, PDF-versie, aantal risico's en succes/fout;
   geen vertrouwelijke inhoud of ticketgegevens.

Deze test kan alleen in het daadwerkelijk gekoppelde account worden uitgevoerd.
Lokale tests gebruiken uitsluitend fictieve fixtures en gesimuleerde Drive.
Deploymentcontrole valideert metadata, anonieme afwijzing en beide deployments;
geen live autorisatiecodes, grants of fictieve analyses als publicatieproef.

## Automatische uitvoering

MCP start zelf geen ChatGPT-gesprek. Een geplande ChatGPT-taak kan de pending-actie
periodiek controleren, de pagina's aflopen en ieder ontbrekend resultaat
volgens bovenstaande stappen verwerken. De taak moet in het andere account
daadwerkelijk de MCP-tools kunnen gebruiken, ook voor schrijven. Dit is niet
bewezen door een handmatige test. Nog geen geplande taak in dat account ingericht.
Het controle-interval bepaalt de vertraging; er is geen onmiddellijke pushtrigger.
API-uitvoering buiten het gekoppelde account zou een afzonderlijke oplossing zijn.

## Vastlopende uitvoering onderzoeken

De UI-actietitels bewijzen niet of een serveraanroep is voltooid. Test eerst
uitsluitend showprofile_analysis_prompt en vraag promptVersion/classification
terug; die actie leest geen PDF of showmappen. Test daarna uitsluitend
get_final_showprofile met een eerder geverifieerd concert-ID. Pas vervolgens
de gepagineerde pending-scan of volledige analyse uitvoeren. Deel bij een
fout alleen de veilige foutcode, geen tokens, headers of documentinhoud.

De broncontrole hergebruikt binnen dezelfde Apps Script-aanroep het al
gevalideerde Drive-doel. Dit voorkomt een tweede index-/parentketenlezing;
validatie wordt nooit over aanroepen heen gecachet.

Authenticatieprotocol: https://developers.openai.com/apps-sdk/reference/
(error tool result, mcp/www_authenticate).

## Risicoanalyse in de ingelogde website

Het bestaande showtabblad Risicoanalyse bevat Productionele risico's en
Operationele risico's. De operationele blokken komen uitsluitend uit het
gevalideerde analysebestand voor de actuele definitieve PDF. Iedere definitie
opent een eigen detailweergave met titel, beschrijving, mogelijk gevolg en
Terug naar overzicht. Ze zijn gemarkeerd als AI-concept. Geen bewerking of
beoordeling toegevoegd. Een ontbrekende PDF, ontbrekende analyse of lege
risicolijst wordt niet vervangen door een oudere versie of voorbeeldrisico's.

De website leest dit via POST /api/access?action=show-risks met uitsluitend
concertId, na de bestaande geactiveerde account-, MFA- en sessiecontrole.
De ondertekende Apps Script-actie risk-view kiest zelf de canonieke map en de
actuele bron. Alleen id, titel, beschrijving en mogelijk gevolg gaan naar de
browser, geen PDF-bytes, bronbestanden, ticketgegevens, Drive-IDs of historie.
Laden gebeurt pas bij openen van het tabblad. Gegevens blijven uitsluitend in
het geheugen van die pagina en verdwijnen bij navigatie/afmelden.

Productionele groepen en onderwerpen:

- Zaalindeling: Barrieropstelling, Vloerdruk, Vluchtweg beperkingen.
- Special effects: Vuurwerk, Open vuur, Lasers, Drones.

Barrieropstelling en Vloerdruk zijn direct toegankelijk. De overige vijf hebben
rechts Ja/Nee. Onbeantwoorde keuzes zijn niet vooraf als Nee ingevuld. Een
onderwerp is pas toegankelijk na bevestigde Ja-opslag; Nee vergrendelt het weer.
De detailweergaven bevatten voor deze eerste fase alleen titel en terugknop.

De gebruiker heeft deze handmatige keuzes op 2 november 2026 expliciet
Vertrouwelijk verklaard en bewaren per show gevraagd. Ze staan apart in
productionele-risicos.json bij de canonieke show/reeksmap. Het bestand heeft
managedBy=ESMOJO/ProductionRisks-v1, classification=vertrouwelijk, concertId,
revision, choices en history. Alleen de vijf vaste booleaanse velden zijn
beschrijfbaar; geen vrije bestandsnamen of inhoudelijke productiebeoordelingen.

POST /api/access?action=production-risks vereist dezelfde account/MFA-checks en
ontvangt concertId, field, value en revision. Alleen de server voegt de actor toe.
De gedeelde UserLock serialiseert writes; revisieconflicten worden geweigerd.
Identieke herpogingen zijn veilig. Iedere write wordt teruggelezen en vergeleken.
Bij een fout blijft een onderwerp vergrendeld totdat de laatste keuzes opnieuw
zijn geladen. Historie en actor blijven uitsluitend in Drive. De keuzes volgen
bij een nieuw toegevoegde eerdere reeksdatum de canonieke map, zonder conflicten
stilzwijgend samen te voegen. Deze bestanden veranderen het bron-PDF en de
ChatGPT-analyses niet. De MCP-tools krijgen geen nieuwe handmatige schrijfactie.


## Individuele ESM-beoordeling (V1.43)

Ieder actueel operationeel risico heeft naast de definitie de gedeelde kaart uit
src/risk-review-card.js. Zonder opgeslagen beoordeling: Nog te beoordelen. Daarna
toont het overzicht Geen risico, Laag, Midden of Hoog. Geen risico vereist een
toelichting, Midden/Hoog een beheersmaatregel, Laag geen tekst. Geen voorselectie.
Opslaan bevestigt de beoordeling; Bewerken maakt een nieuwe bevestiging mogelijk.

POST /api/access?action=operational-risk vereist de actuele geactiveerde Shows-
module, MFA en geldige sessie. De server bindt actor aan de sessie; input is exact
concertId, source (revision/sha256), riskId, revision, riskLevel en riskNote. De
ondertekende risk-operational-save-route kiest de canonieke reeksmap, controleert
de actuele PDF-bron en het bestaande risico-ID en serialiseert met UserLock.

Opslag blijft in het bestaande Vertrouwelijke productionele-risicos.json:
operationalReviews[PDF-revisie] bevat source, assessments en history. Iedere
risicobeoordeling heeft een eigen revision, riskLevel, riskNote en completedAt.
Historie bewaart actor/before/after uitsluitend in Drive. Identieke retry na
verloren antwoord schrijft niet dubbel; afwijkende oude revisie geeft conflict.
Volledige readback vereist vóór bevestiging. AI-bestanden blijven immutable;
oude beoordelingen worden bewaard maar niet toegepast op een nieuwe bron.

De gedeelde operationalComplete-regel geldt voor concertplanning en homeprojectie:
alle actuele risico’s moeten een geldige beoordeling hebben. Geen actuele analyse
betekent open, een beschikbare lege analyse heeft geen open beoordelingen. Een
bevestigde write werkt zowel sessiegeheugen als de bestaande openbare homepage-
afrondvlag bij. Geen vertrouwelijke inhoud in browseropslag of openbare projectie.
Beheersmaatregelen krijgen nog geen taken-/implementatieworkflow.

Controle: server/operational-risks.test.js (ondertekende Drive-flow, 3/3, conflict,
retry, bronwissel, privacy); accounts-api.test.js (module/MFA/serveractor);
show-open.test.js en show-planning.test.js (cache/directe planning). Browsercontrole
met uitsluitend synthetische fixtures op 1920/1440/900/700/390px, licht en donker.
