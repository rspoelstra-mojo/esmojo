# Planningtitel en directe zoekfocus

Eigenaar: Codex. Branch: task/planning-search-focus-20261107.
Voeg Planning als kaarttitel toe en verwijder de onderste deadlinebalk.
Zorg dat openen van de gedeelde submenuzoekfunctie direct toetsenbordinvoer
accepteert, in alle submenu's en op mobiel/desktop. Scope: planningcomponent/CSS,
submenuzoekfunctie/CSS, passende regressiecontrole, websiteversie. Geen diensten.

Oorzaak zoekfocus gereproduceerd: visibility-transition hield het zoekveld nog
verborgen op het moment van de synchrone focus()-aanroep. Alleen clip-path blijft
animeren; zichtbaarheid verandert direct, zodat de mobiele toetsenbordfocus binnen
de oorspronkelijke gebruikersklik blijft. Dit geldt via de gedeelde CSS voor alle
submenu's. Geen timers of extra focusverplaatsingen nodig.

Validatie: 16 browsergevallen (4 submenu's, mobiel/desktop, licht/donker) tonen
onmiddellijk ingevoerde tekst en correct sluiten/heropenen. Planningtitel en het
ontbreken van de footer gecontroleerd op 390/1440/1920px in beide thema's, met alle
vijf mijlpalen behouden. Bestaande planning/showpagina/fluid-tests, build en diff-check
slagen. Websiteversie V1.74.
