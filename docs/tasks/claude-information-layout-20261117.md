# Show informatie: Analyses bovenaan, Risico's onderaan

Eigenaar: Claude Code. Branch: task/claude-information-layout-20261117.

Gebruikersopdracht (17 november 2026): in Show informatie staat Risico's helemaal onderin; erboven onder de titel Analyses twee tegels (Bezoekersanalyse links, Artiestanalyse rechts) in dezelfde vormgeving als de risicotegels, met het cijfer (`7 / 10`) en een kleur die meeloopt met de score (1 groen, 10 rood). Man/vrouw verhouding en leeftijdsrange staan weer in twee kolommen (titel links, gegevens rechts) zoals Projectteam.

Alleen presentatie (src/show-information.js/.css, scoreHue in src/lib/show-information.js, test, versie V1.168); dezelfde gegevens en kleurschaal als de cijferkeuze bij het afronden van een analyse. Geen opslag, API of schemawijziging.
