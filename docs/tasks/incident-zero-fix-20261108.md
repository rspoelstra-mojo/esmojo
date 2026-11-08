# Nulwaarden bij Incidenten onderzoeken en herstellen

Eigenaar: huidige Codex-sessie. Branch: task/incident-zero-fix-20261108.
Gebruiker meldt nulwaarden ondanks 200+ beschikbare rapportages.
Controleer productieherberekening, bron-/bezoekerskoppeling en presentatie.
Behoud vertrouwelijke opslag uitsluitend in Drive; geen echte tellers/incidenten
naar GitHub-logs. Repareer de oorzaak en verifieer werkelijke verwerking.

Vastgesteld: initiële herbouw loopt ruim twintig minuten; iedere twee rapporten
vereisten vijf volledige inventarisaties, terwijl de UI alle referenties inhield
tot de laatste telling. Historische bron-/commitreads gebruiken nu hun bestaande
canonieke register, indexcontext, parentketen en actuele broncontrole, zonder
volledige herscan. Vijf bronnen per werkronde; hervat met bestaande cache.
De UI toont tijdens herbouw echte concert-/bezoekersbasis en verwerkingsvoortgang;
indicatoren blijven expliciet nog niet berekend. Geen onvolledige score/referenties.
Worker v2 heeft privacyveilige READY/BATCH_CONFIRMED/COMPLETE-statusmeldingen en
vervangt de oude herbouw veilig via dezelfde concurrencygroep. V1.98.

Controles: volledige set 659 tests plus extra vijf-per-ronde test slaagt;
Chrome controleert echte voortgang en geen fictieve nullen; productiebuild en
Apps Script-syntax slagen. Cachevalidatie controleert nu ook alle twaalf tellers;
onvolledige caches worden opnieuw opgebouwd. Gereedmelding valideert volledige
referentiedataset en signaleert dubbelingen via een vaste technische foutcode.
