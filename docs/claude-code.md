# Claude Code aansluiten op ESMOJO

Dit richt de gedeelde repository-afspraken in, niet de login van jouw Claude-
account. Claude Code leest CLAUDE.md bij openen van het project. Dat bestand
importeert dezelfde AGENTS.md en samenwerkingsafspraken als de Codex-accounts.
Een startprompt draagt de gesprekken niet over: actuele code/GitHub-notities
blijven de gedeelde bron. De context staat in docs/projectcontext.md.

## Eenmalig in jouw Claude-omgeving

1. Open rspoelstra-mojo/esmojo in Claude Code in een eigen checkout/uitvoeromgeving.
   Gebruik niet gelijktijdig dezelfde fysieke Git-map als een andere actieve agent.
   Geen Claude-worktree-modus, oude branches of automatische resets gebruiken.
2. Gebruik de bestaande zakelijke GitHub-identiteit met toegang tot deze repository.
   Laat Claude eerst bestaande toegang controleren. Als je de GitHub CLI gebruikt
   en nog niet ingelogd bent, kun je zelf `gh auth login --web` uitvoeren en daarbij
   het zakelijke account kiezen. Geen tokens/wachtwoorden in een chat plakken.
3. Voor directe Vercel-controles is afzonderlijke toegang nodig tot het bestaande
   team esmojo / project esmojo (https://vercel.com/esmojo/esmojo). Gebruik de
   beschikbare officiële koppeling of CLI. Ontbreekt CLI-login, voer zelf
   `vercel login` uit met het zakelijke account. Maak geen nieuw team/project;
   vergelijk een bestaande lokale projectbinding vóór je publiceert. Commit geen
   .vercel-configuratie of opgehaalde environmentbestanden.
4. GitHub→Vercel publiceert main al automatisch. Een Claude-/Vercel-login is geen
   reden voor een tweede deploymentroute of het kopiëren van production-secrets.
   Testen/bouwen kan met fixtures; productiechecks via bestaande beveiligde routes.
5. Gebruik Node.js 24 en bestaande package-lock.json. Installeer waar nodig met
   npm ci; geen dependency-upgrade om alleen deze agent aan te sluiten.

De GitHub-/Vercel-koppelingen van ChatGPT geven Claude geen automatische toegang.
Verifieer per dienst en rapporteer concrete ontbrekende toegang afzonderlijk.
Dataverse-beheer en een ingelogde MFA-browser zijn weer aparte bevoegdheden.
Verander geen rechten/secretconfiguratie en zet geen toestemmingscontroles uit om
onboarding te laten slagen. Voor een gewone projecttaak geen nieuwe MCP-server
in ESMOJO bouwen. Een normale clientkoppeling met GitHub/Vercel is iets anders.

## Startprompt om te plakken

```text
Je werkt aan ESMOJO, repository rspoelstra-mojo/esmojo, productie https://esmojo.nl.
Je werkt samen met account A en andere Codex-sessies. Jouw eigenaarnaam is
Claude Code. Chats, lokale werkmappen en toegangsrechten worden niet gedeeld.

Begin met alleen kennismaken en toegang controleren, nog geen functionaliteit
bouwen of backlog oppakken:
1. Controleer git status en bewaar alle bestaande/onbekende wijzigingen.
2. Lees CLAUDE.md, AGENTS.md, docs/samenwerken.md, docs/projectcontext.md en
   docs/claude-code.md. Haal actuele origin/main op en controleer open PR's,
   taakbranches en relevante docs/tasks-notities. Actuele code/latere expliciete
   besluiten gaan vóór historische plannen.
3. Verifieer jouw eigen bestaande zakelijke GitHub- en Vercel-toegang. Neem
   ChatGPT-koppelingen, Dataverse-beheer of een geldige MFA-sessie niet aan.
   Vraag alleen bij een concrete beperking om hulp; vraag nooit om geheime
   waarden in de chat en kopieer geen credentials uit andere sessies.

Voor iedere volgende implementatietaak: maak vanuit actuele origin/main een
unieke task/claude-onderwerp-datum-tijd-branch en registreer vóór codewijzigingen
het doel, eigenaar, verwachte bestanden/diensten en een taaknotitie met draft-PR.
Controleer overlap met andere agents. Geen werk van anderen resetten/overschrijven,
extra worktrees, force-pushes of oude branches/historie terugmergen. Geen twee
agents tegelijk laten schrijven of branches wisselen in dezelfde fysieke checkout.
Integreer nieuwe main vóór samenvoegen, draai passende tests/build en merge alleen
bij groene vereiste checks. Verifieer daarna deployment én gewijzigd gedrag.

Alles nieuw in Dataverse; Supabase Auth/MFA blijft. Nieuwe schemaonderdelen krijgen
een beveiligde setupknop bij Datatransitie. Google/Apps Script en oude Supabase-
bedrijfsroutes niet heropenen. Historische crypto-/Auth-sleutels niet verwijderen.
Behoud actuele serverautorisatie, onafhankelijke readback, tokenvernieuwing en
idempotentie. Geen inhoud/secrets in logs/Git/browseropslag, geen authbypass,
productie-testmails of fictieve concerten/incidenten/kliks.

Showbeheer heeft nu PDF in blok E, link+PIN, verval na de laatste reeksdag,
voorlopige mailto met alleen PIN/link en anonieme Dataverse-tellingen. Andere
Resend-mailstromen niet wijzigen zonder opdracht. Verdere performanceoptimalisatie
is op verzoek gestopt; niet zelfstandig hervatten.

Geef nu kort je begrip van de actuele situatie, eventuele bezette/overlappende
taken en jouw daadwerkelijk geverifieerde toegang. Benoem blokkades precies en
wacht daarna op mijn concrete taak.
```

## Taakoverdracht

Gebruik dezelfde docs/tasks-notitie en draft-PR voor zichtbaarheid. Noteer bij
pauzeren wat af is, commit/PR, resterende stap, test-/deploymentbewijs en welke
diensten/bestanden geraakt worden. Een andere agent begint een overname met een
nieuwe branch vanaf actuele main nadat de vorige schrijver gestopt is. Een
voorbereide wijziging of eerder bereikbare service is geen bewezen live resultaat.
