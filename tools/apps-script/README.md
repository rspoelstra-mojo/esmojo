# Automatische Apps Script-publicatie

Beide Codex-accounts gebruiken dezelfde repository en dezelfde workflow, niet elk
een eigen Google-login of deployment. De bestaande script-ID en deployment-ID
staan in `deployment.json`. Webapp-URL, manifest en Script properties blijven behouden.
Zie ook [de beheerhandleiding](../../docs/beheer-publicatie.md).

## Normale wijziging vanuit elk account

1. Lees AGENTS.md en docs/samenwerken.md, haal actuele main op, controleer open PR’s
   en maak een eigen taakbranch met draft PR. Geen oude branches/historie terugbrengen.
2. Installeer met `npm ci`, bouw met `npm run build` en voer passende tests uit.
   Voor Apps Script altijd:
   ```sh
   node tools/apps-script/check-syntax.mjs
   node --test tools/apps-script/*.test.mjs
   node server/apps-script.test.js
   ```
3. Integreer nieuwste main, controleer opnieuw, push en merge alleen bij groene checks.
4. `Publish Apps Script` publiceert wijzigingen onder google-apps-script/tools op
   main automatisch. Ook wijzigingen van workflow of rootdependencies starten de
   controle. Vercel heeft een afzonderlijke uitrol: een groene Vercel-build bewijst
   geen geslaagde Google-publicatie.
5. Controleer de **laatste** run, de werkelijk geteste SHA en de samenvatting.
   De workflow haalt actuele main op; een tijdens tests gewijzigde main stopt de
   publicatie. Herstart dan de run. Een oude run opnieuw starten rolt geen oude
   commit terug: eerst wordt huidige main opgehaald en opnieuw getest.
6. De samenvatting bevestigt versienummer en het teruglezen van ALLE beheerde
   bronbestanden uit die vaste, gedeployde versie, gelijk aan geteste main. De
   ongetekende HTTP-controle moet toegang blijven weigeren. Controleer afzonderlijk
   de gewenste pagina met een actief MFA-account en de juiste modulerechten.

Een extra controle zonder schrijfacties kan in Actions → Publish Apps Script →
Run workflow → branch main → verify_only aanvinken. Vanuit een toegestane CLI:
```sh
gh workflow run apps-script.yml --repo rspoelstra-mojo/esmojo --ref main -f verify_only=true
```
Dit leest de bestaande vaste deploymentversie en vergelijkt bronbestanden, zonder
push, nieuwe Google-versie, deploymentupdate of concertwijzigingen. Zonder vlag
publiceert dezelfde workflow na de tests naar dezelfde deployment-ID.

## Compatibiliteit en veilige fouten

Node.js 24 accepteert grammatica die Apps Script kan weigeren. Daarom controleert
Acorn vóór Google-I/O alle .gs-bestanden als scripts met de conservatieve ES2020-
grammatica. Dit is een deploymentbasis, geen volledige Google-runtime-emulator.
Bijvoorbeeld `recent ||= show` wordt `if (!recent) recent = show`. Node/Vite-code
buiten google-apps-script mag zijn bestaande moderne syntaxis blijven gebruiken.
De controle draait in PR-CI, publicatie-CI en de publisher zelf, ook op het
samengevoegde pakket met behouden remote bestanden. Geen impliciete transpiler.

Clasp-uitvoer wordt opgevangen en nooit doorgestuurd. Alleen vaste diagnosecodes
verschijnen; bij een syntaxisfout eventueel een bekend repositorybestand en regel.
Er worden geen OAuth-antwoorden, tokens, identiteiten, broninhoud of raw logs getoond.

- APPS_SCRIPT_SYNTAX: offline grammatica past niet binnen de deploymentbasis.
- APPS_SCRIPT_SOURCE_SYNTAX: Google weigert de bron; controleer de aangewezen regel.
- APPS_SCRIPT_OAUTH_REAUTHORIZE / OAUTH_UNAUTHENTICATED: eigenaar vernieuwt login.
- APPS_SCRIPT_API_DISABLED: eigenaar controleert API-schakelaar.
- APPS_SCRIPT_PROJECT_PERMISSION: identiteit/project-/deploymentrechten controleren.
- APPS_SCRIPT_GOOGLE_QUOTA / UPSTREAM_UNAVAILABLE: wachttijd/netwerkstoring; herstart
  gecontroleerd op main. Geen automatische OAuth-rechten verruimen.
- APPS_SCRIPT_SOURCE_MISMATCH / VERSION: gepubliceerde code/versie wijkt af; geen
  geslaagde uitrol claimen. Controleer huidige main en workflow.

Een fout ná update-deployment betekent dat de nieuwe versie al actief kan zijn;
controleer de deploymentstatus. Een fout vóór die update verandert de actieve
webappversie niet. Een geslaagde push alleen bevestigt geen publicatie.

## Wie beheert Google-autorisatie?

De Google-eigenaar van de bestaande webapp beheert de toestemming. GitHub Actions
gebruikt uitsluitend repositorysecret CLASPRC_JSON in de publicatiestap. Codex hoeft
dat geheim niet te lezen, lokaal op te slaan of per account te vernieuwen.
Een verlopen/ingetrokken Google-grant wordt niet hersteld door een nieuw Codex-account.

Alleen bij bevestigde OAuth/API-fouten:

1. Eigenaar: schakel Apps Script API in via https://script.google.com/home/usersettings.
2. Gebruik lokaal Node.js 22+ en voer `npx --yes @google/clasp@3.4.1 login` uit.
3. Meld aan met de eigenaar van de bestaande webapp. Gebruik de bestaande clasp-
   client, geen nieuw ESMOJO-OAuth-project, serviceaccount of nieuwe deployment.
4. Werk in GitHub → rspoelstra-mojo/esmojo → Settings → Secrets and variables →
   Actions → CLASPRC_JSON → Update de **volledige** lokale .clasprc.json bij.
   Alleen de eigenaar voert dit uit. Geen waarden in chat, PR, logs of screenshots.
   Beveilig de lokale credentialfile en verwijder onnodige kopieën.
5. Start Publish Apps Script op main met verify_only UIT; controleer daarna met
   verify_only AAN en een bevoegd gebruikersaccount op de website.

Script properties, GOOGLE_DRIVE_SHARED_SECRET, Supabase-sleutels en Vercel-variabelen
worden hierbij niet gewijzigd. Publicatiecredentials blijven uit PR-tests,
frontendbundels en andere Codex-omgevingen. Vorige Google-versies blijven voor
beheer beschikbaar; normale codecorrecties verlopen via nieuwe main-publicaties.
