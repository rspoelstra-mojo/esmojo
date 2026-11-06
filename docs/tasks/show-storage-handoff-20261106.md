# Atomische overgang naar actieve opslag

Eigenaar Codex; vervolg op de volledige actieve-showopslag, PR #104.
Branch task/show-storage-handoff-20261106.

Voorkom dat een al onderweg zijnde legacy-Drive-write na de eerste export alsnog
achter de nieuwe primaire database langs schrijft. Claim het eigenaarschap onder
dezelfde Drive-lock vóór de eerste DB-seed; weiger oude writes met een herstelbare
fout. Een normale herpoging gebruikt de huidige beveiligde opslagroute. Na archiveren
blijven Drive-writes toegestaan. Compatibele capability-handshake voor staged deploy.
Geen schema-/vormgevingswijziging, geen mail, geen wijziging aan beoordelingen.
Scope: signed Drive-brug, show-store-adapter, integratietest, documentatie en versie.
