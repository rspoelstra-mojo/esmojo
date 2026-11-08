# ESMOJO beheren vanuit twee Codex-accounts

Beide accounts werken aan rspoelstra-mojo/esmojo via de bestaande zakelijke
koppelingen. AGENTS.md en docs/samenwerken.md blijven leidend. Autorisatie in een
ChatGPT-account is niet automatisch autorisatie in het andere account.

## Gedeelde werkwijze

- Iedere taak krijgt een eigen branch vanaf actuele origin/main en een draft PR.
  Controleer andere open taken vóór wijzigingen én vóór samenvoegen. Geen oude
  geschiedenis terugzetten of force-pushen na de opschoning van 7 november.
- Beide accounts bouwen/testen lokaal en via PR-CI. Normale gecontroleerde
  wijzigingen mogen naar main; geen omzeilen van reviews of mislukte checks.
- GitHub → Vercel publiceert de site. Publish Apps Script publiceert de Google-
  bron apart naar dezelfde deployment. Controleer beide; Vercel alleen is onvoldoende.
- Voor Google-code: ES2020-syntaxiscontrole en publicatietests. Details en veilige
  OAuth-herstelstappen staan in tools/apps-script/README.md.
- Verifieer live met een echte ingelogde MFA-gebruiker. Geen research-token als
  gebruikerslogin, servicekey in een browser of nieuwe ongeauthenticeerde testroute.
  Geen fictieve concertgegevens of testkliks in productie aanmaken.

## Toegang: wens, vastgesteld bewijs en resterende inrichting

Controle van 8 november 2026 in de huidige Codex-sessie. Geen tokenwaarden gelezen.

| Dienst | Gewenste toegang voor beide accounts | Hier vastgesteld |
| --- | --- | --- |
| GitHub ESMOJO Zakelijk | Repository lezen/schrijven, branches/PR’s/merge, CI lezen/starten, deploymentstatus; projectinstellingen alleen waar nodig | Zakelijke GitHub-identiteit rspoelstra-mojo; repository geeft admin/push/pull. Code/PR/CI-reads en taakbranch/draft PR werken. Secretmetadata en Actions-instellingen geven via CLI-integratie 403 ondanks repositoryrol. Een gebruikerrol is dus niet hetzelfde als connectorscope. |
| Vercel ESMOJO Zakelijk | ESMOJO-project, builds/logs/deployments en gevraagde projectinstellingen; geen toegang tot andere projecten nodig | Vercel-plugin is DISABLED_BY_ADMIN en niet geïnstalleerd in deze workspace. Geen Vercel-token in runtime. Automatische GitHub-uitrol en via GitHub geregistreerde deploystatus zijn beschikbaar; rechtstreeks projectbeheer niet. |
| Google Apps Script | Publiceren/verifiëren via gedeelde Actions-workflow, zonder Codex-tokenkopie | Laatste goede run 42457754755; mislukte run 42461478364 kwam bij clasp push. Dezelfde workflow/identiteit leest project/deployment. Actuele herstelrun wordt in taaknotitie vastgelegd. |
| Google Drive | Alleen afgesproken ondertekende Vercel→Apps Script-routes met actuele actor/modulecontrole | Geen directe publicatiecredentials of gebruikerssessie in deze runtime. De research-token heeft uitsluitend de bestaande onderzoekscope; geen vervanging voor profiel-/accounttoegang. |
| Supabase | Bestaande app-/MFA-/opslagfuncties; operationele checks via toegestane OIDC-workflows. Schemawijzigingen via eigenaar/voorbereide migratie | Geen directe Supabase-beheerverbinding in deze runtime. Geen extra servicekey aan Codex toegevoegd. De bestaande schema-/gezondheidscontroles blijven de aangewezen route. |

Deze sessie kan **niet** namens het andere ChatGPT-account de koppeling of sessie
controleren. PR #133 toont publicatieactiviteit onder dezelfde zakelijke GitHub-
identiteit, maar bewijst niet welke connectorrechten in die andere sessie actief
zijn. Laat dat account onderstaande niet-destructieve controle zelfstandig doen.

## Instellingen beheren: benodigde handelingen door de eigenaar

Beheerrechten op een zakelijke provider staan los van MFA en modulerechten voor
ESMOJO-gebruikers. Ze veranderen de publieke websiteautorisatie niet, maar geven
wel productiemacht. Bescherm beide ChatGPT-/provideraccounts met MFA. Geef alleen
toegang tot het ESMOJO-project/de repository en gebruik geen gedeeld wachtwoord of
persoonlijke PAT als omweg rond ontbrekende connectorscopes.

