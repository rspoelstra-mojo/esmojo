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

Nacontrole: alle 121 verwachte remote branchverwijzingen zijn na de atomaire push
geverifieerd. 1.844 bereikbare blobs in de gesaneerde kopie bevatten geen matches
met de verwijderde adressen of private PNG-bronnen. Twee uitsluitend lokale,
ongepubliceerde werkbranches zijn bewaard en niet naar GitHub gepusht.

GitHub bewaart nog 120 oude PR-verwijzingen; deze zijn niet schrijfbaar via een
normale Git-push. Een concreet verwijderingsverzoek met de betrokken refs en
eerste gewijzigde commits is lokaal voorbereid. De actuele PR-beschrijvingen en
comments zijn tevens gecontroleerd; één oude beschrijving is geredigeerd.

Een synthetisch ongeldig MCP-token met geldig formaat krijgt de verwachte 401
met OAuth-challenge. Er zijn geen echte OAuth-tokens gebruikt of vernieuwd.
