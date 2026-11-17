# Rapportages en show lezen de meest recente tijdschemaversie

Eigenaar: Claude Code. Branch: task/claude-report-timetable-v2-20261117.

Gebruikersopdracht (17 november 2026): rapportages lezen ook uit het nieuwe (dagelijks vernieuwde) tijdschema; de dag na het concert verdwijnt het schema van de MOJO-website, dus het opgeslagen schema op de showdag blijft de waarheid. Per concert geldt de meest recente versie (voorlopig schema of oudere showdagopname).

Wijzigingen: validateSavedTimetable (strikt, anders voorlopig) in shared/show-timetable.js en report-timeline.js; readTimetable kiest de laatste capturedAt tussen showdagopname en voorlopig schema; na de showdag wordt niets meer opgehaald. Tests en docs bijgewerkt. Geen nieuw schema, geen gegevensmigratie.