1. **Vercel-plugin beschikbaar maken:** de ChatGPT-workspacebeheerder opent
   Workspace Settings → Apps (of Connectors) → Vercel en schakelt de plugin in.
   Een plugin die door de beheerder is uitgezet kan Codex niet zelf activeren.
2. **In beide accounts verbinden:** open Settings → Apps → Vercel, verbind de
   bestaande zakelijke ESMOJO-omgeving en selecteer ‘Vercel ESMOJO Zakelijk’ in
   de betreffende Codex-sessie. In Vercel → zakelijke team → Settings → Members
   controleert de eigenaar projecttoegang voor ESMOJO. Gebruik projectbeheerrechten
   voor deploys, logs, domein-/omgevingsinstellingen; geef geen team-ownerrol voor
   andere projecten als dat niet nodig is. Rollen/beschikbaarheid verschillen per
   Vercel-abonnement. Bewijs de verbinding met een read van het ESMOJO-project.
3. **GitHub-connector per account:** selecteer ‘GitHub ESMOJO Zakelijk’, controleer
   de identiteit en installatie op alleen de benodigde repository. De eigenaar
   beheert de GitHub App onder GitHub Settings → Applications → Installed GitHub
   Apps → betreffende Codex/ChatGPT-installatie → Configure. Accepteer alleen
   aangeboden en noodzakelijke rechten; een integratie kan niet zelf extra scopes
   verzinnen. Repositoryrol admin heft een 403 op Actions-secrets niet op.
4. **Ontbrekende settingsmogelijkheden:** alleen als de officiële koppeling die
   aanbiedt, opnieuw verbinden met de vereiste projectrechten. Anders blijft de
   eigenaar verantwoordelijk voor wijzigingen via GitHub/Vercel Settings. Een
   workflow starten mag zonder secrets lezen. Er is geen verborgen beheersroute
   toegevoegd om deze providerbeperkingen te omzeilen.
5. **Google:** de bestaande webapp-eigenaar beheert de clasp-grant en CLASPRC_JSON
   in GitHub. Niet in beide Codex-accounts kopiëren. Bij echte OAuth-fouten volg
   tools/apps-script/README.md. Een syntaxfout vereist geen nieuwe autorisatie.
6. **Supabase-schema:** de eigenaar voert goedgekeurde migraties in de SQL Editor
   uit zolang geen afgesproken beheerconnector beschikbaar is. Geen service-role-
   sleutel delen in chat of als VITE_-variabele toevoegen.

Het inschakelen van een connector alleen bewijst niet dat alle settings-acties
worden ondersteund. Verifieer het concrete project en de benodigde reads/writes;
rapporteer beperkingen, vraag geen onnodige organisatiebrede rechten.

## Controle vanuit ieder account

1. Lees deze handleiding en controleer actuele main, `git status`, open PR’s en
   geauthenticeerde zakelijke GitHub-identiteit. Geen secrets/credentialconfig dumpen.
2. Lees repository/PR’s en de nieuwste check-/deploymentstatus. Normale taakbranch
   en draft PR zijn het bewijs van code-/PR-schrijfbereik bij echt werk.
3. Start een alleen-lezen Google-publicatiecontrole:
   ```sh
   gh workflow run apps-script.yml --repo rspoelstra-mojo/esmojo --ref main -f verify_only=true
   gh run list --repo rspoelstra-mojo/esmojo --workflow apps-script.yml --limit 5
   ```
   Bekijk de samenvatting van de gestarte run. Als connector/CLI dispatch mist:
   GitHub → Actions → Publish Apps Script → Run workflow → main → verify_only aan.
4. Lees met Vercel ESMOJO Zakelijk het project, laatste deployment en buildstatus.
   Zonder beschikbare connector: vermeld die beperking; gebruik de gekoppelde
   GitHub-deploymentstatus voor normale uitrol, zonder rechtstreeks beheer te claimen.
5. Open na publicatie `/artiest/freyaskye` en een artiest met opgeslagen analyses
   met MFA en Artiestenrechten. Controleer foto waar aanwezig, reeksdatums per zaal
   en de vier bezoekerskaarten. Ontbrekende brongegevens mogen ‘Informatie niet
   beschikbaar’ tonen. Geen concert-/analysegegevens wijzigen voor deze controle.
6. Noteer account A/B, commit, workflow-ID en uitkomst; geen identiteits-/rapport-
   inhoud, sessietokens of ruwe credentiallogs in de repository vastleggen.

Voor technische operationele controles bestaan ook de workflows Check MFA replay
cache en Archive active show storage met check_only=true. Hun OIDC-identiteit is
beperkt tot de bestaande productiechecks; de Artiestenmodule krijgt geen extra
leestoegang door zo’n workflow. Deze checks vervangen geen ingelogde browsertest.
