# Historische opschoning en MCP-controle

Eigenaar: Codex. Branch: task/history-mcp-20261107.

De gebruiker heeft op 7 november expliciet toestemming gegeven voor de vooraf
geteste historische opschoning, inclusief de eenmalige uitzondering op het verbod
op force-pushes. Alle gepubliceerde branches zijn atomair herschreven met een
expliciete lease per oude verwijzing. Twee bekende adrespatronen en de vijf
private diagrambronnen zijn uit de bereikbare branchgeschiedenis verwijderd.
De actuele main-bestandsboom is vóór/na exact gelijk gecontroleerd.

Controleer bestaande checkouts opnieuw; merge of push geen oude geschiedenis terug.
GitHub beheert oude PR-/cacheverwijzingen; daarvoor is apart een verwijderings-
verzoek nodig. Geen herstelbranch met oude gegevens op GitHub plaatsen.

MCP: openbare discovery reageert 200; niet-aangemelde MCP-verzoeken reageren met
de verwachte 401/OAuth-challenge. De bestaande publieke onderzoeksbrug leest de
canonieke openbare Overmono-concertmetadata succesvol uit Drive. Dit bewijst niet
dat een specifieke ChatGPT-OAuth-sessie geldig is; daarvoor is de concrete fout
of een echte gekoppelde sessie nodig. Geen accounts, tokens of analyses wijzigen.
