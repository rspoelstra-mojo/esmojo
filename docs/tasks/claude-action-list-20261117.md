# Actielijst op het showoverzicht

Eigenaar: Claude Code. Branch: task/claude-action-list-20261117.

Gebruikersopdracht (17 november 2026): het blok Actielijst wordt een to-do-lijst voor de event safety manager met status rechtsboven (Op schema / Afgerond / Achter op schema) en maximaal drie to-do's (showprofiel en risico's: tot drie losse regels of "Nog meerdere openstaande analyses/risico's"; beheersmaatregelen: elke aangemaakte, nog niet afgeronde maatregel), gesorteerd op de planningsdeadline, elk met een diepe link naar de pagina waar de actie wordt afgerond.

Wijzigingen: src/show-actions.js/.css, src/lib/show-actions.js (+test), src/lib/analysis-topics.js (onderwerpen gedeeld met het showprofiel), diepe links in shared/show-navigation.js en open-functies in show-profile.js, risk-analysis.js en show-measures.js, bedrading in show-page.js, analysestatussen in de planningssnapshot (show-data.js), operationalReviewed in show-planning.js, tests, docs, versie V1.176. Alleen presentatie op bestaande showgegevens; geen nieuwe opslag, API, rechten of schema.
