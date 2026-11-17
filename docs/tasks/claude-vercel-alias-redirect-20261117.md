# Vercel-aliassen sturen door naar esmojo.nl

Eigenaar: Claude Code. Branch: task/claude-vercel-alias-redirect-20261117.

Gebruiker wil dat `esmojo-esmojo.vercel.app` en `esmojo-git-main-esmojo.vercel.app` de website niet tonen: de site is alleen zichtbaar op esmojo.nl. Bevindingen: alleen esmojo.nl is een projectdomein; de twee .vercel.app-adressen zijn automatische Vercel-aliassen die niet uit het project te verwijderen zijn, en vallen nu onder Vercel Authentication (alleen ingelogde teamleden zien de site). Alle workflows en server-origin-checks gebruiken esmojo.nl.
Aanpak: host-gebonden redirect in vercel.json van beide aliassen naar https://esmojo.nl met behoud van pad en query (tijdelijke 307, geen permanente cache). Geen wijziging aan deploymentbeveiliging, domeinen of secrets; preview-hostnamen per branch blijven ongemoeid. Verwachte bestanden: vercel.json, src/lib/router.test.js, index.html (versie), deze notitie.
