# Rapportages-inrichting blijft zelfstandig doorgaan

Eigenaar: Codex account A. Branch: task/reports-worker-continuity-20261113.

Onderzoek gebruikersmelding over langdurig wachten bij de expliciet gestarte
Rapportages-schema-inrichting. Laatste worker wachtte na één stap; GitHub-cron
kwam vandaag circa45–50min uiteen. Behoud checkpoints,48u machtiging, actuele
rechten, Retry-After, leases en vaste schema-allowlist. Geen bedrijfsdata of
schemawijziging. Maak begrensde workercontinuïteit met technische, OIDC-beveiligde
statusdiagnostiek, zodat korte providerwachttijd geen nieuwe cron vereist.
Verwachte bestanden: background task engine/API/CLI/workflow, gerichte tests en
documentatie. Geen bron-CSV, mails, import of omschakeling Rapportages.
