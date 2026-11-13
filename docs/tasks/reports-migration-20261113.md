# Eenknopsmigratie Rapportages naar Dataverse

Eigenaar: Codex account A. Branch: task/reports-migration-20261113.

Gebruiker autoriseert na de voltooide761-stappeninrichting een beheerknop om alle
bestaande Rapportages-data en bestanden vanuit Google Drive naar het voorbereide
Dataverse-model te kopiëren, zoals de eerdere Shows-migratie. Behoud de bestaande
Vertrouwelijk-classificatie, actuele admin/Reports/MFA,48u expliciete delegatie,
servercheckpoints, leases/ETag, create-only/terugleescontrole en conflictstop.
Bronnen behouden; geen runtimecutover, mails of nieuwe rapportage/PDF-generatie.

Inventariseer alle drie bronsoorten, beschikbare CSV-versies, rapportcontext,
rapport/PDF/mail/ontvanger-/openingshistorie en gedeelde concertidentiteiten. Geen
broninhoud of persoonsgegevens in Git/log/browseropslag. Geen inhoudelijke mapping
raden: stop op werkelijke bronconflicten. Ontbrekende historische bronbytes niet
verzinnen. Verwachte wijzigingen: vaste signed Apps Script-leesexport, beveiligde
Node-migratieadapter, Dataverse-writer, registry/API/UI, tests en documentatie.
Afstemming: bestaande Shows-runtime/schemahash en accounts/Auth niet wijzigen.
Publicatie voegt de knop toe; alleen expliciete gebruikersklik start de kopie.

Implementatie: vaste read-only HMAC-export in ReportsMigration.gs; geïsoleerde
reports-migration/contract/source/map/writer/manifest/task; registry/API-productiepoort;
fluid beheerkaart naast de voltooide inrichting. Algemene create-only writer krijgt
een intern schemacontract en begrensde changesets; default Shows-contract behouden.
Native Shows-catalogus filtert herkenbare nieuwe Reports-only Core-reeksen.
Getest met synthetische data: complete signed Drive→Dataverse-wire/File-keten,
onderbreking/herhaling, bestaande Shows-revisies, onzekere batchbevestiging, corruptie,
TSC/null/nul, CSV17/middernacht/grote tekst, PDF/mail met ontbrekende oude CSV,
versleutelde manifestbinding en admin/Reports/MFA/productie. Browser licht/donker,
mobiel/desktop, Reports-only beheerder, dubbelklik en duurzaam heropenen.
Live gebruik blijft expliciete gebruikersklik; geen productiegegevens gekopieerd
als onderdeel van de codepublicatie. Handleiding docs/dataverse/reports-migratieknop.md.
