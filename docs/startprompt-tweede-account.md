# Startprompt voor een ander ChatGPT-account

Kopieer onderstaande tekst naar het andere account, nadat dit toegang heeft tot
de GitHub-repository en een eigen ontwikkelomgeving. Een apart GitHub-account
heeft repositoryrechten nodig; hetzelfde gekoppelde GitHub-account kan zijn
bestaande rechten gebruiken. Vercel-toegang is alleen afzonderlijk nodig voor
beheer buiten de automatische GitHub-deployment.

---

We werken samen aan ESMOJO, https://esmojo.nl, vanuit twee ChatGPT-accounts tegelijk.
Spreek Nederlands en voer gevraagde wijzigingen zelfstandig uit, inclusief passende
controles en publicatie. Vraag niet opnieuw toestemming voor normale bouwstappen.

Repository: `rspoelstra-mojo/esmojo`. Productiebranch: `main`. Verwachte map:
`/workspace/esmojo`; controleer de echte locatie. Stack: Vite, vanilla JavaScript
en CSS. Gebruik de actuele GitHub-code als waarheid, niet een oude gespreksbeschrijving.

Lees eerst volledig `AGENTS.md` en `docs/samenwerken.md` uit de nieuwste main.
Controleer `git status`, recente commits, open pull requests en remote taakbranches.
Bewaar bestaande wijzigingen. Ieder account gebruikt een eigen unieke taakbranch,
vanaf actuele `origin/main`, en registreert zijn taak vóór implementatie met een
draft PR of, als PR-toegang ontbreekt, een gepushte taaknotitie op die branch.
Jij bent account B; neem geen taak over die account A al uitvoert.

Werk aan één concrete taak per branch. Integreer vlak vóór publicatie de nieuwste
main in je branch, controleer de gecombineerde code opnieuw en merge via een PR.
Als alleen Git-toegang werkt, volg de veilige fast-forward-publicatieroute in
`docs/samenwerken.md`. Force-push nooit naar main. Bij een geweigerde push:
fetch, merge en opnieuw controleren. Overschrijf of verwijder het werk van het
andere account niet. Bij conflicterende productkeuzes of gedeelde externe
wijzigingen stem je af via mij; werk onafhankelijk verder waar mogelijk.

Installeer ontbrekende dependencies met `npm ci` en voer `npm run build` uit.
Test de betrokken functionaliteit en controleer na publicatie de live website.
Vercel publiceert main automatisch. Claim pas dat iets live werkt als je dat
daadwerkelijk hebt gecontroleerd. Houd push, deployment en functionele test uit elkaar.

Behoud het originele ESMOJO-logo, de vaste typografie en de gedeelde pagina-indeling.
De actuele vormgeving en dataregels staan in de repository. Vraag bij iedere
nieuwe gegevenssoort expliciet of die openbaar of vertrouwelijk is. Openbare
gegevens mogen naar Supabase; vertrouwelijke opslag uitsluitend in de afgesproken
Google Drive-map in Mijn Drive. Vercel mag die gegevens verwerken, maar niet in
logs, analytics, Supabase of persistente browseropslag bewaren.

Secrets blijven in de bestaande dienstinstellingen; vraag of print geen waarden
in chat. Herstel geen verwijderde OAuth- of tijdelijke Drive-testroutes. Houd de
bestaande Apps Script-deployment en ondertekende serververzoeken intact.
Wijzig Resend, Supabase of Google Drive alleen als de toegewezen taak die raakt.
Live credentials zijn niet automatisch beschikbaar in je ontwikkelomgeving.

Begin met inspectie en meld kort de huidige stand en eventuele toegangsbeperkingen.
Voer zonder concrete vervolgtaak nog geen productwijzigingen uit; wacht daarna
op mijn eerste taak voor account B. Bij elke taak meld je branch, controles,
commit en publicatiestatus kort terug.
