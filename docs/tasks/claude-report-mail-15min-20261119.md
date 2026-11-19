# Showrapportagemail: aparte run elke 15 minuten

Eigenaar: Claude Code. Branch: task/claude-report-mail-15min-20261119. Bestanden: .github/workflows/ontrack-reports.yml, api/ontrack-reports-sync.js, server/online-report-mail.test.js.

Gewenste inrichting (gebruiker, 19 november 2026): één run om 05:00 voor alle dagelijkse bijwerkingen, en daarnaast elke 15 minuten een aparte run die showrapportagemails verstuurt zodra een nieuwe rapportage beschikbaar is.
Wijziging: ontrack-reports.yml draait weer, nu elke 15 minuten en uitsluitend voor de mail ("Send show report emails"). api/ontrack-reports-sync.js verstuurt alleen nog de wachtende online-rapportagemails (createOnlineReportMailService); de oude OnTrack-/Drive-PDF-verwerking (CSV-scan, PDF-wachtrij) is uit dit eindpunt verwijderd. Bij een fout geeft het eindpunt een vast codewoord (anders MAIL_DELIVERY_UNCONFIRMED), nooit providerberichten, ontvangers of inhoud.
Bekend: de mailstap faalde sinds 19 november ~00:34 UTC met een onbekende oorzaak (HTTP 503). Na publicatie wordt eenmalig handmatig gestart om de foutcode te lezen en de oorzaak te herstellen.
Ongewijzigd: mailinhoud (showReportEmail), ontvangers, afzender, idempotentie en de bestaande Reports-/module-/identiteitscontroles.
