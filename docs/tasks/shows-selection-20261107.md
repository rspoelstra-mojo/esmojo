# Keuzescherm Shows

Eigenaar: Codex. Branch: task/shows-selection-20261107.
Toon zonder geselecteerde show direct ‘Kies eerst een show’, met dezelfde
gecentreerde vormgeving als het bestaande rapportagekeuzescherm.
Scope: Shows-submenu, gedeelde keuzehint-CSS, websiteversie. Geen dienstwijzigingen.

Aanvullend gebruikersverzoek: herstel het laadicoontje bij openen vanaf Homepage,
ook als de canonieke eerste reeksdag ontbreekt in het actuele menu. Behoud de
actieve link tijdens menuverversing; toon bij metadata-resolutie alvast een
icoontje bij Shows. Geen extra netwerkverzoeken voor bekende menu-items.

Aanvullend gebruikersverzoek: planning in bestaande thema-/kaartkleuren, rechts
2/3 breedte; lege Show team-kaart links 1/3. Op smal scherm onder elkaar.
Scope tevens src/show-page.js en src/show-planning.css. Geen nieuwe teamgegevens.

Validatie: productiebuild en bestaande showpagina-, planning-, menu-, rapportage-
en fluid-tests geslaagd. Browsercontroles op 390/1440/1920px, licht/donker:
gecentreerde hint, geen automatisch openen, metadata-laadicoontje, overdracht naar
de juiste reekslink, één showverzoek bij menuverversing, opruimen bij navigatie,
Show team links/planning rechts (1:2), mobiel onder elkaar, geen overflow.
