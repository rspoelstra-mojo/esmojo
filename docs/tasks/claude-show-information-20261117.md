# Blok Show informatie op het showoverzicht

Eigenaar: Claude Code. Branch: task/claude-show-information-20261117.

Gebruikersopdracht (17 november 2026): het blok Show informatie tonen met aantal laag/midden/hoog risico's (zoals door de ESM beoordeeld, zelfde kleuren als de artiestenpagina), de scores van bezoekers- en artiestanalyse, verkochte kaarten en man/vrouw-verhouding en leeftijdsrange uit het showprofiel. Niet hoger dan Planning en niet breder dan nu. Ontbrekende gegevens: "Nog niet ingevuld", bij risico's 0.

Uitgangspunten: alleen bestaande, al geclassificeerde gegevens uit de bestaande beveiligde showcontext (geen nieuwe opslag, tabel of API). Eindcijfers van de analyseafronding zijn eerder Openbaar verklaard; de native afrondstatus geeft nu ook het cijfer (score) mee. Risicotelling wordt gedeeld met de artiestenpagina (shared/risk-level-counts.js).
Verwachte bestanden: shared/risk-level-counts.js, server/artist-preparation.js, server/dataverse-shows/rules/native.js, src/lib/show-data.js, src/lib/show-information.js, src/show-information.js/.css, src/show-page.js, tests, check.yml, versie.
