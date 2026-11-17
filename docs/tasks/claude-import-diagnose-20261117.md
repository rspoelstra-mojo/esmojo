# Import van 17 november: diagnose en handmatige run

Eigenaar: Claude Code. Branch: task/claude-import-diagnose-20261117.

De geplande 05:00-import van 17 november (run 44019868737) faalde in stap photo-candidates met de generieke code IMPORT_UNCONFIRMED. Vercel bewaart de runtimelogs niet meer en de handler schrijft zelf geen fout weg, dus de oorzaak is niet te herleiden. De gebruiker vraagt de oorzaak te onderzoeken en een nieuwe run nu te doen in plaats van morgenochtend.

Aanpak (klein, geen schema, geen nieuwe opslag):
1. Diagnose: bekende veilige foutcodes uitbreiden (o.a. DATAVERSE_SHOWS_LIMIT) en bij onbekende fouten alleen de foutklasse en een code-achtige foutcode teruggeven (geen berichttekst, geen data); de workflow logt die. De alleen-lezen verificatie (verifyOnly, draait ook bij elke push van de workflow) controleert voortaan ook de fotokandidaten en meldt het aantal.
2. Handmatige run: workflow_dispatch met input run_now (standaard uit). De server accepteert het gesloten importvenster alleen als de OIDC-claims event_name=workflow_dispatch op main bevestigen en de aanvraag manualRun=true bevat. Schema-run om 05:00 en tijdschema-run van 12:00 blijven ongewijzigd.

Verwachte bestanden: server/shows-sync-api.js, server/github-identity.js, .github/workflows/mojo-shows.yml, tests, docs/dataverse/concert-catalogue.md.
