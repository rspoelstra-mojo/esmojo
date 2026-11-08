# Artiestenrisicoscore, incidentenbeheer en progressief laden

Eigenaar: huidige Codex-sessie. Branch: task/artist-risk-incidents-20261108.
Scope: hergebruik definitieve analyses, operationele beoordelingen en webrapportage-
indicatoren; afgeleide risicoscore en beheerreferenties; artiestkaart; submenu
Beheerder/Incidenten; niet-blokkerende historische laadwachtrij met prioriteit.
Geen wijzigingen aan bestaande bronberekeningen of incidentregistraties.
Bestanden: artiestmodules, eigen shared/server scoremodule, beveiligde API/Apps
Script-reads, bestaande router/beheermenu, relevante tests en taakdocumentatie.
Nulreferentieregel en classificatie afgeleide gegevens zijn aan de gebruiker
voorgelegd. Tot diens antwoord geen verwerking/opslag van nieuwe scoregegevens.
GitHub-API ontbreekt in deze runtime; branch/taaknotitie registreert de taak.

## Onderzoek en eerste afgeronde onderdeel

- De twaalf indicatoren bestaan al in server/report-web.js en gedeelde
  shared/report-medical.js/shared/report-security.js. PDF-rekenlaag niet wijzigen.
  Totale meldingen tellen bronrecords per discipline; ambulance/uitzettingen/
  aanhoudingen behouden bestaande personenweging. Subcategorieën niet optellen.
- analyseafronding.json heeft definitieve cijfers; esmojoAnalysisFinalState_
  controleert actuele bronafrondingen. esmojoOperationalState_ en
  operationalComplete binden beoordelingen aan de actuele definitieve PDF.
- Er is geen bevestigd daadwerkelijk bezoekersaantal: ticket_sales is verkoop.
  Een geldige CSV bewijst evenmin dat beide disciplines volledig geregistreerd
  zijn. Voorstel: concertgebonden bevestiging door beheerder, geen automatische
  migratie van verkoop naar aanwezigheid. Wacht op expliciete gebruikerskeuze.
- Voorgestelde nulregel: referentie 0 + artiest 0 = 0 punten; referentie 0 +
  artiest >0 = maximaal categoriegewicht. Nog niet geïmplementeerd, wacht op antwoord.
- Classificatie van afgeleide scores/referenties is nog niet bevestigd; conform
  AGENTS.md nog geen verwerking of opslag van deze nieuwe gegevens gebouwd.
- Progressief laden is wel gebouwd: geen show-read vóór zichtbare landing;
  één gelijktijdig verzoek, nieuwste eerst; klik krijgt wachtrijprioriteit;
  gedeelde pending promise, tijdelijke paginacache, afzonderlijke fouten/retry;
  AbortSignal bij navigatie en bescherming tegen late resultaten.
- Controles: productiebuild; 22 gerichte tests; echte Chromiumtest van
  createArtistsPage met hangend eerste rapport (landing blijft interactief),
  klikprioriteit en navigatie; bestaande showoverzichttest op 390/1440px,
  lichte/donkere modus, ontbrekende rapportages en races.

## Bevestigde keuzes

Gebruiker bevestigt: nul/nul → 0 punten, positief/nul → categoriegewicht volledig;
alle afgeleide gegevens Vertrouwelijk, verwerking Vercel, opslag uitsluitend Drive;
per-concert aanwezigheidsaantal en beide volledigheidsbevestigingen toevoegen.
De eerdere beslispauze is opgeheven. Bestaande brongegevens blijven leidend;
het nieuwe register bevat alleen ontbrekende bevestigingen en een bronhashgebonden
herberekenbare tellingcache. Geen verkoopmigratie of fictieve initiële scores.

## Implementatie

Zie docs/artist-risk-incidents.md. Score en referenties delen één rekenmodule;
beheerders bevestigen aanwezigheid en volledigheid in Overzicht. Uitsluitend
Drive-opslag voor het nieuwe register; alle berekeningen in Vercel-geheugen.
Bestaande actuele voorbereiding en centrale webrapportagetellingen hergebruikt.
Artiestkaart en drie beheerderskaarten responsief getest met fictieve gegevens.
Productieversie V1.95. Geen echte historische aanwezigheid of volledigheid ingevuld.
