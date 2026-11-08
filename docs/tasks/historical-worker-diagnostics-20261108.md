# Gerichte diagnose historische controleworker

Eigenaar: huidige Codex-sessie. Branch: task/historical-worker-diagnostics-20261108.
Alle 199 concerten zijn opgeslagen; run 42484034639 stopte na 147 native bevestigingen
zonder ongeldige bron, tijdens een volgende validatieaanroep. Aanvullende indexworker
is gestopt om voortaan één controleworker te gebruiken. Voeg uitsluitend vaste,
begrensde operationele foutcodes toe aan reeds geauthenticeerde OIDC-workerresponses
en de workflow. Geen ruwe providerfouten, bronIDs, inhoud, tokens of credentials.
Bestaande berichtteksten en normale API-responses behouden. Daarna dezelfde
idempotente batch hervatten, zonder CSV-/ticketbestanden opnieuw te schrijven.
