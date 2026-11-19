# Vercel bouwt alleen main

Eigenaar: Claude Code. Branch: task/claude-vercel-main-only-20261119. Bestand: vercel.json (+ AGENTS/docs-notitie).

Aanleiding: de gebruiker wil de deployment storage verlagen en gebruikt previews niet (ESMOJO is nog in ontwikkeling, geen eindgebruikers). Elke branchpush gaf een volledige previewdeployment met alle functiebundels (ruim 20 per dag, naast ruim 20 productiedeployments).

Wijziging: `ignoreCommand` in vercel.json slaat de Vercel-build over (exitcode 0) wanneer de branch niet `main` is. Productie (main) blijft volledig gebouwd en uitgerold. GitHub-checks (`check`, `database`) zijn onafhankelijk van Vercel-previews en blijven gelden. Geen nieuwe functies of secrets.

Gevolg: geen preview-URL en geen vroege waarschuwing voor uitrolproblemen vóór main; PR's controleren alleen via GitHub-CI. Terugdraaien: regel verwijderen.
