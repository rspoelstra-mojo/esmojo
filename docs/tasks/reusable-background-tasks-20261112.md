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

Gebouwd: generieke engine, versleutelde native Opdracht-store, registry en
herbruikbare UI; Shows-adapter eerste toepassing. Nieuwe worker + vaste OIDC-
workflow gebruikt bestaande productieverbindingen. Globaal uitvoeringsslot,
per-taaklease, ETag-checkpoints, generaties en expliciete idempotentie; retries,
24u-machtiging, actuele rechten, conflictstop en veilige publieke status.
De oude browserrunner blokkeert naast een actieve achtergrondmigratie. Native
bestandsessies worden na onderbrekingen veilig vernieuwd. Geen nieuwe taak of
live migratie vanuit deze runtime gestart. docs/background-tasks.md beschrijft
gebruik, begrenzingen en het toevoegen van volgende adapters.

Validatie afgerond: 148 gerichte servertests (incl. engine, native store, registry,
OIDC/API, autorisatie, parallelle workers, crashherstel, verloren antwoorden,
bronconflicten en verlopen bestandsessies), 9 syntax/publicatietests en 7 signed-
gatewaytests. Productiebuild, headers, diffcontrole en browsercontrole geslaagd.
Browsercontrole sluit/vervangt de view en herleest voltooiing uit serverstatus,
zonder automatische nieuwe start. Native productie-uitvoering/deploymentstatus
kan deze runtime niet verifiëren; er zijn geen echte taken gestart.
