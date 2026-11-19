# Redis/Upstash afsluiten: gerichte redis-closure-nacontrole

Eigenaar: Claude Code. Branch: task/claude-redis-closure-20261119. Verwachte bestanden: .github/workflows/web-reports.yml, docs/dataverse/redis-native.md, deze notitie. Diensten: GitHub Actions (vaste main/OIDC), Vercel-omgevingvariabelen (alleen namen/status).

Aanleiding: de stap `redis-closure` zit in het brede push-pad van web-reports.yml, ná artiestvoorbereiding (265 artiesten, eerder gestopt op ARTIST_OPENING_INCOMPLETE na V1.204 door de nieuwe openingsvingerafdruk). Daardoor is de nacontrole nooit bereikt.

Wijziging: workflow_dispatch krijgt invoer `stage` (full | redis-closure). Bij `redis-closure` roept de workflow uitsluitend de bestaande vaste runtimeVerify-stap `redis-closure` aan, zonder incidentverversing of artiestvoorbereiding. Zelfde OIDC-identiteit, audience, serverautorisatie en veilige uitvoer; geen nieuwe API, schema of sleutel. Het brede pad is ongewijzigd.

Controles: tools/reports/web-import-workflow.test.mjs, YAML-validatie; daarna run via workflow_dispatch en uitslag in de PR-beschrijving/afsluitrapport.

## Vervolg (19 november 2026)
Eerste gerichte run (stage redis-closure) gaf RUNTIME_AUDIT_UNCONFIRMED zonder detail. Gesloten diagnostische stapcodes toegevoegd (REDIS_CLOSURE_POLICY / _MFA / _VIEWS) zodat zichtbaar wordt welke substap faalt; geen providerberichten, waarden of tokens.
