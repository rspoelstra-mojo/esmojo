# Herbruikbare achtergrondtaken en Shows-migratie
Eigenaar Codex; branch task/reusable-background-tasks-20261112.
Gebruiker autoriseert serveruitvoering die doorgaat na sluiten/vergrendelen van
browser, als herbruikbare basis voor toekomstige datatransities/Dataverse-wijzigingen.
Gebruik bestaande Dataverse Opdracht voor duurzame checkpoints/ETag-leases,
bestaande appverbinding en vaste GitHub-OIDC-worker. Geen aparte dienst/secrets.
Taakregistry allowlist, actuele admin/Shows/activatie bij starten én worker,
geen willekeurige acties/payloads, geen inhoud/tokens in browser of CI-logs.
Shows-migratie eerste adapter; bron-/conflictcontrole en create-only blijven.
Bestaande tabellen/keuzelijsten krijgen niet spontaan een nieuwe uitvoering.
