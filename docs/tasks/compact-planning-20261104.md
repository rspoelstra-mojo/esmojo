# Compacte horizontale planning

Eigenaar Codex, branch task/compact-planning-20261104. Gebruiker wil de planning
minder hoog, standaardlettergroottes en de oude horizontale tijdlijn uit referentie 2.
Behoud tweederdebreedte, deadlines, statussen en licht/donker. Maak tekst/bolletjes/
witruimte compacter en verlaag het omslagpunt zodat de tweederdekolom op desktop
horizontaal blijft; kleine vensters houden een compacte verticale weergave.
Scope CSS, versie V1.31 en taaknotitie. Build en gerichte browsercontroles,
publiceren via bestaande PR/main-flow. Geen gegevens of logica wijzigen.

Uitgevoerd: 14px staptitels, 12px datums/voetregel, 11px statuslabels, punten 28px,
compactere witruimte en horizontale omslaggrens 680px. Beheersmaatregelen blijft
als heel woord leesbaar. Geen status-/deadline-/opslagwijzigingen. Build/diffcheck
geslaagd. Fictieve Chromium-preview licht/donker op 700/900/1280/1440/1920/2560px:
2:1-breedte behouden, horizontaal vanaf passende kolombreedte, geen pagina-overflow,
vaste 14px titelgrootte, werkende statusupdate en horizontale blokhoogte <290px.
Desktopvoorbeeld 1440px bekeken. Versie V1.31.
