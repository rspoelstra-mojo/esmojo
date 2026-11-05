# Bestaand tijdschema bij filenamefallback

Eigenaar Codex, branch task/fallback-archived-timetable-20261105. Gebruiker wijst
terecht op de ontbrekende archieflookup wanneer een CSV via bestandsnaamfallback
wordt getoond en geen catalogusrecord meer heeft. Hergebruik een eerder opgeslagen
openbaar MOJO-noonschema bij dezelfde exacte of unieke genormaliseerde concert-
identiteit, met gelijke zaal en showdatum. Zoek uitsluitend in het bestaande
Tijdschemas-archief. Geen nieuw schema reconstrueren, geen wijziging van opname,
concertmetadata, bron-CSV, mailflow of ontvangers. Reports/MFA blijven vereist.
Scope kleine readhelper in WebReports.gs, gerichte synthetische regressietests,
docs en V1.42; publicatie via bestaande PR/main/Vercel/Apps Script workflow.
