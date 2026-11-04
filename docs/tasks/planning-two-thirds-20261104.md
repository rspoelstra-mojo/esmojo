# Planning op twee derde breedte

Eigenaar Codex, branch task/planning-two-thirds-20261104. Op verzoek planningsblok
links op twee derde van de Overzicht-contentbreedte, met één derde ruimte ernaast
voor toekomstige onderdelen. Herbruikbare tweekolomswrapper met tussenruimte;
smalle content schakelt naar één kolom. Eigen container voor bestaande responsive
planningregels. Geen inhoud, deadlines of statuslogica wijzigen. Bestanden:
show-page.js, show-planning.css, versie V1.29 en taaknotitie. Build en browsercontrole,
publicatie via normale PR/main-workflow.

Aanvullend gevraagd: hoofdmenu Statistieken vervangen door Rapportages met een
passend documenticoon. Alleen zichtbare naam, paginatitel en icoon aanpassen;
bestaande interne bestemming blijft bereikbaar. Gedeeld src/main.js toegevoegd
aan scope; geen andere open taken bij start.

Uitgevoerd: tweekolomswrapper met 2:1-verhouding (na tussenruimte), volle breedte
onder 1000px beschikbare content. De planningskolom is zelf een CSS-container,
zodat de bestaande vijf stappen op hun eigen beschikbare ruimte reageren.
Hoofdmenu en paginatitel tonen Rapportages met documenticoon; bestaand pad behouden.
Drie showpaginatests, build en diffcontrole geslaagd. Chromium licht/donker op
700/900/1280/1440/1920/2560px: exacte 2:1-verhouding boven de grens, volle breedte
eronder, geen overflow en bestaande statusupdate/typografie gecontroleerd.
De aanvullende moduletoegang wordt als afzonderlijke vervolgtaak behandeld.
