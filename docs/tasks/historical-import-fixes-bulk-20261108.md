# Historische import: correcties en volledige invoer

Eigenaar: Codex. Branch: task/historical-import-fixes-bulk-20261108.
Gebruiker vraagt Schoonmaak (ook gecombineerde disciplines) uit de historische
CSV's te verwijderen, Bouke-naamvarianten samen te nemen, het Rapportages-submenu
te beperken tot 45 dagen, historische kaartverkoop in de bestaande artiestshow-
weergave te tonen en incidents_CSV's centraal in OnTrack te bewaren.
Na verificatie van de tien proefconcerten is de volledige eerder beoordeelde
CSV-import geautoriseerd. Bestaande weergave/rechten behouden, geen mails/AI/taken.
Middag/avond onderscheiden met bestaande ID-opbouw + _S1/_S2 en datumtablabels.
Scope: noodzakelijke lees-/import-/filterkoppelingen en tests. Vertrouwelijke
inhoud, bestanden, ticketcijfers en bron-IDs uitsluitend Drive/Vercel/privéwerkmap;
niet in Git, CI-inputs of logs. Veilige, hervatbare import via de bestaande main-
OIDC-worker en ondertekende Drive-brug. Geen onbeveiligde tijdelijke route.
