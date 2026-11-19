# Eén dagrun om 05:00

Eigenaar: Claude Code. Branch: task/claude-daily-0500-consolidation-20261119. Bestanden: .github/workflows/mojo-shows.yml, .github/workflows/web-reports.yml, api/web-reports-sync.js, server/github-identity.js, server/dataverse-reports/incident-daily.js (+ tests), AGENTS.md, docs/projectcontext.md.

Gewenste inrichting (gebruiker, 19 november 2026): één run om 05:00 die allerlei zaken bijwerkt, ook wat in de incidentreferentie-run stond; daarnaast een aparte mailrun elke 15 minuten (andere PR).
Wijzigingen:
- mojo-shows.yml krijgt een tweede job `references` (needs: import; niet bij push of verify_only; alleen om 05:00 NL of handmatig met run_now): dagelijkse incidentreferenties en voorbereiding van artiestopeningen.
- Identiteit: mojo-shows.yml mag de audience incident-references-sync gebruiken (alleen schedule/workflow_dispatch, niet push); api/web-reports-sync.js accepteert voor die audience web-reports.yml én mojo-shows.yml.
- incident-daily.js: de dagstand wordt vanaf 05:00 (tot 09:00, plus vier uur voortzetting) gebouwd in plaats van om middernacht. Bewuste wijziging aan de eerdere afspraak "rond 00.00".
- web-reports.yml verliest zijn dagelijkse cron; blijft voor push-controle en handmatig starten (inclusief stage redis-closure).
- AGENTS.md/projectcontext.md: geen previewbuilds, 05:00-run, mailrun 15 min, Redis afgesloten.
Gevolg: de dagstand en artiestrisicoscores worden ~5 uur later bijgewerkt dan voorheen; ze volgen de 05:00-import en bevatten daardoor ook nachtelijke CSV-aanleveringen. De eerste run met deze inrichting is de eerstvolgende 05:00; tot dan is de huidige dagstand (gebouwd om 00:00 van 19 november) leidend.
