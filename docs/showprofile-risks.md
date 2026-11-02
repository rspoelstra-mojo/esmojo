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
