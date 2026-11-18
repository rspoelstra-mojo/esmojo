# Toekomstige concerten ontbreken op bewaarde artiestenpagina (Claude Code, 18 november 2026)

Eigenaar: Claude Code. Branch: task/claude-agenda-opening-20261118. Gebruiker meldt bij New Wave alleen historische shows, terwijl er binnen 365 dagen concerten in de agenda staan.
Oorzaak: de bewaarde artiestopening (server/artist-opening.js) had geen agenda in haar vingerafdruk. Fix: agendarijen en aliassen in de vingerafdruk. Verwachte bestanden: server/artist-opening.js (+test), docs, index.html.
