# Incidentverversing losgekoppeld van de rapportagemail

Eigenaar: Claude Code. Branch: task/claude-split-incident-refresh-20261119. Bestanden: .github/workflows/web-reports.yml, api/web-reports-sync.js, tools/reports/web-import-workflow.test.mjs.

Aanleiding: de gebruiker wil `Update incident references` houden, maar losgekoppeld van de run die elke 5 minuten de rapportagemail aanbood.
Wijziging: de mailtak (`deliverExisting`) is uit web-reports.yml en uit api/web-reports-sync.js verwijderd, evenals de aparte concurrencygroep voor die mailrun. De workflow doet nu uitsluitend: dagelijkse incidentreferenties (00:00 NL), de push-controle en handmatige runs. De mailverzending zelf (server/online-report-mail.js, api/ontrack-reports-sync.js, ontrack-reports.yml handmatig) is ongewijzigd en niet meer gekoppeld aan deze workflow.
Let op: de 5-minutenrun deed na de mailstap ook een stukje artiestopening-voorbereiding (artistPerformance inventory/prepare). Die onderhoudsstap staat nog in het dagelijkse pad; sinds het uitzetten van de 5-minutenrun gebeurt dat dus alleen dagelijks (functioneel veilig: een gebruiker die een artiest opent, bouwt de opening zo nodig direct op).
