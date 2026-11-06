# Afzender showrapportagemail

Eigenaar Codex, branch task/report-email-sender-20261106. Gebruik voor bestaande
showrapportagemail en bijbehorende testmail ESMOJO <showrapportage@esmojo.nl>.
Behoud accountmailafzender, ontvangers, ondertekening, inhoud, bijlagen en triggers.
Centrale vaste afzenderkeuze; geen vrij adres uit de browser. Scope server-email,
show-report-factory, gerichte bestaande tests en documentatie. Geen echte testmail.

Uitgevoerd met centrale vaste senderIds, show-report-factory en private senderId-
snapshot in de bestaande OnTrack-aflevering. Oude onzekere afleveringen houden
hun oorspronkelijke afzender bij herpoging. Geslaagd: bestaande emailrenderer,
mailtestservice (controle werkelijk Resend-payload), signed rapportflow, API,
Apps Script/Drive/publicatiechecks, productiebuild en diff-check. Geen echte mail.
Publicatie PR #98, V1.52.
