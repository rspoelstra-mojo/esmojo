# Nieuw opgehaald tijdschema meenemen in Shows-omschakeling

Eigenaar huidige Codex-sessie; branch task/shows-timetable-delta-20261113.
Productie-eindvalidatie meldt ontbrekende Tijdschemaregel. Laat de cutover uitsluitend
nieuwe tijdschema-snapshots plus regels create-only toevoegen na volledige bestaande
native integriteit en actuele broncontrole. Bestaande snapshots nooit vervangen;
wijzigingen blijven blokkeren. Reeks-ETag, atomair, teruglezen en tweede eindvalidatie
onder schrijfstop. Geen bronwijzigingen, geen fictieve concerten, geen andere delta.
Bestanden source-validation/helper/tests, cutover en documentatie. Bestaande
GitHub/Vercel/Dataverse; geen credentials of nieuwe rechten.
