# Dynamische CSV-webrapportages

Eigenaar Codex; branch task/dynamic-web-reports-20261105. De bestaande private
OnTrack-map is bron voor automatische webrapportages, gegroepeerd per echte
artiest, submenu Afgelopen week/periode en per concertdatum een eigen dataset/tab.
Behoud Jungle-weergave, berekeningen, alle acht filters, datumlabels, prioriteiten,
MOJO-foto en bewaard showdag-tijdschema. Maximaal vijf nieuwste datumtabs volgens
bestaande afspraak. Onbekende/ambigue CSV-concertkoppelingen niet raden. Canoniek
concert-ID in URL; geen private bestands-ID/URL als browserinput.

Geen wijziging aan PDF-/mailworkflow, triggers, ontvangers, afleverstatus of
bestaand register. Nieuwe webinventaris geïsoleerd en Vertrouwelijk in dezelfde
reeds toegestane Drive-map; verwerking via bestaande Vercel/Drive-route. Alle
Rapportages-module-, MFA- en actuele Drive-controles behouden. Geen echte CSV of
incidenttekst in Git/CI/logs/persistente browseropslag. Scope webinventaris/backend,
reportmenu/router/renderer, synthetische tests/docs en veilige publicatie.
