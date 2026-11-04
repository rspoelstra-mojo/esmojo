# Jungle-showrapportage als fluid webpagina

Eigenaar Codex, branch task/jungle-report-web-20261104. Gebruiker vraagt onder
Rapportages een submenu-item Jungle met de aangeleverde PDF inhoudelijk als losse
webblokken: zes samenvattingen/grafieken en alle individuele incidenten. CSV is
voorbeeldinput; automatische CSV-/rapportkoppeling is nadrukkelijk voor later.
Gebruik bestaande rekenregels, fluid stijl, standaardtypografie, licht/donker.
CSV/PDF/incidentinhoud blijft Vertrouwelijk in de bestaande private OnTrack-Drive-
map; geen echte data in Git, builds, CI of publieke assets. Privé webvoorbeelddata
via huidige getekende Drive-brug, uitsluitend na huidige Rapportages/MFA-controle.
Geen mail, CSV-worker, Shows-data of bestaande PDF-generator wijzigen.

Scope: herbruikbare webrapport-renderer/CSS, Rapportages-menu, beveiligde private
voorbeeldadapter en Drive-leesoperatie, passende UI-/autorisatietests, docs en V1.32.
PDF-kop vermeldt 3 november 2026, incident-CSV heeft 2 november 2026. Beide bronnen
behouden, geen automatische showkoppeling of correctie van incidentdatums uitvoeren.
Publiceren via bestaande PR/main/Apps Script-workflow. Alleen fictieve fixtures in CI.
