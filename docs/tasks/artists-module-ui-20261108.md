# Artiestenmodule: menu, detailbasis en Redis-top 5

Eigenaar: Codex. Branch: task/artists-module-20261108.
Vervolg op #128: publiceer pas nadat de bestaande Apps Script-publicatie van de
beveiligde artiestcatalogus geslaagd is. Scope: Artiesten-frontend/sessioncache,
accounts/API, anonieme Redis-statistiek, regressietests en websiteversie.
Rechten en gegevensclassificatie uit docs/tasks/artists-module-20261108.md gelden.
Alle artiesten alfabetisch (aanvullend gebruikersverzoek), top 5 aflopend op kliks.
Artiestpagina voorlopig alleen de naam; geen verzonnen inhoud of nieuwe analyses.

Uitgevoerd: Alle artiesten alfabetisch, met afzonderlijke gezamenlijke top 5 van
bevestigde modulekliks over exact 31*24 uur. Catalogus omvat ook historische
PDF-/online-registers wanneer een CSV niet meer aanwezig is. Alleen namen/IDs
persistent; ranking/inhoud nooit. Menu en ranking vernieuwen onafhankelijk.
Kliktelemetrie is idempotent, heeft eigen 31-daagse TTL en is los van paginaweergave.
Nieuwe artiestpagina toont alleen de naam tot het vervolgontwerp.

Validatie: 82 lokale testcommando's geslaagd; echte lokale Redis met 12 gelijktijdige
retries telt één punt, grens/TTL en verlopen records gecontroleerd. CI krijgt een
geïsoleerde Redis-service zonder gepubliceerde poorten voor dezelfde regressietest.
Vier browsergevallen (390/1440px, licht/donker) controleren directe gecachte lijst,
zoekfocus, nieuwe artiesten zonder refresh, juiste top 5, geen punten bij typen/
refresh/directe URL, retry met hetzelfde event-ID, laadiconen tijdens herschikking,
permissiegebonden cache en uitsluitend gewhiteliste opslag. Build/diff-check slagen.
Bridgepublicatie #128 / 579ec66 is bevestigd; deze UI-publicatie wordt V1.76.
