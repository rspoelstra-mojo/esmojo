# Eén bewerkmodus (Bewerken / Annuleren / Opslaan) op de showpagina's (Claude Code, 18 november 2026)

Eigenaar: Claude Code. Branch: task/claude-edit-mode-20261118.

Gebruikersopdracht: op alle pagina's binnen Shows waar iets te bewerken valt (productionele risico's, barrieropstelling, vloerdruk, operationele risico's, maatregelen,
showprofiel-analyses) dezelfde knop **Bewerken** rechtsboven in de header, links van het bestaande label. Bewerken -> Annuleren + Opslaan; pas na een succesvolle opslag terug naar
leesmodus; Annuleren verwerpt. Dit is de enige bewerkknop op de pagina: andere Bewerken-/Opslaan-/"Opslaan als concept"-knoppen verdwijnen. "Opslaan als concept" bestaat nergens meer.
Specificatie (afmetingen 40x112 px, radius 8 px, #374151, animaties 350-400 ms cubic-bezier(0.22,1,0.36,1), prefers-reduced-motion) staat in de opdracht van de gebruiker.

Fasering (elke fase eigen PR, na akkoord op de vorige):
1. Gedeelde component src/edit-mode.js(+css) en de detailpagina van operationele risico's (inclusief titel/omschrijving/gevolg bewerken en de beoordeling).
2. Barrieropstelling en Vloerdruk (+ overzicht productionele risico's).
3. Maatregelen.
4. Showprofiel-analyses (Opslaan als concept vervalt).

Geen nieuwe opslag, API of rechten; bestaande beveiligde routes, revisies en readback blijven.
