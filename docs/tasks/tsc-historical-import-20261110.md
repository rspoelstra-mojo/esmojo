# TSC historische import februari 2020
Eigenaar huidige Codex-sessie; branch task/tsc-historical-import-20261110.
Gebruiker bevestigt Discipline→Division, EHBO→Medisch; Barney Dome in AFAS Live;
identieke Stereophonics S2 vervalt en S1 verliest suffix. TSC eerste rij bevat
werkelijke bezoekers, uitzettingen, aanhoudingen en drie tijden. Eerst showgegevens
opslaan en teruglezen, pas daarna de koploze incidentenbron publiceren. Expliciete
null voor ontbrekend, nul blijft nul; TSC uitzettingen/aanhoudingen nooit berekenen.
Behoud aparte paden voor geautomatiseerd OnTrack, historisch OnTrack en historisch
TSC. Vertrouwelijke data uitsluitend privéwerkmap/Drive, geen Git of CI. Bestaande
beveiligde historische batchroute, geen nieuwe publieke upload of mail/PDF.
Huidige omgeving heeft geen bruikbare Drive-uploadidentiteit/connector; controleer
live overdracht afzonderlijk en rapporteer geen import zonder terugleesbewijs.
Versie blijft V1.99. Scope converter, bestaand import/register, KPI/tijdprojecties.

Voorbereiding voltooid: 15 bestanden native gevalideerd, één goedgekeurd identiek
bronbestand overgeslagen; oorspronkelijke ZIP intact. Private importset en status
per bestand staan buiten Git. Alle bestaande Node-regressies, nieuwe TSC/Drive-
volgorde-/terugleescontroles, browsercontrole, build en Apps Script-syntax slagen.
Nog nul live imports: bruikbare Drive-uploadidentiteit/connector ontbreekt in deze
omgeving. Publicatie betreft alleen geteste bronondersteuning; feitelijke import
vereist private overdracht en bevestigde OIDC-import plus terugleesverificatie.
