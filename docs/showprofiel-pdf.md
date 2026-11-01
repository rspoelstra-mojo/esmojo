# Automatisch Showprofiel-PDF

Zodra beide categorieën definitief zijn afgerond, plant de server het maken van
het PDF op de achtergrond in via `waitUntil`. Het overzicht toont de voortgang
boven Analyse in beeld, gevolgd door Showprofiel downloaden. Openen van een reeds
afgerond profiel hervat zo nodig de voorbereiding. Een mislukking is zichtbaar en
kan opnieuw worden geprobeerd; invoer blijft bewaard.

## Overgenomen bronbestanden

`server/report-original/` bevat de overdracht ongewijzigd: `generate.mjs`, originele
`package.json` en `package-lock.json`, alle `server/*.ts` en `src/*.ts`, vier assets
(body-font.ttf, heading-font.otf, watermark.png, cover.pdf), voorbeeldinvoer/PDF,
geometrie, manifest, verificatiebestand, tests en referentiebronnen. De 38 hashes
in MANIFEST_SHA256.json worden gecontroleerd. Broncommit:
`eb2fa1a532267d7963f3d2358308c04b3bf8cfe6` (websiteversie 2.71).
Opmaakprotocol: `gashouder-showprofile-v6-confidential-footer`.

De renderer wordt rechtstreeks aangeroepen met `{fitText:true}`. Proofmodi blijven
uit. De huidige productieafronding ondersteunt Gashouder. Geen HTML-print, extra
foto, gewijzigde vectorpaden, fontvervanging of inhoudelijke inkorting. De losse
cover en alternatieve modi blijven als oorspronkelijke bron behouden.

Het oorspronkelijke lockbestand blijft intact voor zelfstandige reproductie met
`npm ci` en Node 24. De applicatie heeft daarnaast haar eigen bestaande dependencies;
haar PDF-runtime gebruikt exact pdf-lib 1.17.1, fontkit 1.1.1 en dezelfde transitieve
versies/integriteiten. pdf-lib gebruikt zijn eigen tslib 1.14.1; andere applicatiecode
kan de bestaande nieuwere tslib gebruiken. CI controleert dit onderscheid.

## Aanpassing aan deze applicatie

Alleen de integratie met de huidige Drive-/accountworkflow is nieuw. De oude
`reference/server/finalize-report.ts` is referentie, geen route die in deze
applicatie kan worden ingeschakeld. `google-apps-script/ShowProfilePdf.gs` bouwt een
strikt gebruikerssnapshot: eigen samenvattingen 1–11 uit showprofiel.json worden
naar de oorspronkelijke veld-ID's vertaald. De drie bevestigde handmatige velden
komen uit bezoekersdata.json. Cijfers en toelichtingen komen uit de bevestigde
analyseafronding.json, als score_review.score/reason. Onderzoeks-JSON, research.cards,
summary_points, provenance en attention_proposals worden niet gelezen of doorgegeven.
De Node-adapter herhaalt deze whitelist aan de rendergrens.

De managernaam komt uit het geverifieerde account dat de generatie reserveert, niet
uit een browserparameter. Een hervatte reservering behoudt die naam. updated_at
komt uit de laatste opgeslagen wijziging/bevestiging van de invoer, niet uit de
huidige klok. Concertdagen en locatie komen uit de canonieke reeksindex. De
bestaande inhouds-, ticketdag- en eindbeoordelingscontroles worden opnieuw uitgevoerd.

Het volledige document is Vertrouwelijk vanwege de ticket- en herkomstgegevens.
PDF en revisieregister showprofiel-pdf.json staan uitsluitend in de bestaande
canonieke Drive-showmap. Geen publieke Drive-links, Supabase-opslag, logging van
inhoud of persistente browseropslag. Download vereist de bestaande actieve
account-/MFA-/sessiecontrole en de huidige definitief bevestigde invoerrevisie.

Een serverreservering van vijf minuten voorkomt dubbele generatie. De revisie
bevat brongegevens, bevestigingen, opmaakversie en broncommit. Dezelfde revisie
hergebruikt het opgeslagen bestand en versienummer. Mislukte pogingen verbruiken
geen documentversie; na een verloren opslagantwoord worden identieke bytes
herkend. Nieuwe invoer blokkeert de oude download zonder oude PDF's te wijzigen.
Bij een eerdere eerste reeksdatum verhuizen eigen documenten gecontroleerd mee;
een gedeeltelijk uitgevoerde verplaatsing kan worden hervat.

De maximale PDF-grootte is 2 MiB, passend binnen de bestaande JSON-transportketen.
Een te groot of ongeldig document levert een fout op, geen gedeeltelijke PDF.

## Uitgevoerde vergelijking

Met ongewijzigde invoer/assets en het oorspronkelijke lockbestand is lokaal op
Node 24.22.1 exact dezelfde PDF van 46.096 bytes gegenereerd als de referentie:
SHA-256 `e66f0bb6753a783866e9a6fdb474e58e70343ebfeca90de4ec5c41fe989dab1a`.
De referentie vermeldt Node 24.19.0. Beide pagina's zijn 595.2 × 841.92 pt.
Alle 86 geometrie-items, drie muzieklinks en de OpenType/FontFile3-afwerking zijn
gecontroleerd. Tekstextractie met dezelfde Poppler-versie is gelijk. Renderen met
Poppler 26.05.0 op 144 dpi leverde voor beide pagina's identieke PNG-bytes op;
beide pagina's zijn ook visueel bekeken.

Dit geldt voor de synthetische referentie; geen algemene garantie van identieke
bytes op andere platforms, dependencies of gewijzigde invoer. Een eerder opgeslagen
PDF wordt als oorspronkelijke bytes teruggegeven, niet opnieuw gerenderd.

Controles: oorspronkelijke acht fit-/paginatests; datums over maand-/jaargrenzen;
lange teksten, te brede woorden en artiestnamen; tweede categorie start achtergrondwerk;
AI-poison-test verandert geen PDF-byte; private opslag, concurrente reservering,
replay, verlopen reservering, onderbroken opslag, gewijzigde bron, corrupte bytes
en hervatbare mapmigratie. Alle opslagtests gebruiken synthetische Drive-doubles.
Er zijn geen echte concertgegevens tijdens tests aangepast. Het overzicht en de
voortgang/downloadknop zijn in een lokale browser met synthetische gegevens bekeken.
De automatische downloadmelding van de testbrowser bleek niet bruikbaar; de
browserdownloadcode en de geleverde PDF-bytes worden afzonderlijk gecontroleerd.
