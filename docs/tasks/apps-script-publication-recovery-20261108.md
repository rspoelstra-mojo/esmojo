# Structureel herstel Apps Script-publicatie

Eigenaar: Codex. Branch: task/apps-script-publication-recovery-20261108.
Onderzoek mislukte run 42461478364 tegenover laatste geslaagde publicatie.
Herstel automatische publicatie op main met bestaande script-/deployment-ID en
webapp-URL. Maak foutdiagnose veilig en bruikbaar, controleer zakelijke toegang
en documenteer dezelfde bouw/test/publicatiestappen voor beide Codex-accounts.
Scope: publicatietooling, workflow, relevante Apps Script-bron indien de oorzaak
daar ligt, regressies en beheerhandleiding. Geen concertgegevens wijzigen;
geheimen blijven in bestaande secret stores. Geen force-push of oude branches.

Vergelijking: 42457754755 (1f551bb) slaagde; 42461478364 attempt 2
(097c436) faalt pas bij push; workflow, clasp 3.4.1, deploymentconfig gelijk.
Nieuwe grammatica: Artists.gs:42 bevat als enige ||=. De ES2020-check weigert
precies deze regel; na gelijkwaardige if-toewijzing voldoen alle 48 bestanden.
Node-only tests hadden deze Google-compatibiliteitsfout niet gevonden.

Herstel: compatibiliteitsgate in PR-CI/publicatie/publisher, vaste veilige
foutcodes i.p.v. raw clasp-logs, actuele main en SHA controleren, vaste gedeployde
versie teruglezen en alle beheerde bestanden vergelijken, verify_only via dezelfde
workflow. Geen manifest-/Script properties-/ID-/URL-/Google-credentialwijziging.
Acorn 8.15.0 is uitsluitend een gepinde ontwikkelafhankelijkheid, geen frontendcode.

Toegang: zakelijke GitHub-identiteit/repositoryadmin/code/PR/CI beschikbaar;
Actions-secretmetadata en settings geven 403. Vercel-plugin niet geïnstalleerd en
DISABLED_BY_ADMIN; dit kan alleen de workspacebeheerder herstellen. Geen directe
Supabase-beheerverbinding of ingelogde ESMOJO-gebruikerssessie in deze runtime.
De gebruiker vraagt nu instellingenbeheer vanuit beide accounts; concrete
projectrechten, eigenaarstappen en afzonderlijke accountcontrole vastgelegd in
docs/beheer-publicatie.md. Geen bredere tokens of verborgen beheerroutes toegevoegd.

Lokaal: build, syntaxgate, publicatie-/diagnose-/grammaticatests en bestaande
Apps Script-, artist-service-, show-timetable- en Drive-tests slagen. Productie-
publicatie en een ingelogde controle worden na de CI/uitrol afzonderlijk vastgelegd.


Live resultaat: PR #134 → main 467173b. Automatische publicatie 42462765878
slaagt met Google-versie 65 en terugleesvergelijking van alle 48 bronbestanden.
verify_only-dispatch 42462865438 slaagt zonder writes. Geen Google-grant vernieuwd.
Vercel-productie success; V1.80 op echte artiestroute; anonieme profielread 401.
MFA/Redis-productiecheck 42462551805 slaagt. Gebruikerscreenshot bevestigt foto en
historie op de echte artiestpagina; de vier kaarten zijn aanwezig maar zonder
informatie. Gevuld bezoekersprofiel en rechten vanuit tweede Codex-account nog
niet live bevestigd. Vercel-plugin is nog door workspacebeheer geblokkeerd.
