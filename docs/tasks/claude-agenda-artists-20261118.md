# Artiestenpagina's uit de concertagenda en rapportages per reeks (Claude Code, 18 november 2026)

Eigenaar: Claude Code. Branch: task/claude-agenda-artists-20261118.

Gebruikersopdracht:
1. Artiesten: de artiestenpagina toont alle artiesten (de grote artiestendatabase). Zodra een artiest in de concertagenda (komende 365 dagen) voorkomt,
   krijgt die alvast een artiestenpagina en staat in het submenu. Onder Concert historie staan de toekomstige concerten (niet klikbaar), ook voor
   artiesten die al een pagina hadden.
2. Rapportages-menu: een rapportage opent alleen de rapportages van die reeks; historische rapportages van de artiest zijn alleen via de artiestenpagina bereikbaar.

Ontwerp fase A (artiesten): geen nieuwe opslag. De agenda-artiesten (alias-gekozen naam, Openbaar) worden in de bestaande artiestencatalogus en het profiel afgeleid:
id = `a_`+digest(genormaliseerde naam), gelijk aan wat de 45-dagenimport later aanmaakt. Concerten uit de agenda worden aan `profile.concerts` toegevoegd; de UI toont
toekomstige concerten al uitgeschakeld.
Fase B (rapportages per reeks): apart, na akkoord op fase A.

Verwachte bestanden: server/dataverse-shows/staff-planning.js, catalogue.js, related.js (+tests), docs/personeelsplanning.md, index.html (versie).
