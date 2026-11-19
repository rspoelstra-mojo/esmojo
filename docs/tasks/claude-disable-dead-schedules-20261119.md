# Dode geplande GitHub-runs uitgeschakeld

Eigenaar: Claude Code. Branch: task/claude-disable-dead-schedules-20261119. Bestanden: .github/workflows/ontrack-reports.yml, .github/workflows/web-reports.yml.

Aanleiding: de gebruiker meldt foutmails van geplande runs die niets meer doen.
Bevinding (GitHub Actions, 19 november 2026):
- `Process OnTrack reports` (elke 30 min): laatste succesvolle run 17 november ~09:56; sindsdien elke run mislukt (HTTP-fout van /api/ontrack-reports-sync). Het is de oude OnTrack-/Drive-verwerking (CSV-scan, PDF-wachtrij), vervangen door native Rapportages en report-intake.yml.
- `Update incident references` met cron `*/5` (deliverExisting, online rapportagemail): sinds 19 november ~00:34 UTC elke run mislukt (503, code onbekend; het pad logt geen oorzaak).
Wijziging: ontrack-reports.yml heeft geen schedule meer (alleen handmatig); web-reports.yml verliest alleen de 5-minuten-cron. De dagelijkse incidentrun (22/23 UTC), push- en handmatige paden blijven. Code, endpoints en schema ongewijzigd.
Gevolg: de online rapportagemail aan ontvangers (V1.57) wordt niet meer periodiek aangeboden; die liep al niet meer succesvol. Herstel vraagt een eigen opdracht.
Niet gewijzigd: report-intake.yml (elke 5 min, slaagt), background-tasks.yml (elke 5 min, slaagt grotendeels), mojo-shows.yml (dagelijks 05:00).
