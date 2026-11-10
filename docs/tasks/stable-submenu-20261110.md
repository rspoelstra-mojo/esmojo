# Vaste posities submenu

Eigenaar: Codex, task/stable-submenu-20261110.

Voorkom hoogte- en tekstomloopverschuiving bij selectie en laden van submenu-items.
Scope: src/accounts.css (gedeelde submenu-selectors), een lokale browsercontrole.
Geen gegevens, diensten of menustructuur wijzigen. Ranking/dagcache is een aparte taak.

GitHub PR-API is in deze omgeving geblokkeerd; taakbranch als registratie volgens
samenwerken.md. Website blijft V1.99: geen ongeautoriseerde sprong naar V2.0.

Uitgevoerd: laadindicator absoluut binnen de menuregel, ruimte rechts steeds
reserveren. Ook lange namen behouden daardoor dezelfde tekstomloop.
Browsercontrole met echte CSS en laadfunctie: links en knoppen, selectie,
start/afronden/opruimen, licht/donker en 390/1440px; alle rechthoeken blijven gelijk.
Bouw en git diff --check geslaagd. Geen API- of dienstwijzigingen.
