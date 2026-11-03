# Fluid-layoutproef — uitsluitend preview, NIET MERGEN

De opdracht van 3 november 2026 staat alleen ontwikkeling en beoordeling in een
geïsoleerde testomgeving toe. Deze branch blijft een draft-PR buiten main.
De versie, bestaande routes en deployment van esmojo.nl worden niet bijgewerkt.

## Toegang

Gebruik de **Preview**-deployment van draft-PR #58 met `/test/fluid-layout` achter
de deployment-URL. De bestaande Vercel-previewbescherming vereist projecttoegang.
Daarna vereist ESMOJO een bestaand geactiveerd **beheerderaccount met TOTP/MFA**.
Gewone gebruikers en anonieme bezoekers ontvangen geen testgegevens. Er is geen
navigatielink naar de proef. Preview-HTML en de testroute hebben noindex/nofollow/
noarchive; de testroute en API-responses worden niet gecachet.

De voorkeurs-URL `esmojo.nl/test/fluid-layout` zou een apart goedgekeurde
productiepublicatie van de afgeschermde route en passende featureflag vereisen.
Die publicatie is uitdrukkelijk NIET onderdeel van deze opdracht.

## Herbruikbare layout

`src/layouts/fluid-layout.js` activeert expliciet de variant op de contentbox en
geeft een opruimfunctie terug. `fluid-layout.css` bevat centrale tokens voor gap,
kaartbreedte, leesbreedte en kleuren, generieke `.fluid-grid`/`.fluid-document`
utilities en een afgebakende `show`-variant voor bestaande componentklassen.
De wrapper benut beschikbare breedte zonder max-width 1000 en zonder binnenpadding
van 44 px. Hoofdmarge rechts/links is 28 px op desktop. De .rail en .submenu hebben
geen nieuwe CSS-regels. Bestaande fonts, maten, kleuren en interacties blijven intact.

De show-variant hergebruikt `createShowPage`, `createShowProfile`, de risicoanalyse,
analysedetails, tabjes en de blauwe indicator. De bestaande foto blijft maximaal
340 px breed. De header krijgt een subtiel verloop. Lange analyses blijven op
maximaal 72ch; inhoud wordt niet vervangen of verzonnen. Lege bestaande tabjes
blijven leeg. Andere productiepagina's worden niet overgezet.

Gemeten in Chromium (menu's samen 286 px, hoofdmarges samen 56 px):

| Viewport | Content | Indeling |
| --- | --- | --- |
| 1280 px | 938 px | Analyses gestapeld, aanvullende informatie rechts |
| 1440 px | 1098 px | Analyses gestapeld, aanvullende informatie rechts |
| 1920 px | 1578 px | Bezoekersanalyse, Artiestanalyse, aanvullende informatie naast elkaar |
| 2560 px | 2218 px | Drie hoofdkolommen, compacte analyseknoppen in twee kolommen per kaart |

Onder 850 px contentbreedte schuiven onderdelen onder elkaar. Kleinere vensters
(ook 1024, 700 en 390 px) zijn gecontroleerd op overflow, zonder mobiele navigatie
of speciale touchfunctionaliteit te ontwerpen. De bestaande automatische donkere
modus blijft bruikbaar. De live proef gebruikt de bestaande Puscifer-foto uit MOJO;
browsercontroles gebruiken uitdrukkelijk fictieve data en een lokaal onderschept
beeld voor reproduceerbare maten, nooit als vervangende inhoud in de preview.

## Pure gegevenslezing en veilige interactie

De bestaande volledige show-open/floor-read-route kan Vloerdruk synchroniseren en
opslaan. Daarom is die NIET toegestaan in deze preview. Het minimaal benodigde
serveronderdeel `server/fluid-preview.js` combineert bestaande pure reads voor
profiel/onderzoek, bezoekersdata, barrierbeoordeling en risico-overzicht. De server
bepaalt Puscifer uit de bestaande concertindex; er is geen vrije concert-, map-
of bestandsbestemming. PDF-status en een expliciete download gebruiken bestaande
zuivere report-status/report-download; er wordt nooit gegenereerd of gereserveerd.
Een expliciete bijlageweergave gaat door de bestaande private barrier-download.

Vloerdruk-details zijn in deze proef geblokkeerd, met een uitleggende tooltip,
omdat de huidige leesroute niet gegarandeerd alleen-lezen is. De opgeslagen
samenvattende status blijft afkomstig uit het bestaande risico-overzicht.

`src/fluid-preview/page.js` gebruikt een eigen snapshot en geheugencontext,
afhankelijk van bestaande login. De gewone conceptwachtrij/geheugencontext wordt
niet gebruikt voor deze proef. Een standaard-uitgeschakelde readOnly-optie op
bestaande componenten voorkomt reserveringen en PDF-generatie. Een beperkte
interactiebeveiliging maakt schrijfvelden/knoppen alleen-lezen, behoudt tab-/detail-
interactie en maakt de bestaande afrondoverlay bekijkbaar zonder te kunnen opslaan.
Overlayfocus blijft bruikbaar met Escape. Er is geen nieuwe score of analyse.

Aan de server geldt in deze preview een deny-by-default beleid voor account-API's:
alleen sessiebeheer, openbare show-/fotolezing en de afgeschermde fluid-preview API
zijn toegestaan. Alle bestaande schrijf-/reserveer-/synchronisatieroutes worden
geweigerd, ook met een rechtstreeks handmatig verzoek. Andere API-entrypoints
(MCP, OAuth, research en shows-sync) zijn eveneens gesloten in deze preview.
Buiten preview is deze isolatie uitgeschakeld; de nieuwe test-API is in productie
niet beschikbaar. Er zijn geen Apps Script-, database-, validatie-, PDF-generator-
of Drive-opslagwijzigingen. Bestaande API-contracten blijven intact.

## Controles

- Geactiveerde beheerder + MFA vereist, gewone gebruiker/anonymous geweigerd.
- Rechtstreekse mutatieverzoeken en andere API-entrypoints geweigerd zonder
  productiehandlers aan te roepen; signed Drive-fixtures: nul writes.
- Preview-PDF start ook bij pending/failed/firstGeneration nooit ensure/retry.
- Alleen-lezen DOM-vergrendeling is idempotent en veroorzaakt geen mutatielus.
- Volledige bestaande suite en builds met featureflag aan/uit.
- Chromium: exacte menu-geometrie, berekende styles, selectie en tekst vergeleken
  met bestaande pagina; identiek op dezelfde viewport.
- Alle tabjes, analysedetails, tekstvelden, statuslabels, risico, overlay/Escape,
  geen horizontale overflow en herstel naar normale max1000-pagina gecontroleerd.
- Echte accountaanmelding en vertrouwelijke Puscifer-data op de afgeschermde
  deployment worden niet via fictieve tests als live geverifieerd geclaimd.

## Eventuele latere toepassing, alleen na akkoord

De wrapper kan één pagina tegelijk expliciet activeren. Elke pagina houdt haar
bestaande componenten en gegevensmodel; kies een grid/leesvariant en pas hoogstens
bestaande inhoudswrappers aan. Daarvoor zijn per pagina visuele regressiecontroles,
rechten-/schrijfcontroles en expliciete productiepublicatie nodig. De lab-only
readOnly-beveiliging is geen vervanger voor normale productiefunctionaliteit.
Er vindt vanuit deze branch geen automatische uitrol naar andere onderdelen plaats.
