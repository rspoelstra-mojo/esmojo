# Historische rapportages: tien steekproefconcerten live importeren

Eigenaar: Codex. Branch: task/historical-report-sample-import-20261108.
Gebruiker autoriseert publicatie van uitsluitend de tien eerder willekeurig
gekozen echte concerten via bestaande rapportageweergave en toegangscontrole.
CSV-/incidentinhoud blijft Vertrouwelijk in Drive en bestaande beveiligde
Vercel-verwerking. Geen data/credentials in Git, logs of publieke buildbestanden.
Maak import herhaalbaar zonder overschrijven/dubbelen, voorkom mails/AI/taken,
controleer bestaande concert-ID-opbouw en teruglezen. Middag/avond-ID-conventie
_S1/_S2 behouden; deze twee concerten zitten niet in deze steekproef.
Scope: noodzakelijke import-/register-/rapportagekoppeling, gerichte tests en docs.
Geen nieuwe rapportageweergave. Productieclaims uitsluitend na live bewijs.

Implementatie: alleen-lezen historisch Drive-register en broncontrole in bestaande
WebReports-inventaris; normale rapportagecomponent/CSS ongemoeid. Historische
bronnen blijven in hun eigen concertmap buiten de OnTrack/PDF-scan. Mailmarkering
historical en publicatiehook voorkomen verzending. Bestaande OIDC-workflow krijgt
een historical_only-stand voor veilige indexering zonder mailworker.

Lokaal: historische regressies (weergave/rechten/no-mail/no-PDF/private parents/
hash/ID/datums), bestaande catalogus-/mail-/artiesttests, syntaxcontrole en build
slagen. Werkelijke bytes en private bestandsIDs uitsluitend in Drive/privéwerkmap.
Google Drive-eigenaar en vaste private root zijn via metadata gecontroleerd.
