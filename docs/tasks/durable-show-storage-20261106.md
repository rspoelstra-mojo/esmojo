# Betrouwbare showopslag

Eigenaar: Codex. Branch: task/durable-show-storage-20261106.

Doel: render-/opslagterugkoppelingen verwijderen; actieve voorbereidingsgegevens
transactioneel in Supabase bewaren; geverifieerd naar de canonieke Drive-map
archiveren vanaf 00:00 Europe/Amsterdam op laatste showdatum + 2 kalenderdagen.
Bij mislukte archivering geen gegevens verwijderen. Na archivering alleen Drive.

Uitsluitend Drive: accountprofielen, uploads, CSV/incidentrapportages,
kaartverkoop en bezoekersherkomst. Geen vertrouwelijke browseropslag of logs.
Ongewijzigde vormgeving, workflowvalidaties, MFA/moduletoegang en revisiecontrole.

Verwachte scope: serveropslag/API, Apps Script Drive-archief, SQL-migratie,
achtergrondworker/workflow, showcontext/rendering, passende tests en documentatie.
Externe diensten: Supabase-schema, Drive en bestaande Vercel/GitHub-deployments.
Supabase-schema-toegang ontbreekt bij aanvang; migratie wordt eerst voorbereid.
