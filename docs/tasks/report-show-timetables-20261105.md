# MOJO-tijdschema's bij rapportincidenten

Eigenaar Codex, branch task/report-show-timetables-20261105. Gebruiker bevestigt
Openbaar voor online gecommuniceerde geplande tijden. Alleen geverifieerde
mojo.nl-concertpagina van het canonieke concert gebruiken. Vastleggen op de
echte showdag rond 12:00 Europe/Amsterdam, inclusief zomer/wintertijd. Eerdere
archieven bewaren wanneer MOJO inhoud later verwijdert; geen historische tijden
verzinnen of huidige inhoud als eerdere middagopname presenteren.
Tussenkoppen chronologisch in de individuele lijst, eigen tint en gecentreerd.
Deuren, meerdere support/surprise/hoofdacts, pauzes en eindtijd; nachtgrens en
bestaande incidentfilters respecteren. Tussenkoppen tellen niet als incident.
Scope pure parser/validatie, getekende Drive-opslag bij OnTrack en bestaande
middagworkflow, webprojectie/renderer/CSS/tests/docs, V1.39. Geen PDF-/mail- of
incidentberekeningswijzigingen; alle bestaande Reports/MFA-rechten behouden.


Aanvullende toelichting gebruiker: een week vooraf kan schema ontbreken, de dag
erna verdwijnt het; de eigen showdag om 12:00 is de bedoelde opname. Implementatie
slaat geen vroegtijdig/historisch schema op. Bestaande dagelijkse workflow,
provenance met werkelijke uitvoeringstijd, idempotent per concert bewaard.
Pure parser op actuele Puscifer-pagina geverifieerd, zonder productie-opslag van
die ontwikkelproef. Jungle/Montell Fish-pagina's hebben nu geen schema. Hun oude
rapporten krijgen geen verzonnen tijdstippen; beschikbaarheidsmelding in de UI.

Architectuur en beperkingen staan in docs/report-timetables.md. Publieke tijden
blijven gescheiden van CSV-/PDF-registers. Bestaande machine-identiteit krijgt
eigen audience; geen algemene webschrijfroute. Parser/store/module/tijdzone- en
bestaande rapporttests worden gecontroleerd vóór publicatie via PR/main.

Gecontroleerd: parser 4, opslag/worker 4, rapportprojectie 7, machine-identiteit 6,
Apps Script 8, Drive 7 en deploymenttests geslaagd; productiebuild en diff-check
geslaagd. Browseracceptatie met uitsluitend synthetische records op 700, 1280,
1440, 1920 en 2560px in licht/donker: gecentreerde volle-breedtetussenkoppen,
correcte nachtgrens en volgorde, alle acht incidentfilters, ongewijzigde
incidententelling en geen horizontale overflow. Actuele publieke Puscifer-bron
herkent deuren/Dave Hill/Puscifer/einde, zonder productiearchief te schrijven.
