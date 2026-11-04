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
De bestandsnaam bevat 2 november, maar de inhoudelijke incidentdatums en PDF-kop
zijn beide 3 november 2026. De inhoud is leidend; bestandsnaam niet corrigeren.
Publiceren via bestaande PR/main/Apps Script-workflow. Alleen fictieve fixtures in CI.

Gebruiker bevestigt dat de CSV al in de bestaande Drive-map staat. Map en bestand
via connector geverifieerd; privé en exact de aangeleverde naam. Geen upload,
datasetkopie of nieuwe opslag nodig. De webvoorbeeld-adapter leest uitsluitend dit
vaste bestand, berekent op Vercel met de bestaande rekenlaag en geeft alleen de
nodige rapportvelden terug. Geen vrije bestands-ID of automatische showkoppeling.

Implementatie gereed: server/report-web.js is de vaste privébronadapter en deelt
bestaande calculateReport. Op Reports/MFA gecontroleerde actie report-web leest
via getekende Drive-operatie web-preview; actor en bron niet vrij instelbaar.
Geen nieuwe opslag, registerwijziging, PDF of mailactie. src/report-web.js/CSS en
report-charts.js leveren native HTML/SVG, 1/2/3 kolommen, normale typografie en
alle incidenten. Datum, tekst, grafieken en prioriteitsaccenten uit de bron blijven
behouden. Bronbytes en niet-gebruikte CSV-velden gaan niet naar de browser.

Controles: 2 adaptertests, 31 account-/autorisatietests, 13 getekende rapportservice-
tests, 3 OnTrack-tests, 6 Apps Script-tests, 4 publicatietests en 3 showpaginatests
plus volledige rapporttests geslaagd; build/diffcheck. Nieuwe rapporttest in CI.
Privé lokale PDF-vergelijking: alle velden van alle incidenten uit de CSV zijn in
het oorspronkelijke PDF aanwezig (raw tekstextractie); webweergave bevat alle
25 incidenten, alle omschrijvingen/notities en zes kaarten. Fictieve CI-data alleen.
Chromium lokaal licht/donker op 700/900/1280/1440/1920/2560px: geen overflow,
1/2/3 kolommen, vaste tekstmaten, grafiekverhouding, veilige tekst bij HTML-invoer,
laadfouten/retry en late reacties na verlaten gecontroleerd. Desktopthema’s bekeken.
Geen echte incidentdata of bronbestanden in de commit; geen mails verstuurd.
