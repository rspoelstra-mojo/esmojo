# Gelijktijdig werken aan ESMOJO

GitHub `rspoelstra-mojo/esmojo` is de gedeelde bron. Chats en lokale werkmappen
zijn niet gedeeld. `main` is productie en wordt automatisch door Vercel naar
https://esmojo.nl uitgerold. Beide accounts mogen afgerond en gecontroleerd werk
publiceren zonder opnieuw toestemming te vragen voor normale stappen.

## Taken verdelen en zichtbaar maken

Geef de accounts verschillende, concrete taken, bijvoorbeeld Shows en Artiest.
Eén taak heeft één eigenaar. Werk niet tegelijk aan dezelfde pagina of gedeelde
indeling als dat vermijdbaar is. Hoofdmenu, router, globale CSS, dependencies,
datamodellen en serviceconfiguratie zijn gedeeld en vragen extra afstemming.

Begin iedere taak met `git status`, lees `AGENTS.md` en haal de remote branches
op met `git fetch origin`. Bewaar bestaande wijzigingen; reset niets om schoon
te beginnen. Gebruik de bestaande checkout, geen extra worktree tenzij gevraagd.
Maak vanuit de actuele `origin/main` een unieke branch, bijvoorbeeld
`task/account-b-shows-20261031-1530`. Gebruik nooit de branch van het andere account.

Maak vóór implementatie een draft pull request naar main met het doel, de
eigenaar en de verwachte bestanden en diensten. Push hiervoor zo nodig eerst
een korte taaknotitie onder `docs/tasks/<unieke-taaknaam>.md`. Noteer doel,
eigenaar, branch en verwachte bestanden, zonder secrets of persoonsgegevens.
Werk de beschrijving bij als de scope verandert. Kijk eerst naar andere open
pull requests en remote taakbranches, ook vlak vóór samenvoegen.

Als GitHub PR-toegang ontbreekt maar Git werkt, push de taaknotitie en branch
en gebruik die als gedeelde registratie. Inspecteer dan de notities op andere
remote taakbranches met Git. Een branch of PR is een zichtbaar signaal, geen
technisch slot: bij overlappende taken stem je de taakverdeling via de gebruiker
af. Blijf ondertussen werken aan onafhankelijke onderdelen.

## Bouwen en samenvoegen

1. Werk uitsluitend op je eigen taakbranch. Voeg alleen bestanden van je taak toe.
   Gebruik voor nieuwe pagina-inhoud waar mogelijk eigen modules en beperkte
   CSS-selectors; verbouw gedeelde code alleen als de taak dat nodig heeft.
2. Installeer ontbrekende dependencies met `npm ci`. Controleer met
   `npm run build`, `git diff --check` en passende functionele controles.
   Bestaande servertests: `node server/apps-script.test.js`,
   `node server/google-drive.test.js`, `node tools/apps-script/deploy.test.mjs`.
   Draai de relevante tests bij veranderingen aan die onderdelen.
3. Haal vlak vóór samenvoegen opnieuw `origin/main` op en merge die in je
   taakbranch. Bewaar zowel het werk van de ander als het eigen werk. Los alleen
   conflicten op waarvan de bedoeling duidelijk is; gebruik nooit blind
   “ours” of “theirs”. Onverenigbare productkeuzes vereisen afstemming.
4. Controleer het gecombineerde resultaat opnieuw, inclusief build en de
   betrokken pagina's. Ook conflictloze merges kunnen elkaars gedrag veranderen.
   Push de bijgewerkte taakbranch.
5. Merge de PR alleen wanneer deze actueel en mergeable is en vereiste checks
   slagen. Respecteer repositoryregels en omzeil geen vereiste reviews.
   Gebruik beschikbare merge queues als de repository die al aanbiedt.
6. Zonder PR-beheerrechten mag je na dezelfde integratie en controles vanaf je
   taakbranch `git push origin HEAD:main` gebruiken, uitsluitend als normale
   fast-forward push. Nooit `--force` of `--force-with-lease` op main.
   Als main intussen verder is, wordt de push geweigerd: fetch, merge de nieuwe
   main, controleer opnieuw en probeer pas daarna opnieuw. Niet ongewijzigd herhalen.
7. Controleer de deployment en de werkelijk gewijzigde pagina op esmojo.nl.
   Rapporteer commit, controles en live resultaat afzonderlijk. Als publicatie
   niet bevestigd kan worden, meld dat precies; een geslaagde push is geen
   bewijs van een geslaagde deployment. Sluit de PR na een Git-merge wanneer mogelijk.

Dit beschermt tegen het overschrijven van main met verouderde code, maar is
geen garantie tegen inhoudelijke conflicten. Verdeel taken duidelijk en houd
gedeelde wijzigingen klein. Branch protection en verplichte CI kunnen dit later
technisch afdwingen; die zijn met dit document niet ingesteld.

## Externe diensten en gegevens

Vercel-secrets komen niet automatisch in een ChatGPT-cloudomgeving terecht.
Hergebruik bestaande bindings en bekijk alleen aanwezigheid, nooit geheime waarden.
Publiceer geen secrets in taaknotities, PR's, chat of logs.

Apps Script wordt via de bestaande workflow op main gepubliceerd, op dezelfde
deployment-ID. Geen handmatige parallelle publicaties vanuit beide accounts.
Voor Supabase-schemawijzigingen, Google Drive-opslagstructuur, secrets of
serviceconfiguratie is één eigenaar tegelijk nodig: meld die scope vooraf en
wacht bij overlap op afstemming. Een Git-merge maakt externe wijzigingen niet
automatisch veilig of atomair. Deel geen productiegegevens als coördinatiemiddel.

Classificeer nieuwe gegevens expliciet met de gebruiker volgens `AGENTS.md`.
Wijzig alleen diensten die de gevraagde functie raken. Bouw geen onbeveiligde
Drive-endpoints en herstel verwijderde OAuth- of tijdelijke testroutes niet.
Verstuur geen e-mails tenzij de gevraagde taak dat omvat.

## Huidige basis

Vite, vanilla JavaScript en CSS. Hoofdmenu met iconen; submenu zonder iconen op
alle pagina's behalve Homepage. Contentboxen zijn leeg tot er expliciete inhoud
wordt gevraagd, maximaal 1000 px breed en gecentreerd naast het submenu. Submenu
is 210 px breed, titel 16 px. Typografie schaalt niet mee met de schermbreedte;
onderdelen gaan onder elkaar wanneer de ruimte te smal is.

De gebruiker heeft GitHub → Vercel, Drive-bereikbaarheid via ondertekend Apps
Script en een succesvolle Apps Script-publicatierun bevestigd. Supabase-gebruik,
medewerkersauthenticatie, Drive-bestandsfuncties en een echte e-mailflow zijn
nog niet gebouwd of functioneel bewezen. Deze beschrijving kan verouderen:
actuele code, commits en aantoonbare resultaten zijn leidend.
