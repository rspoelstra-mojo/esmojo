# Rapportages-inventaris: veilige diagnose en herstel

Eigenaar Codex account A; branch task/reports-inventory-diagnostics-20261113.
Gebruiker meldt dat expliciet gestarte Reports-kopie stopt met0 records/bestanden.
Schema490 is voltooid, inventory blokkeerde om21:03:52UTC op13november.
Voeg vaste read-only main/OIDC-diagnose toe, uitsluitend binnen de oorspronkelijke
48u taakdelegatie en huidige admin/Reports-rechten. Alleen fase, vaste codes en
technische aantallen; geen namen, bron-ID's, persoonsgegevens, CSV's, providerbody
of credentials in logs. Geen taakstart/herstart, zakelijke writes, schemawijziging,
bronreparatie of cutover in de diagnose. Onderzoek daarna de concrete oorzaak.
Verwachte bestanden: bestaande worker/API/registry/CLI/workflow, Reports bronexport
met vaste probe, gerichte tests en taakdocumentatie. Bronbestanden behouden.
